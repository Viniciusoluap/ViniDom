// Swap <img src="/logo.png" ... /> when the PNG is available
export default function Logo({ size = 'md', inverted = false }) {
  const sizes = {
    sm:  { wrapper: 'h-8',  text: 'text-base', sub: 'text-xs' },
    md:  { wrapper: 'h-10', text: 'text-lg',   sub: 'text-xs' },
    lg:  { wrapper: 'h-16', text: 'text-3xl',  sub: 'text-xs' },
  };
  const s = sizes[size] || sizes.md;
  const textColor  = inverted ? 'text-white'      : 'text-brand-900';
  const subColor   = inverted ? 'text-brand-400'  : 'text-brand-400';
  const borderColor= inverted ? 'border-gold-500' : 'border-gold-500';

  return (
    <div className={`flex flex-col items-center ${s.wrapper} justify-center`}>
      <span className={`font-bold tracking-[0.2em] uppercase ${s.text} ${textColor} leading-none`}>
        Dom Concept
      </span>
      <div className={`mt-2 w-12 h-px ${borderColor.replace('border-', 'bg-')} opacity-60`} />
      <span className={`mt-1.5 tracking-[0.3em] uppercase ${s.sub} ${subColor}`}>
        Salão de Beleza
      </span>
    </div>
  );
}
