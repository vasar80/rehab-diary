import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { sendPushToUser } from '@/lib/push-server';

// Vercel cron runs this at 15:00 UTC daily (≈ 17:00 Italy summer, 16:00 winter).
// We find patients who haven't compiled today's diary and push them a reminder.
export async function GET(request: NextRequest) {
  // Vercel sends a special header for cron jobs; in development allow without.
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];
  const db = getAdminDb();

  // All patients
  const patientsSnap = await db.collection('patients').get();
  const patients = patientsSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as Array<{ uid: string; name?: string; sex?: 'M' | 'F' }>;

  // Today's entries
  const entriesSnap = await db.collection('dailyEntries').where('date', '==', today).get();
  const compiledUids = new Set(entriesSnap.docs.map((d) => d.data().patientId as string));

  const targets = patients.filter((p) => !compiledUids.has(p.uid));

  let sent = 0;
  let failed = 0;
  for (const p of targets) {
    try {
      const res = await sendPushToUser(p.uid, {
        title: 'Kinora',
        body: 'Hai ancora qualche minuto per il diario di oggi?',
        url: '/?mode=diary',
        tag: 'diary-reminder',
      });
      sent += res.sent;
      failed += res.failed;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, total: targets.length, sent, failed });
}
