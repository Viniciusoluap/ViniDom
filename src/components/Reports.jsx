import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { formatPrice } from '../utils/dateFormatter';
import { MONTH_NAMES_PT } from '../utils/constants';

export default function Reports({ bookings }) {
  const today = new Date();
  const [filterMonth, setFilterMonth] = useState(today.getMonth());
  const [filterYear, setFilterYear]   = useState(today.getFullYear());

  const currentYear = today.getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  const active = useMemo(() => bookings.filter(b => b.status !== 'cancelled'), [bookings]);

  const filteredActive = useMemo(() =>
    active.filter(b => {
      const d = new Date(b.date);
      if (d.getFullYear() !== filterYear) return false;
      if (filterMonth === -1) return true;
      return d.getMonth() === filterMonth;
    }),
    [active, filterYear, filterMonth]
  );

  // Unique clients by phone
  const clientMap = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      const phone = (b.client?.phone || '').replace(/\D/g, '');
      if (!phone) return;
      const bDate = new Date(b.date);
      const existing = map.get(phone);
      if (!existing) {
        map.set(phone, {
          name:       b.client.name      || '',
          phone:      b.client.phone     || '',
          birthdate:  b.client?.birthdate || '',
          visits:     b.status !== 'cancelled' ? 1 : 0,
          totalSpent: b.status !== 'cancelled' ? (b.totalPrice || 0) : 0,
          lastVisit:  b.status !== 'cancelled' ? bDate : null,
          lastDate:   bDate,
        });
      } else {
        if (bDate > existing.lastDate) {
          existing.name      = b.client.name      || existing.name;
          existing.birthdate = b.client?.birthdate || existing.birthdate;
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
    return map;
  }, [bookings]);

  const clients = useMemo(() => Array.from(clientMap.values()), [clientMap]);

  // General summary (filtered by selected month/year)
  const totalRevenue  = useMemo(() => filteredActive.reduce((s, b) => s + (b.totalPrice || 0), 0), [filteredActive]);
  const ticketMedio   = filteredActive.length ? totalRevenue / filteredActive.length : 0;
  const uniqueClients = useMemo(() => {
    const phones = new Set(filteredActive.map(b => (b.client?.phone || '').replace(/\D/g, '')).filter(Boolean));
    return phones.size;
  }, [filteredActive]);

  // Revenue by last 6 months
  const revenueByMonth = useMemo(() => {
    const now   = new Date();
    const rows  = [];
    for (let i = 0; i < 6; i++) {
      const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year  = d.getFullYear();
      const month = d.getMonth();
      const monthBookings = active.filter(b => {
        const bd = new Date(b.date);
        return bd.getFullYear() === year && bd.getMonth() === month;
      });
      rows.push({
        label:    `${MONTH_NAMES_PT[month]} ${year}`,
        count:    monthBookings.length,
        revenue:  monthBookings.reduce((s, b) => s + (b.totalPrice || 0), 0),
      });
    }
    return rows;
  }, [active]);

  // Top 5 services
  const topServices = useMemo(() => {
    const map = new Map();
    active.forEach(b => {
      const list = b.services || (b.service ? [b.service] : []);
      list.forEach(s => {
        const entry = map.get(s.name) || { name: s.name, count: 0, revenue: 0 };
        entry.count  += 1;
        entry.revenue += s.price || 0;
        map.set(s.name, entry);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [active]);

  // Top 5 clients by visits
  const topClients = useMemo(() =>
    clients.slice().sort((a, b) => b.visits - a.visits).slice(0, 5),
    [clients]
  );

  const periodLabel = filterMonth === -1
    ? `Todos os meses de ${filterYear}`
    : `${MONTH_NAMES_PT[filterMonth]} ${filterYear}`;

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-brand-100 p-4">
        <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Filtrar:</span>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(Number(e.target.value))}
          className="input-field py-1.5 text-sm w-auto"
        >
          <option value={-1}>Todos os meses</option>
          {MONTH_NAMES_PT.map((name, idx) => (
            <option key={idx} value={idx}>{name}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(Number(e.target.value))}
          className="input-field py-1.5 text-sm w-auto"
        >
          {yearOptions.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 btn-secondary py-1.5 text-sm"
        >
          <Printer size={14} />
          Imprimir Relatório
        </button>
      </div>

      {/* 1. Resumo Geral */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">
          Resumo Geral — {periodLabel}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total de Agendamentos" value={filteredActive.length} sub={periodLabel.toLowerCase()} />
          <StatCard label="Receita Total"         value={formatPrice(totalRevenue)} sub={periodLabel.toLowerCase()} accent />
          <StatCard label="Ticket Médio"          value={formatPrice(ticketMedio)} sub="por agendamento" />
          <StatCard label="Clientes Únicos"       value={uniqueClients} sub={periodLabel.toLowerCase()} />
        </div>
      </section>

      {/* 2. Receita por Mês */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">
          Receita por Mês — Últimos 6 meses
        </h2>
        <div className="bg-white border border-brand-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-warm-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Mês / Ano</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Agendamentos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Receita</th>
              </tr>
            </thead>
            <tbody>
              {revenueByMonth.map((row, i) => (
                <tr key={row.label} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 !== 0 ? 'bg-warm-50/40' : ''}`}>
                  <td className="px-4 py-3 font-semibold text-brand-900">{row.label}</td>
                  <td className="px-4 py-3 text-right text-brand-500">{row.count}</td>
                  <td className="px-4 py-3 text-right font-bold text-brand-900">{formatPrice(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Serviços Mais Populares */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">
          Serviços Mais Populares — Top 5
        </h2>
        {topServices.length === 0 ? (
          <EmptyState text="Nenhum serviço registrado." />
        ) : (
          <div className="bg-white border border-brand-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Serviço</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Agendamentos</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Receita</th>
                </tr>
              </thead>
              <tbody>
                {topServices.map((s, i) => (
                  <tr key={s.name} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 !== 0 ? 'bg-warm-50/40' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-brand-900">{s.name}</td>
                    <td className="px-4 py-3 text-right text-brand-500">{s.count}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-900">{formatPrice(s.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 4. Clientes Mais Frequentes */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">
          Clientes Mais Frequentes — Top 5
        </h2>
        {topClients.length === 0 ? (
          <EmptyState text="Nenhum cliente cadastrado." />
        ) : (
          <div className="bg-white border border-brand-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">WhatsApp</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Visitas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Total Gasto</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr key={c.phone} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 !== 0 ? 'bg-warm-50/40' : ''}`}>
                    <td className="px-4 py-3 font-semibold text-brand-900">{c.name || '—'}</td>
                    <td className="px-4 py-3 text-brand-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-900">{c.visits}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatPrice(c.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-brand-100 p-5">
      <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-3">{label}</p>
      <p className={`font-bold leading-tight ${accent ? 'text-gold-500' : 'text-brand-900'} ${String(value).length > 8 ? 'text-sm' : 'text-2xl'}`}>
        {value}
      </p>
      <p className="text-xs text-brand-300 mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-white border border-brand-100 p-8 text-center text-brand-300 text-sm">
      {text}
    </div>
  );
}
