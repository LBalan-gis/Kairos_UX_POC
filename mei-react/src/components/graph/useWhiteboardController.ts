import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useLayout, computeFitTransform } from '../../hooks/useLayout';
import { buildProjectionRelations } from '../../engine/relations';
import type { Entity, Relation, ZoneId } from '../../types/domain';
import type { Position } from '../../types/store';

const INTRA_GAP = 28;
const ZONE_ORDER: ZoneId[] = ['A', 'B', 'C', 'D', 'E', 'F'];

type Size = { width: number; height: number };
type MotionAxis = { get: () => number; set: (value: number) => void };
type MotionPair = { mx: MotionAxis; my: MotionAxis };
type MotionRegistry = Record<string, MotionPair>;
type SizeMap = Record<string, Size>;
type PositionMap = Record<string, Position>;
type FitTransform = { x: number; y: number; scale: number };
type BoardRefApi = { panTo: (transform: FitTransform) => void };

function restack(
  dragId: string,
  dragY: number,
  zoneEntities: Entity[],
  getMV: (id: string) => MotionPair | undefined,
  getSize: (id: string) => Size | undefined,
  getY: (id: string) => number
) {
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
    cursorY = y + height + INTRA_GAP;
  });

  return targetYs;
}

export function useWhiteboardController() {
  const dark = useAppStore((state) => state.dark);

  const {
    entities, relations, focusId,
    visibleIds, focusNeighborhood, focusEdgeIds,
    storedPos, enterFocus, exitFocus, revealAll, setPositions,
    simulatedTime, predictions, activeScenario,
    entityPhysics, pinnedIds, zoneMap, zoneLabels,
  } = useAppStore(useShallow((state) => ({
    entities: state.entities,
    relations: state.relations,
    focusId: state.focusId,
    visibleIds: state.visibleIds,
    focusNeighborhood: state.focusNeighborhood,
    focusEdgeIds: state.focusEdgeIds,
    storedPos: state.positions,
    enterFocus: state.enterFocus,
    exitFocus: state.exitFocus,
    revealAll: state.revealAll,
    setPositions: state.setPositions,
    simulatedTime: state.simulatedTime,
    predictions: state.predictions,
    activeScenario: state.activeScenario,
    entityPhysics: state.entityPhysics,
    pinnedIds: state.pinnedIds,
    zoneMap: state.zoneMap,
    zoneLabels: state.zoneLabels,
  })));

  const isSimulating = simulatedTime !== null && simulatedTime > 0;

  const effectiveEntities = useMemo(() => {
    if (simulatedTime === null || simulatedTime <= 0) return entities;
    const scenario = predictions?.find((prediction) => prediction.scenarioId === activeScenario);
    if (!scenario?.steps?.length) return entities;

    let step = scenario.steps[0];
    for (const currentStep of scenario.steps) {
      if (currentStep.t <= simulatedTime) step = currentStep;
      else break;
    }

    return entities.map((entity) => {
      const nextState = step.entityStates?.[entity.id];
      const patch: Partial<Entity> = {};

      if (nextState) patch.state = nextState;

      if (entity.id === 'film_tension' && step.sensorValues?.film_tension !== undefined) {
        const value = step.sensorValues.film_tension;
        patch.metrics = {
          ...entity.metrics,
          Actual: `${value.toFixed(1)} N`,
          Delta: `${value - 42 > 0 ? '+' : ''}${(value - 42).toFixed(1)} N`,
        };
      }

      if (nextState && isSimulating) {
        const physicsDef = entityPhysics[entity.id];
        if (physicsDef?.uiMapper) {
          const mappedMetrics = physicsDef.uiMapper(nextState, physicsDef, (id) => entityPhysics[id]);
          patch.metrics = { ...entity.metrics, ...mappedMetrics };
        }
      }

      if (entity.id === 'planned_vs_actual' && step.unitsMissed !== undefined) {
        patch.metrics = {
          ...entity.metrics,
          Gap: `−${step.unitsMissed.toLocaleString('en-US').replace(',', ' ')} units`,
        };
      }

      if (entity.id === 'impact_yield' && step.financialLossGBP !== undefined) {
        const lossStr = `£${Math.max(1, Math.round(step.financialLossGBP / 1000))}K loss`;
        patch.metrics = activeScenario === 'corrected'
          ? { ...entity.metrics, Corrected: lossStr }
          : { ...entity.metrics, Unchanged: lossStr };
      }

      return Object.keys(patch).length > 0 ? { ...entity, ...patch } : entity;
    });
  }, [entities, simulatedTime, predictions, activeScenario, isSimulating, entityPhysics]);

  const boardEntities = useMemo(
    () => effectiveEntities.filter((entity) => visibleIds.has(entity.id)),
    [effectiveEntities, visibleIds]
  );

  const entityStateMap = useMemo<Record<string, Entity['state']> | null>(() => {
    if (!isSimulating) return null;
    return Object.fromEntries(effectiveEntities.map((entity) => [entity.id, entity.state]));
  }, [isSimulating, effectiveEntities]);

  const hiddenCount = entities.length - visibleIds.size;
  const { positions: layoutPos, sizes } = useLayout(entities, zoneMap) as { positions: PositionMap; sizes: SizeMap };
  const positions = useMemo(() => ({ ...layoutPos, ...storedPos }), [layoutPos, storedPos]);

  const projRelations = useMemo<Relation[]>(
    () => buildProjectionRelations(entities, relations).filter(
      (relation: Relation) => visibleIds.has(relation.from) && visibleIds.has(relation.to)
    ),
    [entities, relations, visibleIds]
  );

  const fitTransform = useMemo<FitTransform>(() => {
    const ids = [...pinnedIds];
    const pinnedPos = Object.fromEntries(ids.map((id) => [id, layoutPos[id]]).filter(([, value]) => value));
    const pinnedSizes = Object.fromEntries(ids.map((id) => [id, sizes[id]]).filter(([, value]) => value));
    return computeFitTransform(pinnedPos, pinnedSizes, window.innerWidth, window.innerHeight - 88);
  }, [pinnedIds, layoutPos, sizes]);

  const mvReg = useRef<MotionRegistry>({});
  const actualSizes = useRef<SizeMap>({});
  const boardRef = useRef<BoardRefApi | null>(null);

  const handleRegister = useCallback((id: string, mx: MotionAxis, my: MotionAxis) => {
    mvReg.current[id] = { mx, my };
  }, []);
  const handleSizeChange = useCallback((id: string, size: Size) => {
    actualSizes.current[id] = size;
  }, []);

  const getBaselineX = useCallback((id: string) => storedPos[id]?.x ?? layoutPos[id]?.x ?? 0, [storedPos, layoutPos]);
  const getBaselineY = useCallback((id: string) => storedPos[id]?.y ?? layoutPos[id]?.y ?? 0, [storedPos, layoutPos]);
  const getSizeOf = useCallback((id: string) => actualSizes.current[id] ?? sizes[id], [sizes]);

  const lastRestackedCount = useRef(0);
  useLayoutEffect(() => {
    if (lastRestackedCount.current === boardEntities.length) return;
    lastRestackedCount.current = boardEntities.length;

    const updates: PositionMap = {};
    const minGap = 110;
    const zoneBounds: Record<string, { minX: number; maxX: number }> = {};

    boardEntities.forEach((entity) => {
      const zone = zoneMap[entity.id];
      if (!zone) return;
      const x = mvReg.current[entity.id]?.mx.get() ?? getBaselineX(entity.id);
      const width = getSizeOf(entity.id)?.width ?? 320;
      if (!zoneBounds[zone]) zoneBounds[zone] = { minX: x, maxX: x + width };
      else {
        zoneBounds[zone].minX = Math.min(zoneBounds[zone].minX, x);
        zoneBounds[zone].maxX = Math.max(zoneBounds[zone].maxX, x + width);
      }
    });

    const currBounds = { ...zoneBounds };
    for (let i = 1; i < ZONE_ORDER.length; i++) {
      const zone = ZONE_ORDER[i];
      const prevZone = ZONE_ORDER[i - 1];
      if (!currBounds[zone] || !currBounds[prevZone]) continue;
      const desired = currBounds[prevZone].maxX + minGap;
      const delta = desired - currBounds[zone].minX;
      if (delta > 0.5) {
        boardEntities.forEach((entity) => {
          if (zoneMap[entity.id] !== zone) return;
          const mv = mvReg.current[entity.id];
          if (!mv) return;
          const targetX = mv.mx.get() + delta;
          mv.mx.set(targetX);
          updates[entity.id] = { ...updates[entity.id], x: targetX };
        });
        currBounds[zone].minX += delta;
        currBounds[zone].maxX += delta;
      }
    }

    ZONE_ORDER.forEach((zone) => {
      const zoneEntities = boardEntities.filter((entity) => zoneMap[entity.id] === zone);
      if (!zoneEntities.length) return;

      const sorted = [...zoneEntities].sort((a, b) => {
        const ay = (storedPos[a.id]?.y ?? layoutPos[a.id]?.y ?? 0) + (getSizeOf(a.id)?.height ?? 160) / 2;
        const by = (storedPos[b.id]?.y ?? layoutPos[b.id]?.y ?? 0) + (getSizeOf(b.id)?.height ?? 160) / 2;
        return ay - by;
      });

      let cursorY: number | null = null;
      sorted.forEach((entity) => {
        const height = getSizeOf(entity.id)?.height ?? 160;
        const mv = mvReg.current[entity.id];
        if (!mv) return;
        const y = mv.my.get();
        if (cursorY === null) cursorY = y + height + INTRA_GAP;
        else if (y < cursorY) {
          mv.my.set(cursorY);
          cursorY += height + INTRA_GAP;
        } else {
          cursorY = y + height + INTRA_GAP;
        }
      });

      zoneEntities.forEach((entity) => {
        const mv = mvReg.current[entity.id];
        if (mv) updates[entity.id] = { ...updates[entity.id], x: updates[entity.id]?.x ?? mv.mx.get(), y: mv.my.get() };
      });
    });

    if (Object.keys(updates).length) setPositions(updates);
  });

  const reflowZones = useCallback((draggedId: string) => {
    const minGap = 110;
    const draggedZone = zoneMap[draggedId];
    const draggedIdx = ZONE_ORDER.indexOf(draggedZone);
    if (draggedIdx < 0) return {};

    const zoneBounds: Record<string, { minX: number; maxX: number }> = {};
    boardEntities.forEach((entity) => {
      const zone = zoneMap[entity.id];
      if (!zone) return;
      const x = mvReg.current[entity.id]?.mx.get() ?? getBaselineX(entity.id);
      const width = getSizeOf(entity.id)?.width ?? 320;
      if (!zoneBounds[zone]) zoneBounds[zone] = { minX: x, maxX: x + width };
      else {
        zoneBounds[zone].minX = Math.min(zoneBounds[zone].minX, x);
        zoneBounds[zone].maxX = Math.max(zoneBounds[zone].maxX, x + width);
      }
    });

    const xTargets: Record<string, number> = {};
    const currBounds = { ...zoneBounds };
    for (let i = draggedIdx + 1; i < ZONE_ORDER.length; i++) {
      const zone = ZONE_ORDER[i];
      const prevZone = ZONE_ORDER[i - 1];
      if (!currBounds[zone] || !currBounds[prevZone]) continue;
      const desired = currBounds[prevZone].maxX + minGap;
      const delta = desired - currBounds[zone].minX;
      if (delta > 0.5) {
        boardEntities.forEach((entity) => {
          if (zoneMap[entity.id] !== zone) return;
          const mv = mvReg.current[entity.id];
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
      const zone = ZONE_ORDER[i];
      const nextZone = ZONE_ORDER[i + 1];
      if (!currBounds[zone] || !currBounds[nextZone]) continue;
      const desired = currBounds[nextZone].minX - minGap;
      const delta = desired - currBounds[zone].maxX;
      if (delta < -0.5) {
        boardEntities.forEach((entity) => {
          if (zoneMap[entity.id] !== zone) return;
          const mv = mvReg.current[entity.id];
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
  }, [boardEntities, getSizeOf, getBaselineX, zoneMap]);

  const handleNodeDrag = useCallback((id: string, _x: number, y: number) => {
    const zone = zoneMap[id];
    if (!zone) return;
    reflowZones(id);
    const zoneEntities = boardEntities.filter((entity) => zoneMap[entity.id] === zone);
    const getLiveY = (entityId: string) => mvReg.current[entityId]?.my.get() ?? getBaselineY(entityId);
    restack(id, y, zoneEntities, (entityId) => mvReg.current[entityId], getSizeOf, getLiveY);
  }, [boardEntities, getSizeOf, reflowZones, getBaselineY, zoneMap]);

  const handleNodeDragEnd = useCallback((id: string, x: number, y: number) => {
    const zone = zoneMap[id];
    const updates = { ...storedPos };
    if (zone) {
      const xTargets = reflowZones(id);
      const zoneEntities = boardEntities.filter((entity) => zoneMap[entity.id] === zone);
      const getLiveY = (entityId: string) => mvReg.current[entityId]?.my.get() ?? getBaselineY(entityId);
      const yTargets = restack(id, y, zoneEntities, (entityId) => mvReg.current[entityId], getSizeOf, getLiveY);
      boardEntities.forEach((entity) => {
        const targetX = xTargets[entity.id] ?? mvReg.current[entity.id]?.mx.get() ?? getBaselineX(entity.id);
        const targetY = yTargets[entity.id] ?? mvReg.current[entity.id]?.my.get() ?? getBaselineY(entity.id);
        updates[entity.id] = { x: targetX, y: targetY };
      });
    } else {
      updates[id] = { x: mvReg.current[id]?.mx.get() ?? x, y: mvReg.current[id]?.my.get() ?? y };
    }
    setPositions(updates);
  }, [boardEntities, getSizeOf, storedPos, setPositions, reflowZones, getBaselineY, getBaselineX, zoneMap]);

  const handleNodeClick = useCallback((id: string) => enterFocus(id), [enterFocus]);
  const handleBoardClick = useCallback(() => {
    if (focusId) exitFocus();
  }, [focusId, exitFocus]);
  const handleResetLayout = useCallback(() => setPositions({}), [setPositions]);

  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (!hasAutoFocused.current && entities.length > 0) {
      hasAutoFocused.current = true;
      enterFocus('film_tension');
    }
  }, [entities, enterFocus]);

  useLayoutEffect(() => {
    if (!focusId || !boardRef.current) return;
    const neighborIds = [...visibleIds].filter((id) => focusNeighborhood.has(id));
    if (!neighborIds.length) return;

    const neighborPositions: PositionMap = {};
    const neighborSizes: SizeMap = {};
    neighborIds.forEach((id) => {
      const mv = mvReg.current[id];
      neighborPositions[id] = mv ? { x: mv.mx.get(), y: mv.my.get() } : (positions[id] ?? { x: 0, y: 0 });
      neighborSizes[id] = getSizeOf(id) ?? { width: 320, height: 160 };
    });

    const fit = computeFitTransform(neighborPositions, neighborSizes, window.innerWidth, window.innerHeight - 88);
    boardRef.current.panTo({ ...fit, scale: Math.min(fit.scale, 0.85) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const focusedEntity = focusId ? effectiveEntities.find((entity) => entity.id === focusId) ?? null : null;
  const focusOn = focusId !== null;

  return {
    dark,
    entities,
    relations: projRelations,
    effectiveEntities,
    boardEntities,
    focusId,
    focusOn,
    focusedEntity,
    focusNeighborhood,
    focusEdgeIds,
    visibleIds,
    hiddenCount,
    simulatedTime,
    isSimulating,
    positions,
    sizes,
    zoneMap,
    zoneLabels,
    entityStateMap,
    fitTransform,
    boardRef,
    actualSizes,
    mvReg,
    enterFocus,
    exitFocus,
    revealAll,
    handleRegister,
    handleSizeChange,
    handleNodeDrag,
    handleNodeDragEnd,
    handleNodeClick,
    handleBoardClick,
    handleResetLayout,
  };
}
