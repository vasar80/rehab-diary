import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyCallerIsSuperAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const { patientId, externalId } = await request.json();
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }
    await getAdminDb().collection('patients').doc(patientId).set(
      { externalId: externalId?.trim() || null },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
