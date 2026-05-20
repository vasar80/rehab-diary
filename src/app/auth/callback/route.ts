import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /auth/callback?code=<pkce>&next=<path>
 *
 * Endpoint server-side che il magic-link di Supabase chiama per
 * completare l'autenticazione (PKCE flow). Senza questa route, l'URL
 * `?code=...` del magic-link non viene MAI scambiato per una sessione
 * → il paziente impersonato vedeva la pagina di login invece di entrare.
 *
 * Flusso:
 *   1. Lo staff genera magic link via /kinora-admin/api/pazienti/impersonate
 *      con `redirectTo: <origin>/auth/callback?next=/`
 *   2. Il paziente (o lo staff in incognito) clicca il link
 *   3. Supabase verifica il token e redirect a /auth/callback?code=<pkce>
 *   4. Questa route fa `exchangeCodeForSession(code)` — imposta i cookie
 *      di sessione lato server
 *   5. Redirect a `next` (default `/`)
 *
 * Se il code è mancante o lo scambio fallisce → redirect a /login con
 * `?error=auth_callback` così la UI può mostrare un messaggio chiaro.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') || '/';
  // Evita open-redirect: accetta solo path interni
  const next = rawNext.startsWith('/') ? rawNext : '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('auth/callback exchange error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_exchange`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error('auth/callback exception:', err);
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }
}
