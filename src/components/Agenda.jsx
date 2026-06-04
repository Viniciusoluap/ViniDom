import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DAY_NAMES_PT, MONTH_NAMES_PT } from '../utils/constants';
import { formatTime, formatPrice } from '../utils/dateFormatter';
import { dateToKey } from '../utils/dateFormatter';

const HOUR_START  = 9;
const HOUR_END    = 19;
const HOURS       = HOUR_END - HOUR_START;
const PX_PER_HOUR = 72;

export default function Agenda({ bookings, staff = [] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [staffFilter, setStaffFilter]   = useState('all');

  const dayKey = dateToKey(selectedDate);
  const isToday = dayKey === dateToKey(new Date());

  const dayBookings = useMemo(() =>
    bookings
      .filter(b => {
        if (b.status === 'cancelled') return false;
        if (b.dateKey !== dayKey) return false;
        if (staffFilter !== 'all' && b.professional !== staffFilter) return false;
        return true;
      })
      .sort((a, b) => a.timeSlot - b.timeSlot),
    [bookings, dayKey, staffFilter]
  );

  const shift = (n) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + n);
    setSelectedDate(d);
  };

  const dayName   = DAY_NAMES_PT[selectedDate.getDay()];
  const dayNum    = selectedDate.getDate();
  const monthName = MONTH_NAMES_PT[selectedDate.getMonth()];
  const year      = selectedDate.getFullYear();

  return (
    <div className="animate-fade-in space-y-4">

      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-brand-100 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)}
            className="p-2 border border-brand-100 text-brand-400 hover:text-brand-900 hover:border-brand-900 transition-all">
            <ChevronLeft size={15} />
          </button>
          <div className="text-center min-w-[160px]">
            <p className="font-bold text-brand-900 text-sm">
              {isToday && <span className="text-gold-500">Hoje · </span>}
              {dayName}, {dayNum} de {monthName}
            </p>
            <p className="text-xs text-brand-300">{year} · {dayBookings.length} agendamento{dayBookings.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => shift(1)}
            className="p-2 border border-brand-100 text-brand-400 hover:text-brand-900 hover:border-brand-900 transition-all">
            <ChevronRight size={15} />
          </button>
        </div>

        <button onClick={() => setSelectedDate(new Date())}
          className="btn-secondary py-1.5 text-xs px-3">
          Hoje
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-brand-400 tracking-widest uppercase">Profissional:</span>
          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="input-field py-1.5 text-sm w-auto"
          >
            <option value="all">Todos</option>
            {staff.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Calendar grid ── */}
      <div className="bg-white border border-brand-100 overflow-hidden">
        <div className="flex" style={{ minWidth: 300 }}>

          {/* Time axis */}
          <div className="shrink-0 w-16 border-r border-brand-100 bg-warm-50">
            {Array.from({ length: HOURS + 1 }, (_, i) => (
              <div
                key={i}
                className="flex items-start justify-end pr-2 pt-0.5 text-xs text-brand-300 font-medium"
                style={{ height: PX_PER_HOUR }}
              >
                {`${String(HOUR_START + i).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Events area */}
          <div className="flex-1 relative" style={{ height: HOURS * PX_PER_HOUR }}>
            {/* Hour lines */}
            {Array.from({ length: HOURS + 1 }, (_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-brand-50"
                style={{ top: i * PX_PER_HOUR }} />
            ))}

            {/* Half-hour dashed lines */}
            {Array.from({ length: HOURS }, (_, i) => (
              <div key={`h${i}`} className="absolute left-0 right-0 border-t border-dashed border-brand-50"
                style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }} />
            ))}

            {/* Now indicator */}
            {isToday && <NowIndicator />}

            {dayBookings.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-brand-200 text-sm">
                Nenhum agendamento neste dia.
              </div>
            ) : (
              dayBookings.map((b, idx) => {
                const startMin   = b.timeSlot - HOUR_START * 60;
                const top        = (startMin / 60) * PX_PER_HOUR;
                const height     = Math.max((b.totalDuration / 60) * PX_PER_HOUR, 32);
                const services   = b.services || (b.service ? [b.service] : []);
                const member     = staff.find(s => s.name === b.professional);
                const bg         = member?.color ?? '#1a1a2e';
                const digits     = (b.client?.phone || '').replace(/\D/g, '');
                const names      = services.map(s => s.name).join(' + ');
                const hora       = formatTime(b.timeSlot);
                const confirmMsg = encodeURIComponent(
                  `Olá, ${b.client?.name}! 😊 Aqui é o Vinicius Cavalcante. Passando pra confirmar o seu horário de hoje às ${hora} para ${names}. Você estará presente? 🙏✂️`
                );
                const waLink = `https://wa.me/55${digits}?text=${confirmMsg}`;

                return (
                  <div
                    key={b.id}
                    className="absolute left-2 right-2 flex flex-col px-2 py-1.5 overflow-hidden group"
                    style={{ top, height, backgroundColor: bg }}
                  >
                    <p className="text-white text-xs font-bold leading-tight truncate">
                      {b.client?.name || '—'}
                    </p>
                    {height > 40 && (
                      <p className="text-white/70 text-xs truncate leading-tight">
                        {names}
                      </p>
                    )}
                    {height > 56 && (
                      <p className="text-white/60 text-xs">{hora} · {formatPrice(b.totalPrice || 0)}</p>
                    )}
                    {digits && height > 40 && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mt-auto flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs px-1.5 py-0.5 w-fit transition-colors"
                      >
                        <WaIcon /> Confirmar
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      {staff.length > 1 && (
        <div className="flex flex-wrap gap-3 px-1">
          {staff.map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-brand-400">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NowIndicator() {
  const now   = new Date();
  const mins  = now.getHours() * 60 + now.getMinutes();
  const start = HOUR_START * 60;
  const end   = HOUR_END * 60;
  if (mins < start || mins > end) return null;
  const top = ((mins - start) / 60) * PX_PER_HOUR;
  return (
    <div className="absolute left-0 right-0 flex items-center pointer-events-none" style={{ top }}>
      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
      <div className="flex-1 border-t-2 border-red-400" />
    </div>
  );
}

function WaIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
