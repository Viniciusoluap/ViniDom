import { Clock, DollarSign, ChevronRight } from 'lucide-react';
import { formatDuration, formatPrice } from '../utils/dateFormatter';

export default function ServiceCard({ service, selected, onSelect, compact = false }) {
  const base = 'card card-hover transition-all duration-200 p-5 relative';
  const selectedStyle = selected
    ? 'ring-2 ring-primary-800 bg-primary-50'
    : 'hover:ring-1 hover:ring-primary-200';

  return (
    <div
      className={`${base} ${selectedStyle}`}
      onClick={() => onSelect && onSelect(service)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && onSelect && onSelect(service)}
      aria-pressed={selected}
    >
      {service.popular && (
        <span className="absolute top-3 right-3 badge bg-gold-400 text-white text-xs">
          ⭐ Popular
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="text-3xl leading-none mt-0.5" aria-hidden="true">
          {service.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-primary-800 text-base leading-tight">{service.name}</h3>
          {!compact && (
            <p className="text-gray-500 text-sm mt-1 leading-snug">{service.description}</p>
          )}
          <span className="inline-block mt-1.5 badge bg-primary-50 text-primary-700 text-xs border border-primary-100">
            {service.category}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {formatDuration(service.duration)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-primary-800 font-bold text-lg">{formatPrice(service.price)}</span>
          {onSelect && (
            <ChevronRight size={16} className={`transition-transform ${selected ? 'rotate-90 text-primary-800' : 'text-gray-300'}`} />
          )}
        </div>
      </div>

      {selected && (
        <div className="absolute inset-0 rounded-2xl border-2 border-primary-800 pointer-events-none" />
      )}
    </div>
  );
}
