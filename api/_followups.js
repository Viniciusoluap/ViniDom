import { BUSINESS_INFO } from '../src/utils/constants.js';
import {
  addDaysToKey, firstName, formatKeyShort, localNow, minutesToHHMM, normalizePhoneDigits,
} from '../src/server/agentUtils.js';

export const MAX_PER_RUN = 15;
const RETURN_AFTER_DAYS = 21;
const RETURN_UNTIL_DAYS = 45;
const QUIET_HOURS = 20; // não manda mais de uma mensagem automática por cliente nesse intervalo
const PRIORITY = ['lembrete_1h', 'confirmacao', 'aniversario', 'pos_atendimento', 'retorno'];
const URGENT = new Set(['lembrete_1h', 'confirmacao']); // ignoram o intervalo entre mensagens automáticas
const REMINDER_BEFORE_MIN = 60;

function daysBetween(fromKey, toKey) {
  return Math.round((new Date(`${toKey}T12:00:00Z`) - new Date(`${fromKey}T12:00:00Z`)) / 86400_000);
}

function servicesLabel(services) {
  return (services || []).map((s) => s.name).join(' + ') || 'atendimento';
}

const hi = (name) => (name ? `Oi, ${name}!` : 'Oi!');

export const MESSAGES = {
  confirmacao: (name, row) => `${hi(name)} Amanhã (${formatKeyShort(row.date_key)}) às ${minutesToHHMM(row.time_slot)}, ${servicesLabel(row.services)}. Confirma? SIM ou NÃO`,
  lembrete_1h: (name, row) => `${hi(name)} Hoje às ${minutesToHHMM(row.time_slot)}, ${servicesLabel(row.services)}. Te esperamos!`,
  aniversario: (name) => `Feliz aniversário${name ? `, ${name}` : ''}! 🎉 Abraço do Vinicius.`,
  pos_atendimento: (name) => `${hi(name)} Obrigado pela visita!`,
  retorno: (name, days) => `${hi(name)} Faz ${days} dias da sua última visita. Quer agendar?`,
};

// bookings: linhas não canceladas (date_key, time_slot, services, client_name, client_phone, client_confirmed_at, created_at, id)
// clients: [{ phone_digits, name, birthdate }]
// sentRefs: Set de `${kind}:${ref}` já enviados; recentPhones: Set de telefones com envio automático recente
export function planFollowups({ bookings = [], clients = [], sentRefs = new Set(), recentPhones = new Set(), now = Date.now() }) {
  const local = localNow(now);
  if (local.hour < 9 || local.hour >= 20) return [];
  const today = local.dateKey;
  const tomorrow = addDaysToKey(today, 1);
  const yesterday = addDaysToKey(today, -1);
  const candidates = [];
  const ownerPhone = normalizePhoneDigits(BUSINESS_INFO.phone);
  // values: variáveis do modelo aprovado pela Meta, usadas quando o envio é pela API Oficial.
  const add = (kind, ref, phoneDigits, message, values) => {
    if (!phoneDigits || phoneDigits === ownerPhone || sentRefs.has(`${kind}:${ref}`)) return;
    candidates.push({ kind, ref, phoneDigits, message, template: { kind, values } });
  };
  const who = (name) => name || 'tudo bem';

  const byPhone = new Map();
  for (const row of bookings) {
    const phone = normalizePhoneDigits(row.client_phone);
    if (!phone) continue;
    if (!byPhone.has(phone)) byPhone.set(phone, []);
    byPhone.get(phone).push(row);
  }
  const nameFor = (phone, fallback) => firstName(clients.find((c) => c.phone_digits === phone)?.name || fallback);

  for (const [phone, rows] of byPhone) {
    const name = nameFor(phone, rows[0]?.client_name);
    for (const row of rows) {
      const createdRecently = row.created_at && now - new Date(row.created_at).getTime() < 6 * 3600_000;
      if (row.date_key === tomorrow && !row.client_confirmed_at && !createdRecently) {
        add('confirmacao', row.id, phone, MESSAGES.confirmacao(name, row), [who(name), formatKeyShort(row.date_key), minutesToHHMM(row.time_slot), servicesLabel(row.services)]);
      }
      // Confirmação 1 hora antes (o cron roda a cada 15 min, então sai entre 60 e 45 min antes).
      const minutesUntil = row.time_slot - local.minutes;
      const bookedJustNow = row.created_at && now - new Date(row.created_at).getTime() < 90 * 60_000;
      if (row.date_key === today && minutesUntil > 0 && minutesUntil <= REMINDER_BEFORE_MIN && !bookedJustNow) {
        add('lembrete_1h', row.id, phone, MESSAGES.lembrete_1h(name, row), [who(name), minutesToHHMM(row.time_slot), servicesLabel(row.services)]);
      }
    }
    if (local.hour >= 10 && rows.some((row) => row.date_key === yesterday)) {
      add('pos_atendimento', `${phone}:${yesterday}`, phone, MESSAGES.pos_atendimento(name), [who(name)]);
    }
    const hasFuture = rows.some((row) => row.date_key >= today);
    const lastVisit = rows.map((row) => row.date_key).filter((key) => key < today).sort().pop();
    if (local.hour >= 10 && local.hour < 18 && !hasFuture && lastVisit) {
      const days = daysBetween(lastVisit, today);
      if (days >= RETURN_AFTER_DAYS && days <= RETURN_UNTIL_DAYS) {
        add('retorno', `${phone}:${lastVisit}`, phone, MESSAGES.retorno(name, days), [who(name), String(days)]);
      }
    }
  }

  const monthDay = `${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  for (const client of clients) {
    if (client.birthdate && String(client.birthdate).slice(5, 10) === monthDay) {
      add('aniversario', `${client.phone_digits}:${local.year}`, client.phone_digits, MESSAGES.aniversario(firstName(client.name)), [who(firstName(client.name))]);
    }
  }

  candidates.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  const chosen = [];
  const usedPhones = new Set();
  for (const item of candidates) {
    if (usedPhones.has(item.phoneDigits)) continue;
    if (!URGENT.has(item.kind) && recentPhones.has(item.phoneDigits)) continue;
    usedPhones.add(item.phoneDigits);
    chosen.push(item);
    if (chosen.length >= MAX_PER_RUN) break;
  }
  return chosen;
}

export { QUIET_HOURS };
