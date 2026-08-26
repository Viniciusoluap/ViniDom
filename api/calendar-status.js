import { getCalendarConfig, isCalendarConfigured } from './_calendar.js';
import { getAdminClient, requireAdmin, sendJson } from '../src/server/supabaseServer.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }
  const auth = await requireAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { error: auth.error });

  const config = getCalendarConfig();
  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { configured: false, error: 'Servidor de reservas não configurado.' });

  const result = await supabase
    .from('bookings')
    .select('calendar_sync_status')
    .neq('status', 'cancelled')
    .limit(1000);
  const counts = (result.data || []).reduce((acc, row) => {
    const status = row.calendar_sync_status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return sendJson(res, 200, {
    configured: isCalendarConfigured(config),
    required: config.required,
    calendarIdConfigured: Boolean(config.calendarId),
    counts,
  });
}
