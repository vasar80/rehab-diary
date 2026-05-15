import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDYKBtEIpOQXzjzLGnGYQFIiI2XqWsWHXU",
  authDomain: "rehab-diary-v1-db182.firebaseapp.com",
  projectId: "rehab-diary-v1-db182",
  storageBucket: "rehab-diary-v1-db182.firebasestorage.app",
  messagingSenderId: "1017617735311",
  appId: "1:1017617735311:web:2c457dd6edb01df54a9afa",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
