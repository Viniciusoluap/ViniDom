import { createBooking } from './bookings.js';
import { getAdminClient, getAuthenticatedUser, parseBody, sendJson } from '../src/server/supabaseServer.js';
import { SERVICES } from '../src/utils/constants.js';
import { getDurationTotals } from '../src/utils/bookingDuration.js';
import { getAvailableSlots } from '../src/utils/availability.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const user = await getAuthenticatedUser(req);
  const role = user?.app_metadata?.role;
  if (!['admin', 'staff'].includes(role) || (role === 'staff' && user.app_metadata.active === false)) {
    return sendJson(res, 403, { error: 'Acesso restrito à equipe.' });
  }
  const input = parseBody(req);
  if (!input || typeof input !== 'object') return sendJson(res, 400, { error: 'Dados inválidos.' });
  const ids = input?.serviceIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 10 || new Set(ids).size !== ids.length) {
    return sendJson(res, 400, { error: 'Selecione pelo menos um serviço válido.' });
  }
  const services = ids.map(id => SERVICES.find(service => service.id === id));
  if (services.some(service => !service)) return sendJson(res, 400, { error: 'Serviço inválido.' });

  const professional = role === 'staff' ? user.app_metadata.professional_name : input.professional;
  if (!professional || (role === 'staff' && input.professional && input.professional !== professional)) {
    return sendJson(res, 403, { error: 'Profissional não autorizado.' });
  }
  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor de reservas não configurado.' });
  const { data: client, error } = await supabase.from('clients').select('*').eq('id', input.clientId).maybeSingle();
  if (error || !client) return sendJson(res, 400, { error: 'Selecione um cliente cadastrado.' });

  const { commercialDuration, operationalDuration } = getDurationTotals(services);
  const day = typeof input.dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.dateKey)
    ? new Date(`${input.dateKey}T12:00:00`) : null;
  if (!day || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== input.dateKey ||
      input.dateKey < new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })) {
    return sendJson(res, 400, { error: 'Data inválida ou anterior a hoje.' });
  }
  const occupied = await supabase.rpc('get_booked_slots_v2', { p_date_key: input.dateKey });
  if (occupied.error) return sendJson(res, 503, { error: 'Não foi possível consultar os horários.' });
  const bookedSlots = (occupied.data || []).map(row => ({
    timeSlot: row.time_slot, totalDuration: row.operational_duration || row.total_duration,
  }));
  const availableSlots = getAvailableSlots({ date: day, totalDuration: commercialDuration, services, bookedSlots });
  const currentTime = new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Sao_Paulo', hour12: false });
  const minutesNow = Number(currentTime.slice(0, 2)) * 60 + Number(currentTime.slice(3, 5));
  if (!availableSlots.includes(input.timeSlot) ||
      (input.dateKey === new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) && input.timeSlot <= minutesNow)) {
    return sendJson(res, 400, { error: 'Este horário não está disponível.' });
  }
  const body = {
    services: services.map(({ id, name, duration, operationalDuration: durationOperational, price }) =>
      ({ id, name, duration, operationalDuration: durationOperational, price })),
    date: `${input.dateKey}T12:00:00`, dateKey: input.dateKey, timeSlot: input.timeSlot,
    totalDuration: commercialDuration, operationalDuration,
    totalPrice: services.reduce((sum, service) => sum + service.price, 0),
    professional,
    client: { name: client.name, phone: client.phone, email: client.email, notes: client.notes, birthdate: client.birthdate },
  };
  return createBooking(body, res);
}
