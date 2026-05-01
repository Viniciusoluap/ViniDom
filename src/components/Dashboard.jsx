import { Calendar, TrendingUp, Star, Clock } from 'lucide-react';
import { useBookings } from '../hooks/useBookings';
import { formatDateLong, formatTime, formatPrice } from '../utils/dateFormatter';

export default function Dashboard() {
  const { getTodayBookings, getMonthBookings, getMostBookedService, getUpcoming, cancelBooking } = useBookings();

  const today          = new Date();
  const todayBookings  = getTodayBookings();
  const monthBookings  = getMonthBookings(today.getFullYear(), today.getMonth());
  const mostBooked     = getMostBookedService();
  const upcoming       = getUpcoming();
  const totalRevenue   = monthBookings.reduce((sum, b) => sum + b.service.price, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Calendar size={20} className="text-brand-600" />}  label="Hoje"         value={todayBookings.length} sub="agendamentos" />
        <Stat icon={<TrendingUp size={20} className="text-gold-500" />} label="Este Mês"     value={monthBookings.length} sub="agendamentos" />
        <Stat icon={<span className="text-lg">💰</span>}                label="Receita"      value={formatPrice(totalRevenue)} sub="este mês" small />
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
  return (
    <li className="flex items-start gap-3 p-3 bg-warm-50 border border-brand-50">
      <span className="text-xl mt-0.5">{b.service.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-brand-900 leading-tight">{b.service.name}</p>
            <p className="text-xs text-brand-400 mt-0.5">{b.client.name} · {formatTime(b.timeSlot)}</p>
            <p className="text-xs text-brand-300">{formatDateLong(new Date(b.date))}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-bold text-brand-900 text-sm">{formatPrice(b.service.price)}</span>
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
