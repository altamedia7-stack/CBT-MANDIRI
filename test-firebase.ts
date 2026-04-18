import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from 'module';
import { applicationDefault } from 'firebase-admin/app';
const require = createRequire(import.meta.url);
const firebaseConfig = require("./firebase-applet-config.json");

async function test() {
  try {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      console.log("Using provided FIREBASE_SERVICE_ACCOUNT from ENV");
      const sa = JSON.parse(serviceAccountEnv);
      if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: firebaseConfig.projectId
      });
    } else {
      console.log("Using explicit Application Default Credentials");
      admin.initializeApp({
        credential: applicationDefault(),
        projectId: firebaseConfig.projectId
      });
    }
    const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
    
    // Test write
    console.log("Testing connection...");
    const snapshot = await db.collection("users").limit(1).get();
    console.log("Success! Found", snapshot.size, "records");
  } catch (e: any) {
    console.error("Test Error:", e);
  }
}
test();
