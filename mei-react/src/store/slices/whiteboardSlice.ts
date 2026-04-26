import type { Position } from '../../types/store';
import type { AppStateCreator } from './types';
import { getNeighborhood } from '../helpers';

export const createWhiteboardSlice: AppStateCreator = (set, get) => ({
  setPositions: (positions) => set({ positions }),
  setNodePosition: (id: string, pos: Position) =>
    set((state) => ({ positions: { ...state.positions, [id]: pos } })),
  enterFocus: (entityId: string) => {
    const { entities, relations, pinnedIds, tempIds } = get();
    const { nodeIds, edgeIds } = getNeighborhood(entityId, entities, relations);
    const knownIds = new Set(entities.map((entity) => entity.id));
    const toReveal: string[] = [];

    relations.forEach((relation) => {
      if (relation.from === entityId && knownIds.has(relation.to) && !pinnedIds.has(relation.to) && !tempIds.has(relation.to)) {
        toReveal.push(relation.to);
      }
      if (relation.to === entityId && knownIds.has(relation.from) && !pinnedIds.has(relation.from) && !tempIds.has(relation.from)) {
        toReveal.push(relation.from);
      }
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
    const allIds = new Set(get().entities.map((entity) => entity.id));
    set({ pinnedIds: allIds, tempIds: new Set(), visibleIds: allIds });
  },
  pinNode: (id) =>
    set((state) => {
      const newPinned = new Set([...state.pinnedIds, id]);
      return { pinnedIds: newPinned, visibleIds: new Set([...newPinned, ...state.tempIds]) };
    }),
});
