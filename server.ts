import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

console.log("Starting server with Project ID:", firebaseConfig.projectId);

let db: ReturnType<typeof admin.firestore> | null = null;
let firebaseInitError = "";

// Initialize Firebase Admin safely
if (!admin.apps.length) {
  try {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      if (serviceAccountEnv.trim().startsWith("{")) {
        const serviceAccount = JSON.parse(serviceAccountEnv);
        // Fix mangled newlines from Vercel env variable pasting
        if (serviceAccount.private_key) {
           serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: firebaseConfig.projectId,
        });
        console.log("Firebase Admin initialized using Service Account.");
      } else {
        throw new Error("FIREBASE_SERVICE_ACCOUNT does not look like valid JSON.");
      }
    } else {
      admin.initializeApp({ projectId: firebaseConfig.projectId });
      console.log("Firebase Admin initialized using Default Credentials.");
    }
    db = admin.firestore(firebaseConfig.firestoreDatabaseId || undefined);
    if (firebaseConfig.firestoreDatabaseId) {
        console.log("Using Firestore Database ID:", firebaseConfig.firestoreDatabaseId);
    }
  } catch (error: any) {
    console.error("Firebase Admin initialization failed:", error);
    firebaseInitError = error.message;
  }
} else {
  db = admin.firestore(firebaseConfig.firestoreDatabaseId || undefined);
}

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// --- Database Seed (Firestore) ---
async function seedDatabase() {
  if (!db) {
      console.error("Skipping DB seed because Firestore did not initialize.");
      return;
  }
  try {
    const usersSnapshot = await db.collection('users').limit(1).get();
  if (usersSnapshot.empty) {
    console.log("Seeding initial data to Firestore...");
    const batch = db.batch();
    
    const initialUsers = [
      { id: "1", username: "admin", password: bcrypt.hashSync("admin123", 10), role: "admin", name: "Administrator" },
      { id: "2", username: "guru", password: bcrypt.hashSync("guru123", 10), role: "guru", name: "Guru Pengampu" },
      { id: "3", username: "siswa", password: bcrypt.hashSync("siswa123", 10), role: "siswa", name: "Siswa Teladan", classId: "1", examKey: "ABCDE" }
    ];
    
    initialUsers.forEach(u => {
      const { id, ...data } = u;
      batch.set(db.collection('users').doc(id), data);
    });

    batch.set(db.collection('rooms').doc('1'), { name: "Lab Komputer 1" });
    batch.set(db.collection('exams').doc('1'), { packetId: "1", name: "UTS Matematika Semester Ganjil", isActive: true, durationMinutes: 60, type: "UTS" });
    
    const questions = [
      { id: "q1", packetId: "1", type: "mcq", text: "Siapakah penemu lampu pijar?", options: [{ id: "a", text: "Albert Einstein" }, { "id": "b", "text": "Thomas Alva Edison" }, { "id": "c", "text": "Isaac Newton" }, { "id": "d", "text": "Nikola Tesla" }] },
      { id: "q2", packetId: "1", type: "mcq", text: "Berapakah hasil dari 15 x 20?", options: [{ id: "a", text: "200" }, { id: "b", "text": "250" }, { id: "c", "text": "300" }, { id: "d", "text": "350" }] },
      { id: "q3", packetId: "1", type: "essay", text: "Jelaskan apa yang dimaksud dengan fotosintesis!" },
      { id: "q4", packetId: "1", type: "mcq", text: "Dengarkan audio dan pilih jawaban yang benar.", media: { type: "audio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }, options: [{ id: "a", text: "Sebutkan nama hewan" }, { id: "b", "text": "Sebutkan nama bunga" }] }
    ];
    
    questions.forEach(q => {
      const { id, ...data } = q;
      batch.set(db.collection('questions').doc(id), data);
    });

    await batch.commit();
  }
  } catch(e) {
    console.error("DB Seed Error:", e);
  }
}

// --- Server Setup ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  await seedDatabase();

  // --- Auth Middleware ---
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Forbidden" });
      req.user = user;
      next();
    });
  };

  // --- API Routes ---
  app.post("/api/login", async (req, res) => {
    try {
      if (!db) {
          return res.status(500).json({ error: `Firebase failed to initialize on Vercel: ${firebaseInitError}` });
      }
      
      const { username, password } = req.body;
      const usersSnapshot = await db.collection('users').where('username', '==', username).limit(1).get();
      
      if (usersSnapshot.empty) return res.status(401).json({ error: "User not found" });
      
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();

      if (bcrypt.compareSync(password, userData.password)) {
        const token = jwt.sign({ id: userDoc.id, role: userData.role, username: userData.username }, JWT_SECRET, { expiresIn: "10h" });
        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
        res.json({ id: userDoc.id, role: userData.role, name: userData.name });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      res.status(500).json({ error: `Backend Error: ${error.message || JSON.stringify(error)}` });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  });

  app.get("/api/me", authenticateToken, async (req: any, res) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.id).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      
      const userData = userDoc.data()!;
      const { password, ...userWithoutPassword } = userData;
      res.json({ id: userDoc.id, ...userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin/Guru endpoints
  app.get("/api/data/:collection", authenticateToken, async (req: any, res) => {
    try {
      const snapshot = await db.collection(req.params.collection).get();
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  app.post("/api/data/:collection", authenticateToken, async (req: any, res) => {
    try {
      const docRef = await db.collection(req.params.collection).add(req.body);
      res.json({ id: docRef.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: "Failed to create data" });
    }
  });

  // --- Exam Sessions ---
  app.get("/api/exam/active", authenticateToken, async (req: any, res) => {
    try {
      const snapshot = await db.collection('exams').where('isActive', '==', true).get();
      const exams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(exams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exams" });
    }
  });

  app.post("/api/exam/:id/start", authenticateToken, async (req: any, res) => {
    try {
      const examId = req.params.id;
      const studentId = req.user.id;

      const snapshot = await db.collection('results')
        .where('examId', '==', examId)
        .where('studentId', '==', studentId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return res.json({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }

      const session = {
        examId,
        studentId,
        answers: [],
        violationCount: 0,
        startTime: new Date().toISOString(),
        isFinished: false,
        remainingTime: 3600
      };
      
      const docRef = await db.collection('results').add(session);
      res.json({ id: docRef.id, ...session });
    } catch (error) {
      res.status(500).json({ error: "Failed to start exam" });
    }
  });

  app.post("/api/exam/:id/submit", authenticateToken, async (req: any, res) => {
    try {
      const examId = req.params.id;
      const studentId = req.user.id;
      const { answers, violationCount } = req.body;

      const snapshot = await db.collection('results')
        .where('examId', '==', examId)
        .where('studentId', '==', studentId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        await docRef.update({ 
          answers, 
          violationCount, 
          isFinished: true, 
          endTime: new Date().toISOString() 
        });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit exam" });
    }
  });

  app.get("/api/data/:collection/:id", authenticateToken, async (req: any, res) => {
    try {
      const doc = await db.collection(req.params.collection).doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  app.put("/api/data/:collection/:id", authenticateToken, async (req: any, res) => {
    try {
      await db.collection(req.params.collection).doc(req.params.id).update(req.body);
      res.json({ id: req.params.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: "Failed to update" });
    }
  });

  app.delete("/api/data/:collection/:id", authenticateToken, async (req: any, res) => {
    try {
      await db.collection(req.params.collection).doc(req.params.id).delete();
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

const appPromise = startServer();
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
