interface GraphFloatingControlsProps {
  focusId: string | null;
  hiddenCount: number;
  totalNodes: number;
  revealAll?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFit?: () => void;
}

export const GraphFloatingControls = ({
  focusId,
  hiddenCount,
  totalNodes,
  revealAll,
  onZoomIn,
  onZoomOut,
  onFit
}: GraphFloatingControlsProps) => {
  const isFocusMode = !!focusId;

  return (
    <>
      {/* Top Right Header Data */}
      <div style={{
        position: 'absolute', top: 20, left: 24, zIndex: 100,
        pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 12
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', WebkitFontSmoothing: 'antialiased' }}>
          Active causal path
        </div>
        <div style={{
          background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 20,
          padding: '2px 10px', fontSize: 11, fontWeight: 600, color: '#4B5563'
        }}>
          4 main drivers
        </div>
      </div>

      <div style={{
        position: 'absolute', top: 48, left: 24, zIndex: 100,
        pointerEvents: 'none', maxWidth: 280,
      }}>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
          CT-1101 micro-stops are causing hidden loss that is impacting OEE and batch risk.
        </div>
      </div>

      {/* Top Right Focus Controls */}
      <div style={{
        position: 'absolute', top: 24, right: 24, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>Focus mode</span>
          <div
            onClick={isFocusMode ? revealAll : undefined}
            style={{
              width: 32, height: 18, borderRadius: 10,
              background: isFocusMode ? '#7C3AED' : '#D1D5DB',
              position: 'relative', cursor: isFocusMode ? 'pointer' : 'default',
              transition: 'background 0.2s'
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: isFocusMode ? 16 : 2,
              width: 14, height: 14, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s, box-shadow 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

        {hiddenCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#4B5563' }}>Showing critical path</span>
            <button
              onClick={revealAll}
              style={{
                background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6,
                padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#111827',
                cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              Show all ({totalNodes})
            </button>
          </div>
        )}
      </div>

      {/* Middle Right Vertical Controls */}
      <div style={{
        position: 'absolute', top: '50%', right: 16, zIndex: 100,
        transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 8
      }}>
        <div style={{
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {[
            { id: 'fit', label: '⛶', action: onFit },
            { id: 'pan', label: '✋', action: null as (() => void) | null, active: true },
            { id: 'in',  label: '+', action: onZoomIn },
            { id: 'out', label: '−', action: onZoomOut },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={btn.action ?? undefined}
              style={{
                background: btn.active ? '#F3F4FF' : '#fff',
                color: btn.active ? '#4F46E5' : '#4B5563',
                border: 'none', borderBottom: btn.id !== 'out' ? '1px solid #F3F4F6' : 'none',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, cursor: 'pointer', fontWeight: 700
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Right Scenario Button */}
      <div style={{
        position: 'absolute', bottom: 24, right: 24, zIndex: 100,
      }}>
        <button style={{
          background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6,
          padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#111827',
          cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ color: '#4F46E5', fontSize: 16 }}>⚖</span> Compare scenarios
        </button>
      </div>
    </>
  );
};
