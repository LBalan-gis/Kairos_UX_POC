interface WidgetGaugeProps {
  label?: string;
  value?: number;
  max?: number;
  unit?: string;
  variant?: 'radial' | 'linear';
  warnAt?: number;
  critAt?: number;
  lowerIsBetter?: boolean;
  live?: boolean;
  dark?: boolean;
}

export function WidgetGauge({
  label = 'Metric',
  value = 0,
  max = 100,
  unit = '%',
  variant = 'radial',
  warnAt = 70,
  critAt = 90,
  lowerIsBetter = false,
  live = false,
  dark = true,
}: WidgetGaugeProps) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const v = pct * max;

  let color: string, dropShadow: string;
  const isRed   = lowerIsBetter ? v <= critAt  : v >= critAt;
  const isAmber = lowerIsBetter ? v <= warnAt  : v >= warnAt;

  if (isRed) {
    color = '#EF4444';
    dropShadow = 'drop-shadow(0 0 6px rgba(239,68,68,0.7))';
  } else if (isAmber) {
    color = '#F59E0B';
    dropShadow = 'drop-shadow(0 0 4px rgba(245,158,11,0.6))';
  } else {
    color = dark ? 'rgba(42,241,229,1)' : '#0284C7';
    dropShadow = dark
      ? 'drop-shadow(0 0 4px rgba(42,241,229,0.4))'
      : 'drop-shadow(0 0 4px rgba(2,132,199,0.35))';
  }

  const labelColor = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.50)';
  const valueColor = dark ? '#fff' : '#111827';
  const unitColor  = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const trackColor = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - pct * circumference;

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: labelColor, marginBottom: 16, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {live && (
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: dark ? 'rgba(42,241,229,0.90)' : '#0284C7', animation: 'pulse 2s infinite' }}>● LIVE</span>
        )}
      </div>
      <div style={{ position: 'relative', width: 90, height: 90, filter: dropShadow }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} fill="none" stroke={trackColor} strokeWidth="6" />
          <circle
            cx="45" cy="45" r={radius}
            fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 45 45)"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: valueColor, letterSpacing: '-0.02em' }}>
            {Number(value).toFixed(0)}
          </span>
          <span style={{ fontSize: 9, color: unitColor, marginTop: -2 }}>{unit}</span>
        </div>
      </div>
      <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }`}</style>
    </div>
  );
}
