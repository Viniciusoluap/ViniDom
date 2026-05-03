import { useMemo } from 'react';
import { formatPrice, formatDate } from '../utils/dateFormatter';

export default function ClientsList({ bookings }) {
  const clients = useMemo(() => {
    const map = new Map();

    bookings.forEach((b) => {
      const phone = (b.client?.phone || '').replace(/\D/g, '');
      if (!phone) return;

      const existing = map.get(phone);
      const bDate = new Date(b.date);

      if (!existing) {
        map.set(phone, {
          name:       b.client.name      || '',
          phone:      b.client.phone     || '',
          email:      b.client.email     || '',
          birthdate:  b.client.birthdate || '',
          visits:     b.status !== 'cancelled' ? 1 : 0,
          totalSpent: b.status !== 'cancelled' ? (b.totalPrice || 0) : 0,
          lastVisit:  b.status !== 'cancelled' ? bDate : null,
          lastDate:   bDate,
        });
      } else {
        // Always keep the most recent booking's profile data
        if (bDate > existing.lastDate) {
          existing.name      = b.client.name      || existing.name;
          existing.email     = b.client.email     || existing.email;
          existing.birthdate = b.client.birthdate || existing.birthdate;
          existing.lastDate  = bDate;
        }
        if (b.status !== 'cancelled') {
          existing.visits     += 1;
          existing.totalSpent += b.totalPrice || 0;
          if (!existing.lastVisit || bDate > existing.lastVisit) {
            existing.lastVisit = bDate;
          }
        }
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.visits - a.visits);
  }, [bookings]);

  if (!clients.length) {
    return (
      <div className="bg-white border border-brand-100 p-10 text-center text-brand-300 text-sm">
        Nenhum cliente cadastrado.
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">
          Total de clientes:
        </span>
        <span className="text-sm font-bold text-brand-900">{clients.length}</span>
      </div>

      <div className="bg-white border border-brand-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 bg-warm-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">WhatsApp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">E-mail</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Nascimento</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Visitas</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Última Visita</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Total Gasto</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={c.phone} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 === 0 ? '' : 'bg-warm-50/40'}`}>
                <td className="px-4 py-3 font-semibold text-brand-900">{c.name || '—'}</td>
                <td className="px-4 py-3 text-brand-500">
                  <a
                    href={`https://wa.me/55${(c.phone || '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-900 transition-colors"
                  >
                    {c.phone || '—'}
                  </a>
                </td>
                <td className="px-4 py-3 text-brand-400">{c.email || '—'}</td>
                <td className="px-4 py-3 text-brand-400">
                  {c.birthdate
                    ? formatBirthdate(c.birthdate)
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-brand-900">{c.visits}</td>
                <td className="px-4 py-3 text-right text-brand-400">
                  {c.lastVisit ? formatDate(c.lastVisit) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-brand-900">
                  {formatPrice(c.totalSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatBirthdate(dateStr) {
  if (!dateStr) return '—';
  // dateStr is YYYY-MM-DD
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}
