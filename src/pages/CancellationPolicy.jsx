import { Link } from 'react-router-dom';
import { Shield, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function CancellationPolicy() {
  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-3xl mx-auto w-full animate-fade-in">
      <div className="text-center mb-12">
        <p className="section-subtitle mb-3">Política</p>
        <h1 className="section-title text-3xl">Cancelamento</h1>
        <p className="text-brand-400 text-sm mt-2">Vinicius Cavalcante – Imperatriz, MA</p>
      </div>

      <div className="space-y-4">
        {[
          {
            icon: <Clock size={18} className="text-brand-600" />,
            title: 'Prazo para Cancelamento',
            bg: 'bg-warm-50',
            text: 'Os cancelamentos devem ser realizados com no mínimo 2 (duas) horas de antecedência do horário agendado. Cancelamentos fora desse prazo podem resultar em cobrança parcial do serviço.',
          },
          {
            icon: <CheckCircle size={18} className="text-green-500" />,
            title: 'Como Cancelar',
            bg: 'bg-green-50',
            list: [
              'Entre em contato pelo WhatsApp: +55 99 98462-6896',
              'Informe seu nome, horário e serviço agendado',
              'Aguarde a confirmação do cancelamento',
            ],
          },
          {
            icon: <AlertCircle size={18} className="text-amber-500" />,
            title: 'Reagendamentos',
            bg: 'bg-amber-50',
            text: 'Reagendamentos são bem-vindos e podem ser solicitados pelo WhatsApp com antecedência mínima de 2 horas. Estamos sempre abertos a encontrar o melhor horário para você.',
          },
          {
            icon: <Shield size={18} className="text-brand-600" />,
            title: 'Nosso Compromisso',
            bg: 'bg-warm-50',
            text: 'Valorizamos seu tempo. Em caso de imprevistos da nossa parte, entraremos em contato o mais breve possível para reagendar sem custos adicionais. Sua satisfação é nossa prioridade.',
          },
        ].map(({ icon, title, bg, text, list }) => (
          <div key={title} className={`border border-brand-100 p-6 ${bg}`}>
            <div className="flex items-center gap-2 mb-3">
              {icon}
              <h2 className="font-semibold text-brand-900 text-sm tracking-wide">{title}</h2>
            </div>
            {text && <p className="text-brand-500 text-sm leading-relaxed">{text}</p>}
            {list && (
              <ul className="space-y-2 text-sm text-brand-500">
                {list.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>{item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-brand-400 text-xs mb-5 tracking-wide">Dúvidas? Fale conosco pelo WhatsApp.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/agendamento" className="btn-primary">Fazer Agendamento</Link>
          <Link to="/contato"    className="btn-secondary">Ver Contato</Link>
        </div>
      </div>
    </div>
  );
}
