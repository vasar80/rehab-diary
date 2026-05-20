import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCallerFromAuthHeader,
  createSupabaseAdminClient,
} from '@/lib/supabase/server';
import { fetchAppointmentsForPatient } from '@/lib/server/appointments-resilients';

/**
 * GET /api/me/appuntamenti
 *
 * Endpoint paziente: risolve l'auth_uid del chiamante in patientId
 * (preso da user_metadata.patientId, settato dallo staff con "Crea
 * login" su /kinora-admin/pazienti) e ritorna gli appuntamenti dal
 * gestionale.
 *
 * Risposte:
 *   200 { rows, source: 'gestionale', patientId }     paziente interno
 *   200 { rows: [], source: 'no-patient-id' }         self-signup (no link al gestionale)
 *   401 { error }                                     non autenticato
 *
 * Self-signup → ritorna lista vuota, NON un errore: il client decide
 * se mostrare un placeholder o il mock di demo per i free.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyCallerFromAuthHeader(
      request.headers.get('authorization')
    );

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(auth.uid);
    if (error) throw error;
    const meta = (data?.user?.user_metadata || {}) as Record<string, unknown>;
    const patientId =
      typeof meta.patientId === 'number'
        ? meta.patientId
        : typeof meta.patientId === 'string' && /^\d+$/.test(meta.patientId)
          ? parseInt(meta.patientId, 10)
          : null;

    if (!patientId) {
      return NextResponse.json({
        rows: [],
        source: 'no-patient-id' as const,
      });
    }

    const rows = await fetchAppointmentsForPatient(patientId);
    return NextResponse.json({
      rows,
      source: 'gestionale' as const,
      patientId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    console.error('/api/me/appuntamenti error:', message);
    const status =
      message.toLowerCase().includes('authoriz') ||
      message.toLowerCase().includes('authenticat')
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
