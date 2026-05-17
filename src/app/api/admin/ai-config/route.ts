import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyCallerIsSuperAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const snap = await getAdminDb().collection('settings').doc('ai').get();
    const data = snap.exists ? snap.data() || {} : {};
    return NextResponse.json({
      basePrompt: data.basePrompt || data.personality || '',
      personality: data.personality || '',
      knowledge: data.knowledge || '',
      updatedAt: data.updatedAt || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const { basePrompt, personality, knowledge } = await request.json();
    const payload: Record<string, string | null> = {
      updatedAt: new Date().toISOString(),
    };
    if (basePrompt !== undefined) payload.basePrompt = (basePrompt || '').trim() || null;
    if (personality !== undefined) payload.personality = (personality || '').trim() || null;
    if (knowledge !== undefined) payload.knowledge = (knowledge || '').trim() || null;
    await getAdminDb().collection('settings').doc('ai').set(payload, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
