// Same Sapiion triangle mark as ILS-dev's Logo.jsx (shared brand identity
// across the product family), recolored to Workplace's teal instead of
// ILS-dev's blue. Same SVG paths, same parameterization.
export default function Logo({ className = '', white = false, scale = 0.79 }) {
  const iconFill = white ? '#FFFFFF' : '#0d9488';
  const textCol  = white ? '#FFFFFF' : '#0d9488';
  const iconSize = Math.round(32 * scale);
  const fontSize = Math.round(28 * scale);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        style={{ width: iconSize, height: iconSize, flexShrink: 0, transform: 'translateY(-9px) rotate(140deg)' }}
        aria-hidden="true"
      >
        <path fill={iconFill} d="M28.757 57.483l1.517-.875 13.176-7.634.026.014 24.85-14.341-.006-12.287L7.493 57.449 82.193 100l10.282-5.93-19.037-10.932z"/>
        <path fill={iconFill} d="M70.426 35.858l.013 28.49 10.554 6.011L80.96 0 6.462 42.973l.006 12.642 63.95-36.887z"/>
        <path fill={iconFill} d="M83.093 73.972l-12.652-7.208-.001.007-2.273-1.303-24.684-14.062-10.521 6.073L93.538 92.26l-.041-86.253L83.059.014z"/>
      </svg>
      <span style={{ color: textCol, fontSize, fontWeight: 400, letterSpacing: '0.12em', lineHeight: 1, fontFamily: "'Josefin Sans', system-ui, sans-serif" }}>
        SAPIION
      </span>
    </div>
  );
}
