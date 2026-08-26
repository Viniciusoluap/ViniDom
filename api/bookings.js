import crypto from 'node:crypto';
import { getCalendarConfig, isCalendarConfigured, upsertCalendarEvent } from './_calendar.js';
import { getAdminClient, parseBody, publicBookingFromRow, sendJson } from '../src/server/supabaseServer.js';

const MAX_SERVICES = 10;

function validDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function validBookingBody(body) {
  const client = body?.client || {};
  return Boolean(
    Array.isArray(body?.services) &&
    body.services.length > 0 &&
    body.services.length <= MAX_SERVICES &&
    validDateKey(body.dateKey) &&
    Number.isInteger(body.timeSlot) &&
    Number.isInteger(body.totalDuration) &&
    Number.isInteger(body.operationalDuration) &&
    Number.isInteger(body.totalPrice) &&
    String(client.name || '').trim().length >= 2 &&
    /^[0-9()+ .-]{8,20}$/.test(String(client.phone || '').trim()),
  );
}

function safeCalendarError(error) {
  return String(error?.message || 'Falha de sincronização com o calendário.')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }

  const body = parseBody(req);
  if (!validBookingBody(body)) return sendJson(res, 400, { error: 'Dados de agendamento inválidos.' });

  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor de reservas não configurado.' });

  const config = getCalendarConfig();
  if (config.required && !isCalendarConfigured(config)) {
    return sendJson(res, 503, { error: 'Agenda automática ainda não foi configurada no servidor.', required: true });
  }

  const bookingId = crypto.randomUUID();
  const rpc = await supabase.rpc('create_public_booking_v2', {
    p_id: bookingId,
    p_services: body.services,
    p_date: body.date,
    p_date_key: body.dateKey,
    p_time_slot: body.timeSlot,
    p_total_duration: body.totalDuration,
    p_operational_duration: body.operationalDuration,
    p_total_price: body.totalPrice,
    p_client_name: body.client.name,
    p_client_phone: body.client.phone,
    p_client_email: body.client.email || null,
    p_client_notes: body.client.notes || null,
    p_client_birthdate: body.client.birthdate || null,
    p_professional_name: body.professional || null,
  });

  if (rpc.error) {
    const status = rpc.error.code === '23P01' ? 409 : 400;
    return sendJson(res, status, { error: rpc.error.message || 'Não foi possível reservar este horário.' });
  }

  const rowResult = await supabase.from('bookings').select('*').eq('id', bookingId).limit(1).maybeSingle();
  if (rowResult.error || !rowResult.data) return sendJson(res, 500, { error: 'Reserva criada, mas não foi possível carregar o resultado.' });

  let row = rowResult.data;
  if (isCalendarConfigured(config)) {
    try {
      const event = await upsertCalendarEvent(publicBookingFromRow(row), config);
      const updated = await supabase.from('bookings').update({
        google_calendar_id: config.calendarId,
        google_event_id: event.id,
        calendar_sync_status: 'synced',
        calendar_sync_error: null,
        calendar_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', bookingId).select('*').limit(1).maybeSingle();
      if (updated.error || !updated.data) return sendJson(res, 500, { error: 'Reserva criada, mas não foi possível registrar a sincronização.' });
      row = updated.data;
    } catch (error) {
      const message = safeCalendarError(error);
      await supabase.from('bookings').update({
        calendar_sync_status: 'failed',
        calendar_sync_error: message,
        updated_at: new Date().toISOString(),
      }).eq('id', bookingId);
      if (config.required) {
        await supabase.from('bookings').update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        }).eq('id', bookingId);
        return sendJson(res, 503, { error: 'Não foi possível confirmar o horário no Google Calendar.' });
      }
    }
  }

  const booking = publicBookingFromRow(row);
  return sendJson(res, 201, {
    booking,
    calendarSyncStatus: booking.calendarSyncStatus,
    calendarConfigured: isCalendarConfigured(config),
  });
}
