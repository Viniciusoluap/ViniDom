import test from 'node:test';
import assert from 'node:assert/strict';
import { getOperationalDuration, getDurationTotals, normalizeServicesForBooking } from '../src/utils/bookingDuration.js';
import { buildCalendarEvent, slotToDateTime } from '../api/_calendar.js';

const corte = { id: 1, name: 'Corte Masculino', duration: 30, price: 80 };
const botox = { id: 3, name: 'Botox Capilar', duration: 90, price: 140 };
const bumper = { id: 4, name: 'Bumper', duration: 90, operationalDuration: 120, price: 220 };

const config = {
  calendarId: 'calendar@example.com',
  serviceAccountEmail: 'service@example.com',
  privateKey: 'not-used-in-domain-test',
  timeZone: 'America/Fortaleza',
  timeZoneOffset: '-03:00',
  required: true,
};

test('serviço comercial de 90 minutos bloqueia 120 minutos', () => {
  assert.equal(getOperationalDuration(botox), 120);
  assert.equal(getOperationalDuration(bumper), 120);
});

test('serviço de 30 minutos preserva o bloqueio de 30 minutos', () => {
  assert.equal(getOperationalDuration(corte), 30);
});

test('combinação soma duração comercial e operacional separadamente', () => {
  assert.deepEqual(getDurationTotals([corte, botox]), {
    commercialDuration: 120,
    operationalDuration: 150,
  });
});

test('normalização torna explícito o bloqueio operacional no payload', () => {
  assert.deepEqual(normalizeServicesForBooking([botox])[0], { ...botox, operationalDuration: 120 });
});

test('slot numérico é convertido para RFC3339 com offset brasileiro', () => {
  assert.equal(slotToDateTime('2026-08-26', 600, '-03:00'), '2026-08-26T10:00:00-03:00');
});

test('evento usa duração operacional e mantém duração comercial na descrição', () => {
  const event = buildCalendarEvent({
    id: 'booking-123',
    dateKey: '2026-08-26',
    timeSlot: 600,
    totalDuration: 90,
    operationalDuration: 120,
    services: [botox],
    client: { name: 'Cliente Teste', phone: '+55 99 99999-9999' },
  }, config);
  assert.equal(event.start.dateTime, '2026-08-26T10:00:00-03:00');
  assert.equal(event.end.dateTime, '2026-08-26T12:00:00-03:00');
  assert.match(event.description, /Duração comercial: 90 minutos/);
  assert.match(event.description, /Bloqueio operacional: 120 minutos/);
  assert.equal(event.extendedProperties.private.vinidomBookingId, 'booking-123');
});
