import { BUSINESS_HOURS, DAY_KEYS, DAY_NAMES_PT } from '../utils/constants.js';

const LOCAL_OFFSET_MS = -3 * 60 * 60 * 1000; // America/Fortaleza, sem horário de verão

// Aceita JID do WhatsApp ou telefone em qualquer formato; devolve DDD + número (11 dígitos) ou null.
export function normalizePhoneDigits(value) {
  let digits = String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 10 && /^[6-9]$/.test(digits[2])) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  return /^[0-9]{10,11}$/.test(digits) ? digits : null;
}

export function maskPhone(digits) {
  if (digits?.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits?.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits || '';
}

// Sufixo usado nas reservas antigas, que guardam o telefone mascarado.
export function phoneLikePattern(digits) {
  return `%${digits.slice(-9, -4)}-${digits.slice(-4)}`;
}

export function localNow(now = Date.now()) {
  const d = new Date(now + LOCAL_OFFSET_MS);
  return {
    dateKey: d.toISOString().slice(0, 10),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    hour: d.getUTCHours(),
    weekday: d.getUTCDay(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    year: d.getUTCFullYear(),
  };
}

export function addDaysToKey(dateKey, days) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOfKey(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

export function isOpenDay(dateKey) {
  return Boolean(BUSINESS_HOURS[DAY_KEYS[weekdayOfKey(dateKey)]]);
}

export function formatKeyShort(dateKey) {
  const [, m, d] = dateKey.split('-');
  return `${d}/${m}`;
}

export function weekdayName(dateKey) {
  return DAY_NAMES_PT[weekdayOfKey(dateKey)];
}

export function minutesToHHMM(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function hhmmToMinutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < 24 * 60 ? minutes : null;
}

export function firstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0] || '';
  return first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : '';
}
