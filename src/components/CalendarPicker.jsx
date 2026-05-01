import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  isSameDay,
  isBusinessDay,
  startOfMonth,
  endOfMonth,
  addDays,
} from '../utils/dateFormatter';
import { MONTH_NAMES_PT as MONTHS } from '../utils/constants';

const SHORT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarPicker({ selected, onSelect }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });

  const monthStart = startOfMonth(viewDate);
  const monthEnd   = endOfMonth(viewDate);

  const canGoPrev = () => endOfMonth(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)) >= today;
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const days = [];
  const firstDay = monthStart.getDay();
  for (let i = 0; i < firstDay; i++) days.push(null);
  let cur = new Date(monthStart);
  while (cur <= monthEnd) { days.push(new Date(cur)); cur = addDays(cur, 1); }

  const monthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  return (
    <div className="bg-white border border-brand-100 p-5 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} disabled={!canGoPrev()}
          className="p-1.5 hover:bg-brand-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="Mês anterior">
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-brand-900 text-sm tracking-wide capitalize">{monthLabel}</span>
        <button onClick={nextMonth}
          className="p-1.5 hover:bg-brand-50 transition-colors"
          aria-label="Próximo mês">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {SHORT_DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-brand-300 py-1 tracking-wide">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const isPast     = day < today;
          const isBusiness = isBusinessDay(day);
          const isToday    = isSameDay(day, today);
          const isSelected = selected && isSameDay(day, selected);
          const disabled   = isPast || !isBusiness;

          let cls = 'calendar-day text-xs';
          if (disabled)    cls += ' calendar-day-disabled';
          else if (isSelected) cls += ' calendar-day-selected';
          else             cls += ' calendar-day-available text-brand-700';
          if (isToday && !isSelected) cls += ' calendar-day-today';

          return (
            <button key={day.toISOString()} className={cls} disabled={disabled}
              onClick={() => !disabled && onSelect(day)}
              aria-label={day.toLocaleDateString('pt-BR')} aria-pressed={isSelected}>
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-brand-300 text-center tracking-wide">
        Fechado: Terças e Domingos
      </p>
    </div>
  );
}
