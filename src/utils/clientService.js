import { supabase } from '../lib/supabase';
import { validateEmail, validateName, validatePhone } from './validation';

const KEY = 'vcvisagismo_clients';
export const phoneDigits = phone => String(phone || '').replace(/\D/g, '');

function localClients() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export async function loadClients() {
  if (!supabase) return localClients();
  const { data, error } = await supabase.from('clients').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function saveClient(form) {
  const phone_digits = phoneDigits(form.phone);
  const message = validateName(form.name) || validatePhone(form.phone) || validateEmail(form.email);
  if (message) throw new Error(message);
  const existing = (await loadClients()).find(c => c.phone_digits === phone_digits);
  if (existing) throw new Error('Este WhatsApp já está cadastrado. Selecione ou edite o cliente existente.');
  const client = {
    name: form.name.trim(), phone: form.phone.trim(), phone_digits,
    email: form.email?.trim() || null, birthdate: form.birthdate || null,
    notes: form.notes?.trim() || null,
  };
  if (supabase) {
    const { error } = await supabase.from('clients').insert(client);
    if (error?.code === '23505') throw new Error('Este WhatsApp já está cadastrado.');
    if (error) throw error;
  } else {
    localStorage.setItem(KEY, JSON.stringify([...localClients(), client]));
  }
  return client;
}

export async function editClient(phone, updates) {
  const phone_digits = phoneDigits(phone);
  const patch = {
    name: updates.name.trim(), email: updates.email?.trim() || null,
    birthdate: updates.birthdate || null, updated_at: new Date().toISOString(),
  };
  const message = validateName(patch.name) || validateEmail(patch.email);
  if (message) throw new Error(message);
  if (supabase) {
    const { error } = await supabase.from('clients').update(patch).eq('phone_digits', phone_digits);
    if (error) throw error;
  } else {
    localStorage.setItem(KEY, JSON.stringify(localClients().map(c => c.phone_digits === phone_digits ? { ...c, ...patch } : c)));
  }
}

// Troca o WhatsApp do cadastro, mantendo o mesmo cliente (nome, nascimento, observações).
export async function changeClientPhone(oldPhone, newPhone) {
  const message = validatePhone(newPhone);
  if (message) throw new Error(message);
  const patch = { phone: newPhone.trim(), phone_digits: phoneDigits(newPhone), updated_at: new Date().toISOString() };
  if (supabase) {
    const { error } = await supabase.from('clients').update(patch).eq('phone_digits', phoneDigits(oldPhone));
    if (error?.code === '23505') throw new Error('Já existe um cliente com este WhatsApp.');
    if (error) throw error;
  } else {
    localStorage.setItem(KEY, JSON.stringify(localClients().map(c => c.phone_digits === phoneDigits(oldPhone) ? { ...c, ...patch } : c)));
  }
}

export async function removeClient(phone) {
  const digits = phoneDigits(phone);
  if (supabase) {
    const { error } = await supabase.from('clients').delete().eq('phone_digits', digits);
    if (error) throw error;
  } else {
    localStorage.setItem(KEY, JSON.stringify(localClients().filter(c => c.phone_digits !== digits)));
  }
}
