import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const DB_FILE = path.join(__dirname, "db.json");

// --- Database Helper ---
function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [
        { id: "1", username: "admin", password: bcrypt.hashSync("admin123", 10), role: "admin", name: "Administrator" },
        { id: "2", username: "guru", password: bcrypt.hashSync("guru123", 10), role: "guru", name: "Guru Pengampu" },
        { id: "3", username: "siswa", password: bcrypt.hashSync("siswa123", 10), role: "siswa", name: "Siswa Teladan", classId: "1", examKey: "ABCDE" }
      ],
      classes: [{ id: "1", name: "X-MIPA-1", level: "SMA" }],
      subjects: [{ id: "1", name: "Matematika" }],
      rooms: [{ id: "1", name: "Lab Komputer 1" }],
      exams: [
        { id: "1", packetId: "1", name: "UTS Matematika Semester Ganjil", isActive: true, durationMinutes: 60, type: "UTS" }
      ],
      questions: [
        { id: "q1", packetId: "1", type: "mcq", text: "Siapakah penemu lampu pijar?", options: [{ id: "a", text: "Albert Einstein" }, { "id": "b", "text": "Thomas Alva Edison" }, { "id": "c", "text": "Isaac Newton" }, { "id": "d", "text": "Nikola Tesla" }] },
        { id: "q2", packetId: "1", type: "mcq", text: "Berapakah hasil dari 15 x 20?", options: [{ id: "a", text: "200" }, { id: "b", "text": "250" }, { id: "c", "text": "300" }, { id: "d", "text": "350" }] },
        { id: "q3", packetId: "1", type: "essay", text: "Jelaskan apa yang dimaksud dengan fotosintesis!" },
        { id: "q4", packetId: "1", type: "mcq", text: "Dengarkan audio dan pilih jawaban yang benar.", media: { type: "audio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }, options: [{ id: "a", text: "Sebutkan nama hewan" }, { id: "b", "text": "Sebutkan nama bunga" }] }
      ],
      results: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- Server Setup ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

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
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const db = getDB();
    const user = db.users.find((u: any) => u.username === username);

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: "10h" });
      res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
      res.json({ id: user.id, role: user.role, name: user.name });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
  });

  app.get("/api/me", authenticateToken, (req: any, res) => {
    const db = getDB();
    const user = db.users.find((u: any) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Admin/Guru endpoints (Generic for demo)
  app.get("/api/data/:collection", authenticateToken, (req: any, res) => {
    const db = getDB();
    res.json(db[req.params.collection] || []);
  });

  app.post("/api/data/:collection", authenticateToken, (req: any, res) => {
    const db = getDB();
    const collection = req.params.collection;
    if (!db[collection]) db[collection] = [];
    
    const newItem = { id: Date.now().toString(), ...req.body };
    db[collection].push(newItem);
    saveDB(db);
    res.json(newItem);
  });

  // --- Exam Sessions ---
  app.get("/api/exam/active", authenticateToken, (req: any, res) => {
    const db = getDB();
    const activeExams = db.exams.filter((e: any) => e.isActive);
    res.json(activeExams);
  });

  app.post("/api/exam/:id/start", authenticateToken, (req: any, res) => {
    const db = getDB();
    const examId = req.params.id;
    const studentId = req.user.id;

    let session = db.results.find((r: any) => r.examId === examId && r.studentId === studentId);
    if (!session) {
      session = {
        examId,
        studentId,
        answers: [],
        violationCount: 0,
        startTime: new Date().toISOString(),
        isFinished: false,
        remainingTime: 3600 // Example 1 hour
      };
      db.results.push(session);
      saveDB(db);
    }
    res.json(session);
  });

  app.post("/api/exam/:id/submit", authenticateToken, (req: any, res) => {
    const db = getDB();
    const examId = req.params.id;
    const studentId = req.user.id;
    const { answers, violationCount } = req.body;

    const sessionIndex = db.results.findIndex((r: any) => r.examId === examId && r.studentId === studentId);
    if (sessionIndex !== -1) {
      db.results[sessionIndex] = { ...db.results[sessionIndex], answers, violationCount, isFinished: true, endTime: new Date().toISOString() };
      saveDB(db);
    }
    res.json({ success: true });
  });

  // --- Collection CRUD Generic Fix ---
  app.get("/api/data/:collection/:id", authenticateToken, (req: any, res) => {
    const db = getDB();
    const item = (db[req.params.collection] || []).find((i: any) => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  });

  app.put("/api/data/:collection/:id", authenticateToken, (req: any, res) => {
    const db = getDB();
    const collection = req.params.collection;
    const id = req.params.id;
    if (!db[collection]) return res.status(404).json({ error: "Collection not found" });
    
    const index = db[collection].findIndex((i: any) => i.id === id);
    if (index === -1) return res.status(404).json({ error: "Item not found" });
    
    db[collection][index] = { ...db[collection][index], ...req.body };
    saveDB(db);
    res.json(db[collection][index]);
  });

  app.delete("/api/data/:collection/:id", authenticateToken, (req: any, res) => {
    const db = getDB();
    const collection = req.params.collection;
    const id = req.params.id;
    if (!db[collection]) return res.status(404).json({ error: "Collection not found" });
    
    db[collection] = db[collection].filter((i: any) => i.id !== id);
    saveDB(db);
    res.json({ message: "Deleted" });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
