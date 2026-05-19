import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerFromAuthHeader, createSupabaseAdminClient } from '@/lib/supabase/server';
import { isStaffEmail, isStaffMetadataRole } from '../../../_lib/staff-gate';

/**
 * POST /kinora-admin/api/pazienti/login
 *
 * Crea o resetta l'account Supabase Auth per un paziente. Lo staff
 * sceglie email + nome (preso dal gestionale) + password temporanea
 * che poi comunica al paziente. Al primo login il paziente vede una
 * password temporanea — un step di "imponi reset" verrà aggiunto in
 * seguito quando il paziente avrà la sua app paziente vera.
 *
 * Body: { email, name, password, patientId? }
 *
 * Comportamenti:
 *  - se NON esiste un user con quella email in Supabase Auth → crea
 *    (email_confirm: true, role: 'patient' nel user_metadata)
 *  - se esiste → resetta la password e marca email come confermata
 */
export async function POST(request: NextRequest) {
  try {
    const caller = await verifyCallerFromAuthHeader(request.headers.get('authorization'));
    const admin = createSupabaseAdminClient();
    const { data: callerUser } = await admin.auth.admin.getUserById(caller.uid);
    const role = (callerUser?.user?.user_metadata as Record<string, unknown> | null)?.role;
    if (!isStaffEmail(caller.email) && !isStaffMetadataRole(role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, patientId } = body as {
      email?: string;
      name?: string;
      password?: string;
      patientId?: number;
    };

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email non valida' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'La password temporanea deve avere almeno 6 caratteri' },
        { status: 400 }
      );
    }
    const lowEmail = email.toLowerCase().trim();

    // Cerca un user esistente con quella email
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
    if (listErr) throw listErr;
    const existing = list.users.find((u) => (u.email || '').toLowerCase() === lowEmail);

    if (existing) {
      // Reset: aggiorna password, conferma email, marca come paziente
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata || {}),
          name: name || (existing.user_metadata as Record<string, unknown>)?.name,
          role: 'patient',
          patientId: patientId ?? (existing.user_metadata as Record<string, unknown>)?.patientId,
        },
      });
      if (updErr) throw updErr;
      return NextResponse.json({
        ok: true,
        action: 'reset',
        uid: existing.id,
        email: lowEmail,
      });
    }

    // Crea nuovo user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: lowEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || lowEmail.split('@')[0],
        role: 'patient',
        patientId: patientId ?? null,
      },
    });
    if (createErr) throw createErr;
    if (!created.user) throw new Error('Creazione utente fallita');

    return NextResponse.json({
      ok: true,
      action: 'created',
      uid: created.user.id,
      email: lowEmail,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
