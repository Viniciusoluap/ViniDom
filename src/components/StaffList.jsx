import { useMemo } from 'react';
import { STAFF } from '../utils/constants';
import { formatPrice, formatTime, dateToKey } from '../utils/dateFormatter';

export default function StaffList({ bookings }) {
  const today = new Date();

  const staffStats = useMemo(() => {
    return STAFF.map(member => {
      const mine = bookings.filter(b =>
        b.professional === member.name && b.status !== 'cancelled'
      );

      const monthMine = mine.filter(b => {
        const d = new Date(b.date);
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      });

      const todayMine = mine.filter(b => b.dateKey === dateToKey(today));

      const revenue = monthMine.reduce((s, b) => s + (b.totalPrice || 0), 0);

      const upcoming = mine
        .filter(b => {
          const d = new Date(b.date);
          d.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
          return d >= today;
        })
        .sort((a, b) => {
          const da = new Date(a.date); da.setHours(Math.floor(a.timeSlot / 60), a.timeSlot % 60, 0, 0);
          const db = new Date(b.date); db.setHours(Math.floor(b.timeSlot / 60), b.timeSlot % 60, 0, 0);
          return da - db;
        })
        .slice(0, 5);

      return { ...member, todayCount: todayMine.length, monthCount: monthMine.length, revenue, upcoming };
    });
  }, [bookings]);

  return (
    <div className="space-y-6 animate-fade-in">
      {staffStats.map(member => (
        <div key={member.id} className="bg-white border border-brand-100">

          {/* Card header */}
          <div className="p-5 border-b border-brand-100">
            <div className="flex flex-wrap items-center gap-4">
              <div
                className="w-14 h-14 flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ backgroundColor: member.color }}
              >
                {member.initials}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-brand-900 text-base">{member.name}</h3>
                <p className="text-xs text-brand-400 tracking-widest uppercase mt-0.5">{member.role}</p>
              </div>
              <div className="flex gap-5 text-center">
                <div>
                  <p className="text-2xl font-bold text-brand-900">{member.todayCount}</p>
                  <p className="text-xs text-brand-300 mt-0.5">hoje</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-900">{member.monthCount}</p>
                  <p className="text-xs text-brand-300 mt-0.5">este mês</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gold-500">{formatPrice(member.revenue)}</p>
                  <p className="text-xs text-brand-300 mt-0.5">receita/mês</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming */}
          <div className="p-5">
            <h4 className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-3">
              Próximos Agendamentos
            </h4>
            {member.upcoming.length === 0 ? (
              <p className="text-brand-200 text-sm">Nenhum agendamento futuro.</p>
            ) : (
              <div className="space-y-2">
                {member.upcoming.map(b => {
                  const services = b.services || (b.service ? [b.service] : []);
                  const date     = new Date(b.date);
                  const digits   = (b.client?.phone || '').replace(/\D/g, '');
                  return (
                    <div key={b.id} className="flex items-center gap-3 p-3 bg-warm-50 border border-brand-50">
                      <span className="text-xl shrink-0">{services[0]?.icon || '✂️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-brand-900 text-sm truncate">{b.client?.name || '—'}</p>
                        <p className="text-xs text-brand-400 truncate">{services.map(s => s.name).join(' + ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-brand-400">{date.toLocaleDateString('pt-BR')}</p>
                        <p className="text-xs font-semibold text-brand-900">{formatTime(b.timeSlot)}</p>
                      </div>
                      {digits && (
                        <a
                          href={`https://wa.me/55${digits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1.5 text-green-500 hover:text-green-700 transition-colors"
                          title="Chamar no WhatsApp"
                        >
                          <WaIcon />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}

      <p className="text-xs text-brand-300 text-center pb-2">
        Para adicionar novos funcionários, edite <code className="bg-warm-100 px-1">src/utils/constants.js</code> → STAFF.
      </p>
    </div>
  );
}

function WaIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
