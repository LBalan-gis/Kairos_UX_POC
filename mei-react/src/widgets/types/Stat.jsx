import React from 'react';

export function WidgetStat({ label, value, unit, delta, deltaLabel, dark = true }) {
  const isPos      = delta > 0;
  const labelColor = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const valueColor = dark ? '#fff'                   : '#111827';
  const unitColor  = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const dimColor   = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';

  return (
    <div style={{ padding: 20 }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: labelColor, textTransform: 'uppercase' }}>
          {label}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: valueColor, letterSpacing: '-0.03em' }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: unitColor, fontWeight: 500 }}>{unit}</span>}
      </div>

      {delta !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
            color: isPos ? '#4ade80' : '#f87171',
            background: isPos ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
            border: `1px solid ${isPos ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          }}>
            {isPos ? '+' : ''}{delta}
          </div>
          {deltaLabel && <span style={{ fontSize: 10, color: dimColor, fontWeight: 600 }}>{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}
