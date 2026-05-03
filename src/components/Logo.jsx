export default function Logo({ size = 'md', inverted = false, horizontal = false }) {
  const widths = { sm: 110, md: 150, lg: 320, xl: 400 };
  const w = widths[size] ?? 150;

  return (
    <img
      src="/Logo.png"
      alt="Vinicius Cavalcante – Visagista & Hair Expert"
      style={{
        width: `${w}px`,
        height: 'auto',
        display: 'block',
        filter: inverted ? 'none' : 'invert(1)',
      }}
    />
  );
}
