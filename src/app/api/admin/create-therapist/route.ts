import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyCallerIsSuperAdmin, createSupabaseAdminClient } from '@/lib/supabase/server';

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

    const supaAdmin = createSupabaseAdminClient();
    const db = getAdminDb();

    const { data, error } = await supaAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // therapists are provisioned manually, no confirmation flow needed
      user_metadata: { name, role: 'admin', sex: sex || undefined },
    });
    if (error) throw error;
    if (!data.user) throw new Error('User not created');

    const uid = data.user.id;

    await db.collection('therapists').doc(uid).set({
      name,
      email,
      sex: sex || null,
      specialty: specialty || null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ uid, email, name });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Create failed';
    const lower = message.toLowerCase();
    const status = lower.includes('authoriz')
      ? 403
      : lower.includes('already') || lower.includes('exists')
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
