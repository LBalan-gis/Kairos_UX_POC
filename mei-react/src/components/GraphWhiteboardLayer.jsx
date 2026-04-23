import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useLayout, computeFitTransform } from '../hooks/useLayout';
import { buildProjectionRelations } from '../engine/relations';
import { GraphBoard } from './graph/GraphBoard';
import { ZoneSwimlanes } from './graph/ZoneSwimlanes';
import { EdgeLayer } from './graph/EdgeLayer';
import { NodeLayer } from './graph/NodeLayer';
import { MiniMap } from './graph/MiniMap';
import './GraphWhiteboardLayer.css';
import './graph/graph.css';

// entityId → which metric key holds the live reading and its unit suffix
const SENSOR_LIVE_METRIC = {
  film_tension: { key: 'Actual', unit: ' N',  prec: 1 },
  env_humidity: { key: 'RH',     unit: '%',   prec: 0 },
};

const INTRA_GAP = 28; // matches HTML _restackZoneColumns INTRA_GAP

// Collision-driven algorithm — mirrors _restackZoneColumns from HTML exactly.
// getY(id) must return the LIVE current Y for each card (HTML uses uiState.positions[id].y
// which is mutated in place each drag frame — we pass mvReg[id].my.get() for the same effect).
// Always instant mv.my.set() — mirrors HTML's el.style.top = p.y (no animation on siblings).
function restack(dragId, dragY, zoneEntities, getMV, getSize, getY) {
  const getSortY = (e) => e.id === dragId ? dragY : getY(e.id);
  const getH    = (e) => getSize(e.id)?.height ?? 160;

  // Sort by center Y — dragged card uses live pointer Y, siblings use live MV Y
  const sorted = [...zoneEntities].sort((a, b) =>
    (getSortY(a) + getH(a) / 2) - (getSortY(b) + getH(b) / 2)
  );

  let cursorY = null;
  const targetYs = {};

  sorted.forEach((e) => {
    const h = getH(e);
    let y = getSortY(e);

    if (cursorY === null) {
      cursorY = y;
    } else if (y < cursorY) {
      y = cursorY;
      if (e.id !== dragId) {
        const mv = getMV(e.id);
        if (mv) mv.my.set(y); // instant — mirrors HTML's el.style.top = p.y
      }
    }

    targetYs[e.id] = y;
    cursorY = y + h + INTRA_GAP;
  });

  return targetYs;
}

