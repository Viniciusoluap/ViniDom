import { CheckCircle, Calendar, Clock, User, Phone, Scissors } from 'lucide-react';
import { formatDateLong, formatTime, formatDuration, formatPrice } from '../utils/dateFormatter';

export default function BookingSummary({ service, date, timeSlot, client, onConfirm, onBack, loading }) {
  return (
    <div className="space-y-5 animate-slide-up">
      <div className="bg-white border border-brand-100 p-6 space-y-0">
        <h3 className="font-bold text-brand-900 text-base tracking-wide mb-5 flex items-center gap-2">
          <CheckCircle size={18} className="text-gold-500" />
          Resumo do Agendamento
        </h3>

        <div className="divide-y divide-brand-50">
          <SRow icon={<Scissors size={14} />} label="Serviço"
            value={<span>{service.name}<span className="ml-2 font-bold text-brand-900">{formatPrice(service.price)}</span></span>} />
          <SRow icon={<Clock size={14} />}    label="Duração"  value={formatDuration(service.duration)} />
          <SRow icon={<Calendar size={14} />} label="Data"     value={formatDateLong(date)} />
          <SRow icon={<Clock size={14} />}    label="Horário"  value={formatTime(timeSlot)} />
          <SRow icon={<User size={14} />}     label="Cliente"  value={client.name} />
          <SRow icon={<Phone size={14} />}    label="WhatsApp" value={client.phone} />
          {client.notes && <SRow icon={<span>📝</span>} label="Obs." value={client.notes} />}
        </div>
      </div>

      <div className="bg-warm-100 border border-brand-100 p-4 text-xs text-brand-500 flex items-start gap-2">
        <CheckCircle size={14} className="text-gold-500 shrink-0 mt-0.5" />
        Após confirmar, você será redirecionado ao WhatsApp para finalizar com o Dom Concept.
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onBack} disabled={loading} className="btn-secondary flex-1 py-3">
          ← Editar
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="btn-whatsapp flex-1 flex items-center justify-center gap-2 py-3 font-semibold">
          {loading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><WhatsAppIcon /> Confirmar via WhatsApp</>
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

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
