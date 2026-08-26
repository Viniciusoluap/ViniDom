import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = {
  hook: await readFile(new URL('../src/hooks/useBookings.js', import.meta.url), 'utf8'),
  service: await readFile(new URL('../src/utils/bookingService.js', import.meta.url), 'utf8'),
  admin: await readFile(new URL('../src/pages/Admin.jsx', import.meta.url), 'utf8'),
  staff: await readFile(new URL('../src/pages/Funcionario.jsx', import.meta.url), 'utf8'),
};

const checks = [
  ['hook waits for authentication', /export function useBookings\(enabled = true\)/.test(files.hook)],
  ['hook clears unauthenticated state', /if \(!enabled\)[\s\S]*setBookings\(\[\]\)/.test(files.hook)],
  ['hook exposes a retry function', /const reload = useCallback/.test(files.hook) && /reload,/.test(files.hook)],
  ['hook exposes an explicit loading error', /const \[error, setError\]/.test(files.hook) && /setError\(err instanceof Error/.test(files.hook)],
  ['service propagates Supabase errors', /getAllBookings:[^\n]*\n\s*throw error/.test(files.service)],
  ['admin waits for auth', /useBookings\(authed\)/.test(files.admin)],
  ['admin does not render data on error', /bookingsError/.test(files.admin) && /BookingsLoadError/.test(files.admin)],
  ['admin offers retry', /Tentar novamente/.test(files.admin) && /reloadBookings/.test(files.admin)],
  ['staff waits for auth', /useBookings\(authed\)/.test(files.staff)],
  ['staff offers retry', /bookingsError/.test(files.staff) && /Tentar novamente/.test(files.staff)],
];

for (const [name, passed] of checks) {
  assert.equal(passed, true, `Reliability regression failed: ${name}`);
  console.log(`PASS ${name}`);
}

console.log(`AIOX reliability checks passed: ${checks.length}`);
