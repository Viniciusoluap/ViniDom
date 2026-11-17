const phoneDigits = (phone) => String(phone || '').replace(/\D/g, '');

// Lista única de clientes: junta quem já agendou com o cadastro (aba Clientes, Vicky, cadastro manual).
// O cadastro manda no nome, e-mail e nascimento; os agendamentos dão visitas, gasto e última visita.
export const nameKey = (name) => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const isBlock = (b) => (b.services || []).some((service) => service?.category === 'Bloqueio');

// includeWithoutPhone: também lista quem só tem nome (agendamento lançado sem WhatsApp), agrupado pelo nome,
// para o telefone ser preenchido depois. Bloqueios de horário (almoço etc.) nunca viram cliente.
export function mergeClients(bookings = [], registered = [], { includeWithoutPhone = false } = {}) {
  const map = new Map();
  bookings.forEach((b) => {
    const digits = phoneDigits(b.client?.phone);
    if (!digits && (!includeWithoutPhone || isBlock(b) || !nameKey(b.client?.name))) return;
    const phone = digits || `nome:${nameKey(b.client.name)}`;
    const existing = map.get(phone);
    const bDate = new Date(b.date);
    const counts = b.status !== 'cancelled';
    if (!existing) {
      map.set(phone, {
        name: b.client.name || '',
        phone: digits ? (b.client.phone || '') : '',
        noPhone: !digits,
        email: b.client.email || '',
        birthdate: b.client.birthdate || '',
        visits: counts ? 1 : 0,
        totalSpent: counts ? (b.totalPrice || 0) : 0,
        lastVisit: counts ? bDate : null,
        lastDate: bDate,
      });
      return;
    }
    if (bDate > existing.lastDate) {
      existing.name = b.client.name || existing.name;
      existing.email = b.client.email || existing.email;
      existing.birthdate = b.client.birthdate || existing.birthdate;
      existing.lastDate = bDate;
    }
    if (counts) {
      existing.visits += 1;
      existing.totalSpent += b.totalPrice || 0;
      if (!existing.lastVisit || bDate > existing.lastVisit) existing.lastVisit = bDate;
    }
  });
  registered.forEach((c) => {
    const digits = c.phone_digits || phoneDigits(c.phone);
    if (!digits) return;
    const data = { name: c.name || '', phone: c.phone || digits, email: c.email || '', birthdate: c.birthdate || '' };
    const existing = map.get(digits);
    if (existing) Object.assign(existing, data);
    else map.set(digits, { ...data, visits: 0, totalSpent: 0, lastVisit: null });
  });
  return Array.from(map.values()).sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
}
