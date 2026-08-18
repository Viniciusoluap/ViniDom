import { useEffect, useMemo, useState } from 'react';
import { UserCircle, CheckCircle, XCircle, Clock, Calendar, ChevronLeft, ChevronRight, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { DAY_NAMES_PT, MONTH_NAMES_PT } from '../utils/constants';
import { useBookings } from '../hooks/useBookings';
import { supabase } from '../lib/supabase';
import { dateToKey, formatTime, formatPrice } from '../utils/dateFormatter';

const STATUS_LABELS = {
  confirmed: { label: 'Confirmado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  attended:  { label: 'Atendido',   cls: 'bg-green-50 text-green-700 border-green-200' },
  no_show:   { label: 'Faltou',     cls: 'bg-red-50 text-red-700 border-red-200' },
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={14} /> },
  { id: 'agenda',    label: 'Agenda',    icon: <Calendar  size={14} /> },
];

export default function Funcionario() {
  const [authed, setAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError]       = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [staffMember, setStaffMember] = useState(null);
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const {
    bookings,
    loading,
    error: bookingsError,
    reload: reloadBookings,
    updateBookingStatus,
  } = useBookings(authed);

  useEffect(() => {
    sessionStorage.removeItem('staff_auth');
    sessionStorage.removeItem('staff_member');
    if (!supabase) {
      queueMicrotask(() => setAuthReady(true));
      return undefined;
    }

    let active = true;
    const applySession = (session) => {
      const metadata = session?.user?.app_metadata || {};
      const allowed = metadata.role === 'staff' && metadata.active !== false && metadata.professional_name;
      const member = allowed ? {
        name: metadata.professional_name,
        role: metadata.professional_role || 'Equipe',
        color: metadata.professional_color || '#1a1a2e',
        initials: metadata.professional_initials || metadata.professional_name.slice(0, 2).toUpperCase(),
      } : null;
      if (session && !allowed) void supabase.auth.signOut();
      if (active) {
        setStaffMember(member);
        setAuthed(Boolean(member));
        setAuthReady(true);
      }
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(false);
    setErrorMsg('');
    if (!supabase) {
      setError(true);
      setErrorMsg('Supabase Auth não configurado.');
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });
    if (authError) {
      setError(true);
      setErrorMsg('E-mail ou senha incorretos.');
      setPw('');
    }
  };

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    setAuthed(false);
    setStaffMember(null);
    setEmail('');
    setPw('');
    setError(false);
    setErrorMsg('');
  };

  const shift = (n) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + n);
    setSelectedDate(d);
  };

  const dayKey  = dateToKey(selectedDate);
  const isToday = dayKey === dateToKey(new Date());
  const todayKey = dateToKey(new Date());

  const myBookings = useMemo(() => {
    if (!staffMember) return [];
    return bookings.filter(b => b.status !== 'cancelled' && b.professional === staffMember.name);
  }, [bookings, staffMember]);

  const dayBookings = useMemo(() =>
    myBookings.filter(b => b.dateKey === dayKey).sort((a, b) => a.timeSlot - b.timeSlot),
    [myBookings, dayKey]
  );

  const upcomingBookings = useMemo(() => {
    const now = new Date();
    return myBookings
      .filter(b => {
        const d = new Date(b.date);
        d.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
        return d >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.date); da.setHours(Math.floor(a.timeSlot / 60), a.timeSlot % 60, 0, 0);
        const db = new Date(b.date); db.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
        return da - db;
      })
      .slice(0, 10);
  }, [myBookings]);

  // Dashboard stats
  const statsToday = useMemo(() =>
    myBookings.filter(b => b.dateKey === todayKey).length,
    [myBookings, todayKey]
  );
  const now = new Date();
  const statsMonth = useMemo(() =>
    myBookings.filter(b => {
      const d = new Date(b.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length,
    [myBookings]
  );
  const statsRevenue = useMemo(() =>
    myBookings
      .filter(b => {
        const d = new Date(b.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && b.status === 'attended';
      })
      .reduce((s, b) => s + (b.totalPrice || 0), 0),
    [myBookings]
  );

  if (!authReady) return (
    <div className="flex-1 flex items-center justify-center pt-24">
      <div className="w-6 h-6 border-2 border-brand-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Tela de login ──
  if (!authed) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-24 animate-fade-in">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-900 flex items-center justify-center">
              <UserCircle size={18} className="text-white" />
            </div>
            <div>
              <p className="text-brand-900 font-semibold tracking-wide">Área do Funcionário</p>
              <p className="text-brand-400 text-xs tracking-widest uppercase mt-0.5">Vinicius Cavalcante</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(false); setErrorMsg(''); }}
                placeholder="seu@email.com"
                autoFocus
                autoComplete="email"
                className={`input-field ${error ? 'border-red-400 focus:border-red-400' : ''}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(false); setErrorMsg(''); }}
                  placeholder="Sua senha de acesso"
                  autoComplete="current-password"
                  className={`input-field pr-10 ${error ? 'border-red-400 focus:border-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-300 hover:text-brand-900 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-xs tracking-wide -mt-2">{errorMsg}</p>
            )}
            <button type="submit" className="btn-primary w-full text-center">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  if (bookingsError) return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-3xl mx-auto w-full animate-fade-in">
      <div className="bg-red-50 border border-red-200 px-5 py-6 text-center">
        <p className="text-sm font-semibold text-red-800">Não foi possível carregar sua agenda.</p>
        <p className="text-xs text-red-600 mt-1">Os dados não foram substituídos por uma lista vazia.</p>
        <p className="text-[11px] text-red-500 mt-2 break-words">{bookingsError}</p>
        <button onClick={reloadBookings} className="btn-secondary mt-4 py-1.5 px-4 text-xs">
          Tentar novamente
        </button>
      </div>
    </div>
  );

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

      {/* Tabs — apenas Dashboard e Agenda */}
      <div className="flex gap-1 mb-6 border-b border-brand-100 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold tracking-widest uppercase transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-brand-900 text-white border-brand-900'
                : 'text-brand-500 border-transparent hover:text-brand-900 hover:border-brand-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-10 text-brand-300 text-sm">Carregando...</div>
      )}

      {/* ── Dashboard Tab ── */}
      {!loading && activeTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in">

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-brand-100 p-4 text-center">
              <p className="text-2xl font-bold text-brand-900">{statsToday}</p>
              <p className="text-xs text-brand-400 uppercase tracking-widest mt-1">Hoje</p>
            </div>
            <div className="bg-white border border-brand-100 p-4 text-center">
              <p className="text-2xl font-bold text-brand-900">{statsMonth}</p>
              <p className="text-xs text-brand-400 uppercase tracking-widest mt-1">Este mês</p>
            </div>
            <div className="bg-white border border-brand-100 p-4 text-center">
              <p className="text-lg font-bold text-gold-500 leading-tight mt-0.5">{formatPrice(statsRevenue)}</p>
              <p className="text-xs text-brand-400 uppercase tracking-widest mt-1">Receita/mês</p>
            </div>
          </div>

          {/* Próximos agendamentos */}
          <Section title="Próximos Agendamentos" icon={<Clock size={15} />}>
            {upcomingBookings.length === 0 ? (
              <p className="text-brand-300 text-sm text-center py-8">Nenhum agendamento futuro.</p>
            ) : (
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
            )}
          </Section>
        </div>
      )}

      {/* ── Agenda Tab ── */}
      {!loading && activeTab === 'agenda' && (
        <div className="space-y-6 animate-fade-in">

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
              <p className="text-xs text-brand-300">
                {year} · {dayBookings.length} agendamento{dayBookings.length !== 1 ? 's' : ''}
              </p>
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
  const services   = b.services || (b.service ? [b.service] : []);
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
              <p className="text-brand-400 text-xs mt-0.5">
                {compact
                  ? `${new Date(b.date).toLocaleDateString('pt-BR')} às ${formatTime(b.timeSlot)}`
                  : `${new Date(b.date).toLocaleDateString('pt-BR')} · ${formatTime(b.timeSlot)}`
                }
              </p>
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
