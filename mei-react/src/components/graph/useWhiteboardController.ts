import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { useLayout, computeFitTransform } from '../../hooks/useLayout';
import { selectSimulationContext } from '../../domain/simulation/selectors';
import { buildGraphBoardVM } from './graphViewModel';
import {
  buildGraphFocusTransform,
  shouldExitGraphFocus,
} from './graphFocus';
import {
  GRAPH_ZONE_ORDER,
  normalizeGraphZoneLayout,
  reflowGraphZones,
  restackGraphZone,
} from './graphLayout';
import type { Entity, Relation, ZoneId } from '../../types/domain';
import type { Position } from '../../types/store';

type Size = { width: number; height: number };
type MotionAxis = { get: () => number; set: (value: number) => void };
type MotionPair = { mx: MotionAxis; my: MotionAxis };
type MotionRegistry = Record<string, MotionPair>;
type SizeMap = Record<string, Size>;
type PositionMap = Record<string, Position>;
type FitTransform = { x: number; y: number; scale: number };
type BoardRefApi = { panTo: (transform: FitTransform) => void };

export function useWhiteboardController() {
  const dark = useAppStore((state) => state.dark);

  const {
    entities, relations, focusId,
    visibleIds, focusNeighborhood, focusEdgeIds,
    storedPos, enterFocus, exitFocus, revealAll, setPositions,
    entityPhysics, pinnedIds, zoneMap, zoneLabels, graphConfig,
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
    entityPhysics: state.entityPhysics,
    pinnedIds: state.pinnedIds,
    zoneMap: state.zoneMap,
    zoneLabels: state.zoneLabels,
    graphConfig: state.graphConfig,
  })));
  const simulation = useAppStore(useShallow(selectSimulationContext));
  const { positions: layoutPos, sizes } = useLayout(entities, zoneMap) as { positions: PositionMap; sizes: SizeMap };
  const boardVm = useMemo(() => buildGraphBoardVM({
    entities,
    relations,
    visibleIds,
    storedPos,
    layoutPos,
    focusId,
    simulation,
    graphConfig,
    entityPhysics,
  }), [entities, relations, visibleIds, storedPos, layoutPos, focusId, simulation, graphConfig, entityPhysics]);
  const {
    simulatedTime,
    isSimulating,
    effectiveEntities,
    boardEntities,
    entityStateMap,
    hiddenCount,
    positions,
    projectionRelations: projRelations,
    focusedEntity,
  } = boardVm;

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

    const updates = normalizeGraphZoneLayout({
      boardEntities,
      zoneMap,
      zoneOrder: GRAPH_ZONE_ORDER,
      getX: (id) => mvReg.current[id]?.mx.get() ?? getBaselineX(id),
      getY: (id) => storedPos[id]?.y ?? layoutPos[id]?.y ?? 0,
      getSize: getSizeOf,
      getMV: (id) => mvReg.current[id],
    });

    if (Object.keys(updates).length) setPositions(updates);
  });

  const reflowZones = useCallback((draggedId: string) => {
    return reflowGraphZones({
      draggedId,
      boardEntities,
      zoneMap,
      zoneOrder: GRAPH_ZONE_ORDER,
      getX: (id) => mvReg.current[id]?.mx.get() ?? getBaselineX(id),
      getSize: getSizeOf,
      getMV: (id) => mvReg.current[id],
    });
  }, [boardEntities, getSizeOf, getBaselineX, zoneMap]);

  const handleNodeDrag = useCallback((id: string, _x: number, y: number) => {
    const zone = zoneMap[id];
    if (!zone) return;
    reflowZones(id);
    const zoneEntities = boardEntities.filter((entity) => zoneMap[entity.id] === zone);
    const getLiveY = (entityId: string) => mvReg.current[entityId]?.my.get() ?? getBaselineY(entityId);
    restackGraphZone({
      dragId: id,
      dragY: y,
      zoneEntities,
      getMV: (entityId) => mvReg.current[entityId],
      getSize: getSizeOf,
      getY: getLiveY,
    });
  }, [boardEntities, getSizeOf, reflowZones, getBaselineY, zoneMap]);

  const handleNodeDragEnd = useCallback((id: string, x: number, y: number) => {
    const zone = zoneMap[id];
    const updates = { ...storedPos };
    if (zone) {
      const xTargets = reflowZones(id);
      const zoneEntities = boardEntities.filter((entity) => zoneMap[entity.id] === zone);
      const getLiveY = (entityId: string) => mvReg.current[entityId]?.my.get() ?? getBaselineY(entityId);
      const yTargets = restackGraphZone({
        dragId: id,
        dragY: y,
        zoneEntities,
        getMV: (entityId) => mvReg.current[entityId],
        getSize: getSizeOf,
        getY: getLiveY,
      });
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
    if (shouldExitGraphFocus(focusId)) exitFocus();
  }, [focusId, exitFocus]);
  const handleResetLayout = useCallback(() => setPositions({}), [setPositions]);

  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (!hasAutoFocused.current && entities.length > 0) {
      hasAutoFocused.current = true;
      enterFocus(graphConfig?.defaultFocusId ?? 'film_tension');
    }
  }, [entities, enterFocus, graphConfig]);

  useLayoutEffect(() => {
    if (!focusId || !boardRef.current) return;
    const neighborIds = [...visibleIds].filter((id) => focusNeighborhood.has(id));
    if (!neighborIds.length) return;

    const livePositions = Object.fromEntries(
      neighborIds.map((id) => {
        const mv = mvReg.current[id];
        return [id, mv ? { x: mv.mx.get(), y: mv.my.get() } : (positions[id] ?? { x: 0, y: 0 })];
      })
    );
    const fit = buildGraphFocusTransform({
      neighborIds,
      positions: livePositions,
      getSize: getSizeOf,
      width: window.innerWidth,
      height: window.innerHeight - 88,
    });
    if (fit) boardRef.current.panTo(fit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

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
    graphConfig,
    entityStateMap,
    fitTransform,
    boardRef,
    actualSizes,
    mvReg,
    enterFocus,
    exitFocus,
    revealAll,
    graphConfig,
    handleRegister,
    handleSizeChange,
    handleNodeDrag,
    handleNodeDragEnd,
    handleNodeClick,
    handleBoardClick,
    handleResetLayout,
  };
}
