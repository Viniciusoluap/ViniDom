import { supabase } from '../lib/supabase';
import { normalizeClientPhone, validateClientDetails } from './clientDirectory.js';

function requireDatabase() {
  if (!supabase) throw new Error('Configure o banco de dados para gerenciar clientes.');
  return supabase;
}

function clientError(error) {
  if (error.code === '23505') return new Error('Já existe um cliente com este WhatsApp. Edite o cadastro existente.');
  return new Error(error.message || 'Não foi possível salvar o cliente.');
}

export async function getRegisteredClients() {
  const { data, error } = await requireDatabase().from('clients').select('id,name,phone,email,birthdate').order('name');
  if (error) throw clientError(error);
  return (data || []).map(c => ({ ...c, email: c.email || '', birthdate: c.birthdate || '' }));
}

export async function saveClient(originalPhone, values) {
  const validation = validateClientDetails(values);
  if (validation) throw new Error(validation);
  const { data, error } = await requireDatabase().rpc('save_admin_client', {
    p_original_phone: originalPhone ? normalizeClientPhone(originalPhone) : null,
    p_name: values.name.trim(),
    p_phone: normalizeClientPhone(values.phone),
    p_email: values.email.trim() || null,
    p_birthdate: values.birthdate || null,
  });
  if (error) throw clientError(error);
  return { ...data, email: data.email || '', birthdate: data.birthdate || '' };
}

export async function deleteClient(phone) {
  const { error } = await requireDatabase().rpc('delete_admin_client', { p_phone: normalizeClientPhone(phone) });
  if (error) throw clientError(error);
}
