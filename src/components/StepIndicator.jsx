import { Check } from 'lucide-react';

export default function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, idx) => {
        const status = idx < current ? 'completed' : idx === current ? 'active' : 'inactive';
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  status === 'completed'
                    ? 'step-completed shadow-md'
                    : status === 'active'
                    ? 'step-active shadow-md scale-110'
                    : 'step-inactive'
                }`}
              >
                {status === 'completed' ? <Check size={16} /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium text-center w-16 leading-tight ${
                  status === 'active' ? 'text-primary-800' : 'text-gray-400'
                }`}
              >
                {step}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-12 mx-1 mb-4 rounded transition-colors duration-300 ${
                  idx < current ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
