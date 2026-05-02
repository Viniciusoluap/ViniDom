// SVG recreation of the VC geometric monogram.
// Swap out the <svg> block for <img src="/logo.png" ... /> when the PNG is available.
export default function Logo({ size = 'md', inverted = false }) {
  const c = inverted ? '#ffffff' : '#0a0a0a';
  const sub = inverted ? '#666666' : '#888888';

  const s = {
    sm:  { mark: 38,  name: 11, tag: 7,  gap: 5 },
    md:  { mark: 54,  name: 14, tag: 8,  gap: 7 },
    lg:  { mark: 86,  name: 20, tag: 10, gap: 11 },
    xl:  { mark: 118, name: 26, tag: 13, gap: 15 },
  }[size] ?? { mark: 54, name: 14, tag: 8, gap: 7 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${s.gap}px` }}>
      {/* VC geometric monogram */}
      <svg
        width={s.mark}
        height={Math.round(s.mark * 0.88)}
        viewBox="0 0 110 97"
        fill="none"
        aria-label="VC monogram"
      >
        {/*
          V: two outer diagonal arms meeting at the bottom tip.
          C: bracket shape that replaces / overlaps the top-right of the V.
          All rendered as thick strokes to recreate the double-line geometric look.
        */}

        {/* ── V outer left arm ── */}
        <line x1="11" y1="6"  x2="50" y2="89" stroke={c} strokeWidth="10.5" strokeLinecap="square"/>
        {/* ── V inner left arm (parallel, offset) ── */}
        <line x1="23" y1="6"  x2="55" y2="76" stroke={c} strokeWidth="10.5" strokeLinecap="square"/>

        {/* ── V/C outer right arm (from tip up to mid-right) ── */}
        <line x1="50" y1="89" x2="82" y2="18" stroke={c} strokeWidth="10.5" strokeLinecap="square"/>
        {/* ── V/C inner right arm ── */}
        <line x1="55" y1="76" x2="75" y2="18" stroke={c} strokeWidth="10.5" strokeLinecap="square"/>

        {/* ── C bracket — top horizontal bar ── */}
        <line x1="52" y1="6"  x2="94" y2="6"  stroke={c} strokeWidth="10.5" strokeLinecap="square"/>
        {/* ── C bracket — right vertical ── */}
        <line x1="94" y1="6"  x2="101" y2="38" stroke={c} strokeWidth="10.5" strokeLinecap="square"/>
        {/* ── C bracket — inner notch going left-down ── */}
        <line x1="101" y1="38" x2="87" y2="52" stroke={c} strokeWidth="10.5" strokeLinecap="square"/>
      </svg>

      {/* Text block */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          color: c,
          fontSize: `${s.name}px`,
          fontWeight: 600,
          letterSpacing: '0.22em',
          lineHeight: 1,
          fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Vinicius Cavalcante
        </div>
        <div style={{
          color: sub,
          fontSize: `${s.tag}px`,
          letterSpacing: '0.28em',
          marginTop: `${Math.round(s.gap * 0.5)}px`,
          fontFamily: 'Inter, system-ui, sans-serif',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Visagista &amp; Hair Expert
        </div>
      </div>
    </div>
  );
}
