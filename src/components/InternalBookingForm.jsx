import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { SERVICES } from '../utils/constants';
import { getAvailableSlots, loadAvailability } from '../utils/availability';
import { getSlotsForDate, invalidateBookedSlots } from '../utils/bookingService';
import { getCalendarBookedSlots } from '../utils/calendarService';
import { getDurationTotals } from '../utils/bookingDuration';
import { dateToKey, formatTime, formatPrice } from '../utils/dateFormatter';
import { loadClients } from '../utils/clientService';
import { supabase } from '../lib/supabase';

export default function InternalBookingForm({ date, staff, fixedProfessional, onClose, onCreated }) {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [serviceIds, setServiceIds] = useState([]);
  const [dateKey, setDateKey] = useState(dateToKey(date));
  const [professional, setProfessional] = useState(fixedProfessional || staff[0]?.name || '');
  const [timeSlot, setTimeSlot] = useState('');
  const [availability, setAvailability] = useState({ status: 'loading', slots: [] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    loadClients().then(result => { if (active) setClients(result); })
      .catch(() => { if (active) setError('Não foi possível carregar os clientes cadastrados.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const day = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(day.getTime())) return undefined;
    loadAvailability({
      date: day, loadDatabaseSlots: getSlotsForDate,
      loadCalendarSlots: import.meta.env.PROD ? getCalendarBookedSlots : async () => [],
      isCurrent: () => active,
    }).then(result => { if (active) setAvailability(result); });
    return () => { active = false; };
  }, [dateKey]);

  useEffect(() => {
    const handleKey = event => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, saving]);

  const services = useMemo(() => serviceIds.map(id => SERVICES.find(service => service.id === id)), [serviceIds]);
  const { commercialDuration } = getDurationTotals(services);
  const availableSlots = useMemo(() => getAvailableSlots({
    date: availability.status === 'success' ? new Date(`${dateKey}T12:00:00`) : null,
    totalDuration: commercialDuration, services, bookedSlots: availability.slots,
  }).filter(slot => dateKey !== dateToKey(new Date()) || slot > new Date().getHours() * 60 + new Date().getMinutes()),
  [availability, dateKey, commercialDuration, services]);
  const matchingClients = clients.filter(client => `${client.name} ${client.phone}`.toLowerCase().includes(query.toLowerCase()));
  const fieldClass = 'w-full border border-brand-200 bg-white p-3 text-sm text-brand-900';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!clientId || !serviceIds.length || !professional || timeSlot === '') {
      setError('Selecione cliente, serviço, profissional e horário.');
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Entre novamente.');
      const response = await fetch('/api/internal-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ clientId, serviceIds, dateKey, timeSlot: Number(timeSlot), professional }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível criar o agendamento.');
      invalidateBookedSlots(dateKey);
      await onCreated(dateKey);
      onClose();
    } catch (err) {
      setError(err.message || 'Não foi possível criar o agendamento.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/65 flex items-end sm:items-center justify-center" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="internal-booking-title" className="bg-white w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto p-5 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 id="internal-booking-title" className="text-lg font-semibold">Novo agendamento</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar" className="p-2"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">Cliente cadastrado
            <input className={`${fieldClass} mt-1`} value={query} onChange={event => { setQuery(event.target.value); setClientId(''); }} placeholder="Buscar por nome ou WhatsApp" />
          </label>
          <select className={fieldClass} value={clientId} onChange={event => setClientId(event.target.value)} aria-label="Selecionar cliente" required>
            <option value="">Selecione um cliente</option>
            {matchingClients.map(client => <option key={client.id || client.phone_digits} value={client.id || client.phone_digits}>{client.name} · {client.phone}</option>)}
          </select>
          {clients.length === 0 && <p className="text-xs text-brand-400">Nenhum cliente cadastrado disponível. Cadastre-o na aba Clientes.</p>}
          <fieldset>
            <legend className="text-sm font-medium mb-2">Serviços</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {SERVICES.map(service => <label key={service.id} className="flex items-center gap-2 border border-brand-100 p-2 text-sm">
                <input type="checkbox" checked={serviceIds.includes(service.id)} onChange={() => { setTimeSlot(''); setServiceIds(current => current.includes(service.id) ? current.filter(id => id !== service.id) : [...current, service.id]); }} />
                {service.name} · {formatPrice(service.price)}
              </label>)}
            </div>
          </fieldset>
          {!fixedProfessional && <label className="block text-sm font-medium">Profissional
            <select className={`${fieldClass} mt-1`} value={professional} onChange={event => setProfessional(event.target.value)} required>
              <option value="">Selecione</option>
              {staff.map(member => <option key={member.id || member.name} value={member.name}>{member.name}</option>)}
            </select>
          </label>}
          {fixedProfessional && <p className="text-sm">Profissional: <strong>{fixedProfessional}</strong></p>}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">Data
              <input type="date" required min={dateToKey(new Date())} className={`${fieldClass} mt-1`} value={dateKey} onChange={event => { setTimeSlot(''); setAvailability({ status: 'loading', slots: [] }); setDateKey(event.target.value); }} />
            </label>
            <label className="text-sm font-medium">Horário
              <select required className={`${fieldClass} mt-1`} value={timeSlot} onChange={event => setTimeSlot(event.target.value)} disabled={!serviceIds.length || availability.status !== 'success'}>
                <option value="">Selecione</option>
                {availableSlots.map(slot => <option key={slot} value={slot}>{formatTime(slot)}</option>)}
              </select>
            </label>
          </div>
          {availability.status === 'loading' && <p className="text-xs text-brand-400">Consultando horários...</p>}
          {availability.status === 'error' && <p className="text-xs text-red-700">Não foi possível consultar os horários. Escolha outra data e tente novamente.</p>}
          {serviceIds.length > 0 && <p className="text-sm text-brand-500">{commercialDuration} min · {formatPrice(services.reduce((sum, service) => sum + service.price, 0))}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving || availability.status !== 'success'} className="btn-primary w-full disabled:opacity-50">{saving ? 'Salvando...' : 'Confirmar agendamento'}</button>
        </form>
      </section>
    </div>
  );
}
