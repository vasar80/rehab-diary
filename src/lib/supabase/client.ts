'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// One Supabase client per browser tab — keeps auth state consistent across
// the whole React tree and across navigations.
let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return _client;
}

/**
 * Returns the current Supabase access token, to be sent as
 * `Authorization: Bearer <token>` to server route handlers.
 *
 * Throws if the user is not authenticated — call sites are expected to be
 * gated behind the auth context.
 */
export async function getAccessToken(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Non autenticato');
  return token;
}
