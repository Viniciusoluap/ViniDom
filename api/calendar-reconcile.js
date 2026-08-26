import { getCalendarConfig, isCalendarConfigured, upsertCalendarEvent, deleteCalendarEvent } from './_calendar.js';
import { getAdminClient, publicBookingFromRow, sendJson } from '../src/server/supabaseServer.js';

function authorized(req) {
  const secret = process.env.CRON_SECRET || '';
  const header = req.headers.authorization || '';
  return Boolean(secret && header === `Bearer ${secret}`);
}

function syncError(error) {
  return String(error?.message || 'Falha de sincronização.')
    .replace(/\s+/g, ' ')
    .slice(0, 240);
}

async function updateSyncState(supabase, id, patch) {
  await supabase.from('bookings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Método não permitido.' });
  }
  if (!authorized(req)) return sendJson(res, 401, { error: 'Não autorizado.' });

  const config = getCalendarConfig();
  if (!isCalendarConfigured(config)) return sendJson(res, 503, { error: 'Google Calendar não configurado.' });
  const supabase = getAdminClient();
  if (!supabase) return sendJson(res, 503, { error: 'Servidor de reservas não configurado.' });

  const [pendingResult, cancelledResult] = await Promise.all([
    supabase.from('bookings')
      .select('*')
      .in('calendar_sync_status', ['pending', 'failed'])
      .neq('status', 'cancelled')
      .gte('date_key', new Date().toISOString().slice(0, 10))
      .order('created_at', { ascending: true })
      .limit(100),
    supabase.from('bookings')
      .select('*')
      .eq('status', 'cancelled')
      .neq('calendar_sync_status', 'cancelled')
      .not('google_event_id', 'is', null)
      .order('updated_at', { ascending: true })
      .limit(100),
  ]);

  const summary = { attempted: 0, synced: 0, cancelled: 0, failed: 0 };
  for (const row of pendingResult.data || []) {
    summary.attempted += 1;
    try {
      const event = await upsertCalendarEvent(publicBookingFromRow(row), config);
      await updateSyncState(supabase, row.id, {
        google_calendar_id: config.calendarId,
        google_event_id: event.id,
        calendar_sync_status: 'synced',
        calendar_sync_error: null,
        calendar_synced_at: new Date().toISOString(),
      });
      summary.synced += 1;
    } catch (error) {
      await updateSyncState(supabase, row.id, {
        calendar_sync_status: 'failed',
        calendar_sync_error: syncError(error),
      });
      summary.failed += 1;
    }
  }

  for (const row of cancelledResult.data || []) {
    summary.attempted += 1;
    try {
      await deleteCalendarEvent(row.google_event_id, config);
      await updateSyncState(supabase, row.id, {
        google_calendar_id: config.calendarId,
        google_event_id: null,
        calendar_sync_status: 'cancelled',
        calendar_sync_error: null,
        calendar_synced_at: new Date().toISOString(),
      });
      summary.cancelled += 1;
    } catch (error) {
      await updateSyncState(supabase, row.id, { calendar_sync_status: 'failed', calendar_sync_error: syncError(error) });
      summary.failed += 1;
    }
  }

  return sendJson(res, 200, { configured: true, summary });
}
