import crypto from 'node:crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const DEFAULT_TIMEZONE = 'America/Fortaleza';
const DEFAULT_OFFSET = '-03:00';

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

export function getCalendarConfig() {
  return {
    calendarId: getEnv('GOOGLE_CALENDAR_ID'),
    serviceAccountEmail: getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    privateKey: getEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
    timeZone: getEnv('GOOGLE_CALENDAR_TIMEZONE', DEFAULT_TIMEZONE),
    timeZoneOffset: getEnv('GOOGLE_CALENDAR_TIMEZONE_OFFSET', DEFAULT_OFFSET),
    required: getEnv('GOOGLE_CALENDAR_REQUIRED', 'false').toLowerCase() === 'true',
  };
}

export function isCalendarConfigured(config = getCalendarConfig()) {
  return Boolean(config.calendarId && config.serviceAccountEmail && config.privateKey);
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createServiceAccountAssertion(config) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: config.serviceAccountEmail,
    scope: CALENDAR_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${base64Url(signer.sign(config.privateKey))}`;
}

async function getAccessToken(config) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createServiceAccountAssertion(config),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error('Falha ao autenticar o serviço de calendário.');
  }
  return data.access_token;
}

async function calendarRequest(path, options = {}, config = getCalendarConfig()) {
  if (!isCalendarConfigured(config)) {
    throw new Error('Google Calendar não configurado no servidor.');
  }
  const token = await getAccessToken(config);
  const response = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason || data?.error?.status || 'calendar_request_failed';
    throw new Error(`Google Calendar: ${reason}`);
  }
  return data;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export function slotToDateTime(dateKey, timeSlot, timeZoneOffset = DEFAULT_OFFSET) {
  const minutes = Number(timeSlot);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey)) || !Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
    throw new Error('Data ou horário de reserva inválido.');
  }
  return `${dateKey}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00${timeZoneOffset}`;
}

function addMinutes(dateTime, minutes) {
  const match = String(dateTime).match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):\d{2}([+-]\d{2}:\d{2})$/);
  if (!match) throw new Error('Data/hora inválida.');
  const [year, month, day, hour, minute] = [match[1].slice(0, 4), match[1].slice(5, 7), match[1].slice(8, 10), match[2], match[3]].map(Number);
  const utc = Date.UTC(year, month - 1, day, hour, minute) + Number(minutes) * 60_000;
  const result = new Date(utc);
  return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}T${pad(result.getUTCHours())}:${pad(result.getUTCMinutes())}:00${match[4]}`;
}

function serviceNames(booking) {
  return (booking.services || []).map((service) => service.name).filter(Boolean).join(' + ') || 'Atendimento Vini Dom';
}

export function buildCalendarEvent(booking, config = getCalendarConfig()) {
  const startDateTime = slotToDateTime(booking.dateKey, booking.timeSlot, config.timeZoneOffset);
  const operationalDuration = Number(booking.operationalDuration || booking.totalDuration || 0);
  if (!Number.isInteger(operationalDuration) || operationalDuration < 15 || operationalDuration > 720) {
    throw new Error('Duração operacional de reserva inválida.');
  }
  const clientName = String(booking.client?.name || 'Cliente').trim().slice(0, 120);
  const phone = String(booking.client?.phone || '').trim().slice(0, 40);
  const email = String(booking.client?.email || '').trim().slice(0, 160);
  const summary = `${clientName} — ${serviceNames(booking)}`.slice(0, 200);
  return {
    summary,
    description: [
      'Reserva criada pelo Vini Dom.',
      `Booking ID: ${booking.id}`,
      `Cliente: ${clientName}`,
      phone ? `Telefone: ${phone}` : '',
      email ? `E-mail: ${email}` : '',
      `Serviços: ${serviceNames(booking)}`,
      `Duração comercial: ${Number(booking.totalDuration || operationalDuration)} minutos`,
      `Bloqueio operacional: ${operationalDuration} minutos`,
    ].filter(Boolean).join('\n'),
    start: { dateTime: startDateTime, timeZone: config.timeZone },
    end: { dateTime: addMinutes(startDateTime, operationalDuration), timeZone: config.timeZone },
    extendedProperties: {
      private: {
        vinidomBookingId: String(booking.id),
        vinidomOperationalDuration: String(operationalDuration),
      },
    },
  };
}

function encodedCalendarId(calendarId) {
  return encodeURIComponent(calendarId);
}

export async function findEventByBookingId(bookingId, config = getCalendarConfig()) {
  const calendarId = encodedCalendarId(config.calendarId);
  const query = new URLSearchParams({
    privateExtendedProperty: `vinidomBookingId=${bookingId}`,
    maxResults: '10',
    showDeleted: 'false',
  });
  const data = await calendarRequest(`/calendars/${calendarId}/events?${query}`, {}, config);
  return data.items?.find((event) => event.status !== 'cancelled') || null;
}

export async function upsertCalendarEvent(booking, config = getCalendarConfig()) {
  const calendarId = encodedCalendarId(config.calendarId);
  const resource = buildCalendarEvent(booking, config);
  const existing = booking.googleEventId
    ? { id: booking.googleEventId }
    : await findEventByBookingId(booking.id, config);
  const suffix = '?sendUpdates=none';
  const data = existing?.id
    ? await calendarRequest(`/calendars/${calendarId}/events/${encodeURIComponent(existing.id)}${suffix}`, {
        method: 'PATCH',
        body: JSON.stringify(resource),
      }, config)
    : await calendarRequest(`/calendars/${calendarId}/events${suffix}`, {
        method: 'POST',
        body: JSON.stringify(resource),
      }, config);
  return { id: data.id, htmlLink: data.htmlLink || null };
}

export async function deleteCalendarEvent(eventId, config = getCalendarConfig()) {
  if (!eventId) return;
  const calendarId = encodedCalendarId(config.calendarId);
  await calendarRequest(`/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  }, config);
}

export async function listBusyEvents({ timeMin, timeMax }, config = getCalendarConfig()) {
  const calendarId = encodedCalendarId(config.calendarId);
  const query = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    showDeleted: 'false',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const data = await calendarRequest(`/calendars/${calendarId}/events?${query}`, {}, config);
  return (data.items || [])
    .filter((event) => event.status !== 'cancelled' && event.transparency !== 'transparent')
    .map((event) => ({
      id: event.id,
      start: event.start?.dateTime || event.start?.date || null,
      end: event.end?.dateTime || event.end?.date || null,
      summary: event.summary || '',
    }))
    .filter((event) => event.start && event.end);
}
