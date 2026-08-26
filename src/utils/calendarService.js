import { dateToKey } from './dateFormatter';
import { supabase } from '../lib/supabase';

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'Falha na integração com o calendário.');
    error.status = response.status;
    error.required = Boolean(data?.required);
    throw error;
  }
  return data;
}

export async function syncBookingWithCalendar(bookingId, action = 'upsert', accessToken = '') {
  if (!bookingId) return { configured: false, synced: false };
  if (!accessToken && supabase) {
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || '';
  }
  const response = await fetch('/api/calendar-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ bookingId, action }),
  });
  return parseResponse(response);
}

export async function getCalendarStatus() {
  let accessToken = '';
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || '';
  }
  const response = await fetch('/api/calendar-status', {
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  return parseResponse(response);
}

export async function getCalendarBookedSlots(date) {
  if (!date) return [];
  const key = dateToKey(date);
  const response = await fetch(`/api/calendar-availability?date=${encodeURIComponent(key)}`, {
    headers: { Accept: 'application/json' },
  });
  const data = await parseResponse(response);
  return Array.isArray(data.busySlots) ? data.busySlots : [];
}
