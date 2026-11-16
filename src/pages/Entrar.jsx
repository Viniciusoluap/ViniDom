import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { homeForSession } from '../utils/authRoles';


export default function Entrar() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!supabase) {
      queueMicrotask(() => setReady(true));
      return undefined;
    }
    let active = true;
    const route = (session) => {
      if (!active) return;
      const target = homeForSession(session);
      if (target) {
        navigate(target, { replace: true });
        return;
      }
      if (session) {
        void supabase.auth.signOut();
        setErrorMsg('Este usuário não tem acesso liberado. Fale com o administrador.');
      }
      setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => route(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => route(session));
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!supabase) {
      setErrorMsg('Login indisponível no momento.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) {
      setErrorMsg('E-mail ou senha incorretos.');
      setPw('');
    }
  };

  if (!ready) return (
    <div className="flex-1 flex items-center justify-center pt-24">
      <div className="w-6 h-6 border-2 border-brand-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-900 flex items-center justify-center">
            <Lock size={18} className="text-white" />
          </div>
          <div>
            <p className="text-brand-900 font-semibold tracking-wide">Acesso restrito</p>
            <p className="text-brand-400 text-xs tracking-widest uppercase mt-0.5">Vinicius Cavalcante</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
            placeholder="E-mail"
            autoComplete="username"
            autoFocus
            className={`input-field ${errorMsg ? 'border-red-400 focus:border-red-400' : ''}`}
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErrorMsg(''); }}
              placeholder="Senha"
              autoComplete="current-password"
              className={`input-field pr-10 ${errorMsg ? 'border-red-400 focus:border-red-400' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-300 hover:text-brand-900"
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errorMsg && <p className="text-red-500 text-xs tracking-wide -mt-2">{errorMsg}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full text-center disabled:opacity-50">
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
