import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SERVICES } from '../utils/constants';
import { formatPrice, formatDuration } from '../utils/dateFormatter';
import { buildWhatsAppQuickLink } from '../utils/whatsappFormatter';
import Logo from '../components/Logo';

const HIGHLIGHTS = [
  { label: 'Alto Padrão', desc: 'Salão premium consolidado em Imperatriz, referência em cuidado masculino.' },
  { label: 'Exclusividade', desc: 'Atendimento personalizado com foco total na experiência do cliente.' },
  { label: 'Relacionamento', desc: 'Clientes VIP com frequência quinzenal e atendimento diferenciado.' },
  { label: 'Excelência', desc: 'Produtos de alta performance e técnicas atualizadas em cada serviço.' },
];

export default function Home() {
  const featured = SERVICES.filter((s) => s.popular);

  return (
    <div className="flex-1 animate-fade-in">

      {/* ── HERO ── */}
      <section className="relative bg-brand-900 min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* subtle texture lines */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px)',
        }} />

        <div className="relative flex flex-col items-center text-center animate-slide-up">
          <div className="mb-12">
            <Logo size="lg" inverted />
          </div>
          <Link to="/agendamento" className="btn-gold flex items-center justify-center gap-3">
            Agendar Horário <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="py-24 bg-warm-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="section-subtitle mb-3">Processo</p>
            <h2 className="section-title">Simples assim</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">
            {[
              { n: '01', title: 'Escolha o Serviço', desc: 'Corte, barba, tratamento — selecione o que deseja.' },
              { n: '02', title: 'Selecione o Horário', desc: 'Veja disponibilidade e escolha o melhor dia e hora.' },
              { n: '03', title: 'Confirme no WhatsApp', desc: 'Finalize direto com o Vinicius e seu horário está garantido.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <span className="text-5xl font-bold text-brand-100 leading-none mb-4">{n}</span>
                <h3 className="font-semibold text-brand-900 mb-2 text-base">{title}</h3>
                <p className="text-brand-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Link to="/agendamento" className="btn-primary inline-flex items-center gap-3">
              Fazer Agendamento <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ── */}
      <section className="py-24 bg-white border-t border-brand-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-4">
            <div>
              <p className="section-subtitle mb-3">Cardápio</p>
              <h2 className="section-title">Nossos Serviços</h2>
            </div>
            <Link to="/servicos" className="btn-secondary text-xs py-3 px-6 whitespace-nowrap self-start sm:self-auto">
              Ver Tabela Completa
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-brand-100">
            {SERVICES.map((s) => (
              <Link
                key={s.id}
                to={`/agendamento?servico=${s.id}`}
                className="bg-white p-7 group hover:bg-warm-50 transition-colors duration-200 flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-2xl">{s.icon}</span>
                  {s.popular && (
                    <span className="text-xs text-gold-600 tracking-widest uppercase font-medium">Destaque</span>
                  )}
                </div>
                <h3 className="font-semibold text-brand-900 text-base mb-1 group-hover:text-gold-600 transition-colors">{s.name}</h3>
                <p className="text-brand-400 text-xs leading-relaxed flex-1 mb-4">{s.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-brand-100">
                  <span className="text-brand-900 font-bold">
                    {s.priceLabel && <span className="text-brand-400 font-normal text-xs mr-1">{s.priceLabel}</span>}
                    {formatPrice(s.price)}
                  </span>
                  <span className="text-brand-300 text-xs flex items-center gap-1">
                    <Clock size={11} />{formatDuration(s.duration)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIAIS ── */}
      <section className="py-24 bg-brand-900 text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="section-subtitle text-brand-500 mb-3">Diferenciais</p>
            <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
              Por que o Dom Concept?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HIGHLIGHTS.map(({ label, desc }) => (
              <div key={label} className="border-t border-brand-700 pt-6">
                <h3 className="text-gold-400 font-semibold text-sm tracking-widest uppercase mb-3">{label}</h3>
                <p className="text-brand-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 bg-warm-100 border-t border-brand-100">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="section-subtitle mb-4">Pronto?</p>
          <h2 className="section-title text-3xl sm:text-4xl mb-4">Agende seu horário</h2>
          <p className="text-brand-400 text-sm mb-10 leading-relaxed">
            Menos de 2 minutos. Sem cadastro. Confirmação direta no WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/agendamento" className="btn-primary flex items-center justify-center gap-3">
              Agendar Online <ArrowRight size={14} />
            </Link>
            <a
              href={buildWhatsAppQuickLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp flex items-center justify-center gap-2 font-medium tracking-wide text-xs uppercase px-8 py-4"
            >
              <WhatsAppIcon /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function Clock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
