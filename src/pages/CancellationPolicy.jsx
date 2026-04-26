import { Link } from 'react-router-dom';
import { Shield, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export default function CancellationPolicy() {
  return (
    <div className="flex-1 py-12 px-4 sm:px-6 max-w-3xl mx-auto w-full animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield size={32} className="text-primary-800" />
        </div>
        <h1 className="section-title text-3xl">Política de Cancelamento</h1>
        <p className="section-subtitle">Dom Concept – Imperatriz, MA</p>
      </div>

      <div className="space-y-6">
        <PolicySection
          icon={<Clock size={20} className="text-primary-600" />}
          title="Prazo para Cancelamento"
          color="bg-primary-50 border-primary-200"
        >
          <p>Os cancelamentos devem ser realizados com <strong>no mínimo 2 (duas) horas de antecedência</strong> do horário agendado.</p>
          <p className="mt-2">Cancelamentos feitos fora desse prazo podem resultar em cobrança parcial do serviço.</p>
        </PolicySection>

        <PolicySection
          icon={<CheckCircle size={20} className="text-green-600" />}
          title="Como Cancelar"
          color="bg-green-50 border-green-200"
        >
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Entre em contato pelo WhatsApp: <strong>+55 99 98462-6896</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Informe seu nome, horário e serviço agendado</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Aguarde a confirmação do cancelamento</span>
            </li>
          </ul>
        </PolicySection>

        <PolicySection
          icon={<AlertCircle size={20} className="text-amber-600" />}
          title="Reagendamentos"
          color="bg-amber-50 border-amber-200"
        >
          <p>Reagendamentos são bem-vindos e podem ser solicitados pelo WhatsApp com antecedência mínima de <strong>2 horas</strong>.</p>
          <p className="mt-2">Estamos sempre abertos a encontrar o melhor horário para você.</p>
        </PolicySection>

        <PolicySection
          icon={<Shield size={20} className="text-blue-600" />}
          title="Compromisso do Dom Concept"
          color="bg-blue-50 border-blue-200"
        >
          <p>Valorizamos seu tempo. Em caso de imprevistos de nossa parte, entraremos em contato o mais breve possível para reagendar sem custos adicionais.</p>
          <p className="mt-2">Sua satisfação é nossa prioridade.</p>
        </PolicySection>
      </div>

      <div className="mt-10 text-center">
        <p className="text-gray-500 text-sm mb-4">Dúvidas? Fale conosco pelo WhatsApp.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/agendamento" className="btn-primary">Fazer Agendamento</Link>
          <Link to="/contato" className="btn-secondary">Ver Contato</Link>
        </div>
      </div>
    </div>
  );
}

function PolicySection({ icon, title, color, children }) {
  return (
    <div className={`card border p-6 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="font-bold text-gray-800 text-lg">{title}</h2>
      </div>
      <div className="text-gray-600 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