export const GraphWhiteboardLayer = () => {
  const {
    entities, relations, focusId,
    visibleIds,        // board = pinned ∪ temp
    focusNeighborhood, // for dimming
    focusEdgeIds,      // for edge dimming
    storedPos,
    enterFocus, exitFocus, revealAll, setPositions,
    simulatedTime, predictions, activeScenario,
    entityPhysics, pinnedIds, zoneMap, zoneLabels,
  } = useAppStore(useShallow(s => ({
    entities:          s.entities,
    relations:         s.relations,
    focusId:           s.focusId,
    visibleIds:        s.visibleIds,
    focusNeighborhood: s.focusNeighborhood,
    focusEdgeIds:      s.focusEdgeIds,
    storedPos:         s.positions,
    enterFocus:        s.enterFocus,
    exitFocus:         s.exitFocus,
    revealAll:         s.revealAll,
    setPositions:      s.setPositions,
    simulatedTime:     s.simulatedTime,
    predictions:       s.predictions,
    activeScenario:    s.activeScenario,
    entityPhysics:     s.entityPhysics,
    pinnedIds:         s.pinnedIds,
    zoneMap:           s.zoneMap,
    zoneLabels:        s.zoneLabels,
  })));

  const isSimulating = simulatedTime !== null && simulatedTime > 0;

  // Overlay predicted states + sensor values when scrubber is in future
  const effectiveEntities = useMemo(() => {
    if (simulatedTime === null || simulatedTime <= 0) return entities;
    const scenario = predictions?.find(p => p.scenarioId === activeScenario);
    if (!scenario?.steps?.length) return entities;

    // Last step at or before simulatedTime
    let step = scenario.steps[0];
    for (const s of scenario.steps) {
      if (s.t <= simulatedTime) step = s;
      else break;
    }

    return entities.map(e => {
      const nextState = step.entityStates?.[e.id];
      const patch = {};
      
      if (nextState) patch.state = nextState;

      // Surgically map the simulation step data to the textual card strings
      if (e.id === 'film_tension' && step.sensorValues?.['film_tension'] !== undefined) {
        const val = step.sensorValues['film_tension'];
        patch.metrics = {
          ...e.metrics,
          Actual: val.toFixed(1) + ' N',
          Delta: (val - 42 > 0 ? '+' : '') + (val - 42).toFixed(1) + ' N',
        };
      }

      // Downstream cascaded nodes dynamically map strings via backend physics config
      if (nextState && isSimulating) {
        const physicsDef = entityPhysics[e.id];
        if (physicsDef?.uiMapper) {
          const mappedMetrics = physicsDef.uiMapper(
            nextState,
            physicsDef,
            (id) => entityPhysics[id]
          );
          patch.metrics = { ...e.metrics, ...mappedMetrics };
        }
      }
      
      if (e.id === 'planned_vs_actual' && step.unitsMissed !== undefined) {
        patch.metrics = {
          ...e.metrics,
          Gap: `−${step.unitsMissed.toLocaleString('en-US').replace(',', ' ')} units`,
        };
      }
      
      if (e.id === 'impact_yield' && step.financialLossGBP !== undefined) {
        const lossStr = `£${Math.max(1, Math.round(step.financialLossGBP / 1000))}K loss`;
        if (activeScenario === 'corrected') {
          patch.metrics = { ...e.metrics, Corrected: lossStr };
        } else {
          patch.metrics = { ...e.metrics, Unchanged: lossStr };
        }
      }

      return Object.keys(patch).length > 0 ? { ...e, ...patch } : e;
    });
  }, [entities, simulatedTime, predictions, activeScenario]);

  // Only render nodes that are on the board (pinned + temp)
  const boardEntities = useMemo(
    () => effectiveEntities.filter((e) => visibleIds.has(e.id)),
    [effectiveEntities, visibleIds]
  );

  // Entity state map for edge simulation highlighting
  const entityStateMap = useMemo(() => {
    if (!isSimulating) return null;
    return Object.fromEntries(effectiveEntities.map(e => [e.id, e.state]));
  }, [isSimulating, effectiveEntities]);

  const hiddenCount = entities.length - visibleIds.size;

  const { positions: layoutPos, sizes } = useLayout(entities, zoneMap);

  const positions = useMemo(
    () => ({ ...layoutPos, ...storedPos }),
    [layoutPos, storedPos]
  );

  const projRelations = useMemo(
    () => buildProjectionRelations(entities, relations).filter(
      (r) => visibleIds.has(r.from) && visibleIds.has(r.to)
    ),
    [entities, relations, visibleIds]
  );

  // Fit initial camera to pinned nodes only
  const fitTransform = useMemo(() => {
    const ids = [...pinnedIds];
    const pinnedPos   = Object.fromEntries(ids.map((id) => [id, layoutPos[id]]).filter(([, v]) => v));
    const pinnedSizes = Object.fromEntries(ids.map((id) => [id, sizes[id]]).filter(([, v]) => v));
    return computeFitTransform(pinnedPos, pinnedSizes, window.innerWidth, window.innerHeight - 88);
  }, [pinnedIds, layoutPos, sizes]);

  // Registry: NodeCard registers its mx/my here on mount.
  // During drag we call sibling MVs directly — zero store writes, zero re-renders.
  const mvReg = useRef({});
  // Actual rendered sizes reported by NodeCard via onSizeChange.
  // Falls back to estimated sizes from useLayout when not yet measured.
  const actualSizes = useRef({});

  const handleRegister = useCallback((id, mx, my) => {
    mvReg.current[id] = { mx, my };
  }, []);

  const handleSizeChange = useCallback((id, size) => {
    actualSizes.current[id] = size;
  }, []);

  // Baseline extractors to prevent mid-flight animation feedback loops
  const getBaselineX = useCallback((id) => storedPos[id]?.x ?? layoutPos[id]?.x ?? 0, [storedPos, layoutPos]);
  const getBaselineY = useCallback((id) => storedPos[id]?.y ?? layoutPos[id]?.y ?? 0, [storedPos, layoutPos]);

  // Returns actual height if measured, else estimated height.
  const getSizeOf = useCallback((id) => actualSizes.current[id] ?? sizes[id], [sizes]);

  // Restack whenever the board gains new nodes (initial render + each reveal).
  // Runs after ALL children's useLayoutEffects have fired (children before parent).
  // Guard on boardEntities.length so setPositions → re-render doesn't loop.
  const lastRestackedCount = useRef(0);
  useLayoutEffect(() => {
    if (lastRestackedCount.current === boardEntities.length) return;
    lastRestackedCount.current = boardEntities.length;

    const updates = {};
    const ZONE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    // 1) Horizontal self-healing pass (sweeps left-to-right to enforce MIN_GAP)
    const MIN_GAP = 110;
    const zoneBounds = {};
    boardEntities.forEach((e) => {
      const zone = zoneMap[e.id];
      if (!zone) return;
      const x = mvReg.current[e.id]?.mx.get() ?? getBaselineX(e.id);
      const w = getSizeOf(e.id)?.width ?? 320;
      if (!zoneBounds[zone]) {
        zoneBounds[zone] = { minX: x, maxX: x + w };
      } else {
        zoneBounds[zone].minX = Math.min(zoneBounds[zone].minX, x);
        zoneBounds[zone].maxX = Math.max(zoneBounds[zone].maxX, x + w);
      }
    });

    let currBounds = { ...zoneBounds };
    for (let i = 1; i < ZONE_ORDER.length; i++) {
      const zone = ZONE_ORDER[i];
      const prevZone = ZONE_ORDER[i - 1];
      if (!currBounds[zone] || !currBounds[prevZone]) continue;

      const desired = currBounds[prevZone].maxX + MIN_GAP;
      const delta = desired - currBounds[zone].minX;
      if (delta > 0.5) {
        boardEntities.forEach((e) => {
          if (zoneMap[e.id] !== zone) return;
          const mv = mvReg.current[e.id];
          if (!mv) return;
          const targetX = mv.mx.get() + delta;
          mv.mx.set(targetX); // instant
          updates[e.id] = { ...updates[e.id], x: targetX };
        });
        currBounds[zone].minX += delta;
        currBounds[zone].maxX += delta;
      }
    }

    // 2) Vertical restack pass
    ZONE_ORDER.forEach((zone) => {
      const zoneEntities = boardEntities.filter((e) => zoneMap[e.id] === zone);
      if (!zoneEntities.length) return;

      // HTML _restackZoneColumns: sort by stored position center Y (y + height/2)
      const sorted = [...zoneEntities].sort((a, b) => {
        const ay = (storedPos[a.id]?.y ?? layoutPos[a.id]?.y ?? 0) + (getSizeOf(a.id)?.height ?? 160) / 2;
        const by = (storedPos[b.id]?.y ?? layoutPos[b.id]?.y ?? 0) + (getSizeOf(b.id)?.height ?? 160) / 2;
        return ay - by;
      });

      let cursorY = null;
      sorted.forEach((e) => {
        const h = getSizeOf(e.id)?.height ?? 160;
        const mv = mvReg.current[e.id];
        if (!mv) return;
        const y = mv.my.get();
        if (cursorY === null) {
          cursorY = y + h + INTRA_GAP;
        } else if (y < cursorY) {
          mv.my.set(cursorY);
          cursorY = cursorY + h + INTRA_GAP;
        } else {
          cursorY = y + h + INTRA_GAP;
        }
      });

      zoneEntities.forEach((e) => {
        const mv = mvReg.current[e.id];
        if (mv) {
          updates[e.id] = { ...updates[e.id], x: updates[e.id]?.x ?? mv.mx.get(), y: mv.my.get() };
        }
      });
    });

    if (Object.keys(updates).length) setPositions(updates);
  }); // no deps — runs after every render but guarded by ref; effectively once

  // Bidirectional reflow. Uses live MV X for ALL cards.
  // Always instant mv.mx.set() for sibling cards.
  // Returns { id → targetX } so drag end can save correct positions.
  const reflowZones = useCallback((draggedId) => {
    const ZONE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F'];
    const MIN_GAP = 110;
    const draggedZone = zoneMap[draggedId];
    const draggedIdx = ZONE_ORDER.indexOf(draggedZone);
    if (draggedIdx < 0) return {};

    // Compute zone bounds from LIVE MV positions
    const zoneBounds = {};
    boardEntities.forEach((e) => {
      const zone = zoneMap[e.id];
      if (!zone) return;
      const x = mvReg.current[e.id]?.mx.get() ?? getBaselineX(e.id);
      const w = getSizeOf(e.id)?.width ?? 320;
      if (!zoneBounds[zone]) {
        zoneBounds[zone] = { minX: x, maxX: x + w };
      } else {
        zoneBounds[zone].minX = Math.min(zoneBounds[zone].minX, x);
        zoneBounds[zone].maxX = Math.max(zoneBounds[zone].maxX, x + w);
      }
    });

    const xTargets = {}; // absolute target X per entity

    // 1) Push downstream zones to the right
    let currBounds = { ...zoneBounds };
    for (let i = draggedIdx + 1; i < ZONE_ORDER.length; i++) {
      const zone     = ZONE_ORDER[i];
      const prevZone = ZONE_ORDER[i - 1];
      if (!currBounds[zone] || !currBounds[prevZone]) continue;

      const desired = currBounds[prevZone].maxX + MIN_GAP;
      const delta   = desired - currBounds[zone].minX;
      if (delta > 0.5) { // Only push, never pull
        boardEntities.forEach((e) => {
          if (zoneMap[e.id] !== zone) return;
          const mv = mvReg.current[e.id];
          if (!mv) return;
          const targetX = mv.mx.get() + delta;
          if (e.id !== draggedId) mv.mx.set(targetX); // instant
          xTargets[e.id] = targetX;
        });
        currBounds[zone].minX += delta;
        currBounds[zone].maxX += delta;
      }
    }

    // 2) Push upstream zones to the left
    for (let i = draggedIdx - 1; i >= 0; i--) {
      const zone     = ZONE_ORDER[i];
      const nextZone = ZONE_ORDER[i + 1];
      if (!currBounds[zone] || !currBounds[nextZone]) continue;

      const desired = currBounds[nextZone].minX - MIN_GAP;
      const delta   = desired - currBounds[zone].maxX; // Will be negative if we need to push left
      if (delta < -0.5) { // Only push left
        boardEntities.forEach((e) => {
          if (zoneMap[e.id] !== zone) return;
          const mv = mvReg.current[e.id];
          if (!mv) return;
          const targetX = mv.mx.get() + delta;
          if (e.id !== draggedId) mv.mx.set(targetX); // instant
          xTargets[e.id] = targetX;
        });
        currBounds[zone].minX += delta;
        currBounds[zone].maxX += delta;
      }
    }

    return xTargets;
  }, [boardEntities, getSizeOf, getBaselineX]);

  // Called every drag frame. Both X and Y — lane expands pushing downstream lanes.
  // Uses live MV for all positions (mirrors HTML's uiState.positions mutated each frame).
  const handleNodeDrag = useCallback((id, x, y) => {
    const zone = zoneMap[id];
    if (!zone) return;
    reflowZones(id);
    const zoneEntities = boardEntities.filter((e) => zoneMap[e.id] === zone);
    const getLiveY = (eid) => mvReg.current[eid]?.my.get() ?? getBaselineY(eid);
    restack(id, y, zoneEntities, (eid) => mvReg.current[eid], getSizeOf, getLiveY);
  }, [boardEntities, getSizeOf, reflowZones, getBaselineY]);

  // On release: finalize positions and persist. All instant — no spring (mirrors HTML exactly).
  const handleNodeDragEnd = useCallback((id, x, y) => {
    const zone = zoneMap[id];
    const updates = { ...storedPos };

    if (zone) {
      const xTargets = reflowZones(id);
      const zoneEntities = boardEntities.filter((e) => zoneMap[e.id] === zone);
      const getLiveY = (eid) => mvReg.current[eid]?.my.get() ?? getBaselineY(eid);
      const yTargets = restack(id, y, zoneEntities, (eid) => mvReg.current[eid], getSizeOf, getLiveY);

      boardEntities.forEach((e) => {
        const targetX = xTargets[e.id] ?? mvReg.current[e.id]?.mx.get() ?? getBaselineX(e.id);
        const targetY = yTargets[e.id] ?? mvReg.current[e.id]?.my.get() ?? getBaselineY(e.id);
        updates[e.id] = { x: targetX, y: targetY };
      });
    } else {
      updates[id] = { x: mvReg.current[id]?.mx.get() ?? x, y: mvReg.current[id]?.my.get() ?? y };
    }

    setPositions(updates);
  }, [boardEntities, getSizeOf, storedPos, setPositions, reflowZones, getBaselineY, getBaselineX]);

  const handleNodeClick  = useCallback((id) => enterFocus(id), [enterFocus]);
  const handleBoardClick = useCallback(() => { if (focusId) exitFocus(); }, [focusId, exitFocus]);

  const boardRef = useRef(null);

  // On focus: zoom out to show the full neighborhood so the user sees
  // all newly revealed connections, then they can zoom in manually.
  useLayoutEffect(() => {
    if (!focusId || !boardRef.current) return;

    // Fit to all neighborhood nodes that are currently on the board.
    // For nodes that just mounted (no MotionValue yet), fall back to computed position.
    const neighborIds = [...visibleIds].filter((id) => focusNeighborhood.has(id));
    if (!neighborIds.length) return;

    const neighborPositions = {};
    const neighborSizes     = {};
    neighborIds.forEach((id) => {
      const mv = mvReg.current[id];
      neighborPositions[id] = mv
        ? { x: mv.mx.get(), y: mv.my.get() }
        : (positions[id] ?? { x: 0, y: 0 });
      neighborSizes[id] = getSizeOf(id) ?? { width: 320, height: 160 };
    });

    const fit = computeFitTransform(
      neighborPositions,
      neighborSizes,
      window.innerWidth,
      window.innerHeight - 88,
    );

    // Cap scale so it never zooms in beyond the current view
    boardRef.current.panTo({ ...fit, scale: Math.min(fit.scale, 0.85) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  return (
    <div className="board-container">
      {isSimulating && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, pointerEvents: 'none',
          background: 'rgba(164,122,42,0.92)',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 20, padding: '4px 16px',
          color: '#fff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em',
          whiteSpace: 'nowrap',
        }}>
          +{Math.round(simulatedTime)}m SIMULATED
        </div>
      )}
      {hiddenCount > 0 && (
        <button
          onClick={revealAll}
          style={{
            position: 'absolute', bottom: 180, left: 20,
            zIndex: 100,
            background: 'rgba(24,32,44,0.88)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 20, padding: '5px 16px',
            color: 'rgba(255,255,255,0.70)',
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
            cursor: 'pointer', whiteSpace: 'nowrap',
            backdropFilter: 'blur(12px)',
          }}
        >
          +{hiddenCount} hidden nodes · reveal all
        </button>
      )}
      <GraphBoard
        ref={boardRef}
        initialTransform={fitTransform}
        onBoardClick={handleBoardClick}
      >
        <ZoneSwimlanes
          entities={boardEntities}
          positions={positions}
          sizes={sizes}
          mvReg={mvReg}
          actualSizesRef={actualSizes}
          zoneMap={zoneMap}
          zoneLabels={zoneLabels}
        />
        <EdgeLayer
          relations={projRelations}
          positions={positions}
          sizes={sizes}
          actualSizesRef={actualSizes}
          focusEdgeIds={focusEdgeIds}
          focusId={focusId}
          mvReg={mvReg}
          isSimulating={isSimulating}
          entityStateMap={entityStateMap}
        />
        <NodeLayer
          entities={boardEntities}
          positions={positions}
          sizes={sizes}
          visibleIds={focusNeighborhood}
          focusId={focusId}
          simulatedTime={simulatedTime}
          onNodeClick={handleNodeClick}
          onNodeDragEnd={handleNodeDragEnd}
          onNodeDrag={handleNodeDrag}
          onRegister={handleRegister}
          onSizeChange={handleSizeChange}
        />
      </GraphBoard>
      <MiniMap
        boardEntities={boardEntities}
        positions={positions}
        sizes={sizes}
        mvReg={mvReg}
        actualSizesRef={actualSizes}
        boardRef={boardRef}
        zoneMap={zoneMap}
      />
    </div>
  );
};
