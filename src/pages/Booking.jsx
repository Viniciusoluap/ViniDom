import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StepIndicator from '../components/StepIndicator';
import ServiceCard from '../components/ServiceCard';
import CalendarPicker from '../components/CalendarPicker';
import TimeSlotPicker from '../components/TimeSlotPicker';
import BookingForm from '../components/BookingForm';
import BookingSummary from '../components/BookingSummary';
import { useBookings } from '../hooks/useBookings';
import { useAvailableSlots } from '../hooks/useAvailableSlots';
import { useServices } from '../hooks/useServices';
import { dateToKey } from '../utils/dateFormatter';
import { buildWhatsAppLink } from '../utils/whatsappFormatter';

const STEPS = ['Serviço', 'Data & Hora', 'Seus Dados', 'Confirmar'];

const EMPTY_CLIENT = { name: '', phone: '', email: '', notes: '', whatsappConfirm: true };

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { services, categories } = useServices();
  const { addBooking, getBookingsForDate } = useBookings();

  const [step, setStep]                   = useState(0);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate]   = useState(null);
  const [selectedSlot, setSelectedSlot]   = useState(null);
  const [client, setClient]               = useState(EMPTY_CLIENT);
  const [loading, setLoading]             = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');

  useEffect(() => {
    const sid = searchParams.get('servico');
    if (sid) {
      const found = services.find((s) => s.id === Number(sid));
      if (found) { setSelectedService(found); setStep(1); }
    }
  }, []);

  const bookedSlots = selectedDate ? getBookingsForDate(selectedDate) : [];
  const slots = useAvailableSlots({ date: selectedDate, service: selectedService, bookedSlots });

  const canNext = () => {
    if (step === 0) return !!selectedService;
    if (step === 1) return !!selectedDate && selectedSlot !== null;
    return true;
  };

  const goNext = () => { if (canNext()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleConfirm = () => {
    setLoading(true);
    const booking = addBooking({
      service: selectedService, date: selectedDate.toISOString(),
      dateKey: dateToKey(selectedDate), timeSlot: selectedSlot, client,
    });
    const waLink = buildWhatsAppLink({ service: selectedService, date: selectedDate, time: selectedSlot, clientName: client.name });
    setTimeout(() => { window.open(waLink, '_blank'); navigate(`/confirmacao?id=${booking.id}`); }, 600);
  };

  const handleServiceSelect = (service) => { setSelectedService(service); setSelectedDate(null); setSelectedSlot(null); };
  const handleDateSelect    = (date) =>    { setSelectedDate(date); setSelectedSlot(null); };

  const filtered = activeCategory === 'Todos' ? services : services.filter((s) => s.category === activeCategory);

  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-4xl mx-auto w-full animate-fade-in">
      <div className="text-center mb-10">
        <p className="section-subtitle mb-3">Reserva</p>
        <h1 className="section-title text-3xl">Agendamento</h1>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {/* Step 0 – Service */}
      {step === 0 && (
        <div className="animate-slide-up">
          <h2 className="font-semibold text-brand-900 text-base mb-5 tracking-wide">Qual serviço você deseja?</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 text-xs tracking-widest uppercase font-medium border transition-all ${
                  activeCategory === cat
                    ? 'bg-brand-900 text-white border-brand-900'
                    : 'bg-white text-brand-500 border-brand-200 hover:border-brand-900 hover:text-brand-900'
                }`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {filtered.map((service) => (
              <ServiceCard key={service.id} service={service}
                selected={selectedService?.id === service.id} onSelect={handleServiceSelect} />
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={goNext} disabled={!canNext()}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* Step 1 – Date & Time */}
      {step === 1 && (
        <div className="animate-slide-up">
          <div className="mb-6 flex items-center gap-3 bg-warm-100 border border-brand-100 p-4 text-sm text-brand-800">
            <span className="text-xl">{selectedService.icon}</span>
            <span className="font-semibold">{selectedService.name}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="font-semibold text-brand-900 text-sm mb-4 tracking-widest uppercase">Data</h2>
              <CalendarPicker selected={selectedDate} onSelect={handleDateSelect} />
            </div>
            <div>
              <h2 className="font-semibold text-brand-900 text-sm mb-4 tracking-widest uppercase">
                {selectedDate ? 'Horários Disponíveis' : 'Selecione uma data'}
              </h2>
              {selectedDate
                ? <TimeSlotPicker slots={slots} selected={selectedSlot} onSelect={setSelectedSlot} />
                : <div className="border border-brand-100 p-10 text-center text-brand-300 text-sm bg-white">
                    Escolha uma data no calendário
                  </div>
              }
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={goBack} className="btn-secondary py-3">← Voltar</button>
            <button onClick={goNext} disabled={!canNext()}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 – Client */}
      {step === 2 && (
        <div className="animate-slide-up max-w-lg mx-auto">
          <h2 className="font-semibold text-brand-900 text-base mb-6 tracking-wide">Seus Dados</h2>
          <BookingForm value={client} onChange={setClient} onSubmit={goNext} />
          <button onClick={goBack} className="btn-secondary w-full mt-3 py-3">← Voltar</button>
        </div>
      )}

      {/* Step 3 – Summary */}
      {step === 3 && (
        <div className="max-w-lg mx-auto">
          <BookingSummary service={selectedService} date={selectedDate} timeSlot={selectedSlot}
            client={client} onConfirm={handleConfirm} onBack={goBack} loading={loading} />
        </div>
      )}
    </div>
  );
}
