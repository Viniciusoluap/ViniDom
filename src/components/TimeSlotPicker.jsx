import { Clock } from 'lucide-react';
import { formatTime } from '../utils/dateFormatter';

export default function TimeSlotPicker({ slots, selected, onSelect }) {
  if (!slots || slots.length === 0) {
    return (
      <div className="border border-brand-100 p-8 text-center bg-white">
        <Clock size={28} className="text-brand-200 mx-auto mb-2" />
        <p className="text-brand-500 text-sm font-medium">Nenhum horário disponível</p>
        <p className="text-brand-300 text-xs mt-1">Selecione outra data ou serviço.</p>
      </div>
    );
  }

  const morning   = slots.filter((s) => s < 12 * 60);
  const afternoon = slots.filter((s) => s >= 14 * 60);

  const renderGroup = (label, group) => {
    if (!group.length) return null;
    return (
      <div className="mb-5">
        <p className="text-xs font-semibold text-brand-300 uppercase tracking-widest mb-3">{label}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {group.map((slot) => {
            const isSelected = selected === slot;
            return (
              <button key={slot} onClick={() => onSelect(slot)} aria-pressed={isSelected}
                className={`py-2.5 text-xs font-medium border transition-all duration-150 tracking-wide focus:outline-none focus:ring-1 focus:ring-brand-900 ${
                  isSelected
                    ? 'bg-brand-900 text-white border-brand-900'
                    : 'bg-white text-brand-700 border-brand-200 hover:border-brand-900 hover:text-brand-900'
                }`}>
                {formatTime(slot)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="border border-brand-100 bg-white p-5">
      {renderGroup('Manhã · 10h–12h', morning)}
      {renderGroup('Tarde · 14h–18h', afternoon)}
    </div>
  );
}
