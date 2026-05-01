import { Clock, Check } from 'lucide-react';
import { formatDuration, formatPrice } from '../utils/dateFormatter';

export default function ServiceCard({ service, selected, onSelect, compact = false }) {
  return (
    <div
      className={`relative bg-white border transition-all duration-200 p-5 cursor-pointer group ${
        selected
          ? 'border-brand-900 shadow-sm'
          : 'border-brand-100 hover:border-brand-300'
      }`}
      onClick={() => onSelect && onSelect(service)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && onSelect && onSelect(service)}
      aria-pressed={selected}
    >
      {service.popular && (
        <span className="absolute top-3 right-3 text-xs text-gold-600 tracking-widest uppercase font-medium">
          Destaque
        </span>
      )}

      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-brand-900 flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}

      <span className="text-2xl block mb-3">{service.icon}</span>

      <h3 className="font-semibold text-brand-900 text-sm mb-1 group-hover:text-gold-600 transition-colors">
        {service.name}
      </h3>

      {!compact && (
        <p className="text-brand-400 text-xs leading-relaxed mb-4">{service.description}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-brand-100 mt-auto">
        <div className="font-bold text-brand-900 text-sm">
          {service.priceLabel && (
            <span className="text-brand-400 font-normal text-xs mr-1">{service.priceLabel}</span>
          )}
          {formatPrice(service.price)}
        </div>
        <span className="text-brand-300 text-xs flex items-center gap-1">
          <Clock size={11} />{formatDuration(service.duration)}
        </span>
      </div>
    </div>
  );
}
