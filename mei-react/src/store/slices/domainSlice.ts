import { predict } from '../../engine/predict';
import type { TenantConfig } from '../../types/config';
import type { AppStateCreator } from './types';
import { buildEntityMap } from '../helpers';
import { initialState } from '../initialState';

export const createDomainSlice: AppStateCreator = (set) => ({
  setView: (view) => set({ view }),
  initEngine: (config: TenantConfig) => {
    const scenarios = config.scenarios ?? [];
    const predictions = predict(
      config.physics ?? {},
      config.propagation ?? {},
      config.relations ?? [],
      scenarios,
      config.entities ?? []
    );
    const activeScenario = scenarios[0]?.id ?? 'unchanged';
    set({
      entities: config.entities ?? [],
      relations: config.relations ?? [],
      entityMap: buildEntityMap(config.entities ?? []),
      entityPhysics: config.physics ?? {},
      relationPropagation: config.propagation ?? {},
      simulation: {
        scenarios,
        predictions,
        simulatedTime: null,
        activeScenario,
      },
      plant: {
        ...initialState.plant,
        liveIds: config.liveIds ?? [],
        reportBindings: config.plantReportBindings,
      },
      zoneMap: config.zoneMap ?? {},
      zoneLabels: config.zoneLabels ?? initialState.zoneLabels,
      floorConfig: config.floor ?? null,
      graphConfig: config.graph,
      pinnedIds: new Set(config.pinnedIds ?? []),
      visibleIds: new Set(config.pinnedIds ?? []),
    });
  },
});
