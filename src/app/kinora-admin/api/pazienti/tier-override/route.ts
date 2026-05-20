import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStaffCaller } from '../../../_lib/staff-gate-server';

const VALID_TIERS = ['free', 'self', 'care', 'studio_nc', 'studio_tot'] as const;
type ValidTier = (typeof VALID_TIERS)[number];

function kinoraClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, db: { schema: 'kinora' } }
  );
}

/**
 * GET /kinora-admin/api/pazienti/tier-override
 *
 * Restituisce tutti gli override attivi. Usato dalla pagina pazienti
 * per arricchire le righe con il tier forzato.
 */
export async function GET(request: NextRequest) {
  try {
    await verifyStaffCaller(request);
    const k = kinoraClient();
    const { data, error } = await k.from('patient_tier_override').select('*');
    if (error) throw error;
    return NextResponse.json({ rows: data, count: data?.length ?? 0 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string } | null)?.message ?? 'Failed';
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT /kinora-admin/api/pazienti/tier-override
 *
 * Upsert dell'override. Body:
 *   {
 *     auth_uid: string,         // Supabase user id
 *     tier: 'free'|'self'|'care'|'studio_nc'|'studio_tot' | null,
 *     note?: string
 *   }
 *
 * Se tier === null → cancella l'override (il paziente torna al tier
 * derivato dal business_status).
 */
export async function PUT(request: NextRequest) {
  try {
    const caller = await verifyStaffCaller(request);
    const body = await request.json();
    const { auth_uid, tier, note } = body as {
      auth_uid?: string;
      tier?: ValidTier | null;
      note?: string | null;
    };

    if (!auth_uid || typeof auth_uid !== 'string') {
      return NextResponse.json(
        { error: 'auth_uid richiesto' },
        { status: 400 }
      );
    }

    const k = kinoraClient();

    if (tier === null) {
      // Cancella l'override
      const { error } = await k
        .from('patient_tier_override')
        .delete()
        .eq('auth_uid', auth_uid);
      if (error) throw error;
      return NextResponse.json({ ok: true, action: 'cleared' });
    }

    if (!tier || !VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'tier non valido' }, { status: 400 });
    }

    const { error } = await k.from('patient_tier_override').upsert(
      {
        auth_uid,
        tier,
        note: note ?? null,
        updated_at: new Date().toISOString(),
        updated_by: caller.uid,
      },
      { onConflict: 'auth_uid' }
    );
    if (error) throw error;
    return NextResponse.json({ ok: true, action: 'set', tier });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string } | null)?.message ?? 'Failed';
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
