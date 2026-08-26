import { getCalendarConfig, isCalendarConfigured, listBusyEvents } from './_calendar.js';
import { sendJson } from '../src/server/supabaseServer.js';

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function nextDateKey(dateKey) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function dayBoundary(dateKey, offset) {
  return new Date(`${dateKey}T00:00:00${offset}`);
}

function eventMinutes(eventValue, dateKey, offset) {
  if (isDateKey(eventValue)) {
    return Math.round((dayBoundary(eventValue, offset).getTime() - dayBoundary(dateKey, offset).getTime()) / 60_000);
  }
  return Math.round((new Date(eventValue).getTime() - dayBoundary(dateKey, offset).getTime()) / 60_000);
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
    const events = await listBusyEvents({
      timeMin: dayBoundary(dateKey, config.timeZoneOffset).toISOString(),
      timeMax: dayBoundary(nextDateKey(dateKey), config.timeZoneOffset).toISOString(),
    }, config);
    const dayStart = 0;
    const dayEnd = 24 * 60;
    const busySlots = events.map((event) => {
      const start = Math.max(dayStart, eventMinutes(event.start, dateKey, config.timeZoneOffset));
      const end = Math.min(dayEnd, eventMinutes(event.end, dateKey, config.timeZoneOffset));
      return { timeSlot: start, totalDuration: Math.max(1, end - start) };
    }).filter((slot) => slot.timeSlot < dayEnd && slot.totalDuration > 0);

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
