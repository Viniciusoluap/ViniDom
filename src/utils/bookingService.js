import { supabase } from '../lib/supabase';
import { dateToKey } from './dateFormatter';

const STORAGE_KEY = 'domconcept_bookings_v2';

// Cache de slots por data — evita re-queries ao trocar datas no calendário
const slotsCache = new Map();

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Reconstrói o número com máscara a partir dos dígitos (formato salvo pelo BookingForm)
function toMasked(digits) {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

// Sufixo numérico do telefone — ex: '98462-6896' — para busca eficiente no Supabase
function phoneSuffix(digits) {
  if (digits.length >= 11) return `${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length >= 10) return `${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

export async function getClientByPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;

  if (supabase) {
    // Filtra no banco pelo sufixo mascarado — evita trazer todos os registros
    const { data, error } = await supabase
      .from('bookings')
      .select('client_name, client_phone, client_email, client_notes, client_birthdate')
      .ilike('client_phone', `%${phoneSuffix(digits)}`)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data?.length) {
      const r = data[0];
      return {
        name:      r.client_name       || '',
        phone:     r.client_phone      || '',
        email:     r.client_email      || '',
        notes:     r.client_notes      || '',
        birthdate: r.client_birthdate  || '',
      };
    }
  }

  const local = loadLocal();
  const match = local
    .slice()
    .reverse()
    .find(b => (b.client?.phone || '').replace(/\D/g, '') === digits);
  if (match) {
    return {
      name:      match.client.name      || '',
      phone:     match.client.phone     || '',
      email:     match.client.email     || '',
      notes:     match.client.notes     || '',
      birthdate: match.client.birthdate || '',
    };
  }
  return null;
}

export async function addBooking(data) {
  const id = crypto.randomUUID();
  const booking = {
    id,
    services:      data.services,
    date:          data.date,
    dateKey:       data.dateKey,
    timeSlot:      data.timeSlot,
    totalDuration: data.totalDuration,
    totalPrice:    data.totalPrice,
    professional:  data.professional || null,
    client: {
      ...data.client,
      birthdate: data.client.birthdate || '',
    },
    status:    'confirmed',
    createdAt: new Date().toISOString(),
  };

  if (supabase) {
    const insertData = {
      id,
      services:       booking.services,
      date:           booking.date,
      date_key:       booking.dateKey,
      time_slot:      booking.timeSlot,
      total_duration: booking.totalDuration,
      total_price:    booking.totalPrice,
      client_name:    booking.client.name,
      client_phone:   booking.client.phone,
      client_email:   booking.client.email || null,
      client_notes:   booking.client.notes || null,
      status:         'confirmed',
    };
    if (booking.client.birthdate)  insertData.client_birthdate  = booking.client.birthdate;
    if (booking.professional)      insertData.professional_name = booking.professional;
    const { error } = await supabase.from('bookings').insert(insertData);
    if (error) console.error('[Supabase] addBooking:', error.message);
  }

  // Invalida cache do dia recém-agendado
  slotsCache.delete(booking.dateKey);

  saveLocal([...loadLocal(), booking]);
  return booking;
}

export async function getBookingById(id) {
  if (supabase) {
    const { data } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (data) return mapRow(data);
  }
  return loadLocal().find(b => b.id === id) || null;
}

export async function getSlotsForDate(date) {
  const key = dateToKey(date);

  // Retorna do cache se já foi consultado nesta sessão
  if (slotsCache.has(key)) return slotsCache.get(key);

  let result;
  if (supabase) {
    const { data, error } = await supabase
      .from('bookings')
      .select('time_slot, total_duration')
      .eq('date_key', key)
      .neq('status', 'cancelled');
    if (!error && data) {
      result = data.map(r => ({ timeSlot: r.time_slot, totalDuration: r.total_duration }));
    }
  }
  if (!result) {
    result = loadLocal()
      .filter(b => b.dateKey === key && b.status !== 'cancelled')
      .map(b => ({ timeSlot: b.timeSlot, totalDuration: b.totalDuration }));
  }

  slotsCache.set(key, result);
  return result;
}

export async function getAllBookings() {
  if (supabase) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data.map(mapRow);
  }
  return loadLocal();
}

export async function updateBookingStatus(id, status) {
  const local = loadLocal();
  const target = local.find(b => b.id === id);

  // Libera slot no cache quando cancela — permite novos agendamentos no mesmo horário
  if (status === 'cancelled' && target?.dateKey) {
    slotsCache.delete(target.dateKey);
  }

  if (supabase) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) console.error('[Supabase] updateBookingStatus:', error.message);
  }
  saveLocal(local.map(b => b.id === id ? { ...b, status } : b));
}

export async function cancelBooking(id) {
  return updateBookingStatus(id, 'cancelled');
}

export async function updateClientByPhone(phone, updates) {
  const digits = phone.replace(/\D/g, '');
  if (supabase) {
    const patch = {};
    if (updates.name      !== undefined) patch.client_name      = updates.name;
    if (updates.email     !== undefined) patch.client_email     = updates.email;
    if (updates.birthdate !== undefined) patch.client_birthdate = updates.birthdate || null;
    if (Object.keys(patch).length) {
      // Filtra no banco diretamente — sem buscar todos os registros primeiro
      await supabase
        .from('bookings')
        .update(patch)
        .ilike('client_phone', `%${phoneSuffix(digits)}`);
    }
  }
  saveLocal(loadLocal().map(b => {
    if ((b.client?.phone || '').replace(/\D/g, '') !== digits) return b;
    return { ...b, client: { ...b.client, ...updates } };
  }));
}

export async function deleteClientByPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (supabase) {
    // Deleta diretamente no banco com filtro — sem buscar todos os registros
    await supabase
      .from('bookings')
      .delete()
      .ilike('client_phone', `%${phoneSuffix(digits)}`);
  }
  saveLocal(loadLocal().filter(b => (b.client?.phone || '').replace(/\D/g, '') !== digits));
}

function mapRow(r) {
  return {
    id:            r.id,
    services:      r.services,
    date:          r.date,
    dateKey:       r.date_key,
    timeSlot:      r.time_slot,
    totalDuration: r.total_duration,
    totalPrice:    r.total_price,
    client: {
      name:      r.client_name,
      phone:     r.client_phone,
      email:     r.client_email,
      notes:     r.client_notes,
      birthdate: r.client_birthdate || '',
    },
    professional: r.professional_name || null,
    status:       r.status,
    createdAt:    r.created_at,
  };
}
