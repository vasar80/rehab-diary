import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerFromAuthHeader, createSupabaseAdminClient } from '@/lib/supabase/server';
import { isStaffEmail, isStaffMetadataRole } from '../../_lib/staff-gate';
import { createClient } from '@supabase/supabase-js';

interface AccessRow {
  id: string;
  slug: string;
  full_name: string;
  role: string;
  country_code: string | null;
  active: boolean;
  visible_apps: string[] | null;
}

function hrClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, db: { schema: 'hr' } }
  );
}

async function checkStaff(request: NextRequest) {
  const caller = await verifyCallerFromAuthHeader(request.headers.get('authorization'));
  const adminAuth = createSupabaseAdminClient();
  const { data: callerUser } = await adminAuth.auth.admin.getUserById(caller.uid);
  const role = (callerUser?.user?.user_metadata as Record<string, unknown> | null)?.role;
  if (!isStaffEmail(caller.email) && !isStaffMetadataRole(role)) {
    throw new Error('Not authorized');
  }
  return caller;
}

export async function GET(request: NextRequest) {
  try {
    await checkStaff(request);
    const hr = hrClient();
    const { data, error } = await hr
      .from('employees')
      .select('id, slug, full_name, role, country_code, active, visible_apps')
      .order('active', { ascending: false })
      .order('full_name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ rows: data as AccessRow[] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Toggle a Kinora module for a specific employee.
 * Body: { employeeId: string, appId: string, grant: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    await checkStaff(request);
    const body = await request.json();
    const { employeeId, appId, grant } = body as {
      employeeId: string;
      appId: string;
      grant: boolean;
    };
    if (!employeeId || !appId || typeof grant !== 'boolean') {
      return NextResponse.json(
        { error: 'employeeId, appId, grant richiesti' },
        { status: 400 }
      );
    }
    if (!appId.startsWith('kinora-')) {
      return NextResponse.json(
        { error: 'Solo gli app id "kinora-*" possono essere modificati da qui' },
        { status: 400 }
      );
    }
    const hr = hrClient();
    const { data: emp, error: getErr } = await hr
      .from('employees')
      .select('visible_apps')
      .eq('id', employeeId)
      .single();
    if (getErr) throw getErr;
    const current: string[] = emp?.visible_apps ?? [];
    let next: string[];
    if (grant) {
      next = current.includes(appId) ? current : [...current, appId];
    } else {
      next = current.filter((a) => a !== appId);
    }
    const { error: updErr } = await hr
      .from('employees')
      .update({ visible_apps: next })
      .eq('id', employeeId);
    if (updErr) throw updErr;
    return NextResponse.json({ ok: true, visible_apps: next });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
