import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';

const NAV_LINKS = [
  { to: '/',        label: 'Início' },
  { to: '/servicos',label: 'Serviços' },
  { to: '/sobre',   label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On home page: transparent until scrolled; elsewhere: always solid
  const isHome = pathname === '/';
  const solid  = !isHome || scrolled;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      solid ? 'bg-brand-900 shadow-md' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" onClick={() => setOpen(false)}>
            <Logo size="sm" inverted />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 text-xs tracking-widest uppercase font-medium transition-colors duration-200 ${
                  pathname === to
                    ? 'text-gold-400'
                    : 'text-brand-300 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/agendamento"
              className="ml-6 btn-gold py-2.5 px-6 text-xs"
            >
              Agendar
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-brand-300 hover:text-white transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-brand-900 border-t border-brand-800 animate-fade-in">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 text-xs tracking-widest uppercase font-medium transition-colors ${
                  pathname === to ? 'text-gold-400' : 'text-brand-300 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/agendamento"
              onClick={() => setOpen(false)}
              className="mt-3 btn-gold text-center py-3"
            >
              Agendar Horário
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
