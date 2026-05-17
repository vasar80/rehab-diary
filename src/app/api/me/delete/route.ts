import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// GDPR art. 17: right to erasure ("right to be forgotten").
// Deletes all Firestore data tied to the caller and disables the Firebase Auth user.
// The Auth record itself is preserved for ~30 days so audit logs survive an accidental
// re-registration with the same email; a scheduled job purges it after the retention window.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }
    const token = authHeader.substring('Bearer '.length);
    const decoded = await getAdminAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const { confirm } = await request.json().catch(() => ({}));
    if (confirm !== 'ELIMINA') {
      return NextResponse.json(
        { error: 'Conferma mancante. Inviare { confirm: "ELIMINA" } per procedere.' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    async function deleteWhere(collection: string, field: string) {
      const snap = await db.collection(collection).where(field, '==', uid).get();
      const batches: FirebaseFirestore.WriteBatch[] = [];
      let batch = db.batch();
      let count = 0;
      snap.docs.forEach((d) => {
        batch.delete(d.ref);
        count++;
        if (count >= 400) {
          batches.push(batch);
          batch = db.batch();
          count = 0;
        }
      });
      if (count > 0) batches.push(batch);
      await Promise.all(batches.map((b) => b.commit()));
      return snap.size;
    }

    const [contractDel, entriesDel, videosDel, subsDel] = await Promise.all([
      deleteWhere('contractItems', 'patientId'),
      deleteWhere('dailyEntries', 'patientId'),
      deleteWhere('videos', 'patientId'),
      deleteWhere('pushSubscriptions', 'uid'),
    ]);

    const [patientSnap, therapistSnap] = await Promise.all([
      db.collection('patients').doc(uid).get(),
      db.collection('therapists').doc(uid).get(),
    ]);
    if (patientSnap.exists) await db.collection('patients').doc(uid).delete();
    if (therapistSnap.exists) await db.collection('therapists').doc(uid).delete();

    // Disable rather than fully delete the Auth account so the user can never accidentally
    // sign back in to "their" account before the retention window expires.
    try {
      await getAdminAuth().updateUser(uid, { disabled: true });
    } catch {}

    return NextResponse.json({
      ok: true,
      deleted: {
        contractItems: contractDel,
        dailyEntries: entriesDel,
        videos: videosDel,
        pushSubscriptions: subsDel,
        patientDoc: patientSnap.exists ? 1 : 0,
        therapistDoc: therapistSnap.exists ? 1 : 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
