import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, X, Check, Plus } from 'lucide-react';
import { formatPrice, formatDate } from '../utils/dateFormatter';
import { editClient, loadClients, phoneDigits, removeClient, saveClient } from '../utils/clientService';
import ClientRegistration from './ClientRegistration';

export default function ClientsList({ bookings, onUpdate, onDelete, canDelete = true }) {
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [registered, setRegistered] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    let active = true;
    loadClients().then(list => { if (active) setRegistered(list); })
      .catch(err => { if (active) setLoadError(err.message || 'Não foi possível carregar os clientes.'); });
    return () => { active = false; };
  }, []);

  const createClient = async form => {
    await saveClient(form);
    setRegistered(await loadClients());
  };

  const clients = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      const phone = phoneDigits(b.client?.phone);
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
        if (bDate > existing.lastDate) {
          existing.name      = b.client.name      || existing.name;
          existing.email     = b.client.email     || existing.email;
          existing.birthdate = b.client.birthdate || existing.birthdate;
          existing.lastDate  = bDate;
        }
        if (b.status !== 'cancelled') {
          existing.visits     += 1;
          existing.totalSpent += b.totalPrice || 0;
          if (!existing.lastVisit || bDate > existing.lastVisit) existing.lastVisit = bDate;
        }
      }
    });
    registered.forEach(c => {
      const existing = map.get(c.phone_digits);
      if (existing) Object.assign(existing, { name: c.name, phone: c.phone, email: c.email || '', birthdate: c.birthdate || '' });
      else map.set(c.phone_digits, {
        name: c.name, phone: c.phone, email: c.email || '', birthdate: c.birthdate || '',
        visits: 0, totalSpent: 0, lastVisit: null,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
  }, [bookings, registered]);

  const startEdit = (c) => {
    setEditing(c.phone);
    setForm({ name: c.name, email: c.email, birthdate: c.birthdate });
  };

  const saveEdit = async () => {
    setSaving(true);
    setFormError('');
    try {
      const isRegistered = registered.some(c => c.phone_digits === phoneDigits(editing));
      if (isRegistered) await editClient(editing, form);
      if (onUpdate) await onUpdate(editing, form);
      setRegistered(await loadClients());
      setEditing(null);
    } catch (err) { setFormError(err.message || 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Excluir ${c.name || 'este cliente'} e todos os seus agendamentos? Esta ação não pode ser desfeita.`)) return;
    try {
      if (onDelete) await onDelete(c.phone);
      await removeClient(c.phone);
      setRegistered(await loadClients());
    } catch (err) { setLoadError(err.message || 'Não foi possível excluir o cliente.'); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {showRegistration && <ClientRegistration onSave={createClient} onClose={() => setShowRegistration(false)} />}
      {loadError && <p role="alert" className="text-red-600 text-xs">{loadError}</p>}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white border border-brand-100 w-full max-w-sm p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-brand-900 text-sm tracking-wide">Editar Cliente</h3>
              <button onClick={() => setEditing(null)} className="text-brand-300 hover:text-brand-900 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-brand-400 uppercase tracking-widest block mb-1">Nome</label>
                <input
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-400 uppercase tracking-widest block mb-1">E-mail</label>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-400 uppercase tracking-widest block mb-1">Nascimento</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.birthdate}
                  onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))}
                />
              </div>
            </div>
            {formError && <p role="alert" className="text-red-600 text-xs mt-3">{formError}</p>}
            <div className="flex gap-3 mt-5">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                <Check size={14} />
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1 py-2.5 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Total de clientes:</span>
          <span className="text-sm font-bold text-brand-900">{clients.length}</span>
        </div>
        <button onClick={() => setShowRegistration(true)} className="btn-primary flex items-center justify-center gap-2 text-xs">
          <Plus size={14} /> Cadastrar cliente
        </button>
      </div>

      {!clients.length ? <div className="bg-white border border-brand-100 p-10 text-center text-brand-300 text-sm">Nenhum cliente cadastrado.</div> : (
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={c.phone} className={`border-b border-brand-50 hover:bg-warm-50 transition-colors ${i % 2 !== 0 ? 'bg-warm-50/40' : ''}`}>
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
                <td className="px-4 py-3 text-brand-400">{c.birthdate ? formatBirthdate(c.birthdate) : '—'}</td>
                <td className="px-4 py-3 text-right font-bold text-brand-900">{c.visits}</td>
                <td className="px-4 py-3 text-right text-brand-400">{c.lastVisit ? formatDate(c.lastVisit) : '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-brand-900">{formatPrice(c.totalSpent)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => startEdit(c)}
                      title="Editar"
                      className="p-1.5 text-brand-300 hover:text-brand-900 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    {canDelete && <button
                      onClick={() => handleDelete(c)}
                      title="Excluir"
                      className="p-1.5 text-brand-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

function formatBirthdate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}
