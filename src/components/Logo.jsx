export default function Logo({ size = 'md', inverted = false, horizontal = false }) {
  const c   = inverted ? '#ffffff' : '#0a0a0a';
  const sub = inverted ? '#666666' : '#999999';

  const s = {
    sm:  { mark: 36,  name: 10, tag: 6.5, gap: 5  },
    md:  { mark: 52,  name: 13, tag: 7.5, gap: 7  },
    lg:  { mark: 82,  name: 18, tag: 9,   gap: 10 },
    xl:  { mark: 112, name: 24, tag: 12,  gap: 14 },
  }[size] ?? { mark: 52, name: 13, tag: 7.5, gap: 7 };

  const markH = Math.round(s.mark * 0.9);

  const mark = (
    <svg
      width={s.mark}
      height={markH}
      viewBox="0 0 112 101"
      fill="none"
      aria-label="VC monogram"
    >
      {/* V outer left arm */}
      <line x1="8"  y1="5"  x2="51" y2="95" stroke={c} strokeWidth="10" strokeLinecap="square"/>
      {/* V inner left arm */}
      <line x1="21" y1="5"  x2="54" y2="76" stroke={c} strokeWidth="10" strokeLinecap="square"/>
      {/* V/C outer right arm */}
      <line x1="51" y1="95" x2="86" y2="16" stroke={c} strokeWidth="10" strokeLinecap="square"/>
      {/* V/C inner right arm */}
      <line x1="54" y1="76" x2="77" y2="16" stroke={c} strokeWidth="10" strokeLinecap="square"/>
      {/* C top horizontal bar */}
      <line x1="51" y1="5"  x2="100" y2="5"  stroke={c} strokeWidth="10" strokeLinecap="square"/>
      {/* C right vertical */}
      <line x1="100" y1="5"  x2="107" y2="40" stroke={c} strokeWidth="10" strokeLinecap="square"/>
      {/* C lower return */}
      <line x1="107" y1="40" x2="90"  y2="57" stroke={c} strokeWidth="10" strokeLinecap="square"/>
    </svg>
  );

  const nameStyle = {
    color: c,
    fontSize: `${s.name}px`,
    fontWeight: 300,
    letterSpacing: '0.30em',
    lineHeight: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };

  const tagStyle = {
    color: sub,
    fontSize: `${s.tag}px`,
    fontWeight: 300,
    letterSpacing: '0.35em',
    fontFamily: 'Inter, system-ui, sans-serif',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  };

  if (horizontal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: `${s.gap + 4}px` }}>
        {mark}
        <div>
          <div style={nameStyle}>Vinicius Cavalcante</div>
          <div style={{ ...tagStyle, marginTop: '4px' }}>Visagista &amp; Hair Expert</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${s.gap}px` }}>
      {mark}
      <div style={{ textAlign: 'center' }}>
        <div style={nameStyle}>Vinicius Cavalcante</div>
        <div style={{ ...tagStyle, marginTop: `${Math.round(s.gap * 0.5)}px` }}>
          Visagista &amp; Hair Expert
        </div>
      </div>
    </div>
  );
}
