import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { verifyStaffCaller } from '../../../_lib/staff-gate-server';

/**
 * POST /kinora-admin/api/pazienti/impersonate
 *
 * Genera un magic link per accedere al posto di un paziente.
 * Usato dallo staff per testare l'esperienza utente "come se fosse"
 * il paziente specifico — vede gli appuntamenti veri, le features
 * della tier giusta, ecc.
 *
 * Body: { email: string, redirectTo?: string }
 *
 * Risposta: { url, action: 'magiclink' }
 *
 * IMPORTANTE: aprire il link in una finestra in incognito, altrimenti
 * la sessione dello staff viene sovrascritta. Non c'è modo di evitare
 * questo lato server — Supabase memorizza la sessione nei cookie del
 * dominio e una sola sessione alla volta. La UI lo deve spiegare.
 *
 * Il link è:
 *   - one-time use (consumato al primo accesso)
 *   - scade dopo 1 ora (default Supabase)
 *   - firmato col project key, non riproducibile esternamente
 *
 * Gate: staff-only via verifyStaffCaller (email-allowlist o
 * user_metadata.role = admin/super_admin).
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await verifyStaffCaller(request);
    const admin = createSupabaseAdminClient();

    const body = await request.json();
    const { email, redirectTo } = body as {
      email?: string;
      redirectTo?: string;
    };

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }
    const lowEmail = email.toLowerCase().trim();

    // Refuse to impersonate yourself — protects against weird states
    if (lowEmail === caller.email) {
      return NextResponse.json(
        { error: 'Non puoi impersonare te stesso' },
        { status: 400 }
      );
    }

    // Verify the target user exists and is a patient (not another staff)
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 200,
    });
    if (listErr) throw listErr;
    const target = list.users.find(
      (u) => (u.email || '').toLowerCase() === lowEmail
    );
    if (!target) {
      return NextResponse.json(
        { error: 'Nessun utente con questa email — crea prima il login' },
        { status: 404 }
      );
    }
    const targetRole = (target.user_metadata as Record<string, unknown> | null)
      ?.role;
    if (targetRole === 'admin' || targetRole === 'super_admin') {
      return NextResponse.json(
        { error: 'Non puoi impersonare un account staff' },
        { status: 403 }
      );
    }

    // Determine redirect URL — use origin of the request so dev/preview/prod
    // all work without configuration.
    const origin = new URL(request.url).origin;
    const finalRedirect =
      redirectTo && redirectTo.startsWith('/') ? `${origin}${redirectTo}` : origin;

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: lowEmail,
      options: { redirectTo: finalRedirect },
    });
    if (error) throw error;
    const url = data?.properties?.action_link;
    if (!url) throw new Error('Generazione magic link fallita');

    return NextResponse.json({
      ok: true,
      action: 'magiclink',
      url,
      target: {
        uid: target.id,
        email: lowEmail,
        name:
          (target.user_metadata as Record<string, unknown> | null)?.name ??
          lowEmail.split('@')[0],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    console.error('Impersonate API error:', message);
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
