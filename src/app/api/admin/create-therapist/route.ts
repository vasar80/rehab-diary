import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, verifyCallerIsSuperAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const { email, name, password, sex, specialty } = await request.json();

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'email, name, password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });

    await db.collection('therapists').doc(userRecord.uid).set({
      name,
      email,
      sex: sex || null,
      specialty: specialty || null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ uid: userRecord.uid, email, name });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Create failed';
    const status = message.includes('authoriz') ? 403 :
      message.includes('email-already-exists') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
