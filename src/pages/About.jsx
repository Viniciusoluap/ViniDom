import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { buildWhatsAppQuickLink } from '../utils/whatsappFormatter';

const VALUES = [
  { label: 'Excelência',       desc: 'Cada corte é resultado de técnica apurada e atenção absoluta ao detalhe.' },
  { label: 'Exclusividade',    desc: 'Atendimento individualizado para cada cliente, sem pressa e sem padronização.' },
  { label: 'Qualidade',        desc: 'Produtos premium e protocolos atualizados para resultados duradouros.' },
  { label: 'Relacionamento',   desc: 'Clientes VIP e relações de longo prazo baseadas em confiança e cuidado.' },
];

export default function About() {
  return (
    <div className="flex-1 animate-fade-in">
      <section className="bg-brand-900 text-white pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="section-subtitle text-brand-500 mb-4">Sobre nós</p>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white mb-6">
            Vinicius Cavalcante
          </h1>
          <p className="text-brand-300 text-base leading-relaxed max-w-xl mx-auto">
            Visagista &amp; Hair Expert com base em Imperatriz – MA.
            Exclusividade, cuidado e resultados que falam por si.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="section-subtitle mb-3">Nossa História</p>
            <h2 className="section-title mb-6">Vinicius Cavalcante</h2>
            <div className="space-y-4 text-brand-500 text-sm leading-relaxed">
              <p><strong className="text-brand-900">Vinicius Cavalcante</strong> é visagista e hair expert apaixonado pelo universo da beleza e estética masculina. Com anos de dedicação ao ofício, construiu em Imperatriz um atendimento único onde cada cliente recebe atenção absolutamente personalizada.</p>
              <p>Acreditamos que um bom corte é muito mais do que estética — é uma experiência. Por isso investimos em ambiente premium, produtos de alta performance e técnicas sempre atualizadas.</p>
              <p>Com Vinicius Cavalcante você encontra cortes de alto nível, barba impecável e tratamentos exclusivos, tudo com o toque de quem realmente se importa com o resultado.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { num: '500+', label: 'Clientes atendidos' },
              { num: '5★',   label: 'Avaliação média' },
              { num: '7+',   label: 'Serviços exclusivos' },
              { num: '15d',  label: 'Frequência média VIP' },
            ].map(({ num, label }) => (
              <div key={label} className="border border-brand-100 p-6 text-center bg-warm-50">
                <div className="text-3xl font-bold text-brand-900 mb-1">{num}</div>
                <div className="text-brand-400 text-xs tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-warm-50 border-t border-brand-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-subtitle mb-3">Valores</p>
            <h2 className="section-title">O que nos move</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-brand-100">
            {VALUES.map(({ label, desc }) => (
              <div key={label} className="bg-white p-7">
                <h3 className="text-gold-600 font-semibold text-xs tracking-widest uppercase mb-3">{label}</h3>
                <p className="text-brand-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-brand-900 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-light tracking-tight mb-4">Venha nos conhecer</h2>
          <p className="text-brand-300 text-sm mb-10">Agende online ou fale diretamente com o Vinicius.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/agendamento" className="btn-gold flex items-center justify-center gap-2">
              Agendar Agora <ArrowRight size={14} />
            </Link>
            <a href={buildWhatsAppQuickLink()} target="_blank" rel="noopener noreferrer"
              className="btn-secondary border-brand-600 text-brand-300 hover:text-white hover:border-white flex items-center justify-center gap-2">
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
