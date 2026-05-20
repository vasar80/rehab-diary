import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Supabase client for server components and route handlers.
 * Reads/writes the Supabase auth cookies so RLS and `auth.uid()` work correctly.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called in Server Components (where setting cookies is
            // disallowed) and that's fine — middleware will refresh the session.
          }
        },
      },
    }
  );
}

/**
 * Admin client with the service_role key. NEVER expose this to the browser.
 * Use only inside server-only files (route handlers, server actions).
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

const SUPER_ADMIN_EMAIL = 'valeriosarmati@gmail.com';

// Module-level token cache to avoid calling auth.getUser() on every
// request. The auth admin API has a strict rate limit (~30 req/h) and
// each kinora-admin page triggers multiple API calls. Cache the
// verified identity for 60 seconds per (token-prefix). On rate-limit
// (429) we fall back to the previous valid result if available.
type CallerIdentity = { uid: string; email: string };
const tokenCache = new Map<string, { identity: CallerIdentity; expires: number }>();
const TOKEN_CACHE_TTL_MS = 60 * 1000;

function tokenKey(token: string): string {
  // First and last 12 chars is enough to dedupe without storing the
  // whole JWT in memory. JWTs have signed integrity so different
  // tokens won't collide on these slices.
  return token.length < 24 ? token : token.slice(0, 12) + '..' + token.slice(-12);
}

/**
 * Verify a `Authorization: Bearer <jwt>` header against Supabase Auth.
 * Returns the authenticated user's basic identity, or throws.
 *
 * Caches the verified identity per token for 60s so the same browser
 * tab hitting multiple admin endpoints in a row doesn't burn the
 * auth admin rate limit on every navigation.
 */
export async function verifyCallerFromAuthHeader(
  authorizationHeader: string | null
): Promise<CallerIdentity> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  const token = authorizationHeader.substring('Bearer '.length);
  const key = tokenKey(token);

  const cached = tokenCache.get(key);
  const now = Date.now();
  if (cached && cached.expires > now) {
    return cached.identity;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      // Rate limit on this verify call → reuse the stale cached identity
      // if we have one (the JWT didn't suddenly become invalid in 60s).
      if (cached) return cached.identity;
      throw new Error('Not authenticated');
    }
    const identity: CallerIdentity = {
      uid: data.user.id,
      email: (data.user.email || '').toLowerCase().trim(),
    };
    tokenCache.set(key, { identity, expires: now + TOKEN_CACHE_TTL_MS });
    return identity;
  } catch (err) {
    if (cached) return cached.identity;
    throw err;
  }
}

/**
 * Same as `verifyCallerFromAuthHeader`, but additionally rejects anyone who
 * isn't the super-admin.
 */
export async function verifyCallerIsSuperAdmin(
  authorizationHeader: string | null
): Promise<{ uid: string; email: string }> {
  const caller = await verifyCallerFromAuthHeader(authorizationHeader);
  if (caller.email !== SUPER_ADMIN_EMAIL) {
    throw new Error('Not authorized');
  }
  return caller;
}
