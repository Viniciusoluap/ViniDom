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
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);

  const prevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const nextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  const canGoPrev = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    return endOfMonth(d) >= today;
  };

  const days = [];
  const firstDay = monthStart.getDay();
  for (let i = 0; i < firstDay; i++) days.push(null);
  let cur = new Date(monthStart);
  while (cur <= monthEnd) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
  }

  const monthLabel = `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  return (
    <div className="card p-4 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev()}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-primary-800 capitalize">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {SHORT_DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;

          const isPast = day < today;
          const isBusiness = isBusinessDay(day);
          const isToday = isSameDay(day, today);
          const isSelected = selected && isSameDay(day, selected);
          const disabled = isPast || !isBusiness;

          let cls = 'calendar-day text-sm';
          if (disabled) cls += ' calendar-day-disabled';
          else if (isSelected) cls += ' calendar-day-selected';
          else cls += ' calendar-day-available text-gray-700';
          if (isToday && !isSelected) cls += ' calendar-day-today';

          return (
            <button
              key={day.toISOString()}
              className={cls}
              disabled={disabled}
              onClick={() => !disabled && onSelect(day)}
              aria-label={day.toLocaleDateString('pt-BR')}
              aria-pressed={isSelected}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-gray-400 text-center">
        Dias cinzas = fechado ou passado
      </p>
    </div>
  );
}
