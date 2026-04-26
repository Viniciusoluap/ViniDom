import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      <div className="text-8xl mb-6">✂️</div>
      <h1 className="text-6xl font-bold text-primary-800 mb-2">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Página não encontrada</h2>
      <p className="text-gray-500 max-w-md mb-8">
        Ops! Parece que essa página foi cortada do menu. Mas não se preocupe – ainda podemos cuidar do seu visual.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/" className="btn-primary flex items-center justify-center gap-2">
          Ir para Início <ArrowRight size={16} />
        </Link>
        <Link to="/agendamento" className="btn-secondary flex items-center justify-center gap-2">
          Fazer Agendamento
        </Link>
      </div>
    </div>
  );
}
