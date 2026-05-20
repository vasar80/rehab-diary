/**
 * SERVER-ONLY helper per gli appuntamenti del gestionale Resilients
 * (Postgres AWS RDS, read-only). Condiviso fra:
 *   - /api/me/appuntamenti (lato paziente)
 *   - /kinora-admin/api/pazienti/[id]/appuntamenti (lato staff)
 *
 * Il mapping (code → label IT + ruolo terapista) è quello concordato
 * con Valerio dopo la ricognizione del 2026-05-20:
 *
 *   REG  Regolare con il Fisioterapista
 *   FOL  Follow-up con il Fisioterapista (boost / cita de seguimiento)
 *   MEA  Misurazione con il Fisioterapista
 *   RET  Regolare con il Logopedista          (cross-check: 39/39 pazienti RET → THP_LTH)
 *   REC  Regolare con il Consulente           (cross-check: 86/86 pazienti REC → THP_CNS)
 *
 * Il nome del terapista si risolve così:
 *   - FOL: prendi sempre l'esplicito `therapist_follow_up_id` se presente
 *   - altri tipi: l'assegnazione corrente del paziente in
 *     `assignment_assignedtherapist` per il ruolo richiesto (THP_PHY /
 *     THP_LTH / THP_CNS). NON `created_by_id` — quello è l'employee che
 *     ha messo in calendario, che nella maggior parte dei casi coincide
 *     col terapista, ma non è una garanzia (es. customer support che
 *     pianifica per conto del terapista).
 */
import { Client } from 'pg';

let cachedClient: Client | null = null;
async function strDbClient(): Promise<Client> {
  if (cachedClient) return cachedClient;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL non configurata');
  const c = new Client({
    connectionString: url.replace('?sslmode=require', ''),
    ssl: false,
    connectionTimeoutMillis: 8000,
  });
  await c.connect();
  cachedClient = c;
  return c;
}

export type AppointmentRole = 'fisio' | 'logopedista' | 'counselor';
export type AppointmentCode = 'REG' | 'FOL' | 'MEA' | 'RET' | 'REC';

export interface ResilientsAppointment {
  id: number;
  code: AppointmentCode | string;
  label_it: string;
  role: AppointmentRole;
  /** ISO 8601 UTC */
  datetime: string;
  /** Google Meet (o vuoto). Spesso wrapping URL di Calendar. */
  url: string | null;
  /** 'PEN' = pending / programmato. Non includiamo CAN (cancellato). */
  status: 'PEN' | 'CAN' | string;
  therapist_name: string | null;
  /** Job title del terapista, es. "Neurocognitive Therapist". */
  therapist_role_label: string | null;
  note: string | null;
  marketplace_code: string | null;
}

const CODE_LABEL: Record<string, string> = {
  REG: 'Regolare con il Fisioterapista',
  FOL: 'Follow-up con il Fisioterapista',
  MEA: 'Misurazione con il Fisioterapista',
  RET: 'Regolare con il Logopedista',
  REC: 'Regolare con il Consulente',
};

const CODE_ROLE: Record<string, AppointmentRole> = {
  REG: 'fisio',
  FOL: 'fisio',
  MEA: 'fisio',
  RET: 'logopedista',
  REC: 'counselor',
};

/**
 * Fetcha tutti gli appuntamenti del paziente. Ritorna future + passati,
 * ordinati cronologicamente. Filtra fuori i CAN (cancellati). Il chiamante
 * decide cosa mostrare al paziente vs admin.
 */
export async function fetchAppointmentsForPatient(
  patientId: number
): Promise<ResilientsAppointment[]> {
  const c = await strDbClient();
  const result = await c.query<{
    id: string | number;
    code: string;
    status: string;
    url: string | null;
    datetime: Date | string;
    note: string | null;
    marketplace_code: string | null;
    therapist_name: string | null;
    therapist_role_label: string | null;
  }>(
    `
    WITH assigned AS (
      SELECT DISTINCT ON (patient_id, therapist_type)
        patient_id,
        therapist_type::text AS therapist_type,
        therapist_id
      FROM assignment_assignedtherapist
      WHERE patient_id = $1
      ORDER BY patient_id, therapist_type, id DESC
    )
    SELECT
      a.id,
      a.appointment_type AS code,
      a.appointment_status AS status,
      a.appointment_url AS url,
      a.appointment_datetime_start AS datetime,
      a.note,
      m.code AS marketplace_code,
      -- Nome terapista: FOL usa therapist_follow_up_id esplicito,
      -- gli altri tipi prendono l'assegnato per ruolo dal paziente.
      COALESCE(
        TRIM(CONCAT_WS(' ', fu_u.first_name, fu_u.last_name)),
        TRIM(CONCAT_WS(' ', th_u.first_name, th_u.last_name))
      ) AS therapist_name,
      COALESCE(fu_emp.job_title, th_emp.job_title) AS therapist_role_label
    FROM appointment_personalappointment a
    LEFT JOIN core_marketplace m ON m.id = a.marketplace_id
    -- Follow-up esplicito
    LEFT JOIN user_employee fu_emp ON fu_emp.id = a.therapist_follow_up_id
    LEFT JOIN user_user fu_u ON fu_u.id = fu_emp.user_id
    -- Terapista assegnato per ruolo (in base al tipo di appuntamento)
    LEFT JOIN assigned th ON th.patient_id = a.patient_id
      AND th.therapist_type = CASE a.appointment_type
        WHEN 'REG' THEN 'THP_PHY'
        WHEN 'FOL' THEN 'THP_PHY'
        WHEN 'MEA' THEN 'THP_PHY'
        WHEN 'RET' THEN 'THP_LTH'
        WHEN 'REC' THEN 'THP_CNS'
        ELSE NULL
      END
    LEFT JOIN user_employee th_emp ON th_emp.id = th.therapist_id
    LEFT JOIN user_user th_u ON th_u.id = th_emp.user_id
    WHERE a.patient_id = $1
      AND a.appointment_status != 'CAN'
    ORDER BY a.appointment_datetime_start ASC NULLS LAST
    `,
    [patientId]
  );

  return result.rows.map((row) => {
    const dt =
      row.datetime instanceof Date
        ? row.datetime.toISOString()
        : new Date(row.datetime as string).toISOString();
    const code = row.code as AppointmentCode;
    return {
      id: Number(row.id),
      code,
      label_it: CODE_LABEL[code] || code,
      role: CODE_ROLE[code] || 'fisio',
      datetime: dt,
      url: row.url,
      status: row.status,
      therapist_name: row.therapist_name || null,
      therapist_role_label: row.therapist_role_label || null,
      note: row.note,
      marketplace_code: row.marketplace_code,
    };
  });
}
