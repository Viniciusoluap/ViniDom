export function normalizeClientPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2) : digits;
}

export function validateClientDetails(values) {
  const name = String(values.name || '').trim();
  const phone = normalizeClientPhone(values.phone);
  const email = String(values.email || '').trim();
  const birthdate = String(values.birthdate || '');
  if (name.length < 3 || name.length > 120) return 'Informe um nome entre 3 e 120 caracteres.';
  if (!/^[1-9][0-9]{9,10}$/.test(phone)) return 'Informe um WhatsApp válido com DDD.';
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return 'Informe um e-mail válido.';
  if (birthdate) {
    const parsed = new Date(`${birthdate}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthdate || birthdate < '1900-01-01' || birthdate > new Date().toLocaleDateString('en-CA')) {
      return 'Informe uma data de nascimento válida, que não esteja no futuro.';
    }
  }
  return null;
}

// Mantém as métricas atuais; o cadastro administrativo é a fonte dos dados pessoais.
export function buildClientDirectory(bookings, registeredClients = []) {
  const map = new Map();
  for (const booking of bookings) {
    const phone = normalizeClientPhone(booking.client?.phone);
    if (!phone) continue;
    let client = map.get(phone);
    const date = new Date(booking.date);
    if (!client) {
      client = { ...booking.client, phone, visits: 0, totalSpent: 0, lastVisit: null, lastDate: null };
      map.set(phone, client);
    }
    if (!client.lastDate || date > client.lastDate) {
      Object.assign(client, {
        name: booking.client.name || client.name || '',
        email: booking.client.email || client.email || '',
        birthdate: booking.client.birthdate || client.birthdate || '',
        lastDate: date,
      });
    }
    if (booking.status !== 'cancelled') {
      client.visits += 1;
      client.totalSpent += booking.totalPrice || 0;
      if (!client.lastVisit || date > client.lastVisit) client.lastVisit = date;
    }
  }
  for (const registered of registeredClients) {
    const phone = normalizeClientPhone(registered.phone);
    map.set(phone, {
      visits: 0, totalSpent: 0, lastVisit: null,
      ...map.get(phone), ...registered, phone,
    });
  }
  return [...map.values()].sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name, 'pt-BR'));
}
