export default function Logo({ size = 'md', inverted = false, horizontal = false, className = '', style = {} }) {
  const widths = { sm: 110, md: 150, lg: 360, xl: 420 };
  const w = widths[size] ?? 150;

  return (
    <img
      src="/Logo.png"
      alt="Vinicius Cavalcante – Visagista & Hair Expert"
      className={className}
      style={{
        width: `${w}px`,
        height: 'auto',
        display: 'block',
        filter: inverted ? 'none' : 'invert(1)',
        ...style,
      }}
    />
  );
}
