import { useState, useEffect, useRef } from 'react';
import Dashboard from '../components/Dashboard';
import Agenda from '../components/Agenda';
import ClientsList from '../components/ClientsList';
import StaffList from '../components/StaffList';
import Reports from '../components/Reports';
import WhatsAppHub from '../components/WhatsAppHub';
import Contabilidade from '../components/Contabilidade';
import { BarChart3, Calendar, Users, Briefcase, TrendingUp, Lock, X, MessageCircle, Calculator } from 'lucide-react';
import { BUSINESS_HOURS, DAY_KEYS } from '../utils/constants';
import { supabase } from '../lib/supabase';
import { useBookings } from '../hooks/useBookings';
import { useStaff } from '../hooks/useStaff';
import { dateToKey, formatTime } from '../utils/dateFormatter';

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail]   = useState('');
  const [pw, setPw]         = useState('');
  const [error, setError]   = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [showDailyConfirm, setShowDailyConfirm]       = useState(false);
  const [dailyConfirmBookings, setDailyConfirmBookings] = useState([]);

  const { bookings, loading, cancelBooking, updateBookingStatus, updateBooking, updateClient, deleteClient } = useBookings();
  const { staff, addMember, updateMember, deleteMember } = useStaff();

  useEffect(() => {
    // Remove apenas a marca de sessão legada; ela nunca é usada como autorização.
    sessionStorage.removeItem('admin_auth');
    if (!supabase) {
      queueMicrotask(() => setAuthReady(true));
      return undefined;
    }

    let active = true;
    const applySession = (session) => {
      const allowed = session?.user?.app_metadata?.role === 'admin';
      if (session && !allowed) {
        void supabase.auth.signOut();
      }
      if (active) {
        setAuthed(allowed);
        setAuthReady(true);
      }
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Ref para leitura dos agendamentos dentro do interval sem stale closure
  const bookingsRef = useRef(bookings);
  useEffect(() => { bookingsRef.current = bookings; }, [bookings]);

  // Disparo automático às 9h — verifica a cada minuto e na carga inicial
  useEffect(() => {
    if (!authed) return;

    const check = () => {
      const now    = new Date();
      const dayKey = DAY_KEYS[now.getDay()];
      if (!BUSINESS_HOURS[dayKey]) return;       // Dia fechado
      if (now.getHours() < 9) return;            // Antes das 9h
      const todayStr = dateToKey(now);
      if (localStorage.getItem(`confirm_modal_${todayStr}`)) return; // Já disparou hoje

      const todayBkgs = bookingsRef.current.filter(b =>
        b.dateKey === todayStr &&
        b.status === 'confirmed' &&
        (b.client?.phone || '').replace(/\D/g, '').length >= 10
      );
      if (!todayBkgs.length) return;

      localStorage.setItem(`confirm_modal_${todayStr}`, '1');
      setDailyConfirmBookings(todayBkgs);
      setShowDailyConfirm(true);
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [authed]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(false);
    if (!supabase) {
      setError(true);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });
    if (authError) {
      setError(true);
      setPw('');
    }
  };

  if (!authReady) return (
    <div className="flex-1 flex items-center justify-center pt-24">
      <div className="w-6 h-6 border-2 border-brand-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!authed) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-24 animate-fade-in">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-900 flex items-center justify-center">
              <Lock size={18} className="text-white" />
            </div>
            <div>
              <p className="text-brand-900 font-semibold tracking-wide">Acesso Administrativo</p>
              <p className="text-brand-400 text-xs tracking-widest uppercase mt-0.5">Vinicius Cavalcante</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(false); }}
              placeholder="E-mail administrativo"
              autoComplete="username"
              autoFocus
              className={`input-field ${error ? 'border-red-400 focus:border-red-400' : ''}`}
            />
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(false); }}
              placeholder="Senha"
              autoComplete="current-password"
              className={`input-field ${error ? 'border-red-400 focus:border-red-400' : ''}`}
            />
            {error && <p className="text-red-500 text-xs tracking-wide -mt-2">E-mail ou senha incorretos, ou Supabase Auth não configurado.</p>}
            <button type="submit" className="btn-primary w-full text-center">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard',     label: 'Dashboard',     icon: <BarChart3     size={14} /> },
    { id: 'agenda',        label: 'Agenda',         icon: <Calendar      size={14} /> },
    { id: 'clientes',      label: 'Clientes',       icon: <Users         size={14} /> },
    { id: 'funcionarios',  label: 'Funcionários',   icon: <Briefcase     size={14} /> },
    { id: 'whatsapp',      label: 'WhatsApp',       icon: <MessageCircle size={14} /> },
    { id: 'relatorios',    label: 'Relatórios',     icon: <TrendingUp    size={14} /> },
    { id: 'contabilidade', label: 'Contabilidade',  icon: <Calculator    size={14} /> },
  ];

  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-6xl mx-auto w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-900 flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-900 tracking-wide">Painel Administrativo</h1>
            <p className="text-brand-400 text-xs tracking-widest uppercase">Vinicius Cavalcante · Visão geral</p>
          </div>
        </div>
        <button
          onClick={async () => { await supabase?.auth.signOut(); setAuthed(false); }}
          className="text-xs text-brand-400 hover:text-brand-900 tracking-widest uppercase transition-colors"
        >
          Sair
        </button>
      </div>

      {/* Connection status */}
      {!supabase && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-5 text-xs text-amber-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>Dados armazenados localmente neste dispositivo. Configure o Supabase para salvar na nuvem.</span>
        </div>
      )}
      {supabase && (
        <div className="bg-green-50 border border-green-200 px-4 py-3 mb-5 text-xs text-green-700 flex items-center gap-2">
          <span>✅</span>
          <span>Conectado ao banco de dados na nuvem.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-brand-100 overflow-x-auto">
        {tabs.map(tab => (
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

      {/* Tab content */}
      {activeTab === 'dashboard'    && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando...</div>
          : <Dashboard bookings={bookings} onCancel={cancelBooking} />
      )}
      {activeTab === 'agenda'       && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando agenda...</div>
          : <Agenda
              bookings={bookings}
              staff={staff}
              onUpdateStatus={updateBookingStatus}
              onEdit={updateBooking}
              onCancel={cancelBooking}
            />
      )}
      {activeTab === 'clientes'     && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando clientes...</div>
          : <ClientsList bookings={bookings} onUpdate={updateClient} onDelete={deleteClient} />
      )}
      {activeTab === 'funcionarios' && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando funcionários...</div>
          : <StaffList bookings={bookings} staff={staff} onAdd={addMember} onUpdate={updateMember} onDelete={deleteMember} />
      )}
      {activeTab === 'relatorios'    && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando relatórios...</div>
          : <Reports bookings={bookings} />
      )}
      {activeTab === 'whatsapp'      && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando...</div>
          : <WhatsAppHub bookings={bookings} />
      )}
      {activeTab === 'contabilidade' && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando...</div>
          : <Contabilidade bookings={bookings} />
      )}

      {/* Modal automático de confirmações do dia (dispara às 9h) */}
      {showDailyConfirm && (
        <DailyConfirmationModal
          bookings={dailyConfirmBookings}
          onClose={() => setShowDailyConfirm(false)}
        />
      )}
    </div>
  );
}

