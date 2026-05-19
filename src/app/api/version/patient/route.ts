import { NextResponse } from 'next/server';
import { PATIENT_VERSION, BUILD_TIME } from '@/lib/_generated/build-info';

// Must be no-store + nodejs runtime so a CDN edge never caches a
// stale version response.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      version: PATIENT_VERSION,
      side: 'patient',
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
