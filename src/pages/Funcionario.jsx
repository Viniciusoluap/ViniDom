import { useState, useMemo } from 'react';
import { Lock, CheckCircle, XCircle, Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { STAFF_PASSWORD, DAY_NAMES_PT, MONTH_NAMES_PT } from '../utils/constants';
import { useBookings } from '../hooks/useBookings';
import { loadStaff } from '../utils/staffService';
import { dateToKey, formatTime, formatPrice } from '../utils/dateFormatter';

const STATUS_LABELS = {
  confirmed: { label: 'Confirmado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  attended:  { label: 'Atendido',   cls: 'bg-green-50 text-green-700 border-green-200' },
  no_show:   { label: 'Faltou',     cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function Funcionario() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('staff_auth'));
  const [pw, setPw]         = useState('');
  const [error, setError]   = useState(false);
  const [staffMember, setStaffMember] = useState(() => {
    try {
      const s = sessionStorage.getItem('staff_member');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { bookings, loading, updateBookingStatus } = useBookings();
  const staffList = loadStaff();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!staffMember) { setError(true); return; }
    if (pw === STAFF_PASSWORD) {
      sessionStorage.setItem('staff_auth', '1');
      sessionStorage.setItem('staff_member', JSON.stringify(staffMember));
      setAuthed(true);
    } else {
      setError(true);
      setPw('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('staff_auth');
    sessionStorage.removeItem('staff_member');
    setAuthed(false);
    setStaffMember(null);
    setPw('');
  };

  const shift = (n) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + n);
    setSelectedDate(d);
  };

  // Agendamentos filtrados pelo profissional logado e data selecionada
  const dayKey  = dateToKey(selectedDate);
  const isToday = dayKey === dateToKey(new Date());

  const dayBookings = useMemo(() => {
    if (!staffMember) return [];
    return bookings
      .filter(b =>
        b.status !== 'cancelled' &&
        b.dateKey === dayKey &&
        b.professional === staffMember.name
      )
      .sort((a, b) => a.timeSlot - b.timeSlot);
  }, [bookings, dayKey, staffMember]);

  const upcomingBookings = useMemo(() => {
    if (!staffMember) return [];
    const now = new Date();
    return bookings
      .filter(b => {
        if (b.status === 'cancelled' || b.professional !== staffMember.name) return false;
        const d = new Date(b.date);
        d.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
        return d >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.date); da.setHours(Math.floor(a.timeSlot / 60), a.timeSlot % 60, 0, 0);
        const db = new Date(b.date); db.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
        return da - db;
      })
      .slice(0, 20);
  }, [bookings, staffMember]);

  // ── Tela de login ──
  if (!authed) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-24 animate-fade-in">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-900 flex items-center justify-center">
              <Lock size={18} className="text-white" />
            </div>
            <div>
              <p className="text-brand-900 font-semibold tracking-wide">Área do Funcionário</p>
              <p className="text-brand-400 text-xs tracking-widest uppercase mt-0.5">Vinicius Cavalcante</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1.5">
                Selecione seu nome
              </label>
              <select
                value={staffMember?.id || ''}
                onChange={e => {
                  const found = staffList.find(s => String(s.id) === e.target.value);
                  setStaffMember(found || null);
                  setError(false);
                }}
                className={`input-field ${error && !staffMember ? 'border-red-400' : ''}`}
              >
                <option value="">— Selecione —</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(false); }}
                placeholder="Senha do funcionário"
                autoFocus
                className={`input-field ${error ? 'border-red-400 focus:border-red-400' : ''}`}
              />
            </div>
            {error && (
              <p className="text-red-500 text-xs tracking-wide -mt-2">
                {!staffMember ? 'Selecione seu nome.' : 'Senha incorreta.'}
              </p>
            )}
            <button type="submit" className="btn-primary w-full text-center">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  const dayName   = DAY_NAMES_PT[selectedDate.getDay()];
  const dayNum    = selectedDate.getDate();
  const monthName = MONTH_NAMES_PT[selectedDate.getMonth()];
  const year      = selectedDate.getFullYear();

  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-3xl mx-auto w-full animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: staffMember?.color || '#1a1a2e' }}
          >
            {staffMember?.initials || '?'}
          </div>
          <div>
            <p className="text-brand-900 font-bold tracking-wide">{staffMember?.name}</p>
            <p className="text-brand-400 text-xs tracking-widest uppercase mt-0.5">{staffMember?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-brand-400 hover:text-brand-900 tracking-widest uppercase transition-colors"
        >
          Sair
        </button>
      </div>

      {loading && (
        <div className="text-center py-10 text-brand-300 text-sm">Carregando agenda...</div>
      )}

      {!loading && (
        <div className="space-y-6">

          {/* Navegação de data */}
          <div className="flex items-center gap-3 bg-white border border-brand-100 p-4">
            <button onClick={() => shift(-1)}
              className="p-2 border border-brand-100 text-brand-400 hover:text-brand-900 hover:border-brand-900 transition-all">
              <ChevronLeft size={15} />
            </button>
            <div className="flex-1 text-center">
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
            <button onClick={() => setSelectedDate(new Date())}
              className="btn-secondary py-1.5 text-xs px-3">
              Hoje
            </button>
          </div>

          {/* Agenda do dia */}
          <Section title="Minha Agenda" icon={<Calendar size={15} />}>
            {dayBookings.length === 0 ? (
              <p className="text-brand-300 text-sm text-center py-8">Nenhum agendamento neste dia.</p>
            ) : (
              <div className="space-y-3">
                {dayBookings.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onUpdateStatus={updateBookingStatus}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Próximos */}
          {upcomingBookings.length > 0 && (
            <Section title="Próximos Agendamentos" icon={<Clock size={15} />}>
              <div className="space-y-3">
                {upcomingBookings.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onUpdateStatus={updateBookingStatus}
                    compact
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white border border-brand-100">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-brand-100">
        <span className="text-brand-400">{icon}</span>
        <h2 className="font-bold text-brand-900 text-sm tracking-wide">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function BookingCard({ booking: b, onUpdateStatus, compact }) {
  const services = b.services || (b.service ? [b.service] : []);
  const statusInfo = STATUS_LABELS[b.status] || STATUS_LABELS.confirmed;

  return (
    <div className="border border-brand-100 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{services[0]?.icon || '✂️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-900 text-sm">
                {services.map(s => s.name).join(' + ')}
              </p>
              <p className="text-brand-700 text-sm font-medium mt-0.5">{b.client?.name || '—'}</p>
              {!compact && (
                <p className="text-brand-400 text-xs mt-0.5">
                  {new Date(b.date).toLocaleDateString('pt-BR')} · {formatTime(b.timeSlot)}
                </p>
              )}
              {compact && (
                <p className="text-brand-400 text-xs mt-0.5">
                  {new Date(b.date).toLocaleDateString('pt-BR')} às {formatTime(b.timeSlot)}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-brand-900 text-sm">{formatPrice(b.totalPrice || 0)}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium border rounded-full ${statusInfo.cls}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de status — apenas para agendamentos confirmados */}
      {b.status === 'confirmed' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onUpdateStatus(b.id, 'attended')}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-2 transition-colors"
          >
            <CheckCircle size={13} /> Atendido
          </button>
          <button
            onClick={() => onUpdateStatus(b.id, 'no_show')}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 transition-colors"
          >
            <XCircle size={13} /> Faltou
          </button>
        </div>
      )}

      {/* Desfazer para confirmado */}
      {(b.status === 'attended' || b.status === 'no_show') && (
        <button
          onClick={() => onUpdateStatus(b.id, 'confirmed')}
          className="w-full text-xs text-brand-400 hover:text-brand-900 py-1 transition-colors"
        >
          ↩ Desfazer
        </button>
      )}
    </div>
  );
}
