// ── Widget UI primitives ───────────────────────────────────────────────────────
// Shared micro-components used by WidgetGate and WidgetMount.
// No logic here — pure presentation only.

interface WidgetSkeletonProps {
  dark?: boolean;
}

export function WidgetSkeleton({ dark = true }: WidgetSkeletonProps) {
  const spinColor = dark ? '#2AF1E5' : '#0284C7';
  const textColor = dark ? 'rgba(42,241,229,0.40)' : 'rgba(2,132,199,0.50)';
  return (
    <div style={{ padding: '18px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${spinColor}33`, borderTopColor: spinColor, animation: 'spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: textColor }}>Loading…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

interface BlockedWidgetProps {
  type?: string;
  confidence?: number;
  error?: string;
  dark?: boolean;
}

export function BlockedWidget({ type = '?', confidence = 0, error, dark = true }: BlockedWidgetProps) {
  return (
    <div style={{ border: '1px solid rgba(239,68,68,0.30)', borderRadius: 10, padding: '11px 14px', background: 'rgba(239,68,68,0.05)' }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#EF4444', marginBottom: 5 }}>⊘ WIDGET BLOCKED</div>
      <div style={{ fontSize: 10, color: dark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.50)', lineHeight: 1.5 }}>
        {error || `Confidence ${(confidence * 100).toFixed(0)}% is below the required threshold for "${type}"`}
      </div>
    </div>
  );
}
