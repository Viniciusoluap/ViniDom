import { getAdminClient, sendJson } from '../src/server/supabaseServer.js';

function validId(value) {
  return /^[0-9a-f-]{36}$/i.test(String(value || '').trim());
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }
  const id = String(req.query?.id || '').trim();
  if (!validId(id)) return sendJson(res, 400, { error: 'Reserva inválida.' });

  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor de reservas não configurado.' });
  const { data, error } = await supabase
    .from('bookings')
    .select('id, services, date, date_key, time_slot, total_duration, operational_duration, total_price, client_name, professional_name, status, created_at')
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (error || !data) return sendJson(res, 404, { error: 'Reserva não encontrada.' });

  return sendJson(res, 200, {
    booking: {
      id: data.id,
      services: data.services,
      date: data.date,
      dateKey: data.date_key,
      timeSlot: data.time_slot,
      totalDuration: data.total_duration,
      operationalDuration: data.operational_duration || (data.total_duration === 90 ? 120 : data.total_duration),
      totalPrice: data.total_price,
      client: { name: data.client_name || '' },
      professional: data.professional_name || null,
      status: data.status,
      createdAt: data.created_at,
    },
  });
}
