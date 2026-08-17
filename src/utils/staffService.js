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
      const safe = sanitizeStaff(parsed);
      // Remove senhas legadas do armazenamento local assim que o app é aberto.
      localStorage.setItem(KEY, JSON.stringify(safe));
      return safe;
    }
  } catch {
    // localStorage pode estar indisponível em modo privado ou durante SSR.
  }
  return sanitizeStaff(DEFAULT_STAFF);
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
  return sanitizeStaff(next);
}
