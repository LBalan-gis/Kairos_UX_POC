import { buildEntityMap } from '../helpers';
import type { AppStateCreator } from './types';

export const createSimulationSlice: AppStateCreator = (set) => ({
  setSimulatedTime: (simulatedTime) => set((store) => ({
    simulation: { ...store.simulation, simulatedTime },
  })),
  setActiveScenario: (activeScenario) => set((store) => ({
    simulation: { ...store.simulation, activeScenario },
  })),
  setPredictions: (predictions) => set((store) => ({
    simulation: { ...store.simulation, predictions },
  })),
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
        plant: {
          ...store.plant,
          signalTimestamps: { ...store.plant.signalTimestamps, [entityId]: Date.now() },
        },
      };
    }),
});
