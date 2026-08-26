import { createClient } from '@supabase/supabase-js';

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

export function getAdminClient() {
  const url = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL'));
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getBearerToken(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

export async function getAuthenticatedUser(req) {
  const client = getAdminClient();
  const token = getBearerToken(req);
  if (!client || !token) return null;
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export async function requireAdmin(req) {
  const user = await getAuthenticatedUser(req);
  if (!user || user.app_metadata?.role !== 'admin') {
    return { error: 'Não autorizado.', status: 403 };
  }
  return { user };
}

export function sendJson(res, status, payload) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(payload);
}

export function parseBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

export function publicBookingFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    services: row.services,
    date: row.date,
    dateKey: row.date_key,
    timeSlot: row.time_slot,
    totalDuration: row.total_duration,
    operationalDuration: row.operational_duration || (row.total_duration === 90 ? 120 : row.total_duration),
    totalPrice: row.total_price,
    professional: row.professional_name || null,
    client: {
      name: row.client_name || '',
      phone: row.client_phone || '',
      email: row.client_email || '',
      notes: row.client_notes || '',
      birthdate: row.client_birthdate || '',
    },
    status: row.status,
    googleCalendarId: row.google_calendar_id || null,
    googleEventId: row.google_event_id || null,
    calendarSyncStatus: row.calendar_sync_status || 'pending',
  };
}
