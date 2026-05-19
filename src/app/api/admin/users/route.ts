import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyCallerIsSuperAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const db = getAdminDb();

    const [patientsSnap, therapistsSnap] = await Promise.all([
      db.collection('patients').get(),
      db.collection('therapists').get(),
    ]);

    const patients = patientsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const therapists = therapistsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ patients, therapists });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
