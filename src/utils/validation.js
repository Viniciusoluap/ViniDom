export function validateName(name) {
  if (!name || name.trim().length < 3) return 'Nome deve ter ao menos 3 caracteres.';
  return null;
}

export function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) return 'WhatsApp inválido.';
  return null;
}

export function validateEmail(email) {
  if (!email) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'E-mail inválido.';
  return null;
}

export function applyPhoneMask(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
