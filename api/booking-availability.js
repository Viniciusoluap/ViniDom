import { getAdminClient, sendJson } from '../src/server/supabaseServer.js';

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }
  const dateKey = String(req.query?.date || '').trim();
  if (!isDateKey(dateKey)) return sendJson(res, 400, { error: 'Data inválida.' });

  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor de reservas não configurado.' });
  const { data, error } = await supabase
    .from('bookings')
    .select('time_slot, total_duration, operational_duration')
    .eq('date_key', dateKey)
    .neq('status', 'cancelled')
    .order('time_slot', { ascending: true })
    .limit(250);
  if (error) {
    console.error('[Booking availability]', error.message);
    return sendJson(res, 500, { error: 'Não foi possível consultar os horários.' });
  }
  return sendJson(res, 200, {
    slots: (data || []).map((row) => ({
      timeSlot: row.time_slot,
      totalDuration: row.operational_duration || (row.total_duration === 90 ? 120 : row.total_duration),
    })),
  });
}
