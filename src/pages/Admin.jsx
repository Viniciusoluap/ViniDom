import Dashboard from '../components/Dashboard';
import { BarChart3 } from 'lucide-react';

export default function Admin() {
  return (
    <div className="flex-1 py-10 px-4 sm:px-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary-800 rounded-xl flex items-center justify-center">
          <BarChart3 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Painel Administrativo</h1>
          <p className="text-gray-500 text-sm">Dom Concept – Visão geral dos agendamentos</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700 flex items-center gap-2">
        <span>⚠️</span>
        <span>Área administrativa. Os dados são armazenados localmente neste dispositivo.</span>
      </div>

      <Dashboard />
    </div>
  );
}
