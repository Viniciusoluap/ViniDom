import { supabase } from '../lib/supabase';
import { dateToKey } from './dateFormatter';
import { syncBookingWithCalendar } from './calendarService';

const STORAGE_KEY = 'domconcept_bookings_v2';
const CREATE_BOOKING_RPC = 'create_public_booking_v2';
const GET_BOOKED_SLOTS_RPC = 'get_booked_slots_v2';
const GET_PUBLIC_BOOKING_RPC = 'get_public_booking_v2';

// Cache de slots por data — evita re-queries ao trocar datas no calendário
const slotsCache = new Map();

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

    // Não consulta PII no banco pelo telefone a partir do navegador público.
  // O preenchimento automático usa apenas dados já armazenados localmente neste dispositivo.



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

async function createRemoteBooking(data) {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || 'Não foi possível confirmar o agendamento.');
    error.status = response.status;
    throw error;
  }
  return payload.booking;
}

export async function addBooking(data) {
  if (import.meta.env.PROD) {
    const booking = await createRemoteBooking(data);
    slotsCache.delete(booking.dateKey);
    saveLocal([...loadLocal(), booking]);
    return booking;
  }

  const id = crypto.randomUUID();
  const booking = {
    id,
    services:      data.services,
    date:          data.date,
    dateKey:       data.dateKey,
    timeSlot:      data.timeSlot,
    totalDuration: data.totalDuration,
    operationalDuration: data.operationalDuration || data.totalDuration,
    totalPrice:    data.totalPrice,
    professional:  data.professional || null,
    client: {
      ...data.client,
      birthdate: data.client.birthdate || '',
    },
    status:    'confirmed',
    createdAt: new Date().toISOString(),
  };

    if (supabase && import.meta.env.VITE_USE_DIRECT_BOOKING_RPC === 'true') {
    const { data, error } = await supabase.rpc(CREATE_BOOKING_RPC, {
      p_id: id,
      p_services: booking.services,
      p_date: booking.date,
      p_date_key: booking.dateKey,
      p_time_slot: booking.timeSlot,
      p_total_duration: booking.totalDuration,
      p_operational_duration: booking.operationalDuration,
      p_total_price: booking.totalPrice,
      p_client_name: booking.client.name,
      p_client_phone: booking.client.phone,
      p_client_email: booking.client.email || null,
      p_client_notes: booking.client.notes || null,
      p_client_birthdate: booking.client.birthdate || null,
      p_professional_name: booking.professional || null,
    });
    if (error) {
      console.error(`[Supabase] ${CREATE_BOOKING_RPC}:`, error.message);
      throw error;
    }
    if (data) booking.id = data;
  }


  // Invalida cache do dia recém-agendado
  slotsCache.delete(booking.dateKey);

  saveLocal([...loadLocal(), booking]);
  return booking;
}

