import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerIsSuperAdmin, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const { uid, password } = await request.json();
    if (!uid || !password) {
      return NextResponse.json({ error: 'uid and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(uid, { password });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
