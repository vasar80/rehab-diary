import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyCallerFromAuthHeader } from '@/lib/supabase/server';

// GDPR art. 15 + art. 20: right of access + right to data portability.
// Returns every piece of personal data we hold about the caller as JSON.
export async function GET(request: NextRequest) {
  try {
    const { uid, email } = await verifyCallerFromAuthHeader(
      request.headers.get('authorization')
    );

    const db = getAdminDb();

    const [patientSnap, therapistSnap, contractSnap, entriesSnap, videosSnap, subsSnap] = await Promise.all([
      db.collection('patients').doc(uid).get(),
      db.collection('therapists').doc(uid).get(),
      db.collection('contractItems').where('patientId', '==', uid).get(),
      db.collection('dailyEntries').where('patientId', '==', uid).get(),
      db.collection('videos').where('patientId', '==', uid).get(),
      db.collection('pushSubscriptions').where('uid', '==', uid).get(),
    ]);

    const account = patientSnap.exists
      ? { id: patientSnap.id, kind: 'patient', ...patientSnap.data() }
      : therapistSnap.exists
        ? { id: therapistSnap.id, kind: 'therapist', ...therapistSnap.data() }
        : { id: uid, kind: 'unknown', email };

    const payload = {
      exportedAt: new Date().toISOString(),
      account,
      authEmail: email,
      contractItems: contractSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      dailyEntries: entriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      videos: videosSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          date: data.date,
          duration: data.duration ?? null,
          notes: data.notes ?? null,
          uploadedAt: data.uploadedAt,
          googleDriveUrl: data.googleDriveUrl ?? null,
        };
      }),
      pushSubscriptions: subsSnap.docs.map((d) => ({
        id: d.id,
        endpoint: d.data().endpoint,
        userAgent: d.data().userAgent ?? null,
        createdAt: d.data().createdAt,
      })),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="kinora-export-${uid}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
