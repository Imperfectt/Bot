import admin from "firebase-admin";

// 🔍 Логируем переменные для отладки
console.log("🔥 FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("📧 FIREBASE_CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
console.log("🔑 FIREBASE_PRIVATE_KEY starts with:", process.env.FIREBASE_PRIVATE_KEY?.slice(0, 30));

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") || ""
  })
});

export const db = admin.firestore();



