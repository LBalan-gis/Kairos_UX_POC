import { create } from "zustand";
import { persist } from "zustand/middleware";
import { predict } from "../engine/predict";

const STORAGE_VERSION = "v17";

// ── helpers ───────────────────────────────────────────────────────────────────

function buildEntityMap(entities) {
  return Object.fromEntries(entities.map((e) => [e.id, e]));
}

// Focus neighborhood for dimming: 1 hop back, 2 hops forward + batch_golden anchor
// Mirrors HTML getConnectedImpactNeighborhood exactly:
// 3 hops upstream (toward causes) + 4 hops downstream (toward effects)
function getNeighborhood(entityId, entities, allRelations) {
  const projRels = allRelations;
  const entityIds = new Set(entities.map((e) => e.id));
  const ids = new Set([entityId]);
  const edgeIds = new Set();

  let frontierUp = [entityId];
  for (let d = 0; d < 3; d++) {
    const next = [];
    frontierUp.forEach((id) => {
      projRels.forEach((r) => {
        if (r.to === id && entityIds.has(r.from) && entityIds.has(r.to)) {
          ids.add(r.from); ids.add(r.to); edgeIds.add(r.id); next.push(r.from);
        }
      });
    });
    frontierUp = next;
    if (!frontierUp.length) break;
  }

  let frontierDown = [entityId];
  for (let d = 0; d < 4; d++) {
    const next = [];
    frontierDown.forEach((id) => {
      projRels.forEach((r) => {
        if (r.from === id && entityIds.has(r.from) && entityIds.has(r.to)) {
          ids.add(r.from); ids.add(r.to); edgeIds.add(r.id); next.push(r.to);
        }
      });
    });
    frontierDown = next;
    if (!frontierDown.length) break;
  }

  return { nodeIds: ids, edgeIds };
}

