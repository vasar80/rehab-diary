import { NextResponse } from 'next/server';
import { ADMIN_VERSION, BUILD_TIME } from '@/lib/_generated/build-info';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      version: ADMIN_VERSION,
      side: 'admin',
      buildTime: BUILD_TIME,
      ts: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    }
  );
}
