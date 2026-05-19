import { NextRequest, NextResponse } from 'next/server';
import { verifyCallerIsSuperAdmin } from '@/lib/supabase/server';
import { sendPushToUser, sendPushToAll } from '@/lib/push-server';

export async function POST(request: NextRequest) {
  try {
    await verifyCallerIsSuperAdmin(request.headers.get('authorization'));
    const { uid, title, body, url, tag } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    const payload = { title, body, url: url || '/', tag: tag || 'admin' };
    const result = uid && uid !== 'all'
      ? await sendPushToUser(uid, payload)
      : await sendPushToAll(payload);

    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    const status = message.includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
