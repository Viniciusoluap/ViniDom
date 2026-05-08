import { STAFF as DEFAULT_STAFF } from './constants';

const KEY = 'vcvisagismo_staff';

export function loadStaff() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_STAFF;
}

function persist(staff) {
  localStorage.setItem(KEY, JSON.stringify(staff));
}

export function addStaffMember(staff, member) {
  const initials = member.initials
    || member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const next = [...staff, { ...member, id: Date.now(), initials }];
  persist(next);
  return next;
}

export function updateStaffMember(staff, id, updates) {
  const next = staff.map(m =>
    m.id === id ? { ...m, ...updates, initials: updates.initials
      || updates.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      || m.initials }
    : m
  );
  persist(next);
  return next;
}

export function deleteStaffMember(staff, id) {
  const next = staff.filter(m => m.id !== id);
  persist(next);
  return next;
}
