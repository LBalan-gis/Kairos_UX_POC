import type { AppStoreState } from '../../types/store';
import type { Entity } from '../../types/domain';
import type { PlantReportMetricBinding } from '../../types/config';
import type { PlantReportMetrics, PlantRuntimeContext } from './model';

export function selectPlantRuntime(state: AppStoreState): PlantRuntimeContext {
  return state.plant;
}

export function selectSignalTimestamp(entityId: string | null, state: AppStoreState) {
  if (!entityId) return 0;
  return state.plant.signalTimestamps[entityId] ?? 0;
}

export function selectPlantIdentity(state: AppStoreState) {
  return {
    entities: state.entities,
    entityMap: state.entityMap,
  };
}

export function selectPlantEntityById(entityId: string | null, state: AppStoreState): Entity | null {
  if (!entityId) return null;
  return state.entityMap[entityId] ?? null;
}

function metricValue(state: AppStoreState, binding: PlantReportMetricBinding) {
  if (binding.source === 'physics') {
    const value = state.entityPhysics[binding.entityId]?.[binding.field];
    return typeof value === 'number' && Number.isFinite(value) ? value : binding.fallback;
  }

  return binding.fallback;
}

export function selectPlantReportMetrics(state: AppStoreState): PlantReportMetrics {
  const bindings = state.plant.reportBindings;
  return {
    oee: metricValue(state, bindings.oee),
    speed: metricValue(state, bindings.speed),
    tension: metricValue(state, bindings.tension),
  };
}