export async function getBookingById(id) {
  if (supabase && import.meta.env.PROD) {
    const response = await fetch(`/api/booking?id=${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.booking) return payload.booking;
    if (response.status === 404) return null;
    throw new Error(payload?.error || 'Não foi possível carregar a reserva.');
  }
  if (supabase && import.meta.env.VITE_USE_DIRECT_BOOKING_RPC === 'true') {
    const { data, error } = await supabase.rpc(GET_PUBLIC_BOOKING_RPC, { p_id: id });
    if (!error && data?.length) return mapPublicRow(data[0]);
    if (error) console.error(`[Supabase] ${GET_PUBLIC_BOOKING_RPC}:`, error.message);
  }
  return loadLocal().find(b => b.id === id) || null;
}

export async function getSlotsForDate(date) {
  const key = dateToKey(date);

  // Retorna do cache se já foi consultado nesta sessão
  if (slotsCache.has(key)) return slotsCache.get(key);

  let result;
  if (supabase && import.meta.env.PROD) {
    const response = await fetch(`/api/booking-availability?date=${encodeURIComponent(key)}`, { headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'Não foi possível consultar os horários.');
    result = payload.slots || [];
  } else if (supabase && import.meta.env.VITE_USE_DIRECT_BOOKING_RPC === 'true') {
    const { data, error } = await supabase.rpc(GET_BOOKED_SLOTS_RPC, { p_date_key: key });
    if (error) {
      console.error(`[Supabase] ${GET_BOOKED_SLOTS_RPC}:`, error.message);
      throw error;
    }
    result = (data || []).map(r => ({
      timeSlot: r.time_slot,
      totalDuration: r.operational_duration || (r.total_duration === 90 ? 120 : r.total_duration),
    }));
  } else {
    result = loadLocal()
      .filter(b => b.dateKey === key && b.status !== 'cancelled')
      .map(b => ({
        timeSlot: b.timeSlot,
        totalDuration: b.operationalDuration || (b.totalDuration === 90 ? 120 : b.totalDuration),
      }));
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
    if (error) {
      console.error('[Supabase] getAllBookings:', error.message);
      throw error;
    }
    return (data || []).map(mapRow);
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
    const { error } = await supabase.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      console.error('[Supabase] updateBookingStatus:', error.message);
      throw error;
    }
  }
  if (import.meta.env.PROD && supabase) {
    await syncBookingWithCalendar(id, status === 'cancelled' ? 'cancel' : 'upsert');
  }
  saveLocal(local.map(b => b.id === id ? { ...b, status } : b));
}

export async function cancelBooking(id) {
  return updateBookingStatus(id, 'cancelled');
}

export async function updateBooking(id, patch) {
  const local = loadLocal();
  const target = local.find(b => b.id === id);

  // Invalida cache do dia se a duração mudar — libera/bloqueia slots corretamente
  if ((patch.totalDuration !== undefined || patch.operationalDuration !== undefined) && target?.dateKey) {
    slotsCache.delete(target.dateKey);
  }

  const dbPatch = {};
  if (patch.services      !== undefined) dbPatch.services       = patch.services;
  if (patch.totalDuration !== undefined) dbPatch.total_duration = patch.totalDuration;
  if (patch.operationalDuration !== undefined) dbPatch.operational_duration = patch.operationalDuration;
  if (patch.totalPrice    !== undefined) dbPatch.total_price    = patch.totalPrice;
  if (patch.timeSlot      !== undefined) dbPatch.time_slot      = patch.timeSlot;

  if (supabase) {
    const { error } = await supabase.from('bookings').update({ ...dbPatch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      console.error('[Supabase] updateBooking:', error.message);
      throw error;
    }
  }
  if (import.meta.env.PROD && supabase) {
    await syncBookingWithCalendar(id, 'upsert');
  }
  saveLocal(local.map(b => b.id === id ? { ...b, ...patch } : b));
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
      const { error } = await supabase
        .from('bookings')
        .update(patch)
        .ilike('client_phone', `%${phoneSuffix(digits)}`);
      if (error) throw error;
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
    const { error } = await supabase
      .from('bookings')
      .delete()
      .ilike('client_phone', `%${phoneSuffix(digits)}`);
    if (error) throw error;
  }
  saveLocal(loadLocal().filter(b => (b.client?.phone || '').replace(/\D/g, '') !== digits));
}

function mapPublicRow(r) {
  return {
    id: r.id,
    services: r.services,
    date: r.date,
    dateKey: r.date_key,
    timeSlot: r.time_slot,
    totalDuration: r.total_duration,
    operationalDuration: r.operational_duration || r.total_duration,
    totalPrice: r.total_price,
    client: { name: r.client_name || '', email: '' },
    professional: r.professional_name || null,
    status: r.status,
    createdAt: r.created_at,
  };
}

function mapRow(r) {
  return {
    id:            r.id,
    services:      r.services,
    date:          r.date,
    dateKey:       r.date_key,
    timeSlot:      r.time_slot,
    totalDuration: r.total_duration,
    operationalDuration: r.operational_duration || (r.total_duration === 90 ? 120 : r.total_duration),
    totalPrice: r.total_price,
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
