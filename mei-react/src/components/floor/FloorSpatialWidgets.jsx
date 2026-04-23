import { useState, useCallback } from 'react';
import { Html } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { WidgetRenderer } from '../WidgetRenderer';

// ── Equipment arrays (needed for spatial binding lookup) ──────────────────────
const EQUIPMENT_L1 = [
  { id: 'bf_1101',  entityId: 'blister_machine',      x: -7.5, z: -2.5, h: 1.2 },
  { id: 'ctn_1101', entityId: 'cartoner',             x: -7.5, z:  0.0, h: 1.8 },
  { id: 'agg_1101', entityId: 'serialization_queue',  x: -4.0, z:  0.0, h: 1.5 },
  { id: 'vis_1101',                                   x: -0.5, z:  0.0, h: 1.8 },
  { id: 'cw_1101',                                    x:  2.8, z:  0.0, h: 0.85 },
  { id: 'lab_1101',                                   x:  5.8, z:  0.0, h: 1.3 },
];
const EQUIPMENT_L2 = [
  { id: 'bf_1201',  x: -7.5, z:  7.0, h: 1.2 },
  { id: 'ctn_1201', x: -7.5, z:  4.5, h: 1.8 },
  { id: 'agg_1201', x: -4.0, z:  4.5, h: 1.5 },
  { id: 'vis_1201', x: -0.5, z:  4.5, h: 1.8 },
  { id: 'cw_1201',  x:  2.8, z:  4.5, h: 0.85 },
  { id: 'lab_1201', x:  5.8, z:  4.5, h: 1.3 },
];

// ── Spatial HUD Pin ──────────────────────────────────────────────────────────
function SpatialHudPin({ id, payload, eq, dark, removeSpatialWidget, liveDataProvider, liveIds }) {
  const [expanded, setExpanded] = useState(false);

  const p          = payload.props ?? {};
  const typeLabel  = { gauge:'KPI', chart:'TREND', table:'TABLE', stat:'STAT', action:'ACTION', control:'CONTROL', layout:'PANEL' }[payload.type] ?? payload.type.toUpperCase();
  const label      = p.label ?? p.title ?? typeLabel;
  const hasValue   = p.value !== undefined && payload.type === 'gauge';

  const accent    = dark ? '#2AF1E5'                  : '#0369A1';
  const panelBg   = dark ? 'rgba(10,16,28,0.94)'      : 'rgba(248,250,252,0.97)';
  const border    = dark ? 'rgba(42,241,229,0.22)'    : 'rgba(3,105,161,0.20)';
  const labelCol  = dark ? 'rgba(255,255,255,0.80)'   : 'rgba(0,0,0,0.72)';
  const dimCol    = dark ? 'rgba(255,255,255,0.35)'   : 'rgba(0,0,0,0.38)';
  const divider   = dark ? 'rgba(255,255,255,0.07)'   : 'rgba(0,0,0,0.07)';

  return (
    <div style={{
      width: 188, pointerEvents: 'auto',
      background: panelBg,
      border: `1px solid ${border}`,
      borderRadius: 8,
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      boxShadow: dark ? '0 6px 24px rgba(0,0,0,0.60)' : '0 4px 16px rgba(0,0,0,0.13)',
      overflow: 'hidden',
      fontFamily: 'system-ui,-apple-system,sans-serif',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 8px',
          borderBottom: expanded ? `1px solid ${divider}` : 'none',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.12em', color: accent, flexShrink: 0 }}>{typeLabel}</span>
          {!expanded && hasValue && (
            <span style={{ fontSize: 13, fontWeight: 700, color: labelCol, letterSpacing: '-0.01em' }}>
              {Number(p.value).toFixed(0)}<span style={{ fontSize: 9, fontWeight: 400, color: dimCol, marginLeft: 2 }}>{p.unit}</span>
            </span>
          )}
          {!expanded && !hasValue && (
            <span style={{ fontSize: 10, fontWeight: 500, color: labelCol, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          )}
          {expanded && (
            <span style={{ fontSize: 10, fontWeight: 600, color: labelCol, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: dimCol, lineHeight: 1 }}>{expanded ? '▲' : '▼'}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeSpatialWidget(id); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: dimCol, fontSize: 15, lineHeight: 1, padding: '0 1px',
              borderRadius: 3, transition: 'color 0.1s',
            }}
            onMouseOver={e => e.currentTarget.style.color = '#EF4444'}
            onMouseOut={e => e.currentTarget.style.color = dimCol}
            title="Dismiss"
          >×</button>
        </div>
      </div>

      {expanded && (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          <WidgetRenderer payload={payload} dark={dark} liveDataProvider={liveDataProvider} liveTagIds={liveIds} />
        </div>
      )}
    </div>
  );
}

// ── FloorSpatialWidgets — rendered inside the R3F Canvas ─────────────────────
export function FloorSpatialWidgets() {
  const spatialWidgets   = useAppStore(s => s.spatialWidgets);
  const removeSpatialWidget = useAppStore(s => s.removeSpatialWidget);
  const dark             = useAppStore(s => s.dark);
  const entityPhysics    = useAppStore(s => s.entityPhysics);
  const liveIds          = useAppStore(s => s.liveIds);

  const liveDataProvider = useCallback(
    (tag) => entityPhysics?.[tag]?.currentValue,
    [entityPhysics]
  );

  const allEq = [...EQUIPMENT_L1, ...EQUIPMENT_L2];

  return (
    <>
      {spatialWidgets.map(({ id, payload }) => {
        const binding = payload?.spatialBinding;
        if (!binding) return null;
        const eq = allEq.find(e => e.entityId === binding.entityId || e.id === binding.entityId);
        if (!eq) return null;
        const yOffset = binding.anchor === 'top' ? eq.h + 1.6 : -0.6;
        return (
          <Html key={id} position={[eq.x, yOffset, eq.z]} center zIndexRange={[200, 150]}>
            <SpatialHudPin
              id={id} payload={payload} eq={eq}
              dark={dark} removeSpatialWidget={removeSpatialWidget}
              liveDataProvider={liveDataProvider}
              liveIds={liveIds}
            />
          </Html>
        );
      })}
    </>
  );
}
