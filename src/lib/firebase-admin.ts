import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: App | null = null;

export function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }
  const keyJson = process.env.FIREBASE_ADMIN_KEY;
  if (!keyJson) throw new Error('FIREBASE_ADMIN_KEY env var not set');
  const credentials = JSON.parse(keyJson);
  app = initializeApp({ credential: cert(credentials) });
  return app;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export async function verifyCallerIsSuperAdmin(authorizationHeader: string | null): Promise<{ uid: string; email: string }> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  const token = authorizationHeader.substring('Bearer '.length);
  const decoded = await getAdminAuth().verifyIdToken(token);
  const email = (decoded.email || '').toLowerCase().trim();
  if (email !== 'valeriosarmati@gmail.com') {
    throw new Error('Not authorized');
  }
  return { uid: decoded.uid, email };
}
