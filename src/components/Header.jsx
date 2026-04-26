import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Scissors } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Início' },
  { to: '/servicos', label: 'Serviços' },
  { to: '/agendamento', label: 'Agendar' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-primary-800 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
            <div className="w-9 h-9 bg-gold-400 rounded-lg flex items-center justify-center shadow-md group-hover:bg-gold-500 transition-colors">
              <Scissors size={18} className="text-white" />
            </div>
            <div className="leading-none">
              <span className="block text-white font-bold text-lg tracking-wide">Dom Concept</span>
              <span className="block text-primary-300 text-xs">Imperatriz • MA</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/agendamento"
              className="ml-3 bg-gold-400 hover:bg-gold-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-md"
            >
              Agendar Agora
            </Link>
          </nav>

          <button
            className="md:hidden p-2 rounded-lg text-primary-100 hover:bg-primary-700 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-primary-700 bg-primary-800 animate-fade-in">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/agendamento"
              onClick={() => setOpen(false)}
              className="mt-2 bg-gold-400 hover:bg-gold-500 text-white font-semibold px-4 py-3 rounded-lg text-sm text-center transition-colors shadow-md"
            >
              Agendar Agora
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
