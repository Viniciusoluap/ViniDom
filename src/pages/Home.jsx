import { Link } from 'react-router-dom';
import { ArrowRight, Star, Clock, MapPin, Phone, Shield } from 'lucide-react';
import { SERVICES, BUSINESS_INFO } from '../utils/constants';
import { formatPrice, formatDuration } from '../utils/dateFormatter';
import { buildWhatsAppQuickLink } from '../utils/whatsappFormatter';

const HIGHLIGHTS = [
  { icon: '✂️', title: 'Cortes Modernos', desc: 'Degradê, navalhado e muito mais com precisão artesanal.' },
  { icon: '🧔', title: 'Barba Perfeita', desc: 'Aparação e desenhos personalizados para realçar seu estilo.' },
  { icon: '🎨', title: 'Coloração', desc: 'Pintura e reflexo com produtos premium e resultado duradouro.' },
  { icon: '🌿', title: 'Tratamentos', desc: 'Cuidados especializados para pele e cabelo saudáveis.' },
];

const TESTIMONIALS = [
  { name: 'Rafael S.', text: 'Melhor corte que já fiz na vida! Vinicius é um artista, super recomendo.', stars: 5 },
  { name: 'Lucas M.', text: 'Ambiente incrível, atendimento top. Meu salão favorito em Imperatriz!', stars: 5 },
  { name: 'Thiago P.', text: 'Barba e corte impecáveis. Sempre saio satisfeito do Dom Concept.', stars: 5 },
];

export default function Home() {
  const featuredServices = SERVICES.filter((s) => s.popular).slice(0, 4);

  return (
    <div className="flex-1 animate-fade-in">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-400 rounded-full translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-primary-700/50 border border-primary-600 rounded-full px-4 py-1.5 text-sm text-primary-200 mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-slow" />
                Agendamentos Online Disponíveis
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
                Seu Estilo,<br />
                <span className="text-gold-400">Nossa Arte</span>
              </h1>
              <p className="text-lg sm:text-xl text-primary-200 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                Cortes precisos, barba impecável e muito mais. Agende online em minutos e garanta seu horário no Dom Concept.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/agendamento" className="btn-primary flex items-center justify-center gap-2 text-base py-4 px-8">
                  Agendar Agora <ArrowRight size={18} />
                </Link>
                <a
                  href={buildWhatsAppQuickLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp flex items-center justify-center gap-2 text-base py-4 px-8"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4 justify-center lg:justify-start text-sm text-primary-300">
                <span className="flex items-center gap-1.5"><MapPin size={14} /> Imperatriz – MA</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> Seg–Sex 9h–18h</span>
                <span className="flex items-center gap-1.5"><Star size={14} className="text-gold-400" /> Atendimento 5 estrelas</span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-2xl">
                  <div className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-full bg-primary-700 flex items-center justify-center text-8xl sm:text-9xl">
                    ✂️
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse-slow">
                  Online ✓
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-primary-800 text-sm font-bold px-6 py-2 rounded-full shadow-lg whitespace-nowrap">
                  Dom Concept 💈
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="section-title">Como Funciona</h2>
            <p className="section-subtitle">Agende em menos de 2 minutos</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '💆', title: 'Escolha o Serviço', desc: 'Selecione entre cortes, barba, coloração e muito mais.' },
              { step: '02', icon: '📅', title: 'Selecione a Data', desc: 'Veja os horários disponíveis e escolha o melhor para você.' },
              { step: '03', icon: '✅', title: 'Confirme pelo WhatsApp', desc: 'Finalize o agendamento direto no WhatsApp com o Vinicius.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center animate-slide-up">
                <div className="relative inline-block">
                  <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-sm">
                    {icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-primary-800 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/agendamento" className="btn-primary inline-flex items-center gap-2">
              Começar Agendamento <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
            <div>
              <h2 className="section-title">Serviços em Destaque</h2>
              <p className="section-subtitle">Os favoritos dos nossos clientes</p>
            </div>
            <Link to="/servicos" className="btn-secondary text-sm py-2 px-5 whitespace-nowrap">
              Ver Todos
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SERVICES.slice(0, 4).map((service) => (
              <Link
                key={service.id}
                to={`/agendamento?servico=${service.id}`}
                className="card card-hover p-5 group"
              >
                <div className="text-4xl mb-3">{service.icon}</div>
                <h3 className="font-bold text-primary-800 mb-1">{service.name}</h3>
                <p className="text-gray-500 text-sm mb-3 leading-snug">{service.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-primary-800 font-bold">{formatPrice(service.price)}</span>
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <Clock size={12} />{formatDuration(service.duration)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 bg-primary-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Por Que Escolher o Dom Concept?</h2>
            <p className="text-primary-200">Qualidade e cuidado em cada detalhe</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {HIGHLIGHTS.map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-4">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="font-bold text-white mb-2 text-sm sm:text-base">{title}</h3>
                <p className="text-primary-300 text-xs sm:text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="section-title">O Que Nossos Clientes Dizem</h2>
            <p className="section-subtitle">Satisfação garantida em cada visita</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, text, stars }) => (
              <div key={name} className="card p-6">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={16} className="text-gold-400 fill-gold-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{text}"</p>
                <p className="font-semibold text-primary-800 text-sm">— {name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-primary-800 to-primary-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Pronto para um Novo Visual?
          </h2>
          <p className="text-primary-200 text-lg mb-8">
            Agende agora e garanta seu horário no Dom Concept.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/agendamento" className="btn-primary bg-gold-400 hover:bg-gold-500 focus:ring-gold-400 flex items-center justify-center gap-2 text-lg py-4 px-10">
              Agendar Online <ArrowRight size={20} />
            </Link>
            <a
              href={buildWhatsAppQuickLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp flex items-center justify-center gap-2 text-lg py-4 px-10"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Falar no WhatsApp
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-primary-300 text-sm">
            <span className="flex items-center gap-1.5"><Shield size={14} /> Sem cadastro necessário</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> Menos de 2 minutos</span>
          </div>
        </div>
      </section>
    </div>
  );
}
