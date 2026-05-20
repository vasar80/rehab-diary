import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffCaller } from '../../_lib/staff-gate-server';
import { createClient } from '@supabase/supabase-js';

interface FeatureRow {
  slug: string;
  label: string;
  description: string | null;
  area: string;
  sort_order: number;
}

interface TierFeatureRow {
  tier: string;
  feature_slug: string;
  enabled: boolean;
}

function kinoraClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, db: { schema: 'kinora' } }
  );
}

export async function GET(request: NextRequest) {
  try {
    await verifyStaffCaller(request);
    const k = kinoraClient();

    const [{ data: features, error: fErr }, { data: matrix, error: mErr }] = await Promise.all([
      k.from('feature').select('*').order('sort_order'),
      k.from('tier_feature').select('*'),
    ]);
    if (fErr) throw fErr;
    if (mErr) throw mErr;

    return NextResponse.json({
      features: features as FeatureRow[],
      matrix: matrix as TierFeatureRow[],
      tiers: ['free', 'self', 'care'],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * Toggle a single (tier, feature) cell.
 * Body: { tier, feature_slug, enabled }
 */
export async function PATCH(request: NextRequest) {
  try {
    const caller = await verifyStaffCaller(request);
    const body = await request.json();
    const { tier, feature_slug, enabled } = body as {
      tier?: string;
      feature_slug?: string;
      enabled?: boolean;
    };
    if (!tier || !feature_slug || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'tier, feature_slug, enabled richiesti' },
        { status: 400 }
      );
    }
    if (!['free', 'self', 'care'].includes(tier)) {
      return NextResponse.json({ error: 'tier non valido' }, { status: 400 });
    }
    const k = kinoraClient();
    const { error } = await k
      .from('tier_feature')
      .upsert(
        { tier, feature_slug, enabled, updated_by: caller.uid },
        { onConflict: 'tier,feature_slug' }
      );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
