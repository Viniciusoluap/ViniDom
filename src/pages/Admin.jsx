import { useState } from 'react';
import Dashboard from '../components/Dashboard';
import Agenda from '../components/Agenda';
import ClientsList from '../components/ClientsList';
import StaffList from '../components/StaffList';
import Reports from '../components/Reports';
import { BarChart3, Calendar, Users, Briefcase, TrendingUp, Lock } from 'lucide-react';
import { ADMIN_PASSWORD } from '../utils/constants';
import { supabase } from '../lib/supabase';
import { useBookings } from '../hooks/useBookings';
import { useStaff } from '../hooks/useStaff';

export default function Admin() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('admin_auth'));
  const [pw, setPw]         = useState('');
  const [error, setError]   = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const { bookings, loading, updateClient, deleteClient } = useBookings();
  const { staff, addMember, updateMember, deleteMember } = useStaff();

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1');
      setAuthed(true);
    } else {
      setError(true);
      setPw('');
    }
  };

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
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(false); }}
              placeholder="Senha"
              autoFocus
              className={`input-field ${error ? 'border-red-400 focus:border-red-400' : ''}`}
            />
            {error && <p className="text-red-500 text-xs tracking-wide -mt-2">Senha incorreta.</p>}
            <button type="submit" className="btn-primary w-full text-center">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard',    label: 'Dashboard',    icon: <BarChart3  size={14} /> },
    { id: 'agenda',       label: 'Agenda',        icon: <Calendar   size={14} /> },
    { id: 'clientes',     label: 'Clientes',      icon: <Users      size={14} /> },
    { id: 'funcionarios', label: 'Funcionários',  icon: <Briefcase  size={14} /> },
    { id: 'relatorios',   label: 'Relatórios',    icon: <TrendingUp size={14} /> },
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
          onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false); }}
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
      {activeTab === 'dashboard'    && <Dashboard />}
      {activeTab === 'agenda'       && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando agenda...</div>
          : <Agenda bookings={bookings} staff={staff} />
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
      {activeTab === 'relatorios'   && (
        loading
          ? <div className="text-center py-16 text-brand-300 text-sm">Carregando relatórios...</div>
          : <Reports bookings={bookings} />
      )}
    </div>
  );
}
