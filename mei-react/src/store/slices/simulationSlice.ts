import { buildEntityMap } from '../helpers';
import type { AppStateCreator } from './types';

export const createSimulationSlice: AppStateCreator = (set) => ({
  setSimulatedTime: (simulatedTime) => set({ simulatedTime }),
  setActiveScenario: (activeScenario) => set({ activeScenario }),
  setPredictions: (predictions) => set({ predictions }),
  applyLiveReading: (entityId, state, metrics, value) =>
    set((store) => {
      const updatedEntities = store.entities.map((entity) =>
        entity.id === entityId
          ? { ...entity, state, ...(metrics ? { metrics: { ...entity.metrics, ...metrics } } : {}) }
          : entity
      );
      const updatedPhysics = value !== undefined && store.entityPhysics[entityId]
        ? {
            ...store.entityPhysics,
            [entityId]: { ...store.entityPhysics[entityId], currentValue: value },
          }
        : store.entityPhysics;

      return {
        entities: updatedEntities,
        entityMap: buildEntityMap(updatedEntities),
        entityPhysics: updatedPhysics,
        signalTimestamps: { ...store.signalTimestamps, [entityId]: Date.now() },
      };
    }),
});
