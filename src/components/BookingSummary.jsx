import { CheckCircle, Calendar, Clock, User, Phone, Scissors } from 'lucide-react';
import { formatDateLong, formatTime, formatDuration, formatPrice } from '../utils/dateFormatter';

export default function BookingSummary({ services, date, timeSlot, totalDuration, totalPrice, client, onConfirm, onBack, loading }) {
  return (
    <div className="space-y-5 animate-slide-up">
      <div className="bg-white border border-brand-100 p-6 space-y-0">
        <h3 className="font-bold text-brand-900 text-base tracking-wide mb-5 flex items-center gap-2">
          <CheckCircle size={18} className="text-gold-500" />
          Resumo do Agendamento
        </h3>

        <div className="divide-y divide-brand-50">
          {/* Lista de serviços */}
          <div className="py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 text-brand-400"><Scissors size={14} /></div>
              <div className="flex-1">
                <span className="block text-xs text-brand-300 font-medium uppercase tracking-widest mb-1">
                  Serviço{services.length > 1 ? 's' : ''}
                </span>
                <div className="space-y-1">
                  {services.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-brand-800 text-sm font-medium">{s.icon} {s.name}</span>
                      <span className="text-brand-900 font-bold text-sm">{formatPrice(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SRow icon={<Clock size={14} />}    label="Duração total" value={formatDuration(totalDuration)} />
          <SRow icon={<Calendar size={14} />} label="Data"          value={formatDateLong(date)} />
          <SRow icon={<Clock size={14} />}    label="Horário"       value={formatTime(timeSlot)} />
          <SRow icon={<User size={14} />}     label="Cliente"       value={client.name} />
          <SRow icon={<Phone size={14} />}    label="WhatsApp"      value={client.phone} />
          {client.email && <SRow icon={<span>✉️</span>} label="E-mail" value={client.email} />}
          {client.notes && <SRow icon={<span>📝</span>} label="Obs."   value={client.notes} />}

          {/* Total */}
          <div className="py-3 flex items-center justify-between">
            <span className="text-xs text-brand-300 font-medium uppercase tracking-widest">Total</span>
            <span className="font-bold text-brand-900 text-lg">{formatPrice(totalPrice)}</span>
          </div>
        </div>
      </div>

      <div className="bg-warm-100 border border-brand-100 p-4 text-xs text-brand-500 flex items-start gap-2">
        <CheckCircle size={14} className="text-gold-500 shrink-0 mt-0.5" />
        Ao confirmar, seu agendamento será registrado e você receberá os detalhes via WhatsApp
        {' '}{client.email ? 'e e-mail' : ''}. O Vinicius Cavalcante entrará em contato para confirmar.
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onBack} disabled={loading} className="btn-secondary flex-1 py-3">
          ← Editar
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 font-semibold">
          {loading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : 'Confirmar Agendamento'
          }
        </button>
      </div>
    </div>
  );
}

function SRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 shrink-0 text-brand-400">{icon}</div>
      <div className="flex-1">
        <span className="block text-xs text-brand-300 font-medium uppercase tracking-widest">{label}</span>
        <span className="block text-brand-800 text-sm font-medium mt-0.5">{value}</span>
      </div>
    </div>
  );
}
