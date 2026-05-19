/**
 * Who is allowed to enter the Kinora admin area.
 *
 * Until the dashboard's hr.employees table is mirrored into Kinora's
 * Supabase auth users (next step), we gate by a hardcoded staff email
 * allowlist plus anyone whose user_metadata.role is 'admin' or 'super_admin'.
 * The CEO email is always allowed.
 *
 * When the dashboard exposes a proper "is_staff(uid)" RPC we'll switch
 * to that and drop this file. For now this keeps the surface small and
 * portable — the only thing to migrate later is this one function.
 */

const STAFF_EMAIL_ALLOWLIST = new Set<string>([
  'valeriosarmati@gmail.com',
  // Add other staff emails here as needed
]);

const STAFF_DOMAIN_ALLOWLIST = new Set<string>([
  // Internal company domains, if/when you have one — e.g.
  // 'stroke-therapy-revolution.es'
]);

export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (STAFF_EMAIL_ALLOWLIST.has(lower)) return true;
  const domain = lower.split('@')[1];
  if (domain && STAFF_DOMAIN_ALLOWLIST.has(domain)) return true;
  return false;
}

export function isStaffMetadataRole(role: unknown): boolean {
  return role === 'admin' || role === 'super_admin';
}
