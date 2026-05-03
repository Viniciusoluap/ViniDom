import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock } from 'lucide-react';
import { BUSINESS_INFO } from '../utils/constants';
import { buildWhatsAppQuickLink } from '../utils/whatsappFormatter';
import Logo from './Logo';

function InstagramIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-900 text-brand-400 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          <div>
            <Logo size="sm" inverted />
            <p className="mt-6 text-xs text-brand-500 leading-relaxed">
              Estilo, exclusividade e cuidado em cada detalhe.
            </p>
          </div>

          <div>
            <h3 className="text-white text-xs tracking-widest uppercase mb-5 font-medium">Navegação</h3>
            <ul className="space-y-3 text-xs">
              {[
                { to: '/',                      label: 'Início' },
                { to: '/servicos',              label: 'Serviços & Preços' },
                { to: '/agendamento',           label: 'Agendamento' },
                { to: '/sobre',                 label: 'Sobre' },
                { to: '/politica-cancelamento', label: 'Política de Cancelamento' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs tracking-widest uppercase mb-5 font-medium">Horários</h3>
            <ul className="space-y-2 text-xs">
              <li className="flex justify-between">
                <span>Seg, Qua – Sex</span><span className="text-white">10:00–18:00</span>
              </li>
              <li className="flex justify-between">
                <span>Sábado</span><span className="text-white">10:00–18:00</span>
              </li>
              <li className="flex justify-between">
                <span>Terça</span><span className="text-red-400">Fechado</span>
              </li>
              <li className="flex justify-between">
                <span>Domingo</span><span className="text-red-400">Fechado</span>
              </li>
              <li className="text-brand-600 text-xs mt-2 flex items-center gap-1">
                <Clock size={11} /> Intervalo 12h–14h
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xs tracking-widest uppercase mb-5 font-medium">Contato</h3>
            <ul className="space-y-4 text-xs">
              <li>
                <a href={buildWhatsAppQuickLink()} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone size={13} className="text-green-400" />
                  {BUSINESS_INFO.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={13} className="text-gold-500 shrink-0" />
                {BUSINESS_INFO.address}
              </li>
              <li className="flex items-center gap-2">
                <InstagramIcon size={13} className="text-brand-500" />
                {BUSINESS_INFO.instagram}
              </li>
            </ul>
            <a
              href={buildWhatsAppQuickLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 btn-whatsapp inline-flex items-center gap-2 text-xs py-2.5 px-5"
            >
              <WhatsAppIcon /> WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-brand-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-brand-600">
          <p>© {year} Vinicius Cavalcante. Todos os direitos reservados.</p>
          <p>Imperatriz – MA</p>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
