import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Pencil, X, Search, Trash2 } from 'lucide-react';
import { DAY_NAMES_PT, MONTH_NAMES_PT, SERVICES } from '../utils/constants';
import { formatTime, formatPrice } from '../utils/dateFormatter';
import { dateToKey } from '../utils/dateFormatter';
import { getDurationTotals } from '../utils/bookingDuration';
import { getCalendarStatus } from '../utils/calendarService';

const HOUR_START  = 9;
const HOUR_END    = 19;
const HOURS       = HOUR_END - HOUR_START;
const PX_PER_HOUR = 88;

const DAY_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDays(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(dd.getDate() + i);
    return dd;
  });
}

function getMonthGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Agenda({ bookings, staff = [], onUpdateStatus, onEdit, onCancel }) {
  const [viewMode, setViewMode]                = useState('day');
  const [selectedDate, setSelectedDate]        = useState(new Date());
  const [staffFilter, setStaffFilter]          = useState('all');
  const [clientFilter, setClientFilter]        = useState('');
  const [selectedBooking, setSelectedBooking]  = useState(null);
  const [editingBooking, setEditingBooking]    = useState(null);
  const [editServices, setEditServices]        = useState([]);

  const dateInputRef = useRef(null);

  /* ── Google Calendar automático ── */
  const [gcalStatus, setGcalStatus] = useState(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;
    let active = true;
    getCalendarStatus()
      .then(status => { if (active) setGcalStatus(status); })
      .catch(error => {
        console.error('Erro ao consultar status do calendário:', error);
        if (active) setGcalStatus({ configured: false, error: 'Status indisponível' });
      });
    return () => { active = false; };
  }, []);

  const todayKey = dateToKey(new Date());
  const dayKey   = dateToKey(selectedDate);
  const isToday  = dayKey === todayKey;

  const shift = (n) => {
    const d = new Date(selectedDate);
    if (viewMode === 'day')   d.setDate(d.getDate() + n);
    if (viewMode === 'week')  d.setDate(d.getDate() + n * 7);
    if (viewMode === 'month') d.setMonth(d.getMonth() + n);
    setSelectedDate(d);
  };

  const jumpToDate = (value) => {
    if (!value) return;
    setSelectedDate(new Date(value + 'T12:00:00'));
  };

  const filteredBookings = useMemo(() =>
    bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      if (staffFilter !== 'all' && b.professional !== staffFilter) return false;
      if (clientFilter.trim()) {
        const name = (b.client?.name || '').toLowerCase();
        if (!name.includes(clientFilter.trim().toLowerCase())) return false;
      }
      return true;
    }),
    [bookings, staffFilter, clientFilter]
  );

  const dayBookings = useMemo(() =>
    filteredBookings
      .filter(b => b.dateKey === dayKey)
      .sort((a, b) => a.timeSlot - b.timeSlot),
    [filteredBookings, dayKey]
  );

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const weekBookingsMap = useMemo(() => {
    const map = {};
    const keys = new Set(weekDays.map(d => dateToKey(d)));
    filteredBookings.forEach(b => {
      if (!keys.has(b.dateKey)) return;
      if (!map[b.dateKey]) map[b.dateKey] = [];
      map[b.dateKey].push(b);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.timeSlot - b.timeSlot));
    return map;
  }, [filteredBookings, weekDays]);

  const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);

  const monthBookingsMap = useMemo(() => {
    const map = {};
    filteredBookings.forEach(b => {
      if (!map[b.dateKey]) map[b.dateKey] = [];
      map[b.dateKey].push(b);
    });
    return map;
  }, [filteredBookings]);

  const liveSelected = selectedBooking
    ? (filteredBookings.find(b => b.id === selectedBooking.id) ?? selectedBooking)
    : null;

  const openEdit = (booking) => {
    setEditingBooking(booking);
    setEditServices(booking.services || []);
    setSelectedBooking(null);
  };
  const closeEdit = () => { setEditingBooking(null); setEditServices([]); };

  const toggleService = (svc) => {
    setEditServices(prev => {
      const exists = prev.find(s => s.id === svc.id);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter(s => s.id !== svc.id);
      }
      return [...prev, svc];
    });
  };

  const saveEdit = () => {
    if (!editingBooking || !editServices.length || !onEdit) return;
    const { commercialDuration: totalDuration, operationalDuration } = getDurationTotals(editServices);
    const totalPrice = editServices.reduce((s, sv) => s + sv.price, 0);
    onEdit(editingBooking.id, { services: editServices, totalDuration, operationalDuration, totalPrice });
    closeEdit();
  };

  const goToDay = (date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  // Header date display — clicável para abrir seletor rápido de data
  const DateDisplay = () => {
    let label;
    if (viewMode === 'day') {
      const dn  = DAY_NAMES_PT[selectedDate.getDay()];
      const num = selectedDate.getDate();
      const mn  = MONTH_NAMES_PT[selectedDate.getMonth()];
      label = (
        <>
          <p className="font-bold text-brand-900 text-sm underline decoration-dotted underline-offset-2 cursor-pointer">
            {isToday && <span className="text-gold-500 no-underline">Hoje · </span>}
            {dn}, {num} de {mn}
          </p>
          <p className="text-xs text-brand-300">{selectedDate.getFullYear()} · {dayBookings.length} agend.</p>
        </>
      );
    } else if (viewMode === 'week') {
      const first = weekDays[0];
      const last  = weekDays[6];
      const sameMonth = first.getMonth() === last.getMonth();
      const range = sameMonth
        ? `${first.getDate()}–${last.getDate()} de ${MONTH_NAMES_PT[first.getMonth()]}`
        : `${first.getDate()} ${MONTH_NAMES_PT[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTH_NAMES_PT[last.getMonth()].slice(0, 3)}`;
      const total = weekDays.reduce((n, d) => n + (weekBookingsMap[dateToKey(d)]?.length || 0), 0);
      label = (
        <>
          <p className="font-bold text-brand-900 text-sm underline decoration-dotted underline-offset-2 cursor-pointer">{range}</p>
          <p className="text-xs text-brand-300">{first.getFullYear()} · {total} agend.</p>
        </>
      );
    } else {
      const total = filteredBookings.filter(b => {
        const bDate = new Date(b.date);
        return bDate.getFullYear() === selectedDate.getFullYear() &&
               bDate.getMonth() === selectedDate.getMonth();
      }).length;
      label = (
        <>
          <p className="font-bold text-brand-900 text-sm capitalize underline decoration-dotted underline-offset-2 cursor-pointer">
            {MONTH_NAMES_PT[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </p>
          <p className="text-xs text-brand-300">{total} agend.</p>
        </>
      );
    }

    return (
      <div className="relative text-center min-w-[150px]">
        {/* Input escondido — abre o seletor nativo ao clicar na data */}
        <input
          ref={dateInputRef}
          type="date"
          value={dayKey}
          onChange={e => jumpToDate(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          style={{ zIndex: 1 }}
        />
        <div style={{ position: 'relative', zIndex: 0 }}>{label}</div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-4">

      {/* ── Google Agenda automático ── */}
      <div className="bg-white border border-brand-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <GoogleCalIcon />
          <span className="text-sm font-semibold text-brand-900">Google Agenda automático</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 ${
            gcalStatus?.configured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {gcalStatus?.configured ? '✓ Backend configurado' : 'Aguardando configuração'}
          </span>
        </div>
        <p className="mt-2 text-xs text-brand-400 leading-relaxed">
          As reservas do site usam duração operacional, sincronização idempotente e atualização automática do evento. A configuração do Google fica protegida no servidor; não há mais Client ID ou token no navegador.
        </p>
        {gcalStatus?.counts && (
          <p className="mt-2 text-[11px] text-brand-500">
            Sincronizados: {gcalStatus.counts.synced || 0} · Pendentes: {gcalStatus.counts.pending || 0} · Falhas: {gcalStatus.counts.failed || 0}
          </p>
        )}
      </div>

      {/* ── Header bar ── */}
      <div className="bg-white border border-brand-100 p-4 space-y-3">

        {/* Linha 1: modo de visualização + navegação de data */}
        <div className="flex flex-wrap items-center gap-3">

          {/* View toggle */}
          <div className="flex border border-brand-100 overflow-hidden shrink-0">
            {[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors ${
                  viewMode === mode
                    ? 'bg-brand-900 text-white'
                    : 'text-brand-400 hover:text-brand-900 hover:bg-warm-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)}
              className="p-2 border border-brand-100 text-brand-400 hover:text-brand-900 hover:border-brand-900 transition-all">
              <ChevronLeft size={15} />
            </button>
            <DateDisplay />
            <button onClick={() => shift(1)}
              className="p-2 border border-brand-100 text-brand-400 hover:text-brand-900 hover:border-brand-900 transition-all">
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            onClick={() => { setSelectedDate(new Date()); setViewMode('day'); }}
            className="btn-secondary py-1.5 text-xs px-3"
          >
            Hoje
          </button>
        </div>

        {/* Linha 2: filtros */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Busca por cliente */}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300 pointer-events-none" />
            <input
              type="text"
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              placeholder="Buscar cliente..."
              className="input-field pl-8 py-1.5 text-sm w-full"
            />
            {clientFilter && (
              <button
                onClick={() => setClientFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-300 hover:text-brand-900 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtro de profissional */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-brand-400 tracking-widest uppercase hidden sm:block">Profissional:</span>
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
      </div>

      {/* ── Day View ── */}
      {viewMode === 'day' && (
        <DayView
          dayBookings={dayBookings}
          isToday={isToday}
          staff={staff}
          onSelectBooking={setSelectedBooking}
        />
      )}

      {/* ── Week View ── */}
      {viewMode === 'week' && (
        <WeekView
          weekDays={weekDays}
          weekBookingsMap={weekBookingsMap}
          staff={staff}
          todayKey={todayKey}
          onSelectBooking={setSelectedBooking}
          onGoToDay={goToDay}
        />
      )}

      {/* ── Month View ── */}
      {viewMode === 'month' && (
        <MonthView
          monthGrid={monthGrid}
          monthBookingsMap={monthBookingsMap}
          staff={staff}
          todayKey={todayKey}
          onGoToDay={goToDay}
        />
      )}

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

      {/* ── Bottom sheet de detalhe ── */}
      {liveSelected && (
        <BookingDetailSheet
          booking={liveSelected}
          onClose={() => setSelectedBooking(null)}
          onUpdateStatus={onUpdateStatus}
          onOpenEdit={onEdit ? () => openEdit(liveSelected) : null}
          onCancel={onCancel ? (id) => { onCancel(id); setSelectedBooking(null); } : null}
        />
      )}

      {/* ── Modal de edição de serviços ── */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-sm max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-100">
              <div>
                <p className="font-bold text-brand-900 text-sm">Editar Serviços</p>
                <p className="text-brand-400 text-xs">
                  {editingBooking.client?.name} · {formatTime(editingBooking.timeSlot)}
                </p>
              </div>
              <button onClick={closeEdit} className="p-1 text-brand-400 hover:text-brand-900 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {SERVICES.map(svc => {
                const selected = !!editServices.find(s => s.id === svc.id);
                return (
                  <button
                    key={svc.id}
                    onClick={() => toggleService(svc)}
                    className={`w-full flex items-center gap-3 p-3 border text-left transition-colors ${
                      selected ? 'border-brand-900 bg-brand-900' : 'border-brand-100 hover:border-brand-300'
                    }`}
                  >
                    <span className="text-lg shrink-0">{svc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${selected ? 'text-white' : 'text-brand-900'}`}>
                        {svc.name}
                      </p>
                      <p className={`text-xs ${selected ? 'text-white/70' : 'text-brand-400'}`}>
                        {svc.duration}min · {formatPrice(svc.price)}
                        {svc.priceLabel && <span className="ml-1 opacity-75">({svc.priceLabel})</span>}
                      </p>
                    </div>
                    {selected && <CheckCircle size={14} className="text-white shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-brand-100">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-brand-400 text-xs">Novo total</span>
                <span className="font-bold text-brand-900 text-sm">
                  {formatPrice(editServices.reduce((s, sv) => s + sv.price, 0))}
                  <span className="text-brand-400 font-normal text-xs ml-1">
                    · {editServices.reduce((s, sv) => s + sv.duration, 0)}min
                  </span>
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={closeEdit} className="flex-1 btn-secondary text-sm py-2.5">Cancelar</button>
                <button
                  onClick={saveEdit}
                  disabled={!editServices.length}
                  className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Day View ──
function DayView({ dayBookings, isToday, staff, onSelectBooking }) {
  return (
    <div className="bg-white border border-brand-100 overflow-hidden">
      <div className="flex" style={{ minWidth: 300 }}>

        {/* Time axis */}
        <div className="shrink-0 w-16 border-r border-brand-100 bg-warm-50">
          {Array.from({ length: HOURS + 1 }, (_, i) => (
            <div key={i}
              className="flex items-start justify-end pr-2 pt-0.5 text-xs text-brand-300 font-medium"
              style={{ height: PX_PER_HOUR }}>
              {`${String(HOUR_START + i).padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        {/* Events area */}
        <div className="flex-1 relative" style={{ height: HOURS * PX_PER_HOUR }}>
          {Array.from({ length: HOURS + 1 }, (_, i) => (
            <div key={i} className="absolute left-0 right-0 border-t border-brand-50"
              style={{ top: i * PX_PER_HOUR }} />
          ))}
          {Array.from({ length: HOURS }, (_, i) => (
            <div key={`h${i}`} className="absolute left-0 right-0 border-t border-dashed border-brand-50"
              style={{ top: i * PX_PER_HOUR + PX_PER_HOUR / 2 }} />
          ))}
          {isToday && <NowIndicator />}

          {dayBookings.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-brand-200 text-sm">
              Nenhum agendamento neste dia.
            </div>
          ) : (
            dayBookings.map(b => {
              const startMin = b.timeSlot - HOUR_START * 60;
              const top      = (startMin / 60) * PX_PER_HOUR;
              const height   = Math.max((b.totalDuration / 60) * PX_PER_HOUR, 40);
              const services = b.services || (b.service ? [b.service] : []);
              const member   = staff.find(s => s.name === b.professional);
              const bg       = member?.color ?? '#1a1a2e';
              const names    = services.map(s => s.name).join(' + ');
              const hora     = formatTime(b.timeSlot);
              const statusIndicator =
                b.status === 'attended' ? (
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0 mt-0.5" />
                ) : b.status === 'no_show' ? (
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0 mt-0.5" />
                ) : null;

              return (
                <button
                  key={b.id}
                  onClick={() => onSelectBooking(b)}
                  className="absolute left-2 right-2 flex flex-col px-2.5 py-2 text-left overflow-hidden hover:brightness-110 active:brightness-125 transition-all"
                  style={{ top, height, backgroundColor: bg }}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <p className="text-white font-bold text-xs leading-tight flex-1 min-w-0">
                      {b.client?.name || '—'}
                    </p>
                    {statusIndicator}
                  </div>
                  {height > 42 && (
                    <p className="text-white/80 text-xs leading-snug mt-0.5 break-words">{names}</p>
                  )}
                  {height > 62 && (
                    <p className="text-white/60 text-xs mt-auto">{hora}</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Week View ──
function WeekView({ weekDays, weekBookingsMap, staff, todayKey, onSelectBooking, onGoToDay }) {
  return (
    <div className="bg-white border border-brand-100 overflow-x-auto">
      <div className="min-w-[560px]">

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-brand-100">
          {weekDays.map((d, i) => {
            const key     = dateToKey(d);
            const isToday = key === todayKey;
            const count   = weekBookingsMap[key]?.length || 0;
            return (
              <button
                key={i}
                onClick={() => onGoToDay(d)}
                className={`p-3 text-center border-r last:border-r-0 border-brand-50 hover:bg-warm-50 transition-colors ${isToday ? 'bg-brand-50' : ''}`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-widest ${isToday ? 'text-gold-500' : 'text-brand-400'}`}>
                  {DAY_SHORT_PT[d.getDay()]}
                </p>
                <p className={`text-lg font-bold mt-0.5 leading-none ${isToday ? 'text-gold-500' : 'text-brand-900'}`}>
                  {d.getDate()}
                </p>
                {count > 0 && (
                  <p className="text-[10px] text-brand-400 mt-1">{count} ag.</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Booking cards per day */}
        <div className="grid grid-cols-7 divide-x divide-brand-50">
          {weekDays.map((d, i) => {
            const key     = dateToKey(d);
            const dayBks  = weekBookingsMap[key] || [];
            const isToday = key === todayKey;
            return (
              <div key={i} className={`min-h-[160px] p-1.5 space-y-1 ${isToday ? 'bg-brand-50/60' : ''}`}>
                {dayBks.length === 0 ? (
                  <p className="text-[10px] text-brand-200 text-center mt-8 select-none">—</p>
                ) : (
                  dayBks.map(b => {
                    const services = b.services || (b.service ? [b.service] : []);
                    const member   = staff.find(s => s.name === b.professional);
                    const bg       = member?.color ?? '#1a1a2e';
                    const names    = services.map(s => s.name).join(' + ');
                    return (
                      <button
                        key={b.id}
                        onClick={() => onSelectBooking(b)}
                        className="w-full text-left p-1.5 flex flex-col gap-0.5 hover:brightness-110 active:brightness-125 transition-all overflow-hidden"
                        style={{ backgroundColor: bg }}
                      >
                        <p className="text-white font-bold text-[10px] leading-tight truncate">
                          {b.client?.name || '—'}
                        </p>
                        <p className="text-white/75 text-[10px] leading-tight truncate">{names}</p>
                        <p className="text-white/60 text-[10px]">{formatTime(b.timeSlot)}</p>
                      </button>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month View ──
const MONTH_DAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function MonthView({ monthGrid, monthBookingsMap, staff, todayKey, onGoToDay }) {
  return (
    <div className="bg-white border border-brand-100 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-brand-100">
        {MONTH_DAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-brand-400 uppercase tracking-widest border-r last:border-r-0 border-brand-50">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {monthGrid.map((d, i) => {
          if (!d) {
            return (
              <div key={`empty-${i}`} className="border-r last:border-r-0 border-b border-brand-50 min-h-[80px] bg-warm-50/50" />
            );
          }
          const key     = dateToKey(d);
          const isToday = key === todayKey;
          const bks     = monthBookingsMap[key] || [];

          return (
            <button
              key={key}
              onClick={() => onGoToDay(d)}
              className={`border-r last:border-r-0 border-b border-brand-50 min-h-[80px] p-1.5 text-left hover:bg-warm-50 transition-colors flex flex-col items-start ${
                isToday ? 'bg-brand-50' : ''
              }`}
            >
              <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                isToday ? 'bg-brand-900 text-white' : 'text-brand-900'
              }`}>
                {d.getDate()}
              </span>

              {bks.slice(0, 3).map((b, j) => {
                const services = b.services || (b.service ? [b.service] : []);
                const member   = staff.find(s => s.name === b.professional);
                const bg       = member?.color ?? '#1a1a2e';
                return (
                  <div key={j} className="w-full flex items-center gap-1 overflow-hidden mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: bg }} />
                    <p className="text-[10px] text-brand-700 truncate leading-tight">
                      {b.client?.name || services[0]?.name || '—'}
                    </p>
                  </div>
                );
              })}

              {bks.length > 3 && (
                <p className="text-[10px] text-brand-400 mt-0.5">+{bks.length - 3} mais</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Bottom sheet com detalhes e ações ──
function BookingDetailSheet({ booking: b, onClose, onUpdateStatus, onOpenEdit, onCancel }) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  const services = b.services || (b.service ? [b.service] : []);
  const names    = services.map(s => s.name).join(' + ');
  const hora     = formatTime(b.timeSlot);
  const digits   = (b.client?.phone || '').replace(/\D/g, '');
  const msg      = encodeURIComponent(
    `Olá, ${b.client?.name}! 😊 Aqui é o Vinicius Cavalcante. Passando pra confirmar o seu horário de hoje às ${hora} para ${names}. Você estará presente? 🙏✂️`
  );
  const waLink = `https://wa.me/55${digits}?text=${msg}`;

  const STATUS_MAP = {
    confirmed: { label: 'Confirmado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    attended:  { label: 'Atendido',   cls: 'bg-green-50 text-green-700 border-green-200' },
    no_show:   { label: 'Faltou',     cls: 'bg-red-50 text-red-700 border-red-200' },
    cancelled: { label: 'Cancelado',  cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  };
  const statusInfo = STATUS_MAP[b.status] || STATUS_MAP.confirmed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl rounded-t-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Alça visual */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-brand-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-brand-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{services[0]?.icon || '✂️'}</span>
            <div>
              <p className="font-bold text-brand-900">{b.client?.name || '—'}</p>
              <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 border font-medium ${statusInfo.cls}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-brand-400 hover:text-brand-900 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <p className="text-xs text-brand-400 uppercase tracking-widest mb-2">Serviços</p>
            <div className="space-y-2">
              {services.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <span className="font-semibold text-brand-900 text-sm flex-1">{s.name}</span>
                  <span className="text-xs text-brand-400 shrink-0">{s.duration}min</span>
                  <span className="text-sm font-bold text-brand-900 shrink-0">{formatPrice(s.price)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-warm-50 border border-brand-50 p-3">
              <p className="text-xs text-brand-400 uppercase tracking-widest">Horário</p>
              <p className="font-bold text-brand-900 text-base mt-1">{hora}</p>
              <p className="text-xs text-brand-400">{b.totalDuration} min</p>
            </div>
            <div className="bg-warm-50 border border-brand-50 p-3">
              <p className="text-xs text-brand-400 uppercase tracking-widest">Total</p>
              <p className="font-bold text-brand-900 text-base mt-1">{formatPrice(b.totalPrice || 0)}</p>
            </div>
          </div>

          {b.client?.phone && (
            <p className="text-xs text-brand-400">
              <span className="uppercase tracking-widest">Telefone: </span>
              <span className="text-brand-700 font-medium">{b.client.phone}</span>
            </p>
          )}
        </div>

        {/* Botões de ação */}
        <div className="px-5 pb-6 pt-3 border-t border-brand-100 space-y-2 shrink-0">
          {digits && b.status === 'confirmed' && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 text-sm transition-colors"
            >
              <WaIcon /> Confirmar via WhatsApp
            </a>
          )}

          {b.status === 'confirmed' && onUpdateStatus && (
            <div className="flex gap-2">
              <button
                onClick={() => { onUpdateStatus(b.id, 'attended'); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-900 hover:bg-brand-800 text-white font-bold py-3.5 text-sm transition-colors"
              >
                <CheckCircle size={16} /> Atendido
              </button>
              <button
                onClick={() => { onUpdateStatus(b.id, 'no_show'); onClose(); }}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 text-sm transition-colors"
              >
                <XCircle size={16} /> Faltou
              </button>
            </div>
          )}

          {(b.status === 'attended' || b.status === 'no_show') && onUpdateStatus && (
            <button
              onClick={() => { onUpdateStatus(b.id, 'confirmed'); onClose(); }}
              className="w-full border border-brand-200 text-brand-700 hover:border-brand-900 hover:text-brand-900 py-3 text-sm font-medium transition-colors"
            >
              ↩ Desfazer para Confirmado
            </button>
          )}

          {onOpenEdit && (
            <button
              onClick={onOpenEdit}
              className="w-full flex items-center justify-center gap-2 border border-brand-200 text-brand-700 hover:border-brand-900 hover:text-brand-900 py-3 text-sm font-medium transition-colors"
            >
              <Pencil size={13} /> Editar Serviços
            </button>
          )}

          {/* Cancelar agendamento */}
          {onCancel && !confirmCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 hover:border-red-400 hover:text-red-600 py-3 text-sm font-medium transition-colors"
            >
              <Trash2 size={13} /> Cancelar Agendamento
            </button>
          )}

          {onCancel && confirmCancel && (
            <div className="border border-red-200 p-3 space-y-2">
              <p className="text-xs text-red-600 text-center font-medium">Confirmar cancelamento?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="flex-1 py-2 text-xs font-semibold border border-brand-200 text-brand-700 hover:border-brand-900 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => onCancel(b.id)}
                  className="flex-1 py-2 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Sim, cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function GoogleCalIcon({ small }) {
  const s = small ? 14 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" fill="#fff" stroke="#dadce0" strokeWidth="1.5"/>
      <path d="M3 9h18" stroke="#dadce0" strokeWidth="1.5"/>
      <path d="M8 2v4M16 2v4" stroke="#5f6368" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8.5 13.5l2 2 4-4" stroke="#1a73e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
