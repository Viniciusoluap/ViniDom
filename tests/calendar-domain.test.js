import test from 'node:test';
import assert from 'node:assert/strict';
import { getOperationalDuration, getDurationTotals, normalizeServicesForBooking } from '../src/utils/bookingDuration.js';
import { buildCalendarEvent, slotToDateTime } from '../api/_calendar.js';
import { getAvailableSlots, loadAvailability } from '../src/utils/availability.js';

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

const monday = new Date(2026, 7, 24);
const tuesday = new Date(2026, 7, 25);
const sunday = new Date(2026, 7, 23);

function available(overrides = {}) {
  return getAvailableSlots({
    date: monday,
    totalDuration: 30,
    services: [corte],
    bookedSlots: [],
    ...overrides,
  });
}

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

test('dias fechados não oferecem horários', () => {
  assert.deepEqual(available({ date: tuesday }), []);
  assert.deepEqual(available({ date: sunday }), []);
});

test('segunda-feira respeita abertura, almoço e fechamento', () => {
  const slots = available();
  assert.equal(slots[0], 10 * 60);
  assert.equal(slots.at(-1), 17 * 60 + 30);
  assert.ok(slots.every(slot => slot >= 10 * 60 && slot + 30 <= 18 * 60));
  assert.ok(slots.every(slot => slot + 30 <= 12 * 60 || slot >= 14 * 60));
});

test('atendimento pode terminar às 12h e começar às 14h, mas não atravessa o almoço', () => {
  const slots = available({ totalDuration: 60, services: [] });
  assert.ok(slots.includes(11 * 60));
  assert.ok(slots.includes(14 * 60));
  assert.ok(!slots.includes(11 * 60 + 15));
  assert.ok(!slots.includes(12 * 60));
});

test('duração operacional altera o último horário permitido', () => {
  assert.equal(available({ services: [corte] }).at(-1), 17 * 60 + 30);
  assert.equal(available({ totalDuration: 90, services: [botox] }).at(-1), 16 * 60);
});

test('combinação usa a soma das durações operacionais', () => {
  const slots = available({ totalDuration: 120, services: [corte, botox] });
  assert.equal(slots.at(-1), 15 * 60 + 30);
  assert.ok(!slots.includes(10 * 60 + 30));
});

test('conflitos cobrem coincidência e sobreposições em ambas as direções', () => {
  const bookedSlots = [{ timeSlot: 10 * 60 + 30, totalDuration: 60 }];
  const slots = available({ bookedSlots });
  assert.ok(!slots.includes(10 * 60 + 30), 'mesmo início');
  assert.ok(!slots.includes(10 * 60 + 15), 'reserva começa durante novo atendimento');
  assert.ok(!slots.includes(11 * 60), 'novo atendimento começa durante reserva');
  assert.ok(slots.includes(10 * 60), 'contato exato antes da reserva');
  assert.ok(slots.includes(11 * 60 + 30), 'contato exato depois da reserva');
});

test('reserva operacional bloqueia todo o intervalo de 120 minutos', () => {
  const slots = available({ bookedSlots: [{ timeSlot: 14 * 60, totalDuration: 120 }] });
  assert.ok(!slots.includes(14 * 60));
  assert.ok(!slots.includes(15 * 60 + 45));
  assert.ok(slots.includes(16 * 60));
});

test('entradas sem data ou duração retornam lista vazia', () => {
  assert.deepEqual(available({ date: null }), []);
  assert.deepEqual(available({ totalDuration: 0, services: [] }), []);
  assert.ok(available({ bookedSlots: [] }).length > 0);
});

test('consulta combina banco e calendário quando ambos respondem', async () => {
  const statuses = [];
  const result = await loadAvailability({
    date: monday,
    loadDatabaseSlots: async () => [{ timeSlot: 600, totalDuration: 30 }],
    loadCalendarSlots: async () => [{ timeSlot: 840, totalDuration: 60 }],
    onStatus: state => statuses.push(state.status),
  });
  assert.deepEqual(result, {
    status: 'success',
    slots: [{ timeSlot: 600, totalDuration: 30 }, { timeSlot: 840, totalDuration: 60 }],
  });
  assert.deepEqual(statuses, ['loading', 'success']);
});

test('listas vazias são sucesso legítimo', async () => {
  const result = await loadAvailability({
    date: monday,
    loadDatabaseSlots: async () => [],
    loadCalendarSlots: async () => [],
  });
  assert.deepEqual(result, { status: 'success', slots: [] });
});

for (const source of ['banco', 'calendário']) {
  test(`falha do ${source} encerra a disponibilidade com erro e sem horários`, async () => {
    const failure = async () => { throw new Error('indisponível'); };
    const success = async () => [{ timeSlot: 600, totalDuration: 30 }];
    const result = await loadAvailability({
      date: monday,
      loadDatabaseSlots: source === 'banco' ? failure : success,
      loadCalendarSlots: source === 'calendário' ? failure : success,
    });
    assert.deepEqual(result, { status: 'error', slots: [] });
  });
}

test('nova tentativa remove o erro depois de uma consulta bem-sucedida', async () => {
  let attempts = 0;
  const database = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('falha temporária');
    return [{ timeSlot: 600, totalDuration: 30 }];
  };
  const first = await loadAvailability({ date: monday, loadDatabaseSlots: database, loadCalendarSlots: async () => [] });
  const retry = await loadAvailability({ date: monday, loadDatabaseSlots: database, loadCalendarSlots: async () => [] });
  assert.equal(first.status, 'error');
  assert.equal(retry.status, 'success');
  assert.equal(attempts, 2);
});

test('resposta antiga é ignorada após troca de data ou desmontagem', async () => {
  let current = true;
  const statuses = [];
  let resolveDatabase;
  const pendingDatabase = new Promise(resolve => { resolveDatabase = resolve; });
  const request = loadAvailability({
    date: monday,
    loadDatabaseSlots: () => pendingDatabase,
    loadCalendarSlots: async () => [],
    isCurrent: () => current,
    onStatus: state => statuses.push(state.status),
  });
  current = false;
  resolveDatabase([{ timeSlot: 600, totalDuration: 30 }]);
  assert.deepEqual(await request, { status: 'stale', slots: [] });
  assert.deepEqual(statuses, ['loading']);
});
