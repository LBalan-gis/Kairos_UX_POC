import { useState } from 'react';

interface WidgetActionProps {
  label?: string;
  action?: string;
  machineId?: string;
  risk?: 'low' | 'medium' | 'high';
  onAction?: (data: { action: string; machineId: string; risk: string }) => void;
  dark?: boolean;
}

export function WidgetAction({ label = 'Execute Command', action = 'TRIGGER', machineId = 'SYS-01', risk = 'medium', onAction, dark = true }: WidgetActionProps) {
  const [hover, setHover] = useState(false);

  const isHigh    = risk === 'high';
  const baseColor = isHigh ? '#EF4444' : '#F59E0B';
  const bgOpacity = hover ? '0.12' : '0.04';

  const metaColor = dark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.45)';
  const idColor   = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.78)';
  const cfrColor  = dark
    ? `rgba(${isHigh ? '239,68,68' : '255,255,255'}, 0.50)`
    : `rgba(${isHigh ? '185,28,28' : '0,0,0'}, 0.40)`;

  return (
    <div style={{ padding: 18 }}>
      <div style={{ fontSize: 10, color: metaColor, marginBottom: 12, letterSpacing: '0.05em' }}>
        Target Instance: <span style={{ color: idColor, fontWeight: 600 }}>{machineId}</span>
      </div>
      <button
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => onAction?.({ action, machineId, risk })}
        style={{
          width: '100%', padding: '14px 16px',
          background: `rgba(${isHigh ? '239,68,68' : '245,158,11'}, ${bgOpacity})`,
          border: `1px solid rgba(${isHigh ? '239,68,68' : '245,158,11'}, ${hover ? '0.6' : '0.2'})`,
          borderRadius: 6, color: baseColor,
          fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'all 0.15s ease',
          boxShadow: hover ? `0 0 16px rgba(${isHigh ? '239,68,68' : '245,158,11'}, 0.2)` : 'none',
        }}
      >
        <span style={{ fontSize: 14 }}>{isHigh ? '⚠' : '⚡'}</span>
        {label}
      </button>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', opacity: isHigh ? 1 : 0.6 }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: baseColor }} />
        <div style={{ fontSize: 8, color: cfrColor, fontWeight: 600, letterSpacing: '0.1em' }}>
          21 CFR PART 11 SIGNATURE REQUIRED
        </div>
      </div>
    </div>
  );
}
