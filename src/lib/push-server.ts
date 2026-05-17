import webpush from 'web-push';
import { getAdminDb } from './firebase-admin';

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('VAPID keys not configured');
  webpush.setVapidDetails(
    'mailto:info@stroke-therapy-revolution.es',
    publicKey,
    privateKey
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(uid: string, payload: PushPayload): Promise<{ sent: number; failed: number; gone: number }> {
  configure();
  const db = getAdminDb();
  const snap = await db.collection('pushSubscriptions').where('uid', '==', uid).get();
  return await sendToSubs(db, snap, payload);
}

export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; failed: number; gone: number }> {
  configure();
  const db = getAdminDb();
  const snap = await db.collection('pushSubscriptions').get();
  return await sendToSubs(db, snap, payload);
}

async function sendToSubs(
  db: ReturnType<typeof getAdminDb>,
  snap: FirebaseFirestore.QuerySnapshot,
  payload: PushPayload
): Promise<{ sent: number; failed: number; gone: number }> {
  let sent = 0;
  let failed = 0;
  let gone = 0;
  const dataString = JSON.stringify(payload);

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const sub = { endpoint: data.endpoint, keys: data.keys };
    try {
      await webpush.sendNotification(sub as webpush.PushSubscription, dataString);
      sent += 1;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await db.collection('pushSubscriptions').doc(docSnap.id).delete().catch(() => {});
        gone += 1;
      } else {
        failed += 1;
      }
    }
  }
  return { sent, failed, gone };
}
