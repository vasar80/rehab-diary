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

/**
 * Verify a `Authorization: Bearer <jwt>` header against Supabase Auth.
 * Returns the authenticated user's basic identity, or throws.
 */
export async function verifyCallerFromAuthHeader(
  authorizationHeader: string | null
): Promise<{ uid: string; email: string }> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  const token = authorizationHeader.substring('Bearer '.length);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Not authenticated');
  }
  return {
    uid: data.user.id,
    email: (data.user.email || '').toLowerCase().trim(),
  };
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