// ── store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── data (injected via initEngine) ──────────────────────────────────────
      entities: [],
      relations: [],
      entityMap: {},
      entityPhysics: {},
      relationPropagation: {},
      scenarios: [],
      predictions: [],
      zoneMap: {},
      zoneLabels: {},
      liveIds: [],

      // ── view mode ───────────────────────────────────────────────────────────
      // "floor" | "graph"
      view: "floor",
      setView: (view) => set({ view }),

      // ── bootloader (Dependency Injection) ───────────────────────────────────
      initEngine: (config) => {
        set({
          entities: config.entities || [],
          relations: config.relations || [],
          entityMap: buildEntityMap(config.entities || []),
          entityPhysics: config.physics || {},
          relationPropagation: config.propagation || {},
          scenarios: config.scenarios || [],
          predictions: predict(
            config.physics || {},
            config.propagation || {},
            config.relations || [],
            config.scenarios || [],
            config.entities || [],
          ),
          zoneMap:    config.zoneMap    || {},
          zoneLabels: config.zoneLabels || {},
          liveIds:    config.liveIds    || [],
          // Set initial visibility
          pinnedIds: new Set(config.pinnedIds || []),
          visibleIds: new Set(config.pinnedIds || []),
          activeScenario: config.scenarios?.[0]?.id || 'unchanged'
        });
      },

      // ── graph state ─────────────────────────────────────────────────────────
      // node id → { x, y } positions (persisted)
      positions: {},
      setPositions: (positions) => set({ positions }),
      setNodePosition: (id, pos) =>
        set((s) => ({ positions: { ...s.positions, [id]: pos } })),

      // Permanently visible nodes
      pinnedIds: new Set(),
      // Temporarily revealed on card click (cleared on exitFocus)
      tempIds: new Set(),
      // Board = pinned ∪ temp — what's rendered and gets swimlanes
      visibleIds: new Set(),

      // Focus state
      focusId: null,
      // Neighborhood of focused node — nodeIds for card dimming, edgeIds for edge dimming
      focusNeighborhood: new Set(),
      focusEdgeIds: new Set(),

      enterFocus: (entityId) => {
        const { entities, relations, pinnedIds, tempIds } = get();

        // Mirrors HTML getConnectedImpactNeighborhood exactly
        const { nodeIds, edgeIds } = getNeighborhood(entityId, entities, relations);

        // Reveal direct projection neighbors onto the board (temp)
        const projRels = relations;
        const knownIds = new Set(entities.map((e) => e.id));
        const toReveal = [];
        projRels.forEach((r) => {
          if (r.from === entityId && knownIds.has(r.to) && !pinnedIds.has(r.to) && !tempIds.has(r.to))
            toReveal.push(r.to);
          if (r.to === entityId && knownIds.has(r.from) && !pinnedIds.has(r.from) && !tempIds.has(r.from))
            toReveal.push(r.from);
        });
        const newTempIds = new Set([...tempIds, ...toReveal]);

        set({
          focusId: entityId,
          focusNeighborhood: nodeIds,
          focusEdgeIds: edgeIds,
          tempIds: newTempIds,
          visibleIds: new Set([...pinnedIds, ...newTempIds]),
        });
      },

      exitFocus: () => {
        const { pinnedIds, tempIds } = get();
        set({
          focusId: null,
          focusNeighborhood: new Set(),
          focusEdgeIds: new Set(),
          visibleIds: new Set([...pinnedIds, ...tempIds]),
        });
      },

      revealAll: () => {
        const { entities } = get();
        const allIds = new Set(entities.map((e) => e.id));
        set({ pinnedIds: allIds, tempIds: new Set(), visibleIds: allIds });
      },

      pinNode: (id) =>
        set((s) => {
          const newPinned = new Set([...s.pinnedIds, id]);
          return { pinnedIds: newPinned, visibleIds: new Set([...newPinned, ...s.tempIds]) };
        }),

      // ── prediction ──────────────────────────────────────────────────────────
      // Re-run whenever entity states are updated (future: live signal loop).
      
      // null = live NOW  |  number = minutes offset for timeline scrubbing
      simulatedTime:   null,
      activeScenario:  'unchanged',

      setSimulatedTime:  (t)  => set({ simulatedTime: t }),
      setActiveScenario: (id) => set({ activeScenario: id }),

      // Re-run engine (call when entity physics change due to live data)
      refreshPredictions: () => set((s) => ({
        predictions: predict(s.entityPhysics, s.relationPropagation, s.relations, s.scenarios, s.entities),
      })),

      // ── live data ingestion (called by useLiveData on each DB row) ───────────
      applyLiveReading: (entityId, state, metrics, value) => set((s) => {
        const updatedEntities = s.entities.map((e) =>
          e.id === entityId
            ? { ...e, state, ...(metrics && { metrics: { ...e.metrics, ...metrics } }) }
            : e
        );
        const updatedPhysics =
          value !== undefined && s.entityPhysics[entityId]
            ? { ...s.entityPhysics, [entityId]: { ...s.entityPhysics[entityId], currentValue: value } }
            : s.entityPhysics;
        return {
          entities: updatedEntities,
          entityMap: buildEntityMap(updatedEntities),
          entityPhysics: updatedPhysics,
          predictions: predict(updatedPhysics, s.relationPropagation, s.relations, s.scenarios, updatedEntities),
          signalTimestamps: { ...s.signalTimestamps, [entityId]: Date.now() },
        };
      }),

      // ── theme ───────────────────────────────────────────────────────────────
      dark: false,
      toggleDark: () => set((s) => ({ dark: !s.dark })),

      // ── kairos pane ─────────────────────────────────────────────────────────
      kairosOpen: false,
      kairosEntityId: null,
      openKairos: (entityId = null) => set({ kairosOpen: true, kairosEntityId: entityId }),
      closeKairos: () => set({ kairosOpen: false, kairosEntityId: null }),

      // ── live signal timestamps ───────────────────────────────────────────────
      // node id → timestamp of last update
      signalTimestamps: {},
      bumpSignal: (ids) => {
        const now = Date.now();
        set((s) => ({
          signalTimestamps: {
            ...s.signalTimestamps,
            ...Object.fromEntries(ids.map((id) => [id, now])),
          },
        }));
      },
    }),
    {
      name: `mei_graph_state_${STORAGE_VERSION}`,
      // persist positions and theme — everything else rehydrates from data
      partialize: (s) => ({ positions: s.positions, dark: s.dark }),
    }
  )
);
