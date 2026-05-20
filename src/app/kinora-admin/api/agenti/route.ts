import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffCaller } from '../../_lib/staff-gate-server';
import { createClient } from '@supabase/supabase-js';

interface AgentRow {
  tier: string;
  display_name: string;
  system_prompt: string;
  model: string;
  knowledge_base: string | null;
  notes: string | null;
  updated_at: string;
}

const VALID_TIERS = ['free', 'self', 'care', 'studio_nc', 'studio_tot'];

function kinoraClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, db: { schema: 'kinora' } }
  );
}

/**
 * GET /kinora-admin/api/agenti
 *
 * Lista tutti gli agenti (uno per tier) con system prompt, model e notes.
 * Letti da /kinora-admin/agenti per editing.
 */
export async function GET(request: NextRequest) {
  try {
    await verifyStaffCaller(request);
    const k = kinoraClient();
    const { data, error } = await k
      .from('agent')
      .select('*')
      .order('tier');
    if (error) throw error;
    return NextResponse.json({
      rows: data as AgentRow[],
      tiers: VALID_TIERS,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string } | null)?.message ?? 'Failed';
    console.error('Agenti GET error:', message);
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PATCH /kinora-admin/api/agenti
 *
 * Aggiorna 1+ campi di un agente. Body:
 *   {
 *     tier: string,
 *     display_name?: string,
 *     system_prompt?: string,
 *     model?: string,
 *     knowledge_base?: string,
 *     notes?: string
 *   }
 */
export async function PATCH(request: NextRequest) {
  try {
    const caller = await verifyStaffCaller(request);
    const body = await request.json();
    const {
      tier,
      display_name,
      system_prompt,
      model,
      knowledge_base,
      notes,
    } = body as {
      tier?: string;
      display_name?: string;
      system_prompt?: string;
      model?: string;
      knowledge_base?: string | null;
      notes?: string | null;
    };

    if (!tier || !VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: 'tier non valido' },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: caller.uid,
    };
    if (typeof display_name === 'string') update.display_name = display_name;
    if (typeof system_prompt === 'string') update.system_prompt = system_prompt;
    if (typeof model === 'string') update.model = model;
    if (knowledge_base !== undefined) update.knowledge_base = knowledge_base;
    if (notes !== undefined) update.notes = notes;

    if (Object.keys(update).length === 2) {
      // Solo updated_at + updated_by — nessun campo da aggiornare
      return NextResponse.json(
        { error: 'Nessun campo da aggiornare' },
        { status: 400 }
      );
    }

    const k = kinoraClient();
    const { error } = await k.from('agent').update(update).eq('tier', tier);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string } | null)?.message ?? 'Failed';
    console.error('Agenti PATCH error:', message);
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
