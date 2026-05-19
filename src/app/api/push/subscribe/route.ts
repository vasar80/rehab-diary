import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyCallerFromAuthHeader } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { uid } = await verifyCallerFromAuthHeader(request.headers.get('authorization'));

    const body = await request.json();
    const { subscription } = body;
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'subscription is required' }, { status: 400 });
    }

    // Hash the endpoint to use as the doc id so re-subscribing is idempotent
    const docId = Buffer.from(subscription.endpoint).toString('base64url').slice(0, 80);

    await getAdminDb()
      .collection('pushSubscriptions')
      .doc(docId)
      .set({
        uid,
        endpoint: subscription.endpoint,
        keys: subscription.keys || null,
        userAgent: request.headers.get('user-agent') || null,
        createdAt: new Date().toISOString(),
      });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
