import { useMemo } from 'react';
import type { Entity, ZoneId } from '../types/domain';
import type { Position } from '../types/store';

// ── Size estimation — mirrors HTML WhiteboardProjectionEngine._estimate ────────
export function estimateSize(entity: Entity): { width: number; height: number } {
  const mc = Object.keys(entity.metrics || {}).length;
  if (entity.type === 'GoldenBatch' || entity.id === 'batch_current')
    return { width: entity.chart ? 380 : 360, height: entity.chart ? 280 : 180 };
  if (entity.type === 'SimulationScenario')
    return { width: 320, height: 160 };
  if (entity.type === 'ExternalSystem')
    return { width: 280, height: 120 + mc * 20 };
  return {
    width:  entity.chart ? 360 : 340,
    height: entity.chart ? 240 : 200,
  };
}

// ── Layout — mirrors HTML _enforceZoneOrder exactly ────────────────────────────
const ZONE_ORDER: ZoneId[]  = ['A', 'B', 'C', 'D', 'E', 'F'];
const MARGIN_LEFT    = 28;
const INTER_ZONE_GAP = 110;
const INTRA_ZONE_GAP = 28;
const MARGIN_TOP     = 120;

export function useLayout(
  entities: Entity[],
  zoneMap: Record<string, ZoneId>
): { positions: Record<string, Position>; sizes: Record<string, { width: number; height: number }> } {
  return useMemo(() => {
    if (!entities?.length) return { positions: {}, sizes: {} };

    const sizes: Record<string, { width: number; height: number }> = {};
    entities.forEach((e) => { sizes[e.id] = estimateSize(e); });

    const zoneGroups: Record<string, Entity[]> = {};
    const zoneMaxW: Record<string, number>    = {};
    entities.forEach((e) => {
      const zone = zoneMap[e.id];
      if (!zone) return;
      if (!zoneGroups[zone]) zoneGroups[zone] = [];
      zoneGroups[zone].push(e);
      zoneMaxW[zone] = Math.max(zoneMaxW[zone] || 0, sizes[e.id].width);
    });

    const present = ZONE_ORDER.filter((z) => zoneGroups[z]);

    const zoneStartX: Record<string, number> = {};
    let cursorX = MARGIN_LEFT;
    present.forEach((zone) => {
      zoneStartX[zone] = cursorX;
      cursorX += zoneMaxW[zone] + INTER_ZONE_GAP;
    });

    const positions: Record<string, Position> = {};
    present.forEach((zone) => {
      const zEntities = [...zoneGroups[zone]].sort(
        (a, b) => (a.rankHint || 0) - (b.rankHint || 0)
      );
      let cursorY = MARGIN_TOP;
      zEntities.forEach((e) => {
        positions[e.id] = { x: zoneStartX[zone], y: cursorY };
        cursorY += sizes[e.id].height + INTRA_ZONE_GAP;
      });
    });

    let fallbackX = cursorX;
    let fallbackY = MARGIN_TOP;
    entities.forEach((e) => {
      if (!positions[e.id]) {
        positions[e.id] = { x: fallbackX, y: fallbackY };
        fallbackY += (sizes[e.id]?.height ?? 160) + INTRA_ZONE_GAP;
      }
    });

    return { positions, sizes };
  }, [entities, zoneMap]);
}

export function computeFitTransform(
  positions: Record<string, Position>,
  sizes: Record<string, { width: number; height: number }>,
  viewW: number,
  viewH = window.innerHeight
): { x: number; y: number; scale: number } {
  const ids = Object.keys(positions);
  if (!ids.length) return { x: 40, y: 56, scale: 1 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  ids.forEach((id) => {
    const p = positions[id];
    const s = sizes[id] ?? { width: 320, height: 160 };
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.width);
    maxY = Math.max(maxY, p.y + s.height);
  });

  const contentW = maxX - minX;
  const contentH = maxY - minY;

  const padW = viewW * 0.08;
  const padH = viewH * 0.08;

  const scaleW = (viewW - padW * 2) / Math.max(1, contentW);
  const scaleH = (viewH - padH * 2) / Math.max(1, contentH);
  const scale  = Math.max(0.1, Math.min(1.0, Math.min(scaleW, scaleH)));

  const tx = (viewW - contentW * scale) / 2 - minX * scale;
  const ty = (viewH - contentH * scale) / 2 - minY * scale;

  return { x: tx, y: ty, scale };
}
