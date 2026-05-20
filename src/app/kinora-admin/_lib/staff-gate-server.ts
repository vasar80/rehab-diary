/**
 * SERVER-ONLY staff gate. Imports `createSupabaseAdminClient` from
 * `@/lib/supabase/server`, which in turn imports `next/headers` — that
 * import is fatal in the client bundle. Never import this file from a
 * client component. The client-safe utilities live in `./staff-gate`.
 *
 * `verifyStaffCaller` centralises the two-step check (decode the JWT,
 * then confirm the caller is staff) and short-circuits the second call
 * when the email is already in the static allowlist — which matters
 * because the Supabase auth admin API has a tight rate limit (~30
 * req/h) and we were burning through it on every kinora-admin page
 * render.
 */
import type { NextRequest } from 'next/server';
import {
  verifyCallerFromAuthHeader,
  createSupabaseAdminClient,
} from '@/lib/supabase/server';
import { isStaffEmail, isStaffMetadataRole } from './staff-gate';

export interface StaffCaller {
  uid: string;
  email: string;
}

export async function verifyStaffCaller(request: NextRequest): Promise<StaffCaller> {
  const caller = await verifyCallerFromAuthHeader(
    request.headers.get('authorization')
  );

  // Fast path: the email is in our static allowlist → no need to call
  // the auth admin API a second time.
  if (isStaffEmail(caller.email)) return caller;

  // Fallback: check user_metadata.role. If the admin API is rate-limited
  // (429), we conservatively reject — the email allowlist is the
  // primary mechanism and the metadata path is meant for future staff
  // who aren't yet listed.
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(caller.uid);
    if (error) throw error;
    const role = (data?.user?.user_metadata as Record<string, unknown> | null)?.role;
    if (isStaffMetadataRole(role)) return caller;
  } catch (err) {
    console.warn(
      'verifyStaffCaller: metadata lookup failed:',
      err instanceof Error ? err.message : err
    );
  }
  throw new Error('Not authorized');
}
