const phoneDigits = (phone) => String(phone || '').replace(/\D/g, '');

// Lista única de clientes: junta quem já agendou com o cadastro (aba Clientes, Vicky, cadastro manual).
// O cadastro manda no nome, e-mail e nascimento; os agendamentos dão visitas, gasto e última visita.
export function mergeClients(bookings = [], registered = []) {
  const map = new Map();
  bookings.forEach((b) => {
    const phone = phoneDigits(b.client?.phone);
    if (!phone) return;
    const existing = map.get(phone);
    const bDate = new Date(b.date);
    const counts = b.status !== 'cancelled';
    if (!existing) {
      map.set(phone, {
        name: b.client.name || '',
        phone: b.client.phone || '',
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
