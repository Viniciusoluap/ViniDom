import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      <span className="text-6xl mb-6">✂️</span>
      <p className="section-subtitle mb-2">Erro</p>
      <h1 className="text-7xl font-bold text-brand-100 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-brand-900 mb-4">Página não encontrada</h2>
      <p className="text-brand-400 text-sm max-w-sm mb-10 leading-relaxed">
        Essa página foi cortada do menu. Mas ainda podemos cuidar do seu visual.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/" className="btn-primary flex items-center justify-center gap-2">
          Ir para Início <ArrowRight size={14} />
        </Link>
        <Link to="/agendamento" className="btn-secondary flex items-center justify-center gap-2">
          Agendamento
        </Link>
      </div>
    </div>
  );
}
