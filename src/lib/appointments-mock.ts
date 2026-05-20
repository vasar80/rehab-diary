export type AppointmentType =
  | 'physio_monthly'      // REG — Regolare con il Fisioterapista
  | 'physio_boost'        // FOL — Follow-up con il Fisioterapista (boost)
  | 'physio_measurement'  // MEA — Misurazione con il Fisioterapista
  | 'speech_regular'      // RET — Regolare con il Logopedista
  | 'group_grasp'         // (mock-only) gruppo presa
  | 'group_walking'       // (mock-only) gruppo cammino
  | 'counselor';          // REC — Regolare con il Consulente

export interface MockAppointment {
  id: string;
  type: AppointmentType;
  title: string;
  who: string;
  date: Date;
  time: string;
  duration: number;
  done?: boolean;
  /** URL Google Meet (presente solo se viene dal gestionale reale). */
  url?: string | null;
}

const TYPE_META: Record<AppointmentType, { title: string; who: string; duration: number }> = {
  physio_monthly: { title: 'Visita fisio', who: 'Dr.ssa Laura Bianchi', duration: 50 },
  physio_boost: { title: 'Boost fisio', who: 'Dr.ssa Laura Bianchi', duration: 60 },
  physio_measurement: { title: 'Misurazione', who: 'Dr.ssa Laura Bianchi', duration: 45 },
  speech_regular: { title: 'Logopedia', who: 'Dr.ssa Paola Espinosa', duration: 50 },
  group_grasp: { title: 'Lab presa', who: '3 partecipanti', duration: 75 },
  group_walking: { title: 'Lab cammino', who: '4 partecipanti', duration: 75 },
  counselor: { title: 'Counselor', who: 'Dr. Marco Rinaldi', duration: 45 },
};

/**
 * Mapping fra il `code` Resilients e il `type` del widget calendario.
 * Tenuto qui (non lato server) così il client può usarlo direttamente
 * sull'output di `/api/me/appuntamenti`.
 */
export const RESILIENTS_CODE_TO_TYPE: Record<string, AppointmentType> = {
  REG: 'physio_monthly',
  FOL: 'physio_boost',
  MEA: 'physio_measurement',
  RET: 'speech_regular',
  REC: 'counselor',
};

interface ResilientsRow {
  id: number;
  code: string;
  label_it: string;
  datetime: string;
  url: string | null;
  therapist_name: string | null;
}

/**
 * Adapter dal payload del gestionale al formato consumato dal widget
 * calendario. Lascia intatto il mock per il fallback dei self-signup.
 */
export function adaptResilientsAppointments(
  rows: ResilientsRow[]
): MockAppointment[] {
  return rows.map((r) => {
    const date = new Date(r.datetime);
    const type: AppointmentType =
      RESILIENTS_CODE_TO_TYPE[r.code] || 'physio_monthly';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayMidnight = new Date(date);
    dayMidnight.setHours(0, 0, 0, 0);
    return {
      id: `r-${r.id}`,
      type,
      title: r.label_it,
      who: r.therapist_name || '—',
      date,
      time: `${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
      ).padStart(2, '0')}`,
      duration: TYPE_META[type].duration,
      done: dayMidnight.getTime() < today.getTime(),
      url: r.url,
    };
  });
}

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(1);
  return out;
}

function setDay(base: Date, day: number): Date {
  const out = new Date(base);
  out.setDate(day);
  return out;
}

export function generateUpcomingAppointments(): MockAppointment[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const month = startOfMonth(today);

  // Build a full-month schedule anchored to the actual current month so the
  // user always sees a mix of past + today + future on the same calendar.
  // 2× visita fisio, 2× boost, 1× lab presa, 1× lab cammino, 1× counselor.
  const plan: { type: AppointmentType; day: number; time: string }[] = [
    { type: 'physio_monthly', day: 3, time: '10:00' },
    { type: 'physio_boost', day: 5, time: '14:00' },
    { type: 'group_grasp', day: 9, time: '16:00' },
    { type: 'physio_boost', day: 12, time: '11:30' },
    { type: 'group_walking', day: 17, time: '09:30' },
    { type: 'physio_monthly', day: 20, time: '10:00' },
    { type: 'counselor', day: 24, time: '15:00' },
  ];

  // Shift the whole plan so that one appointment lands "today" or near, to
  // give a nice live demo. Anchor the FIRST appointment 7 days before today.
  const lastDayOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const anchor = Math.max(1, Math.min(lastDayOfMonth - 20, today.getDate() - 7));
  const offset = anchor - plan[0].day;

  return plan.map((p, i) => {
    const day = Math.max(1, Math.min(lastDayOfMonth, p.day + offset));
    const date = setDay(month, day);
    const meta = TYPE_META[p.type];
    return {
      id: `appt-${i}`,
      type: p.type,
      title: meta.title,
      who: meta.who,
      date,
      time: p.time,
      duration: meta.duration,
      done: date.getTime() < today.getTime(),
    };
  });
}

const DOW = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function formatAppointmentsAsChat(appointments: MockAppointment[]): string {
  if (appointments.length === 0) {
    return 'Al momento non ho appuntamenti in calendario per te.';
  }
  const lines = appointments.map((a) => {
    const dow = DOW[a.date.getDay()];
    const dd = a.date.getDate();
    const mm = MONTHS[a.date.getMonth()];
    return `${dow} ${dd} ${mm}, ore ${a.time} — ${a.title} (${a.who})`;
  });
  return `Ecco i tuoi prossimi appuntamenti:\n\n${lines.join('\n')}`;
}

export function findAppointmentTomorrow(appointments: MockAppointment[]): MockAppointment | undefined {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return appointments.find((a) => {
    const d = new Date(a.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === tomorrow.getTime();
  });
}
