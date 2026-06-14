import { Calendar, TrendingUp, Star, Clock } from 'lucide-react';
import { formatDateLong, formatTime, formatPrice, dateToKey } from '../utils/dateFormatter';
import { MONTH_NAMES_PT } from '../utils/constants';

export default function Dashboard({ bookings, onCancel }) {
  const today        = new Date();
  const todayKey     = dateToKey(today);
  const currentYear  = today.getFullYear();
  const currentMonth = today.getMonth();
  const now          = today.getTime();

  const todayBookings = bookings.filter(b => b.dateKey === todayKey && b.status !== 'cancelled');

  const monthBookings = bookings.filter(b => {
    if (b.status === 'cancelled') return false;
    const d = new Date(b.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const upcoming = bookings
    .filter(b => {
      if (b.status === 'cancelled') return false;
      const d = new Date(b.date);
      d.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
      return d.getTime() >= now;
    })
    .sort((a, b) => {
      const da = new Date(a.date); da.setHours(Math.floor(a.timeSlot / 60), a.timeSlot % 60, 0, 0);
      const db = new Date(b.date); db.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
      return da - db;
    })
    .slice(0, 10);

  const counts = {};
  bookings.filter(b => b.status !== 'cancelled').forEach(b => {
    const list = b.services || (b.service ? [b.service] : []);
    list.forEach(s => { counts[s.name] = (counts[s.name] || 0) + 1; });
  });
  const entries    = Object.entries(counts);
  const mostBooked = entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : null;
  const totalRevenue = monthBookings.reduce((sum, b) => sum + (b.totalPrice ?? b.service?.price ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Calendar size={20} className="text-brand-600" />}  label="Hoje"          value={todayBookings.length} sub="agendamentos" />
        <Stat icon={<TrendingUp size={20} className="text-gold-500" />} label={`${MONTH_NAMES_PT[currentMonth]} ${currentYear}`} value={monthBookings.length} sub="agendamentos" />
        <Stat icon={<span className="text-lg">💰</span>}                label="Receita"       value={formatPrice(totalRevenue)} sub={`${MONTH_NAMES_PT[currentMonth].toLowerCase()} ${currentYear}`} small />
        <Stat icon={<Star size={20} className="text-gold-400" />}       label="Mais Agendado" value={mostBooked || '—'} sub="serviço" small />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Agenda de Hoje" icon={<Calendar size={16} />} empty={!todayBookings.length}>
          {todayBookings.map(b => <BookingRow key={b.id} booking={b} onCancel={onCancel} showConfirm />)}
        </Panel>
        <Panel title="Próximos Agendamentos" icon={<Clock size={16} />} empty={!upcoming.length}>
          <div className="max-h-80 overflow-y-auto space-y-3">
            {upcoming.map(b => <BookingRow key={b.id} booking={b} onCancel={onCancel} />)}
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

function BookingRow({ booking: b, onCancel, showConfirm }) {
  const services = b.services || (b.service ? [b.service] : []);
  const price    = b.totalPrice ?? b.service?.price ?? 0;

  const confirmWaLink = () => {
    const digits = (b.client?.phone || '').replace(/\D/g, '');
    const names  = services.map(s => s.name).join(' + ');
    const hora   = formatTime(b.timeSlot);
    const msg    = encodeURIComponent(
      `Olá, ${b.client?.name}! 😊 Aqui é o Vinicius Cavalcante. Passando pra confirmar o seu horário de hoje às ${hora} para ${names}. Você estará presente? Nos confirme aqui. 🙏✂️`
    );
    return `https://wa.me/55${digits}?text=${msg}`;
  };

  return (
    <li className="p-3 bg-warm-50 border border-brand-50 space-y-2">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{services[0]?.icon ?? '✂️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-brand-900 leading-tight">
                {services.map(s => s.name).join(' + ')}
              </p>
              <p className="text-xs text-brand-400 mt-0.5">{b.client?.name} · {formatTime(b.timeSlot)}</p>
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
      </div>
      {showConfirm && (
        <a
          href={confirmWaLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 transition-colors"
        >
          <WaIcon /> Confirmar Presença
        </a>
      )}
    </li>
  );
}

function WaIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
