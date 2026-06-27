import { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { formatPrice, formatDateLong } from '../utils/dateFormatter';
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

  // Follow-up: last visit > 10 days ago
  const followUp = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 10);
    return clients
      .filter(c => c.lastVisit && new Date(c.lastVisit) < cutoff)
      .sort((a, b) => new Date(a.lastVisit) - new Date(b.lastVisit));
  }, [clients]);

  // Birthday today
  const birthdayToday = useMemo(() => {
    const now = new Date();
    const todayMM = String(now.getMonth() + 1).padStart(2, '0');
    const todayDD = String(now.getDate()).padStart(2, '0');
    return clients.filter(c => {
      if (!c.birthdate) return false;
      const parts = c.birthdate.split('-'); // YYYY-MM-DD
      return parts[1] === todayMM && parts[2] === todayDD;
    });
  }, [clients]);

  const daysSince = (date) => Math.floor((new Date() - new Date(date)) / 86400000);

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

      {/* 5. Aniversariantes do Dia */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1">
          🎂 Aniversariantes de Hoje
        </h2>
        <p className="text-xs text-brand-300 mb-4">Clientes que fazem aniversário hoje.</p>
        {birthdayToday.length === 0 ? (
          <div className="bg-white border border-brand-100 p-6 text-center text-brand-300 text-sm">
            Nenhum aniversariante hoje.
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-widest">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-widest">WhatsApp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-amber-700 uppercase tracking-widest">Nascimento</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {birthdayToday.map((c) => {
                  const digits  = (c.phone || '').replace(/\D/g, '');
                  const msg = encodeURIComponent(
                    `Olá, ${c.name}! 🎂🎉 Feliz aniversário! Que hoje seja um dia incrível, cheio de alegria e realizações. Aqui é o Vinicius Cavalcante, e quero te desejar tudo de melhor nessa data tão especial. Você merece muito! 🥳✨`
                  );
                  const waLink  = `https://wa.me/55${digits}?text=${msg}`;
                  const [y, m, d] = (c.birthdate || '').split('-');
                  return (
                    <tr key={c.phone} className="border-b border-amber-100">
                      <td className="px-4 py-3 font-semibold text-brand-900">{c.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-500">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-brand-400">{d && m && y ? `${d}/${m}/${y}` : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                        >
                          <WaIcon /> Parabenizar
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 6. Follow-up */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-1">
          Follow-up — Clientes para Contatar
        </h2>
        <p className="text-xs text-brand-300 mb-4">Clientes cuja última visita foi há mais de 10 dias.</p>
        {followUp.length === 0 ? (
          <div className="bg-white border border-brand-100 p-8 text-center text-brand-300 text-sm">
            Todos os clientes visitaram recentemente.
          </div>
        ) : (
          <div className="bg-white border border-brand-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">WhatsApp</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Última Visita</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Dias</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {followUp.map((c, i) => {
                  const digits = (c.phone || '').replace(/\D/g, '');
                  const msg = encodeURIComponent(
                    `Olá, ${c.name}! Tudo bem? 😊 Aqui é o Vinicius Cavalcante. Faz um tempo que não te vejo por aqui e senti sua falta! Que tal agendar um horário e renovar o visual? Estou disponível para deixar você ainda mais incrível. ✂️💈`
                  );
                  const waLink = `https://wa.me/55${digits}?text=${msg}`;
                  return (
                    <tr key={c.phone} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 !== 0 ? 'bg-warm-50/40' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-brand-900">{c.name || '—'}</td>
                      <td className="px-4 py-3 text-brand-500">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-right text-brand-400">
                        {c.lastVisit ? formatDateLong(c.lastVisit) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gold-500">
                        {c.lastVisit ? `${daysSince(c.lastVisit)}d` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                        >
                          <WaIcon /> Contatar
                        </a>
                      </td>
                    </tr>
                  );
                })}
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

function WaIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function EmptyState({ text }) {
  return (
    <div className="bg-white border border-brand-100 p-8 text-center text-brand-300 text-sm">
      {text}
    </div>
  );
}
