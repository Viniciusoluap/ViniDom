import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useBookings } from '../hooks/useBookings';
import { formatDateLong, formatTime, formatPrice } from '../utils/dateFormatter';
import { buildWhatsAppLink } from '../utils/whatsappFormatter';

export default function Confirmation() {
  const [searchParams] = useSearchParams();
  const { bookings } = useBookings();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const id = searchParams.get('id');
    const found = bookings.find((b) => b.id === id);
    setBooking(found || null);
  }, [bookings]);

  if (!booking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-primary-800 mb-2">Agendamento não encontrado</h2>
        <p className="text-gray-500 mb-6">O agendamento pode não existir ou foi cancelado.</p>
        <Link to="/agendamento" className="btn-primary">Fazer Novo Agendamento</Link>
      </div>
    );
  }

  const waLink = buildWhatsAppLink({
    service: booking.service,
    date: new Date(booking.date),
    time: booking.timeSlot,
    clientName: booking.client.name,
  });

  return (
    <div className="flex-1 py-16 px-4 sm:px-6 max-w-lg mx-auto w-full animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-slide-up">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-primary-800 mb-2">Pré-agendamento Confirmado!</h1>
        <p className="text-gray-500">
          Agora finalize no WhatsApp com o Vinicius para confirmar o horário.
        </p>
      </div>

      <div className="card p-6 mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{booking.service.icon}</span>
          <div>
            <h2 className="font-bold text-primary-800 text-lg">{booking.service.name}</h2>
            <span className="text-gray-500 text-sm">{booking.service.category}</span>
          </div>
          <span className="ml-auto font-bold text-primary-800 text-lg">
            {formatPrice(booking.service.price)}
          </span>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar size={16} className="text-primary-600" />
            <span>{formatDateLong(new Date(booking.date))}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} className="text-primary-600" />
            <span>{formatTime(booking.timeSlot)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-primary-600">👤</span>
            <span>{booking.client.name}</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
        <strong>Importante:</strong> Seu horário é reservado somente após confirmação via WhatsApp. Clique abaixo para finalizar.
      </div>

      <div className="space-y-3">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-whatsapp w-full flex items-center justify-center gap-2 text-base py-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Confirmar no WhatsApp
        </a>
        <Link to="/agendamento" className="btn-secondary w-full flex items-center justify-center gap-2">
          Fazer Outro Agendamento <ArrowRight size={16} />
        </Link>
        <Link to="/" className="block text-center text-gray-400 text-sm hover:text-gray-600 transition-colors py-2">
          Voltar à Página Inicial
        </Link>
      </div>
    </div>
  );
}
