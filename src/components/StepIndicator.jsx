import { Check } from 'lucide-react';

export default function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10 overflow-x-auto pb-1 -mx-4 px-4">
      {steps.map((step, idx) => {
        const status = idx < current ? 'completed' : idx === current ? 'active' : 'inactive';
        return (
          <div key={idx} className="flex items-center shrink-0">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                status === 'completed' ? 'step-completed' :
                status === 'active'    ? 'step-active scale-110' :
                'step-inactive'
              }`}>
                {status === 'completed' ? <Check size={12} /> : idx + 1}
              </div>
              <span className={`mt-1.5 text-[9px] sm:text-xs font-medium text-center leading-tight tracking-wide w-10 sm:w-14 ${
                status === 'active' ? 'text-brand-900' : 'text-brand-300'
              }`}>
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-px w-3 sm:w-8 mx-0.5 sm:mx-1 mb-4 shrink-0 transition-colors duration-300 ${
                idx < current ? 'bg-gold-400' : 'bg-brand-100'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
