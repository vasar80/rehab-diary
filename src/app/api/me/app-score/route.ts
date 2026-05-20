import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCallerFromAuthHeader } from '@/lib/supabase/server';
import { findModule } from '@/core/registry/registry';

/**
 * POST /api/me/app-score
 *
 * Endpoint che gli applicativi (Walking, Neglect-Go, futuri) chiamano
 * a fine sessione / al raggiungimento di un record per registrare un
 * evento di punteggio. Il payload è intenzionalmente piccolo — un
 * evento, un valore numerico, un eventuale metadata blob.
 *
 * Body:
 *   {
 *     app_slug: string;       // es. 'walking', 'neglect-go'
 *     metric: string;         // es. 'completion_ms', 'level', 'targets_found'
 *     value: number;
 *     metadata?: Record<string, unknown>;
 *   }
 *
 * Behavior:
 *   - patient_auth_uid viene dal JWT (auth context)
 *   - cognitive_domains vengono letti dal manifest del modulo al
 *     momento dell'INSERT — il client non deve mandarli (single
 *     source of truth)
 *
 * GET /api/me/app-score?app_slug=...
 *   Lista degli ultimi N score del paziente per quell'app (read-only,
 *   utile per mostrare "i tuoi record" / grafici nel dettaglio app).
 */

function kinoraClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, db: { schema: 'kinora' } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyCallerFromAuthHeader(
      request.headers.get('authorization')
    );

    const body = await request.json();
    const { app_slug, metric, value, metadata } = body as {
      app_slug?: string;
      metric?: string;
      value?: number;
      metadata?: Record<string, unknown>;
    };

    if (!app_slug || typeof app_slug !== 'string') {
      return NextResponse.json({ error: 'app_slug richiesto' }, { status: 400 });
    }
    if (!metric || typeof metric !== 'string') {
      return NextResponse.json({ error: 'metric richiesto' }, { status: 400 });
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return NextResponse.json(
        { error: 'value deve essere numero finito' },
        { status: 400 }
      );
    }

    // Validate against registry — protegge da slug inventati e popola
    // cognitive_domains automaticamente dal manifest.
    const mod = findModule(app_slug);
    if (!mod) {
      return NextResponse.json(
        { error: `app_slug "${app_slug}" non riconosciuto` },
        { status: 400 }
      );
    }
    const domains = mod.cognitive_domains ?? [];

    const k = kinoraClient();
    const { data, error } = await k
      .from('app_score')
      .insert({
        patient_auth_uid: auth.uid,
        app_slug,
        metric,
        value,
        cognitive_domains: domains,
        metadata: metadata ?? null,
      })
      .select('id, recorded_at')
      .single();
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      id: data.id,
      recorded_at: data.recorded_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    console.error('/api/me/app-score POST error:', message);
    const status =
      message.toLowerCase().includes('authoriz') ||
      message.toLowerCase().includes('authenticat')
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCallerFromAuthHeader(
      request.headers.get('authorization')
    );

    const url = new URL(request.url);
    const appSlug = url.searchParams.get('app_slug') || undefined;
    const limit = Math.min(
      200,
      Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10))
    );

    const k = kinoraClient();
    let q = k
      .from('app_score')
      .select('id, app_slug, metric, value, cognitive_domains, recorded_at, metadata')
      .eq('patient_auth_uid', auth.uid)
      .order('recorded_at', { ascending: false })
      .limit(limit);
    if (appSlug) q = q.eq('app_slug', appSlug);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ rows: data, count: data?.length ?? 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    console.error('/api/me/app-score GET error:', message);
    const status =
      message.toLowerCase().includes('authoriz') ||
      message.toLowerCase().includes('authenticat')
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