function DailyConfirmationModal({ bookings, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white w-full max-w-sm max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-100">
          <div>
            <p className="font-bold text-brand-900 text-sm">Confirmações do Dia</p>
            <p className="text-brand-400 text-xs">
              {bookings.length} agendamento{bookings.length !== 1 ? 's' : ''} para confirmar
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-brand-400 hover:text-brand-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {bookings.map(b => {
            const services = b.services || (b.service ? [b.service] : []);
            const names    = services.map(s => s.name).join(' + ');
            const hora     = formatTime(b.timeSlot);
            const digits   = (b.client?.phone || '').replace(/\D/g, '');
            const msg      = encodeURIComponent(
              `Olá, ${b.client?.name}! 😊 Aqui é o Vinicius Cavalcante. Passando pra confirmar o seu horário de hoje às ${hora} para ${names}. Você estará presente? 🙏✂️`
            );
            const waLink = `https://wa.me/55${digits}?text=${msg}`;

            return (
              <div key={b.id} className="flex items-center gap-3 p-3 border border-brand-100">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-900 text-sm truncate">{b.client?.name}</p>
                  <p className="text-brand-400 text-xs truncate">{hora} · {names}</p>
                </div>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 transition-colors"
                >
                  <WaIcon /> Confirmar
                </a>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-brand-100">
          <button onClick={onClose} className="w-full btn-secondary text-sm py-2">
            Fechar
          </button>
        </div>
      </div>
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
