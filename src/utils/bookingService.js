import { supabase } from '../lib/supabase';
import { dateToKey } from './dateFormatter';

const STORAGE_KEY = 'domconcept_bookings_v2';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function getClientByPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;

  if (supabase) {
    const { data, error } = await supabase
      .from('bookings')
      .select('client_name, client_phone, client_email, client_notes, client_birthdate')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const match = data.find(r => (r.client_phone || '').replace(/\D/g, '') === digits);
      if (match) {
        return {
          name:      match.client_name  || '',
          phone:     match.client_phone || '',
          email:     match.client_email || '',
          notes:     match.client_notes || '',
          birthdate: match.client_birthdate || '',
        };
      }
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
    client: {
      ...data.client,
      birthdate: data.client.birthdate || '',
    },
    status:        'confirmed',
    createdAt:     new Date().toISOString(),
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
      client_email:   booking.client.email    || null,
      client_notes:   booking.client.notes    || null,
      status:         'confirmed',
    };
    if (booking.client.birthdate) {
      insertData.client_birthdate = booking.client.birthdate;
    }
    const { error } = await supabase.from('bookings').insert(insertData);
    if (error) console.error('[Supabase] addBooking:', error.message);
  }

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
  if (supabase) {
    const { data, error } = await supabase
      .from('bookings')
      .select('time_slot, total_duration')
      .eq('date_key', key)
      .neq('status', 'cancelled');
    if (!error && data) return data.map(r => ({ timeSlot: r.time_slot, totalDuration: r.total_duration }));
  }
  return loadLocal()
    .filter(b => b.dateKey === key && b.status !== 'cancelled')
    .map(b => ({ timeSlot: b.timeSlot, totalDuration: b.totalDuration }));
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

export async function cancelBooking(id) {
  if (supabase) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
  }
  saveLocal(loadLocal().map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
}

export async function updateClientByPhone(phone, updates) {
  const digits = phone.replace(/\D/g, '');
  if (supabase) {
    const { data } = await supabase.from('bookings').select('id, client_phone');
    const ids = (data || [])
      .filter(r => (r.client_phone || '').replace(/\D/g, '') === digits)
      .map(r => r.id);
    if (ids.length) {
      const patch = {};
      if (updates.name      !== undefined) patch.client_name      = updates.name;
      if (updates.email     !== undefined) patch.client_email     = updates.email;
      if (updates.birthdate !== undefined) patch.client_birthdate = updates.birthdate || null;
      if (Object.keys(patch).length) {
        await supabase.from('bookings').update(patch).in('id', ids);
      }
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
    const { data } = await supabase.from('bookings').select('id, client_phone');
    const ids = (data || [])
      .filter(r => (r.client_phone || '').replace(/\D/g, '') === digits)
      .map(r => r.id);
    if (ids.length) {
      await supabase.from('bookings').delete().in('id', ids);
    }
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
    status:    r.status,
    createdAt: r.created_at,
  };
}
