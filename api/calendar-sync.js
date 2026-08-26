import { getCalendarConfig, isCalendarConfigured, upsertCalendarEvent, deleteCalendarEvent } from './_calendar.js';
import { getAdminClient, parseBody, publicBookingFromRow, requireAdmin, sendJson } from '../src/server/supabaseServer.js';

function safeError(error) {
  return String(error?.message || 'Falha de sincronização.')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const auth = await requireAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { error: auth.error });

  const body = parseBody(req);
  const bookingId = String(body?.bookingId || '').trim();
  const action = body?.action === 'cancel' ? 'cancel' : 'upsert';
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return sendJson(res, 400, { error: 'Booking inválido.' });

  const supabase = getAdminClient();
  const config = getCalendarConfig();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor de reservas não configurado.' });
  if (!isCalendarConfigured(config)) {
    return sendJson(res, config.required ? 503 : 200, { configured: false, synced: false });
  }

  const found = await supabase.from('bookings').select('*').eq('id', bookingId).limit(1).maybeSingle();
  if (found.error || !found.data) return sendJson(res, 404, { error: 'Reserva não encontrada.' });

  const booking = publicBookingFromRow(found.data);
  try {
    if (action === 'cancel' || booking.status === 'cancelled') {
      await deleteCalendarEvent(booking.googleEventId, config);
      await supabase.from('bookings').update({
        google_calendar_id: config.calendarId,
        google_event_id: null,
        calendar_sync_status: 'cancelled',
        calendar_sync_error: null,
        calendar_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', bookingId);
      return sendJson(res, 200, { configured: true, synced: true, status: 'cancelled' });
    }

    const event = await upsertCalendarEvent(booking, config);
    const updated = await supabase.from('bookings').update({
      google_calendar_id: config.calendarId,
      google_event_id: event.id,
      calendar_sync_status: 'synced',
      calendar_sync_error: null,
      calendar_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', bookingId).select('*').limit(1).maybeSingle();
    if (updated.error) throw updated.error;
    return sendJson(res, 200, { configured: true, synced: true, eventId: event.id });
  } catch (error) {
    const message = safeError(error);
    await supabase.from('bookings').update({
      calendar_sync_status: 'failed',
      calendar_sync_error: message,
      updated_at: new Date().toISOString(),
    }).eq('id', bookingId);
    return sendJson(res, config.required ? 503 : 200, {
      configured: true,
      synced: false,
      error: config.required ? 'Não foi possível sincronizar a agenda.' : undefined,
    });
  }
}
