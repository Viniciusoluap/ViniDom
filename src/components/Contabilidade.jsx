import { useMemo, useState } from 'react';
import { Plus, Trash2, Printer } from 'lucide-react';
import { formatPrice } from '../utils/dateFormatter';
import { MONTH_NAMES_PT } from '../utils/constants';

// Limites e alíquotas vigentes (MEI 2025)
const MEI_LIMITE_ANUAL   = 81000;   // R$ 81.000/ano
const DAS_MENSAL_SERVICO = 80.90;   // INSS R$71,60 + ISS R$5,00 + ICMS R$4,30 — barbearia/salão
const EXPENSE_KEY = 'vcvisagismo_expenses';

function loadExpenses() {
  try { return JSON.parse(localStorage.getItem(EXPENSE_KEY) || '[]'); }
  catch { return []; }
}
function saveExpenses(list) {
  localStorage.setItem(EXPENSE_KEY, JSON.stringify(list));
}

export default function Contabilidade({ bookings }) {
  const today        = new Date();
  const currentYear  = today.getFullYear();
  const currentMonth = today.getMonth();

  const [expenses, setExpenses] = useState(loadExpenses);
  const [newDesc,  setNewDesc]  = useState('');
  const [newValue, setNewValue] = useState('');
  const [newMonth, setNewMonth] = useState(currentMonth);
  const [newYear,  setNewYear]  = useState(currentYear);

  // Receita por mês (apenas agendamentos atendidos)
  const attended = useMemo(() =>
    bookings.filter(b => b.status === 'attended'),
    [bookings]
  );

  // Receita mensal — ano corrente
  const monthlyRevenue = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => {
      const rev = attended
        .filter(b => {
          const d = new Date(b.date);
          return d.getFullYear() === currentYear && d.getMonth() === m;
        })
        .reduce((s, b) => s + (b.totalPrice || 0), 0);
      return { month: m, label: MONTH_NAMES_PT[m], revenue: rev };
    });
  }, [attended, currentYear]);

  // Receita total ano corrente
  const annualRevenue = useMemo(() =>
    monthlyRevenue.reduce((s, r) => s + r.revenue, 0),
    [monthlyRevenue]
  );

  // Progresso MEI
  const meiPercent = Math.min((annualRevenue / MEI_LIMITE_ANUAL) * 100, 100);
  const meiRemaining = Math.max(MEI_LIMITE_ANUAL - annualRevenue, 0);
  const meiAlert = meiPercent >= 80;

  // DAS estimado no ano (meses com receita > 0)
  const activeMonths = monthlyRevenue.filter(r => r.revenue > 0).length;
  const estimatedDAS = activeMonths * DAS_MENSAL_SERVICO;

  // Despesas do ano corrente
  const yearExpenses = useMemo(() =>
    expenses.filter(e => e.year === currentYear),
    [expenses, currentYear]
  );
  const totalExpenses = yearExpenses.reduce((s, e) => s + e.value, 0);

  // Lucro líquido estimado
  const netProfit = annualRevenue - totalExpenses - estimatedDAS;

  // Despesas por mês atual

  // Adicionar despesa
  const addExpense = () => {
    const val = parseFloat(newDesc && newValue.replace(',', '.'));
    if (!newDesc.trim() || isNaN(val) || val <= 0) return;
    const updated = [...expenses, {
      id:    Date.now(),
      desc:  newDesc.trim(),
      value: val,
      month: newMonth,
      year:  newYear,
    }];
    setExpenses(updated);
    saveExpenses(updated);
    setNewDesc('');
    setNewValue('');
  };

  const removeExpense = (id) => {
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
  };

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Alerta MEI ── */}
      {meiAlert && (
        <div className="bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <span className="text-red-500 font-bold text-lg shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-red-800 text-sm">Atenção: {meiPercent.toFixed(0)}% do limite MEI atingido</p>
            <p className="text-red-700 text-xs mt-0.5">
              Restam {formatPrice(meiRemaining)} para o limite anual de {formatPrice(MEI_LIMITE_ANUAL)}.
              Consulte um contador para avaliar a migração para Simples Nacional.
            </p>
          </div>
        </div>
      )}

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Receita Anual" value={formatPrice(annualRevenue)} sub={`${currentYear} (atendidos)`} accent />
        <SummaryCard label="DAS MEI Estimado" value={formatPrice(estimatedDAS)} sub={`${activeMonths} meses × R$${DAS_MENSAL_SERVICO.toFixed(2)}`} />
        <SummaryCard label="Despesas Anuais" value={formatPrice(totalExpenses)} sub={`${yearExpenses.length} lançamentos`} />
        <SummaryCard label="Lucro Líquido Est." value={formatPrice(netProfit)} sub="receita − despesas − DAS" accent={netProfit >= 0} danger={netProfit < 0} />
      </div>

      {/* ── Limite MEI ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest">
            Limite MEI {currentYear}
          </h2>
          <span className={`text-xs font-bold ${meiAlert ? 'text-red-500' : 'text-brand-500'}`}>
            {formatPrice(annualRevenue)} / {formatPrice(MEI_LIMITE_ANUAL)}
          </span>
        </div>
        <div className="bg-brand-50 h-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${meiAlert ? 'bg-red-400' : meiPercent >= 60 ? 'bg-gold-500' : 'bg-green-500'}`}
            style={{ width: `${meiPercent}%` }}
          />
        </div>
        <p className="text-xs text-brand-300 mt-1.5">
          {meiPercent < 80
            ? `Restam ${formatPrice(meiRemaining)} para atingir o limite anual MEI.`
            : `⚠️ Você já utilizou ${meiPercent.toFixed(0)}% do limite. Fique atento!`
          }
        </p>
      </section>

      {/* ── Receita e resultado mensal ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest">
            Receita Mensal — {currentYear}
          </h2>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 btn-secondary py-1.5 text-xs">
            <Printer size={12} /> Imprimir
          </button>
        </div>
        <div className="bg-white border border-brand-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 bg-warm-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Mês</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Receita</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">DAS MEI</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Despesas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRevenue.map((row, i) => {
                const mExp = expenses
                  .filter(e => e.year === currentYear && e.month === row.month)
                  .reduce((s, e) => s + e.value, 0);
                const das = row.revenue > 0 ? DAS_MENSAL_SERVICO : 0;
                const result = row.revenue - mExp - das;
                const isCurrentMonth = row.month === currentMonth;
                return (
                  <tr key={row.month}
                    className={`border-b border-brand-50 transition-colors ${isCurrentMonth ? 'bg-brand-50/60' : i % 2 !== 0 ? 'bg-warm-50/40' : 'hover:bg-warm-50'}`}
                  >
                    <td className={`px-4 py-3 font-semibold ${isCurrentMonth ? 'text-gold-500' : 'text-brand-900'}`}>
                      {row.label} {isCurrentMonth && <span className="text-[10px] font-normal text-brand-400 ml-1">← atual</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-900">{formatPrice(row.revenue)}</td>
                    <td className="px-4 py-3 text-right text-brand-400">
                      {row.revenue > 0 ? `−${formatPrice(das)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-400">
                      {mExp > 0 ? `−${formatPrice(mExp)}` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${result >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {row.revenue > 0 || mExp > 0 ? formatPrice(result) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand-200 bg-warm-50">
                <td className="px-4 py-3 font-bold text-brand-900 text-xs uppercase tracking-widest">Total {currentYear}</td>
                <td className="px-4 py-3 text-right font-bold text-gold-500">{formatPrice(annualRevenue)}</td>
                <td className="px-4 py-3 text-right font-bold text-brand-600">−{formatPrice(estimatedDAS)}</td>
                <td className="px-4 py-3 text-right font-bold text-brand-600">−{formatPrice(totalExpenses)}</td>
                <td className={`px-4 py-3 text-right font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {formatPrice(netProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── Despesas ── */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">
          Lançamento de Despesas
        </h2>

        {/* Formulário */}
        <div className="bg-white border border-brand-100 p-4 mb-4">
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-3">Nova Despesa</p>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Descrição (ex: Aluguel, Produtos...)"
              className="input-field py-1.5 text-sm flex-1 min-w-[180px]"
            />
            <input
              type="text"
              inputMode="decimal"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="Valor (R$)"
              className="input-field py-1.5 text-sm w-28"
            />
            <select
              value={newMonth}
              onChange={e => setNewMonth(Number(e.target.value))}
              className="input-field py-1.5 text-sm w-auto"
            >
              {MONTH_NAMES_PT.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
            <select
              value={newYear}
              onChange={e => setNewYear(Number(e.target.value))}
              className="input-field py-1.5 text-sm w-auto"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={addExpense}
              disabled={!newDesc.trim() || !newValue.trim()}
              className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {/* Lista do mês atual */}
        {yearExpenses.length === 0 ? (
          <div className="bg-white border border-brand-100 p-8 text-center text-brand-300 text-sm">
            Nenhuma despesa lançada para {currentYear}.
          </div>
        ) : (
          <div className="bg-white border border-brand-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Mês</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-brand-400 uppercase tracking-widest">Valor</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {yearExpenses
                  .sort((a, b) => a.month - b.month)
                  .map((e, i) => (
                    <tr key={e.id} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 !== 0 ? 'bg-warm-50/40' : ''}`}>
                      <td className="px-4 py-3 text-brand-900">{e.desc}</td>
                      <td className="px-4 py-3 text-brand-500">{MONTH_NAMES_PT[e.month]}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatPrice(e.value)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeExpense(e.id)}
                          className="text-brand-300 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-brand-200 bg-warm-50">
                  <td colSpan={2} className="px-4 py-3 font-bold text-brand-900 text-xs uppercase tracking-widest">
                    Total de Despesas {currentYear}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{formatPrice(totalExpenses)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ── Informações MEI ── */}
      <section>
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-4">
          Referência — MEI Barbearia / Salão de Beleza
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard
            title="DAS MEI Mensal"
            value={`R$ ${DAS_MENSAL_SERVICO.toFixed(2)}`}
            desc="INSS R$71,60 + ISS R$5,00 + ICMS R$4,30"
          />
          <InfoCard
            title="Limite Anual MEI"
            value={formatPrice(MEI_LIMITE_ANUAL)}
            desc="Acima disso, migrar para Simples Nacional (CNAE Serviços)"
          />
          <InfoCard
            title="Simples Nacional Est."
            value="6% a 33%"
            desc="Alíquota progressiva sobre receita bruta (Anexo III – Serviços)"
          />
        </div>
        <p className="text-[11px] text-brand-300 mt-3">
          * Valores de referência 2025. Consulte sempre um contador para orientação específica ao seu negócio.
        </p>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent, danger }) {
  return (
    <div className="bg-white border border-brand-100 p-5">
      <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-3">{label}</p>
      <p className={`font-bold text-lg leading-tight ${danger ? 'text-red-500' : accent ? 'text-gold-500' : 'text-brand-900'}`}>
        {value}
      </p>
      <p className="text-xs text-brand-300 mt-0.5">{sub}</p>
    </div>
  );
}

function InfoCard({ title, value, desc }) {
  return (
    <div className="bg-white border border-brand-100 p-4">
      <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-2">{title}</p>
      <p className="text-xl font-bold text-brand-900">{value}</p>
      <p className="text-xs text-brand-300 mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}
