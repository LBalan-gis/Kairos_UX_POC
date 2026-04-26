import type { Entity, ZoneId } from '../../types/domain';
import type { Position } from '../../types/store';

export const GRAPH_INTRA_GAP = 28;
export const GRAPH_ZONE_ORDER: ZoneId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
export const GRAPH_ZONE_MIN_GAP = 110;

export type GraphSize = { width: number; height: number };
export type GraphMotionAxis = { get: () => number; set: (value: number) => void };
export type GraphMotionPair = { mx: GraphMotionAxis; my: GraphMotionAxis };
export type GraphMotionRegistry = Record<string, GraphMotionPair>;
export type GraphSizeMap = Record<string, GraphSize>;
export type GraphPositionMap = Record<string, Position>;

type ZoneBounds = Record<string, { minX: number; maxX: number }>;

function collectZoneBounds({
  boardEntities,
  zoneMap,
  getX,
  getSize,
}: {
  boardEntities: Entity[];
  zoneMap: Record<string, ZoneId>;
  getX: (id: string) => number;
  getSize: (id: string) => GraphSize | undefined;
}) {
  const zoneBounds: ZoneBounds = {};

  boardEntities.forEach((entity) => {
    const zone = zoneMap[entity.id];
    if (!zone) return;
    const x = getX(entity.id);
    const width = getSize(entity.id)?.width ?? 320;
    if (!zoneBounds[zone]) zoneBounds[zone] = { minX: x, maxX: x + width };
    else {
      zoneBounds[zone].minX = Math.min(zoneBounds[zone].minX, x);
      zoneBounds[zone].maxX = Math.max(zoneBounds[zone].maxX, x + width);
    }
  });

  return zoneBounds;
}

export function restackGraphZone({
  dragId,
  dragY,
  zoneEntities,
  getMV,
  getSize,
  getY,
}: {
  dragId: string;
  dragY: number;
  zoneEntities: Entity[];
  getMV: (id: string) => GraphMotionPair | undefined;
  getSize: (id: string) => GraphSize | undefined;
  getY: (id: string) => number;
}) {
  const getSortY = (entity: Entity) => entity.id === dragId ? dragY : getY(entity.id);
  const getH = (entity: Entity) => getSize(entity.id)?.height ?? 160;
  const sorted = [...zoneEntities].sort(
    (a, b) => (getSortY(a) + getH(a) / 2) - (getSortY(b) + getH(b) / 2)
  );

  let cursorY: number | null = null;
  const targetYs: Record<string, number> = {};

  sorted.forEach((entity) => {
    const height = getH(entity);
    let y = getSortY(entity);
    if (cursorY === null) {
      cursorY = y;
    } else if (y < cursorY) {
      y = cursorY;
      if (entity.id !== dragId) {
        const mv = getMV(entity.id);
        if (mv) mv.my.set(y);
      }
    }
    targetYs[entity.id] = y;
    cursorY = y + height + GRAPH_INTRA_GAP;
  });

  return targetYs;
}

