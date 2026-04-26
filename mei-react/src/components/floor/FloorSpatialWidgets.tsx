import { useState, useCallback, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';
import { buildFloorWidgetAnchors, resolveFloorWidgetAnchor } from '../../services/widgets/spatial';
import { WidgetRenderer } from '../widget/WidgetRenderer';
import type { WidgetPayload, FloorWidgetAnchor } from '../../types/widgets';
import './FloorSpatialWidgets.css';

// ── SpatialHudPin ─────────────────────────────────────────────────────────────

interface SpatialHudPinProps {
  id: string;
  payload: WidgetPayload;
  eq: FloorWidgetAnchor;
  dark: boolean;
  removeSpatialWidget: (id: string) => void;
  liveDataProvider: (tag: string) => unknown;
  liveIds: string[];
}

function SpatialHudPin({ id, payload, eq, dark, removeSpatialWidget, liveDataProvider, liveIds }: SpatialHudPinProps) {
  const [expanded, setExpanded] = useState(false);

  const p         = payload.props ?? {};
  const typeLabel = ({ gauge:'KPI', chart:'TREND', table:'TABLE', stat:'STAT', action:'ACTION', control:'CONTROL', layout:'PANEL' } as Record<string, string>)[payload.type] ?? payload.type.toUpperCase();
  const label     = (p.label as string) ?? (p.title as string) ?? typeLabel;
  const hasValue  = p.value !== undefined && payload.type === 'gauge';

  const accent = dark ? '#9CC8FF' : '#2F6FD8';

  return (
    <div className="fsw-pin">
      <div
        onClick={() => setExpanded(e => !e)}
        className={`fsw-pin__head${expanded ? ' is-expanded' : ''}`}
      >
        <div className="fsw-pin__meta">
          <span className="fsw-pin__type" style={{ color: accent }}>{typeLabel}</span>
          {!expanded && hasValue && (
            <span className="fsw-pin__value">
              {Number(p.value).toFixed(0)}<span className="fsw-pin__unit">{p.unit as string}</span>
            </span>
          )}
          {!expanded && !hasValue && (
            <span className="fsw-pin__label">{label}</span>
          )}
          {expanded && (
            <span className="fsw-pin__label is-expanded">{label}</span>
          )}
        </div>
        <div className="fsw-pin__actions">
          <span className="fsw-pin__chevron">{expanded ? '▲' : '▼'}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeSpatialWidget(id); }}
            className="fsw-pin__dismiss"
            title="Dismiss"
          >×</button>
        </div>
      </div>

      {expanded && (
        <div className="fsw-pin__body">
          <WidgetRenderer payload={payload} dark={dark} liveDataProvider={liveDataProvider} liveTagIds={liveIds} />
        </div>
      )}
    </div>
  );
}

// ── FloorSpatialWidgets ───────────────────────────────────────────────────────

export function FloorSpatialWidgets() {
  const spatialWidgets      = useAppStore(s => s.spatialWidgets);
  const removeSpatialWidget = useAppStore(s => s.removeSpatialWidget);
  const dark                = useAppStore(s => s.dark);
  const floorConfig         = useAppStore(s => s.floorConfig);
  const entityPhysics       = useAppStore(s => s.entityPhysics);
  const liveIds             = useAppStore(s => s.liveIds);

  const liveDataProvider = useCallback(
    (tag: string) => entityPhysics?.[tag]?.currentValue,
    [entityPhysics]
  );

  const anchors = useMemo(() => buildFloorWidgetAnchors(floorConfig), [floorConfig]);

  return (
    <>
      {spatialWidgets.map(({ id, payload }) => {
        const binding = payload?.spatialBinding;
        if (!binding) return null;
        const eq = resolveFloorWidgetAnchor(anchors, binding.entityId);
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
