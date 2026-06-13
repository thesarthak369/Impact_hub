import { getApps, initializeApp, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID;

const isKeyValid = !!(
  privateKey &&
  privateKey.includes("-----BEGIN PRIVATE KEY-----") &&
  !privateKey.includes("...")
);

const app = getApps().length === 0 
  ? initializeApp(
      isKeyValid && clientEmail && projectId
        ? {
            credential: cert({
              projectId: projectId,
              clientEmail: clientEmail,
              privateKey: privateKey.replace(/\\n/g, "\n"),
            }),
          }
        : {
            projectId: projectId || "mock-project-id",
          }
    )
  : getApp();

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

export { adminDb, adminAuth, app as adminApp };