export function normalizeGraphZoneLayout({
  boardEntities,
  zoneMap,
  zoneOrder = GRAPH_ZONE_ORDER,
  getX,
  getY,
  getSize,
  getMV,
}: {
  boardEntities: Entity[];
  zoneMap: Record<string, ZoneId>;
  zoneOrder?: ZoneId[];
  getX: (id: string) => number;
  getY: (id: string) => number;
  getSize: (id: string) => GraphSize | undefined;
  getMV: (id: string) => GraphMotionPair | undefined;
}) {
  const updates: GraphPositionMap = {};
  const zoneBounds = collectZoneBounds({ boardEntities, zoneMap, getX, getSize });
  const currBounds = { ...zoneBounds };

  for (let i = 1; i < zoneOrder.length; i++) {
    const zone = zoneOrder[i];
    const prevZone = zoneOrder[i - 1];
    if (!currBounds[zone] || !currBounds[prevZone]) continue;
    const desired = currBounds[prevZone].maxX + GRAPH_ZONE_MIN_GAP;
    const delta = desired - currBounds[zone].minX;
    if (delta > 0.5) {
      boardEntities.forEach((entity) => {
        if (zoneMap[entity.id] !== zone) return;
        const mv = getMV(entity.id);
        if (!mv) return;
        const targetX = mv.mx.get() + delta;
        mv.mx.set(targetX);
        updates[entity.id] = { ...updates[entity.id], x: targetX };
      });
      currBounds[zone].minX += delta;
      currBounds[zone].maxX += delta;
    }
  }

  zoneOrder.forEach((zone) => {
    const zoneEntities = boardEntities.filter((entity) => zoneMap[entity.id] === zone);
    if (!zoneEntities.length) return;

    const sorted = [...zoneEntities].sort((a, b) => {
      const ay = getY(a.id) + (getSize(a.id)?.height ?? 160) / 2;
      const by = getY(b.id) + (getSize(b.id)?.height ?? 160) / 2;
      return ay - by;
    });

    let cursorY: number | null = null;
    sorted.forEach((entity) => {
      const height = getSize(entity.id)?.height ?? 160;
      const mv = getMV(entity.id);
      if (!mv) return;
      const y = mv.my.get();
      if (cursorY === null) cursorY = y + height + GRAPH_INTRA_GAP;
      else if (y < cursorY) {
        mv.my.set(cursorY);
        cursorY += height + GRAPH_INTRA_GAP;
      } else {
        cursorY = y + height + GRAPH_INTRA_GAP;
      }
    });

    zoneEntities.forEach((entity) => {
      const mv = getMV(entity.id);
      if (mv) updates[entity.id] = { ...updates[entity.id], x: updates[entity.id]?.x ?? mv.mx.get(), y: mv.my.get() };
    });
  });

  return updates;
}

export function reflowGraphZones({
  draggedId,
  boardEntities,
  zoneMap,
  zoneOrder = GRAPH_ZONE_ORDER,
  getX,
  getSize,
  getMV,
}: {
  draggedId: string;
  boardEntities: Entity[];
  zoneMap: Record<string, ZoneId>;
  zoneOrder?: ZoneId[];
  getX: (id: string) => number;
  getSize: (id: string) => GraphSize | undefined;
  getMV: (id: string) => GraphMotionPair | undefined;
}) {
  const draggedZone = zoneMap[draggedId];
  const draggedIdx = zoneOrder.indexOf(draggedZone);
  if (draggedIdx < 0) return {};

  const zoneBounds = collectZoneBounds({ boardEntities, zoneMap, getX, getSize });
  const xTargets: Record<string, number> = {};
  const currBounds = { ...zoneBounds };

  for (let i = draggedIdx + 1; i < zoneOrder.length; i++) {
    const zone = zoneOrder[i];
    const prevZone = zoneOrder[i - 1];
    if (!currBounds[zone] || !currBounds[prevZone]) continue;
    const desired = currBounds[prevZone].maxX + GRAPH_ZONE_MIN_GAP;
    const delta = desired - currBounds[zone].minX;
    if (delta > 0.5) {
      boardEntities.forEach((entity) => {
        if (zoneMap[entity.id] !== zone) return;
        const mv = getMV(entity.id);
        if (!mv) return;
        const targetX = mv.mx.get() + delta;
        if (entity.id !== draggedId) mv.mx.set(targetX);
        xTargets[entity.id] = targetX;
      });
      currBounds[zone].minX += delta;
      currBounds[zone].maxX += delta;
    }
  }

  for (let i = draggedIdx - 1; i >= 0; i--) {
    const zone = zoneOrder[i];
    const nextZone = zoneOrder[i + 1];
    if (!currBounds[zone] || !currBounds[nextZone]) continue;
    const desired = currBounds[nextZone].minX - GRAPH_ZONE_MIN_GAP;
    const delta = desired - currBounds[zone].maxX;
    if (delta < -0.5) {
      boardEntities.forEach((entity) => {
        if (zoneMap[entity.id] !== zone) return;
        const mv = getMV(entity.id);
        if (!mv) return;
        const targetX = mv.mx.get() + delta;
        if (entity.id !== draggedId) mv.mx.set(targetX);
        xTargets[entity.id] = targetX;
      });
      currBounds[zone].minX += delta;
      currBounds[zone].maxX += delta;
    }
  }

  return xTargets;
}
