'use client';

import { MockAppointment } from '@/lib/appointments-mock';

interface CalendarWidgetProps {
  appointments: MockAppointment[];
  monthOffset?: number;
}

const DOW = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

const TYPE_COLORS: Record<MockAppointment['type'], string> = {
  physio_monthly: '#322A6E',
  physio_boost: '#6B5DA8',
  group_grasp: '#E85A7A',
  group_walking: '#F4A6B7',
  counselor: '#0EA5E9',
};

export default function CalendarWidget({ appointments, monthOffset = 0 }: CalendarWidgetProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cursor = new Date(today);
  cursor.setMonth(cursor.getMonth() + monthOffset);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Monday-first week index
  const startWeekday = (firstDay.getDay() + 6) % 7;

  type Cell = { day: number | null; date?: Date; appointments: MockAppointment[]; isPast: boolean; isToday: boolean };
  const cells: Cell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: null, appointments: [], isPast: false, isToday: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    const apptsForDay = appointments.filter((a) => {
      const ad = new Date(a.date);
      return ad.getFullYear() === year && ad.getMonth() === month && ad.getDate() === d;
    });
    cells.push({
      day: d,
      date,
      appointments: apptsForDay,
      isPast: date.getTime() < today.getTime(),
      isToday: date.getTime() === today.getTime(),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, appointments: [], isPast: false, isToday: false });
  }

  return (
    <div className="glass-strong rounded-3xl p-4 my-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-text font-bold text-base">{MONTHS[month]} <span className="text-text-secondary font-medium">{year}</span></p>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-text-muted py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={i} className="aspect-square" />;
          const hasAppts = cell.appointments.length > 0;
          return (
            <div
              key={i}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative ${
                cell.isToday
                  ? 'gradient-primary text-white font-bold shadow-md shadow-primary/30'
                  : cell.isPast
                  ? 'text-text-muted'
                  : 'text-text'
              }`}
            >
              <span className="leading-none">{cell.day}</span>
              {hasAppts && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                  {cell.isPast ? (
                    <span className="text-danger text-[11px] font-bold leading-none">✕</span>
                  ) : (
                    cell.appointments.slice(0, 3).map((a, j) => (
                      <span
                        key={j}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: cell.isToday ? '#fff' : TYPE_COLORS[a.type] }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/40">
        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Prossimi</p>
        <div className="space-y-1.5">
          {appointments.filter((a) => a.date.getTime() >= today.getTime()).slice(0, 5).map((a) => {
            const d = new Date(a.date);
            const dd = d.getDate();
            const mm = MONTHS[d.getMonth()].slice(0, 3).toLowerCase();
            return (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: TYPE_COLORS[a.type] }}
                />
                <span className="text-text-secondary text-xs font-semibold shrink-0">
                  {dd} {mm} · {a.time}
                </span>
                <span className="text-text truncate">{a.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
