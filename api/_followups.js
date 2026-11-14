import { BUSINESS_INFO } from '../src/utils/constants.js';
import {
  addDaysToKey, firstName, formatKeyShort, localNow, minutesToHHMM, normalizePhoneDigits, weekdayName,
} from '../src/server/agentUtils.js';

export const MAX_PER_RUN = 15;
const RETURN_AFTER_DAYS = 21;
const RETURN_UNTIL_DAYS = 45;
const QUIET_HOURS = 20; // não manda mais de uma mensagem automática por cliente nesse intervalo
const PRIORITY = ['confirmacao', 'aniversario', 'pos_atendimento', 'retorno'];

function daysBetween(fromKey, toKey) {
  return Math.round((new Date(`${toKey}T12:00:00Z`) - new Date(`${fromKey}T12:00:00Z`)) / 86400_000);
}

function servicesLabel(services) {
  return (services || []).map((s) => s.name).join(' + ') || 'atendimento';
}

const hi = (name) => (name ? `Oi, ${name}!` : 'Oi!');

export const MESSAGES = {
  confirmacao: (name, row) => `${hi(name)} Lembrando do seu horário amanhã (${weekdayName(row.date_key).toLowerCase()}, ${formatKeyShort(row.date_key)}) às ${minutesToHHMM(row.time_slot)} — ${servicesLabel(row.services)}. Confirma? Responda SIM ou NÃO.`,
  aniversario: (name) => `Feliz aniversário${name ? `, ${name}` : ''}! 🎉 Que seu dia seja ótimo. Abraço do Vinicius Cavalcante.`,
  pos_atendimento: (name) => `${hi(name)} Obrigado pela visita ontem. Qualquer coisa, é só chamar por aqui.`,
  retorno: (name, days) => `${hi(name)} Já faz ${days} dias do seu último atendimento. Quer que eu veja um horário pra você?`,
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
  const add = (kind, ref, phoneDigits, message) => {
    if (!phoneDigits || phoneDigits === ownerPhone || sentRefs.has(`${kind}:${ref}`)) return;
    candidates.push({ kind, ref, phoneDigits, message });
  };

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
        add('confirmacao', row.id, phone, MESSAGES.confirmacao(name, row));
      }
    }
    if (local.hour >= 10 && rows.some((row) => row.date_key === yesterday)) {
      add('pos_atendimento', `${phone}:${yesterday}`, phone, MESSAGES.pos_atendimento(name));
    }
    const hasFuture = rows.some((row) => row.date_key >= today);
    const lastVisit = rows.map((row) => row.date_key).filter((key) => key < today).sort().pop();
    if (local.hour >= 10 && local.hour < 18 && !hasFuture && lastVisit) {
      const days = daysBetween(lastVisit, today);
      if (days >= RETURN_AFTER_DAYS && days <= RETURN_UNTIL_DAYS) {
        add('retorno', `${phone}:${lastVisit}`, phone, MESSAGES.retorno(name, days));
      }
    }
  }

  const monthDay = `${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  for (const client of clients) {
    if (client.birthdate && String(client.birthdate).slice(5, 10) === monthDay) {
      add('aniversario', `${client.phone_digits}:${local.year}`, client.phone_digits, MESSAGES.aniversario(firstName(client.name)));
    }
  }

  candidates.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  const chosen = [];
  const usedPhones = new Set();
  for (const item of candidates) {
    if (usedPhones.has(item.phoneDigits)) continue;
    if (item.kind !== 'confirmacao' && recentPhones.has(item.phoneDigits)) continue;
    usedPhones.add(item.phoneDigits);
    chosen.push(item);
    if (chosen.length >= MAX_PER_RUN) break;
  }
  return chosen;
}

export { QUIET_HOURS };
