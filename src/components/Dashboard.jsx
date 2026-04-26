import { Calendar, TrendingUp, Star, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useBookings } from '../hooks/useBookings';
import { formatDateLong, formatTime, formatPrice } from '../utils/dateFormatter';

export default function Dashboard() {
  const {
    getTodayBookings,
    getMonthBookings,
    getMostBookedService,
    getUpcoming,
    cancelBooking,
  } = useBookings();

  const today = new Date();
  const todayBookings = getTodayBookings();
  const monthBookings = getMonthBookings(today.getFullYear(), today.getMonth());
  const mostBooked = getMostBookedService();
  const upcoming = getUpcoming();

  const totalRevenue = monthBookings.reduce((sum, b) => sum + b.service.price, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar size={22} className="text-primary-600" />}
          label="Hoje"
          value={todayBookings.length}
          sub="agendamentos"
          color="bg-primary-50"
        />
        <StatCard
          icon={<TrendingUp size={22} className="text-green-600" />}
          label="Este Mês"
          value={monthBookings.length}
          sub="agendamentos"
          color="bg-green-50"
        />
        <StatCard
          icon={<span className="text-xl">💰</span>}
          label="Receita"
          value={formatPrice(totalRevenue)}
          sub="este mês"
          color="bg-gold-400/10"
        />
        <StatCard
          icon={<Star size={22} className="text-yellow-500" />}
          label="Mais Agendado"
          value={mostBooked || '—'}
          sub="serviço"
          color="bg-yellow-50"
          small
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-bold text-primary-800 mb-4 flex items-center gap-2">
            <Calendar size={18} />
            Agenda de Hoje
          </h3>
          {todayBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum agendamento hoje.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {todayBookings.map((b) => (
                <BookingItem key={b.id} booking={b} onCancel={cancelBooking} />
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-primary-800 mb-4 flex items-center gap-2">
            <Clock size={18} />
            Próximos Agendamentos
          </h3>
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum agendamento futuro.</p>
            </div>
          ) : (
            <ul className="space-y-3 max-h-80 overflow-y-auto">
              {upcoming.map((b) => (
                <BookingItem key={b.id} booking={b} onCancel={cancelBooking} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, small }) {
  return (
    <div className={`card p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`font-bold text-primary-800 leading-tight ${small ? 'text-sm' : 'text-2xl'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function BookingItem({ booking: b, onCancel }) {
  return (
    <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="text-xl mt-0.5">{b.service.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-gray-800 leading-tight">{b.service.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{b.client.name} · {formatTime(b.timeSlot)}</p>
            <p className="text-xs text-gray-400">{formatDateLong(new Date(b.date))}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-bold text-primary-800 text-sm">{formatPrice(b.service.price)}</span>
            <button
              onClick={() => onCancel(b.id)}
              className="block mt-1 text-xs text-red-400 hover:text-red-600 transition-colors"
              aria-label="Cancelar"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
