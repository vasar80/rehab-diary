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
 * Body:
 *   {
 *     email: string,           // email del paziente (gestionale)
 *     redirectTo?: string,     // path interno, default '/'
 *     name?: string,           // serve solo se auto-create
 *     patientId?: number,      // gestionale id, serve solo se auto-create
 *   }
 *
 * IMPORTANTE — silenzio assoluto verso il paziente:
 *   - Se l'utente Supabase Auth con quella email NON esiste, lo
 *     creiamo qui dietro le quinte (`email_confirm: true` → ZERO
 *     email di conferma, password random che il paziente non vedrà
 *     mai e non riceverà mai).
 *   - generateLink restituisce l'URL solo a noi (in JSON). Supabase
 *     NON manda l'email del magic link a meno che il flag `email`
 *     non sia esplicitamente disabilitato — ma in questa fase pre-
 *     lancio dobbiamo essere SICURI che non parta nulla. Usiamo per
 *     questo `auth.admin.generateLink` (server) e non il client
 *     `signInWithOtp`, che invece manda l'email automaticamente.
 *
 * Il link è:
 *   - one-time use (consumato al primo accesso)
 *   - scade dopo 1 ora (default Supabase)
 *   - firmato col project key, non riproducibile esternamente
 *
 * Sessione staff: aprire il link in una finestra in incognito —
 * la sessione paziente sovrascrive i cookie nella stessa origine.
 *
 * Gate: staff-only via verifyStaffCaller.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await verifyStaffCaller(request);
    const admin = createSupabaseAdminClient();

    const body = await request.json();
    const { email, redirectTo, name, patientId } = body as {
      email?: string;
      redirectTo?: string;
      name?: string;
      patientId?: number;
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

    // Cerca un utente esistente
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 200,
    });
    if (listErr) throw listErr;
    let target = list.users.find(
      (u) => (u.email || '').toLowerCase() === lowEmail
    );

    // Auto-provision SILENZIOSO: se l'utente non esiste, lo creiamo qui
    // senza inviare email. La password è generata a caso e non viene mai
    // esposta — il paziente accederà solo via magic link che restiamo a
    // mandare noi quando lo decidiamo. Questo è il caso "pre-lancio":
    // lo staff vuole testare l'esperienza del paziente senza coinvolgerlo.
    let autoCreated = false;
    if (!target) {
      // Password random non riusabile dal paziente — solo per soddisfare
      // il requisito Supabase che richiede un valore al createUser.
      const randomPassword =
        'tmp-' +
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2) +
        '!';
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: lowEmail,
          password: randomPassword,
          email_confirm: true, // niente email di conferma
          user_metadata: {
            name: name || lowEmail.split('@')[0],
            role: 'patient',
            patientId: patientId ?? null,
            // Marker: questo utente è stato creato dall'admin a scopo di
            // testing/impersonation pre-lancio. Se in futuro vorremo
            // distinguere "provisioning vero" da "auto-impersonate"
            // possiamo guardare questo campo.
            provisioned_via: 'impersonate-autocreate',
            provisioned_at: new Date().toISOString(),
          },
        });
      if (createErr) throw createErr;
      if (!created.user) throw new Error('Auto-creazione utente fallita');
      target = created.user;
      autoCreated = true;
    }

    const targetRole = (target.user_metadata as Record<string, unknown> | null)
      ?.role;
    if (targetRole === 'admin' || targetRole === 'super_admin') {
      return NextResponse.json(
        { error: 'Non puoi impersonare un account staff' },
        { status: 403 }
      );
    }

    // Il magic-link di Supabase usa PKCE flow → punta SEMPRE al nostro
    // callback `/auth/callback` che fa exchangeCodeForSession e poi
    // redirige all'app vera. `next` è il path interno finale.
    const origin = new URL(request.url).origin;
    const safeNext =
      redirectTo && redirectTo.startsWith('/') ? redirectTo : '/';
    const finalRedirect = `${origin}/auth/callback?next=${encodeURIComponent(
      safeNext
    )}`;

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
      autoCreated,
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
