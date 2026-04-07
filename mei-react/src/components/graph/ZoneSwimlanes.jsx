import { useState, useEffect } from 'react';

const PAD_X = 14;
const PAD_Y = 48;
const BAND_GAP = 14;

/**
 * Zone swimlane background bands.
 * entities — already filtered to board-visible nodes (pinned + temp).
 */
export function ZoneSwimlanes({ entities, positions, sizes, mvReg, actualSizesRef, zoneMap, zoneLabels }) {
  const [bands, setBands] = useState([]);

  useEffect(() => {
    let frameId;

    const loop = () => {
      const rawBounds = {};

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

      const ZONE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
      const presentZones = ZONE_ORDER.filter(z => rawBounds[z]);
      const LANE_GAP = 24; // Visual margin between lanes

      const bands = presentZones.map((zone, idx) => {
        const b = rawBounds[zone];
        let left;
        if (idx === 0) {
          left = b.minX - PAD_X;
        } else {
          const prevZone = presentZones[idx - 1];
          const prevB = rawBounds[prevZone];
          left = (prevB.maxX + b.minX) / 2 + (LANE_GAP / 2);
        }

        let right;
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
        };
      });

      setBands(bands);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [entities, positions, sizes, mvReg]);

  if (!bands.length) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {bands.map(({ zone, label, left, width }) => (
        <div
          key={zone}
          className={`swimlane zone-${zone}`}
          style={{ left, width, top: -10000, height: 20000 }}
        >
          <span className="swimlane-label" style={{ top: 10020 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}
