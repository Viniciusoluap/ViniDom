import { STAFF as DEFAULT_STAFF } from './constants';

const KEY = 'vcvisagismo_staff';

function sanitizeMember(member) {
  if (!member || typeof member !== 'object') return null;
  const safeMember = { ...member };
  delete safeMember.password;
  return safeMember;
}

function sanitizeStaff(staff) {
  return Array.isArray(staff) ? staff.map(sanitizeMember).filter(Boolean) : [];
}

export function loadStaff() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const stored = sanitizeStaff(parsed);
      // Funcionário novo do cadastro padrão entra também em quem já tinha a lista salva neste aparelho,
      // a não ser que tenha sido excluído aqui de propósito.
      const removed = removedIds();
      const missing = DEFAULT_STAFF.filter(d => !removed.includes(d.id) && !stored.some(m => m.id === d.id || m.name === d.name));
      const safe = [...stored, ...sanitizeStaff(missing)];
      // Remove senhas legadas do armazenamento local assim que o app é aberto.
      localStorage.setItem(KEY, JSON.stringify(safe));
      return safe;
    }
  } catch {
    // localStorage pode estar indisponível em modo privado ou durante SSR.
  }
  return sanitizeStaff(DEFAULT_STAFF);
}

const REMOVED_KEY = 'vcvisagismo_staff_removed';

function removedIds() {
  try { return JSON.parse(localStorage.getItem(REMOVED_KEY) || '[]'); } catch { return []; }
}

function persist(staff) {
  localStorage.setItem(KEY, JSON.stringify(sanitizeStaff(staff)));
}

export function addStaffMember(staff, member) {
  const initials = member.initials
    || member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const next = [...staff, { ...member, id: Date.now(), initials }];
  persist(next);
  return sanitizeStaff(next);
}

export function updateStaffMember(staff, id, updates) {
  const next = staff.map(m =>
    m.id === id ? { ...m, ...updates, initials: updates.initials
      || updates.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      || m.initials }
    : m
  );
  persist(next);
  return sanitizeStaff(next);
}

export function deleteStaffMember(staff, id) {
  const next = staff.filter(m => m.id !== id);
  persist(next);
  try { localStorage.setItem(REMOVED_KEY, JSON.stringify([...new Set([...removedIds(), id])])); } catch { /* sem armazenamento local */ }
  return sanitizeStaff(next);
}
