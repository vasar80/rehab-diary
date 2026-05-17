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

const TYPE_META: Record<MockAppointment['type'], { color: string; short: string }> = {
  physio_monthly: { color: '#322A6E', short: 'Visita fisio' },
  physio_boost: { color: '#6B5DA8', short: 'Boost fisio' },
  group_grasp: { color: '#E85A7A', short: 'Lab presa' },
  group_walking: { color: '#F4A6B7', short: 'Lab cammino' },
  counselor: { color: '#0EA5E9', short: 'Counselor' },
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
  const startWeekday = (firstDay.getDay() + 6) % 7;

  type Cell = { day: number | null; appointments: MockAppointment[]; isPast: boolean; isToday: boolean };
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
      appointments: apptsForDay,
      isPast: date.getTime() < today.getTime(),
      isToday: date.getTime() === today.getTime(),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, appointments: [], isPast: false, isToday: false });
  }

  // Build legend from the appointment types actually used this month
  const typesInMonth = Array.from(
    new Set(
      appointments
        .filter((a) => {
          const ad = new Date(a.date);
          return ad.getFullYear() === year && ad.getMonth() === month;
        })
        .map((a) => a.type)
    )
  );

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
          const firstAppt = cell.appointments[0];
          const apptColor = firstAppt ? TYPE_META[firstAppt.type].color : undefined;

          if (cell.isToday) {
            return (
              <div
                key={i}
                className="aspect-square flex items-center justify-center rounded-xl text-sm font-bold gradient-primary text-white shadow-md shadow-primary/30"
              >
                {cell.day}
              </div>
            );
          }
          if (cell.isPast && cell.appointments.length > 0) {
            return (
              <div
                key={i}
                className="aspect-square flex items-center justify-center rounded-xl text-sm font-semibold text-text relative"
              >
                <span className="leading-none relative z-0">{cell.day}</span>
                <svg viewBox="0 0 24 24" className="absolute inset-1 pointer-events-none z-10" preserveAspectRatio="xMidYMid meet">
                  <line x1="5" y1="5" x2="19" y2="19" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
                  <line x1="19" y1="5" x2="5" y2="19" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
                </svg>
              </div>
            );
          }
          if (cell.appointments.length > 0 && apptColor) {
            return (
              <div
                key={i}
                className="aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm relative"
                style={{ background: apptColor }}
              >
                <span className="leading-none">{cell.day}</span>
                {cell.appointments.length > 1 && (
                  <span className="absolute top-0.5 right-1 text-[9px] font-bold">×{cell.appointments.length}</span>
                )}
              </div>
            );
          }
          return (
            <div
              key={i}
              className={`aspect-square flex items-center justify-center rounded-xl text-sm ${cell.isPast ? 'text-text-muted' : 'text-text'}`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>

      {appointments.filter((a) => a.date.getTime() < today.getTime()).length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/40 space-y-1.5">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Già fatti</p>
          {appointments
            .filter((a) => a.date.getTime() < today.getTime())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map((a) => {
              const d = new Date(a.date);
              const dd = d.getDate();
              const mm = MONTHS[d.getMonth()].slice(0, 3).toLowerCase();
              return (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="text-danger text-[14px] font-bold leading-none shrink-0 w-3 text-center">✕</span>
                  <span className="text-text-muted text-xs font-semibold shrink-0">{dd} {mm} · {a.time}</span>
                  <span className="text-text-muted truncate line-through decoration-text-muted/40">{TYPE_META[a.type].short}</span>
                </div>
              );
            })}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/40 space-y-1.5">
        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Prossimi</p>
        {appointments.filter((a) => a.date.getTime() >= today.getTime()).slice(0, 5).map((a) => {
          const d = new Date(a.date);
          const dd = d.getDate();
          const mm = MONTHS[d.getMonth()].slice(0, 3).toLowerCase();
          return (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_META[a.type].color }} />
              <span className="text-text-secondary text-xs font-semibold shrink-0">{dd} {mm} · {a.time}</span>
              <span className="text-text truncate">{TYPE_META[a.type].short}</span>
            </div>
          );
        })}
      </div>

      {typesInMonth.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/40">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Legenda</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {typesInMonth.map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md shrink-0" style={{ background: TYPE_META[t].color }} />
                <span className="text-[11px] text-text font-medium">{TYPE_META[t].short}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
