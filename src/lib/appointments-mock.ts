export type AppointmentType =
  | 'physio_monthly'
  | 'physio_boost'
  | 'group_grasp'
  | 'group_walking'
  | 'counselor';

export interface MockAppointment {
  id: string;
  type: AppointmentType;
  title: string;
  who: string;
  date: Date;
  time: string;
  duration: number;
}

const TYPE_META: Record<AppointmentType, { title: string; who: string; duration: number }> = {
  physio_monthly: { title: 'Visita mensile con il fisioterapista', who: 'Dr.ssa Laura Bianchi', duration: 50 },
  physio_boost: { title: 'Boost con il fisioterapista', who: 'Dr.ssa Laura Bianchi', duration: 60 },
  group_grasp: { title: 'Laboratorio di gruppo: presa', who: '3 partecipanti', duration: 75 },
  group_walking: { title: 'Laboratorio di gruppo: cammino', who: '4 partecipanti', duration: 75 },
  counselor: { title: 'Visita con il counselor', who: 'Dr. Marco Rinaldi', duration: 45 },
};

function nextWeekday(from: Date, weekday: number): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const diff = (weekday + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function generateUpcomingAppointments(): MockAppointment[] {
  // Build a stable month of appointments anchored to a base date so the
  // schedule doesn't reshuffle every render — only progresses week by week.
  const now = new Date();
  const monthStart = nextWeekday(now, 1); // next Monday

  const schedule: { type: AppointmentType; dayOffset: number; time: string }[] = [
    { type: 'physio_monthly', dayOffset: 1, time: '10:00' },
    { type: 'physio_boost', dayOffset: 3, time: '11:30' },
    { type: 'group_grasp', dayOffset: 4, time: '16:00' },
    { type: 'physio_boost', dayOffset: 10, time: '14:00' },
    { type: 'group_walking', dayOffset: 12, time: '09:30' },
    { type: 'counselor', dayOffset: 14, time: '15:00' },
  ];

  return schedule.map((s, i) => {
    const date = addDays(monthStart, s.dayOffset);
    const meta = TYPE_META[s.type];
    return {
      id: `appt-${i}`,
      type: s.type,
      title: meta.title,
      who: meta.who,
      date,
      time: s.time,
      duration: meta.duration,
    };
  }).filter((a) => a.date.getTime() >= now.getTime() - 86400000); // keep future ones
}

const DOW = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

export function formatAppointmentsAsChat(appointments: MockAppointment[]): string {
  if (appointments.length === 0) {
    return 'Al momento non ho appuntamenti in calendario per te. Quando il centro fissa una nuova data te la mostro qui.';
  }
  const lines = appointments.map((a) => {
    const dow = DOW[a.date.getDay()];
    const dd = a.date.getDate();
    const mm = MONTHS[a.date.getMonth()];
    return `${dow} ${dd} ${mm}, ore ${a.time} — ${a.title} (${a.who})`;
  });
  return `Ecco i tuoi prossimi appuntamenti:\n\n${lines.join('\n')}\n\nIn tutto ${appointments.length} appuntamenti nelle prossime settimane.`;
}
