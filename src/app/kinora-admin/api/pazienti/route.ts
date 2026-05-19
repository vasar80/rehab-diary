import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerFromAuthHeader, createSupabaseAdminClient } from '@/lib/supabase/server';
import { isStaffEmail, isStaffMetadataRole } from '../../_lib/staff-gate';

interface PatientRow {
  uid: string;
  email: string | null;
  name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Caller must be authenticated AND staff
    const caller = await verifyCallerFromAuthHeader(
      request.headers.get('authorization')
    );
    // Re-fetch the full user so we can check user_metadata.role too
    const admin = createSupabaseAdminClient();
    const { data: callerUser, error: callerErr } = await admin.auth.admin.getUserById(caller.uid);
    if (callerErr || !callerUser.user) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    const role = (callerUser.user.user_metadata as Record<string, unknown> | null)?.role;
    if (!isStaffEmail(caller.email) && !isStaffMetadataRole(role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // 2. List users from Supabase Auth, paginated
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, parseInt(url.searchParams.get('perPage') || '50', 10));
    const search = (url.searchParams.get('q') || '').trim().toLowerCase();

    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    let rows: PatientRow[] = data.users.map((u) => ({
      uid: u.id,
      email: u.email ?? null,
      name:
        (typeof u.user_metadata?.name === 'string' && u.user_metadata.name) ||
        null,
      role:
        (typeof u.user_metadata?.role === 'string' && u.user_metadata.role) ||
        null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      banned_until: ((u as unknown) as { banned_until?: string | null }).banned_until ?? null,
    }));

    // 3. Optional client-side filtering (the auth.admin API doesn't support
    // server-side search, so we filter the current page).
    if (search) {
      rows = rows.filter(
        (r) =>
          (r.email || '').toLowerCase().includes(search) ||
          (r.name || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ rows, page, perPage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
