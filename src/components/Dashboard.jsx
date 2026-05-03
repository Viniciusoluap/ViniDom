import { useState } from 'react';
import { Calendar, TrendingUp, Star, Clock, Printer } from 'lucide-react';
import { useBookings } from '../hooks/useBookings';
import { formatDateLong, formatTime, formatPrice } from '../utils/dateFormatter';
import { MONTH_NAMES_PT } from '../utils/constants';

export default function Dashboard() {
  const today = new Date();
  const [filterYear, setFilterYear]   = useState(today.getFullYear());
  const [filterMonth, setFilterMonth] = useState(today.getMonth());

  const { getTodayBookings, getMonthBookings, getMostBookedService, getUpcoming, cancelBooking } = useBookings();

  const todayBookings  = getTodayBookings();
  const monthBookings  = getMonthBookings(filterYear, filterMonth);
  const mostBooked     = getMostBookedService();
  const upcoming       = getUpcoming();
  const totalRevenue   = monthBookings.reduce((sum, b) => sum + (b.totalPrice ?? b.service?.price ?? 0), 0);

  const currentYear = today.getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-brand-100 p-4">
        <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Filtrar:</span>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(Number(e.target.value))}
          className="input-field py-1.5 text-sm w-auto"
        >
          {MONTH_NAMES_PT.map((name, idx) => (
            <option key={idx} value={idx}>{name}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(Number(e.target.value))}
          className="input-field py-1.5 text-sm w-auto"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 btn-secondary py-1.5 text-sm"
        >
          <Printer size={14} />
          Imprimir Relatório
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Calendar size={20} className="text-brand-600" />}  label="Hoje"         value={todayBookings.length} sub="agendamentos" />
        <Stat icon={<TrendingUp size={20} className="text-gold-500" />} label={`${MONTH_NAMES_PT[filterMonth]} ${filterYear}`} value={monthBookings.length} sub="agendamentos" />
        <Stat icon={<span className="text-lg">💰</span>}                label="Receita"      value={formatPrice(totalRevenue)} sub={`${MONTH_NAMES_PT[filterMonth].toLowerCase()} ${filterYear}`} small />
        <Stat icon={<Star size={20} className="text-gold-400" />}       label="Mais Agendado" value={mostBooked || '—'} sub="serviço" small />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Agenda de Hoje" icon={<Calendar size={16} />} empty={!todayBookings.length}>
          {todayBookings.map((b) => <BookingRow key={b.id} booking={b} onCancel={cancelBooking} />)}
        </Panel>
        <Panel title="Próximos Agendamentos" icon={<Clock size={16} />} empty={!upcoming.length}>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {upcoming.map((b) => <BookingRow key={b.id} booking={b} onCancel={cancelBooking} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, small }) {
  return (
    <div className="bg-white border border-brand-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`font-bold text-brand-900 leading-tight ${small ? 'text-sm' : 'text-2xl'}`}>{value}</div>
      <div className="text-xs text-brand-300 mt-0.5">{sub}</div>
    </div>
  );
}

function Panel({ title, icon, empty, children }) {
  return (
    <div className="bg-white border border-brand-100 p-5">
      <h3 className="font-bold text-brand-900 mb-4 flex items-center gap-2 text-sm tracking-wide">
        {icon}{title}
      </h3>
      {empty ? (
        <div className="text-center py-10 text-brand-300">
          <p className="text-sm">Nenhum agendamento.</p>
        </div>
      ) : (
        <ul className="space-y-3">{children}</ul>
      )}
    </div>
  );
}

function BookingRow({ booking: b, onCancel }) {
  const services = b.services || (b.service ? [b.service] : []);
  const price    = b.totalPrice ?? b.service?.price ?? 0;
  return (
    <li className="flex items-start gap-3 p-3 bg-warm-50 border border-brand-50">
      <span className="text-xl mt-0.5">{services[0]?.icon ?? '✂️'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-brand-900 leading-tight">
              {services.map(s => s.name).join(' + ')}
            </p>
            <p className="text-xs text-brand-400 mt-0.5">{b.client.name} · {formatTime(b.timeSlot)}</p>
            <p className="text-xs text-brand-300">{formatDateLong(new Date(b.date))}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-bold text-brand-900 text-sm">{formatPrice(price)}</span>
            <button onClick={() => onCancel(b.id)}
              className="block mt-1 text-xs text-red-400 hover:text-red-600 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
