/**
 * Client-SAFE staff gate utilities. These can be imported from both
 * client components (AdminShell) and server route handlers without
 * pulling in any server-only modules.
 *
 * For the server-side verification (which calls the Supabase auth
 * admin API), see ./staff-gate-server.ts — DO NOT import that from a
 * client component.
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
