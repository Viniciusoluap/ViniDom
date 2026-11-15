import { getCalendarBusySlots, getCalendarConfig, isCalendarConfigured } from './_calendar.js';
import { sendJson } from '../src/server/supabaseServer.js';

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

  const config = getCalendarConfig();
  if (!isCalendarConfigured(config)) {
    return sendJson(res, 200, { configured: false, busySlots: [] });
  }

  try {
    const busySlots = await getCalendarBusySlots(dateKey, config);
    return sendJson(res, 200, { configured: true, busySlots });
  } catch (error) {
    console.error('[Calendar availability]', error.message);
    return sendJson(res, config.required ? 503 : 200, {
      configured: true,
      busySlots: [],
      error: config.required ? 'Não foi possível consultar a disponibilidade do calendário.' : undefined,
    });
  }
}
