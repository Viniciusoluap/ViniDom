import Dashboard from '../components/Dashboard';
import { BarChart3 } from 'lucide-react';

export default function Admin() {
  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-brand-900 flex items-center justify-center">
          <BarChart3 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-900 tracking-wide">Painel Administrativo</h1>
          <p className="text-brand-400 text-xs tracking-widest uppercase">Dom Concept · Visão geral</p>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-6 text-xs text-amber-700 flex items-center gap-2">
        <span>⚠️</span>
        <span>Dados armazenados localmente neste dispositivo.</span>
      </div>
      <Dashboard />
    </div>
  );
}
