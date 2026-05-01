import { Check } from 'lucide-react';

export default function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((step, idx) => {
        const status = idx < current ? 'completed' : idx === current ? 'active' : 'inactive';
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                status === 'completed' ? 'step-completed' :
                status === 'active'    ? 'step-active scale-110' :
                'step-inactive'
              }`}>
                {status === 'completed' ? <Check size={14} /> : idx + 1}
              </div>
              <span className={`mt-2 text-xs font-medium text-center w-16 leading-tight tracking-wide ${
                status === 'active' ? 'text-brand-900' : 'text-brand-300'
              }`}>
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-px w-8 sm:w-12 mx-1 mb-4 transition-colors duration-300 ${
                idx < current ? 'bg-gold-400' : 'bg-brand-100'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
