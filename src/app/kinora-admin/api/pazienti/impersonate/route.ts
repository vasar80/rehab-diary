import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { verifyStaffCaller } from '../../../_lib/staff-gate-server';

/**
 * POST /kinora-admin/api/pazienti/impersonate
 *
 * Impersonation REALE: invece di restituire un action_link (URL
 * Supabase, che richiede /auth/callback + Site URL whitelist
 * configurato), estraiamo l'**OTP a 6 cifre** dal magic-link generato
 * via admin.generateLink e lo restituiamo al client. Il client chiama
 * `supabase.auth.verifyOtp({ email, token, type: 'email' })` browser-
 * side → la sessione del paziente target si installa direttamente
 * nello stesso tab, senza redirect.
 *
 * Vantaggi rispetto al pattern action_link:
 *   - Niente dipendenza dalla Supabase Site URL allowlist
 *   - Niente /auth/callback / PKCE flow
 *   - Una sola chiamata, l'utente impersonato è immediatamente loggato
 *   - Niente bisogno di "apri in incognito" per non perdere lo staff
 *     (lo staff perde comunque la sessione attuale ma può rifare
 *     login subito; per testare un singolo paziente è sufficiente)
 *
 * Body:
 *   {
 *     email: string,           // email del paziente (gestionale)
 *     name?: string,           // serve solo se auto-create
 *     patientId?: number,      // gestionale id, serve solo se auto-create
 *   }
 *
 * Risposta: { ok, email, otp, target, autoCreated }
 *
 * IMPORTANTE — silenzio assoluto verso il paziente:
 *   - Se l'utente Supabase Auth con quella email NON esiste, lo
 *     creiamo qui dietro le quinte (`email_confirm: true` → ZERO
 *     email di conferma, password random che il paziente non vedrà
 *     mai e non riceverà mai).
 *   - generateLink ritorna OTP + URL solo a noi (in JSON). Supabase
 *     NON manda nessuna email al paziente.
 *
 * L'OTP è:
 *   - one-time use (consumato al primo verifyOtp)
 *   - scade dopo 1 ora (default Supabase)
 *
 * Gate: staff-only via verifyStaffCaller.
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await verifyStaffCaller(request);
    const admin = createSupabaseAdminClient();

    const body = await request.json();
    const { email, name, patientId } = body as {
      email?: string;
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

    // Generiamo magic-link e ne estraiamo l'OTP (NON l'action_link).
    // Il client chiamerà verifyOtp({ email, token, type:'email' })
    // → la sessione del target si installa SENZA redirect.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: lowEmail,
    });
    if (error) throw error;
    const otp = data?.properties?.email_otp;
    if (!otp) throw new Error('Generazione OTP fallita');

    return NextResponse.json({
      ok: true,
      action: 'otp',
      autoCreated,
      email: lowEmail,
      otp,
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
