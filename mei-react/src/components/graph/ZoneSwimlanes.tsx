import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import type { MotionValue } from 'framer-motion';
import type { Entity, ZoneId } from '../../types/domain';
import type { Position } from '../../types/store';

const PAD_X = 14;

type MvEntry = { mx: MotionValue<number>; my: MotionValue<number> };
type NodeSize = { width: number; height: number };

interface ZoneSwimlanesProps {
  entities: Entity[];
  positions: Record<string, Position>;
  sizes?: Record<string, NodeSize>;
  mvReg?: RefObject<Record<string, MvEntry>>;
  actualSizesRef?: RefObject<Record<string, NodeSize>>;
  zoneMap: Record<string, ZoneId>;
  zoneLabels: Record<ZoneId, string>;
}

interface Band {
  zone: ZoneId;
  label: string;
  left: number;
  width: number;
  minY: number;
}

/**
 * Zone swimlane background bands.
 * entities — already filtered to board-visible nodes (pinned + temp).
 */
export function ZoneSwimlanes({ entities, positions, sizes, mvReg, actualSizesRef, zoneMap, zoneLabels }: ZoneSwimlanesProps) {
  const [bands, setBands] = useState<Band[]>([]);

  useEffect(() => {
    let frameId: number;

    const loop = () => {
      const rawBounds: Record<string, { minX: number; maxX: number; minY: number; maxY: number }> = {};

      entities.forEach((e) => {
        const zone = zoneMap[e.id];
        if (!zone) return;

        const x = mvReg?.current?.[e.id]?.mx?.get() ?? positions[e.id]?.x;
        const y = mvReg?.current?.[e.id]?.my?.get() ?? positions[e.id]?.y;
        if (x === undefined || y === undefined) return;

        const w = actualSizesRef?.current?.[e.id]?.width  ?? sizes?.[e.id]?.width  ?? 320;
        const h = actualSizesRef?.current?.[e.id]?.height ?? sizes?.[e.id]?.height ?? 160;

        if (!rawBounds[zone]) {
          rawBounds[zone] = { minX: x, maxX: x + w, minY: y, maxY: y + h };
        } else {
          rawBounds[zone].minX = Math.min(rawBounds[zone].minX, x);
          rawBounds[zone].maxX = Math.max(rawBounds[zone].maxX, x + w);
          rawBounds[zone].minY = Math.min(rawBounds[zone].minY, y);
          rawBounds[zone].maxY = Math.max(rawBounds[zone].maxY, y + h);
        }
      });

      if (!Object.keys(rawBounds).length) {
        setBands([]);
        frameId = requestAnimationFrame(loop);
        return;
      }

      const ZONE_ORDER: ZoneId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
      const presentZones = ZONE_ORDER.filter(z => rawBounds[z]);
      const LANE_GAP = 24;

      const next = presentZones.map((zone, idx) => {
        const b = rawBounds[zone];
        let left: number;
        if (idx === 0) {
          left = b.minX - PAD_X;
        } else {
          const prevZone = presentZones[idx - 1];
          const prevB = rawBounds[prevZone];
          left = (prevB.maxX + b.minX) / 2 + (LANE_GAP / 2);
        }

        let right: number;
        if (idx === presentZones.length - 1) {
          right = b.maxX + PAD_X;
        } else {
          const nextZone = presentZones[idx + 1];
          const nextB = rawBounds[nextZone];
          right = (b.maxX + nextB.minX) / 2 - (LANE_GAP / 2);
        }

        return {
          zone,
          label: zoneLabels[zone] ?? zone,
          left,
          width: Math.max(0, right - left),
          minY: b.minY,
        };
      });

      setBands(next);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [entities, positions, sizes, mvReg]);

  if (!bands.length) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {bands.map(({ zone, label, left, width, minY }) => (
        <div
          key={zone}
          className={`swimlane zone-${zone}`}
          style={{ left, width, top: -10000, height: 20000 }}
        >
          <span className="swimlane-label" style={{ top: minY + 10000 - 44 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
