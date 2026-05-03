import { useState } from 'react';
import Dashboard from '../components/Dashboard';
import { BarChart3, Lock } from 'lucide-react';
import { ADMIN_PASSWORD } from '../utils/constants';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem('admin_auth'));
  const [pw, setPw]         = useState('');
  const [error, setError]   = useState(false);

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
            {error && (
              <p className="text-red-500 text-xs tracking-wide -mt-2">Senha incorreta.</p>
            )}
            <button type="submit" className="btn-primary w-full text-center">
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex items-center justify-between mb-8">
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
      {!supabase && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-6 text-xs text-amber-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>Dados armazenados localmente neste dispositivo. Configure o Supabase para salvar na nuvem.</span>
        </div>
      )}
      {supabase && (
        <div className="bg-green-50 border border-green-200 px-4 py-3 mb-6 text-xs text-green-700 flex items-center gap-2">
          <span>✅</span>
          <span>Conectado ao banco de dados na nuvem.</span>
        </div>
      )}
      <Dashboard />
    </div>
  );
}
