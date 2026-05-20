import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffCaller } from '../../../../_lib/staff-gate-server';
import { fetchAppointmentsForPatient } from '@/lib/server/appointments-resilients';

/**
 * GET /kinora-admin/api/pazienti/[id]/appuntamenti
 *
 * Endpoint staff: ritorna tutti gli appuntamenti del gestionale per un
 * paziente specifico. Usa l'`id` numerico di `user_patient.id`. Il
 * mapping code → label è in `@/lib/server/appointments-resilients.ts`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyStaffCaller(request);
    const { id } = await params;
    const patientId = parseInt(id, 10);
    if (!Number.isFinite(patientId) || patientId <= 0) {
      return NextResponse.json(
        { error: 'patient id non valido' },
        { status: 400 }
      );
    }
    const rows = await fetchAppointmentsForPatient(patientId);
    return NextResponse.json({ rows, count: rows.length, patientId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    console.error('Kinora-admin appuntamenti API error:', message);
    const status = message.toLowerCase().includes('authoriz') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
