import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerFromAuthHeader, createSupabaseAdminClient } from '@/lib/supabase/server';
import { isStaffEmail, isStaffMetadataRole } from '../../_lib/staff-gate';
import { createClient } from '@supabase/supabase-js';

interface StaffRow {
  id: string;
  slug: string;
  full_name: string;
  title: string | null;
  role: string;
  email: string | null;
  country_code: string | null;
  markets: string[] | null;
  active: boolean;
  is_advisor: boolean;
  photo_path: string | null;
  visible_apps: string[] | null;
  auth_user_id: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const caller = await verifyCallerFromAuthHeader(
      request.headers.get('authorization')
    );
    const adminAuth = createSupabaseAdminClient();
    const { data: callerUser } = await adminAuth.auth.admin.getUserById(caller.uid);
    const role = (callerUser?.user?.user_metadata as Record<string, unknown> | null)?.role;
    if (!isStaffEmail(caller.email) && !isStaffMetadataRole(role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // hr.employees lives in the 'hr' schema — we need a dedicated client for it
    const hr = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false }, db: { schema: 'hr' } }
    );

    const { data, error } = await hr
      .from('employees')
      .select(
        'id, slug, full_name, title, role, email, country_code, markets, active, is_advisor, photo_path, visible_apps, auth_user_id'
      )
      .order('active', { ascending: false })
      .order('full_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ rows: data as StaffRow[] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
