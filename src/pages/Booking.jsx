import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import StepIndicator from '../components/StepIndicator';
import ServiceCard from '../components/ServiceCard';
import CalendarPicker from '../components/CalendarPicker';
import TimeSlotPicker from '../components/TimeSlotPicker';
import BookingForm from '../components/BookingForm';
import BookingSummary from '../components/BookingSummary';
import { useAvailableSlots } from '../hooks/useAvailableSlots';
import { useServices } from '../hooks/useServices';
import { dateToKey } from '../utils/dateFormatter';
import { buildWhatsAppLink } from '../utils/whatsappFormatter';
import { addBooking, getSlotsForDate } from '../utils/bookingService';
import { sendBookingConfirmation } from '../utils/emailService';
import { loadStaff } from '../utils/staffService';

const STEPS = ['Serviço', 'Data & Hora', 'Profissional', 'Seus Dados', 'Confirmar'];
const EMPTY_CLIENT = { name: '', phone: '', email: '', notes: '', birthdate: '' };

export default function Booking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { services, categories } = useServices();

  const [step, setStep]                         = useState(0);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate]         = useState(null);
  const [selectedSlot, setSelectedSlot]         = useState(null);
  const [staffList]                             = useState(() => loadStaff());
  const [selectedStaff, setSelectedStaff]       = useState(() => loadStaff()[0]);
  const [client, setClient]                     = useState(EMPTY_CLIENT);
  const [loading, setLoading]                   = useState(false);
  const [activeCategory, setActiveCategory]     = useState('Todos');
  const [bookedSlots, setBookedSlots]           = useState([]);

  const totalDuration = selectedServices.reduce((s, svc) => s + svc.duration, 0);
  const totalPrice    = selectedServices.reduce((s, svc) => s + svc.price, 0);

  useEffect(() => {
    const sid = searchParams.get('servico');
    if (sid) {
      const found = services.find(s => s.id === Number(sid));
      if (found) { setSelectedServices([found]); setStep(1); }
    }
  }, [services]);

  useEffect(() => {
    if (!selectedDate) { setBookedSlots([]); return; }
    getSlotsForDate(selectedDate).then(setBookedSlots);
  }, [selectedDate]);

  const slots = useAvailableSlots({ date: selectedDate, totalDuration, bookedSlots });

  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.some(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleDateSelect = (date) => { setSelectedDate(date); setSelectedSlot(null); };

  const canNext = () => {
    if (step === 0) return selectedServices.length > 0;
    if (step === 1) return !!selectedDate && selectedSlot !== null;
    if (step === 2) return !!selectedStaff;
    return true;
  };

  const goNext = () => { if (canNext()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const booking = await addBooking({
        services: selectedServices,
        date:     selectedDate.toISOString(),
        dateKey:  dateToKey(selectedDate),
        timeSlot: selectedSlot,
        totalDuration,
        totalPrice,
        professional: selectedStaff?.name || null,
        client,
      });
      await sendBookingConfirmation({ services: selectedServices, date: booking.date, timeSlot: selectedSlot, totalPrice, client });
      const waLink = buildWhatsAppLink({ services: selectedServices, date: selectedDate, time: selectedSlot, clientName: client.name });
      window.open(waLink, '_blank');
      navigate(`/confirmacao?id=${booking.id}`);
    } catch (err) {
      console.error('Erro ao confirmar agendamento:', err);
      setLoading(false);
    }
  };

  const filtered = activeCategory === 'Todos' ? services : services.filter(s => s.category === activeCategory);

  return (
    <div className="flex-1 pt-24 pb-16 px-6 max-w-4xl mx-auto w-full animate-fade-in">
      <div className="text-center mb-10">
        <p className="section-subtitle mb-3">Reserva</p>
        <h1 className="section-title text-3xl">Agendamento</h1>
      </div>

      <StepIndicator steps={STEPS} current={step} />

      {/* Step 0 – Serviços */}
      {step === 0 && (
        <div className="animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-brand-900 text-base tracking-wide">
              Quais serviços você deseja?
            </h2>
            {selectedServices.length > 0 && (
              <span className="text-xs text-gold-600 font-medium tracking-widest uppercase">
                {selectedServices.length} selecionado{selectedServices.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {filtered.map(service => (
              <ServiceCard key={service.id} service={service}
                selected={selectedServices.some(s => s.id === service.id)}
                onSelect={toggleService} />
            ))}
          </div>

          {selectedServices.length > 0 && (
            <div className="bg-warm-100 border border-brand-100 p-4 mb-6 flex items-center justify-between text-sm">
              <span className="text-brand-500 text-xs tracking-widest uppercase">Total estimado</span>
              <div className="text-right">
                <span className="font-bold text-brand-900">
                  {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-brand-400 text-xs ml-2">· {totalDuration} min</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={goNext} disabled={!canNext()}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* Step 1 – Data & Hora */}
      {step === 1 && (
        <div className="animate-slide-up">
          <div className="mb-6 flex flex-wrap gap-2">
            {selectedServices.map(s => (
              <span key={s.id} className="inline-flex items-center gap-2 bg-warm-100 border border-brand-100 px-3 py-1.5 text-sm text-brand-800">
                <span>{s.icon}</span><span className="font-semibold">{s.name}</span>
              </span>
            ))}
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
                : <div className="border border-brand-100 p-10 text-center text-brand-300 text-sm bg-white">Escolha uma data no calendário</div>
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

      {/* Step 2 – Profissional */}
      {step === 2 && (
        <div className="animate-slide-up max-w-lg mx-auto">
          <h2 className="font-semibold text-brand-900 text-base mb-2 tracking-wide">Escolha o Profissional</h2>
          <p className="text-brand-400 text-sm mb-6">Selecione com quem deseja ser atendido.</p>
          <div className="space-y-3 mb-8">
            {staffList.map(member => {
              const selected = selectedStaff?.id === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedStaff(member)}
                  className={`w-full flex items-center gap-4 p-4 border-2 transition-all text-left ${
                    selected
                      ? 'border-brand-900 bg-brand-900 text-white'
                      : 'border-brand-100 bg-white hover:border-brand-900'
                  }`}
                >
                  <div
                    className="w-12 h-12 flex items-center justify-center font-bold text-sm shrink-0"
                    style={{
                      backgroundColor: selected ? 'rgba(255,255,255,0.2)' : member.color,
                      color: 'white',
                    }}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${selected ? 'text-white' : 'text-brand-900'}`}>{member.name}</p>
                    <p className={`text-xs ${selected ? 'text-white/70' : 'text-brand-400'} tracking-widest uppercase mt-0.5`}>{member.role}</p>
                  </div>
                  {selected && (
                    <span className="ml-auto text-xs font-semibold tracking-widest uppercase text-gold-300">✓ Selecionado</span>
                  )}
                </button>
              );
            })}
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

      {/* Step 3 – Dados */}
      {step === 3 && (
        <div className="animate-slide-up max-w-lg mx-auto">
          <h2 className="font-semibold text-brand-900 text-base mb-6 tracking-wide">Seus Dados</h2>
          <BookingForm value={client} onChange={setClient} onSubmit={goNext} />
          <button onClick={goBack} className="btn-secondary w-full mt-3 py-3">← Voltar</button>
        </div>
      )}

      {/* Step 4 – Resumo */}
      {step === 4 && (
        <div className="max-w-lg mx-auto">
          <BookingSummary
            services={selectedServices}
            date={selectedDate}
            timeSlot={selectedSlot}
            totalDuration={totalDuration}
            totalPrice={totalPrice}
            client={client}
            professional={selectedStaff}
            onConfirm={handleConfirm}
            onBack={goBack}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
