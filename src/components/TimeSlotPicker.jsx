import { Clock } from 'lucide-react';
import { formatTime } from '../utils/dateFormatter';

export default function TimeSlotPicker({ slots, selected, onSelect }) {
  if (!slots || slots.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Clock size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 font-medium">Nenhum horário disponível</p>
        <p className="text-gray-400 text-sm mt-1">Selecione outra data ou serviço.</p>
      </div>
    );
  }

  const morning = slots.filter((s) => s < 12 * 60);
  const afternoon = slots.filter((s) => s >= 12 * 60 && s < 17 * 60);
  const evening = slots.filter((s) => s >= 17 * 60);

  const renderGroup = (label, group) => {
    if (!group.length) return null;
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {group.map((slot) => {
            const isSelected = selected === slot;
            return (
              <button
                key={slot}
                onClick={() => onSelect(slot)}
                aria-pressed={isSelected}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                  isSelected
                    ? 'bg-primary-800 text-white border-primary-800 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-800 hover:bg-primary-50'
                }`}
              >
                {formatTime(slot)}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="card p-4">
      {renderGroup('Manhã', morning)}
      {renderGroup('Tarde', afternoon)}
      {renderGroup('Noite', evening)}
    </div>
  );
}
