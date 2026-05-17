import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyCallerIsSuperAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const snap = await getAdminDb().collection('settings').doc('ai').get();
    const data = snap.exists ? snap.data() : null;
    return NextResponse.json({
      personality: data?.personality || '',
      knowledge: data?.knowledge || '',
      updatedAt: data?.updatedAt || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const { personality, knowledge } = await request.json();
    await getAdminDb().collection('settings').doc('ai').set(
      {
        personality: personality || '',
        knowledge: knowledge || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
