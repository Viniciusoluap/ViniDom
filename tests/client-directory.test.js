import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClientDirectory, normalizeClientPhone, validateClientDetails } from '../src/utils/clientDirectory.js';

const details = { name: 'Cliente de teste', phone: '(99) 91234-5678', email: '', birthdate: '' };
const booking = (phone, extra = {}) => ({ date: '2026-01-10', status: 'confirmed', totalPrice: 150, client: { ...details, phone }, ...extra });

test('identifies Brazilian phones regardless of masks and country prefix', () => {
  assert.equal(normalizeClientPhone('+55 (99) 91234-5678'), '99912345678');
  assert.equal(normalizeClientPhone('(55) 91234-5678'), '55912345678');
  assert.equal(normalizeClientPhone('(99) 3123-4567'), '9931234567');
});

test('manual client appears without bookings and has zero activity', () => {
  const list = buildClientDirectory([], [details]);
  assert.equal(list.length, 1);
  assert.equal(list[0].visits, 0);
  assert.equal(list[0].totalSpent, 0);
  assert.equal(list[0].lastVisit, null);
});

test('merges master and historical records without duplicate or fabricated metrics', () => {
  const master = { ...details, name: 'Nome corrigido', email: '', birthdate: '' };
  const list = buildClientDirectory([
    booking('(99) 91234-5678'),
    booking('+55 99 91234 5678', { date: '2026-02-10', totalPrice: 100 }),
    booking('99912345678', { status: 'cancelled', date: '2026-03-10', totalPrice: 900 }),
  ], [master]);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Nome corrigido');
  assert.equal(list[0].email, '');
  assert.equal(list[0].visits, 2);
  assert.equal(list[0].totalSpent, 250);
  assert.equal(list[0].lastVisit.toISOString().slice(0, 10), '2026-02-10');
});

test('legacy clients stay visible and latest booking details win before an admin edit', () => {
  const list = buildClientDirectory([
    booking('99912345678'),
    booking('99912345678', { date: '2026-02-10', client: { ...details, phone: '99912345678', name: 'Nome recente' } }),
    booking('99987654321'),
  ]);
  assert.equal(list.length, 2);
  assert.equal(list[0].name, 'Nome recente');
});

test('validates optional fields, exact dates, WhatsApp and required names', () => {
  assert.equal(validateClientDetails(details), null);
  assert.equal(validateClientDetails({ ...details, phone: '+55 (99) 91234-5678' }), null);
  assert.equal(validateClientDetails({ ...details, birthdate: '1992-09-17' }), null);
  for (const change of [{ name: 'Ab' }, { phone: '1234' }, { email: 'a@b' }, { birthdate: '2026-02-30' }, { birthdate: '3000-01-01' }]) {
    assert.ok(validateClientDetails({ ...details, ...change }));
  }
});
