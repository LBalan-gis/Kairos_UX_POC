import { predict } from '../../engine/predict';
import type { TenantConfig } from '../../types/config';
import type { AppStateCreator } from './types';
import { buildEntityMap } from '../helpers';
import { initialState } from '../initialState';

export const createDomainSlice: AppStateCreator = (set) => ({
  setView: (view) => set({ view }),
  initEngine: (config: TenantConfig) => {
    set({
      entities: config.entities ?? [],
      relations: config.relations ?? [],
      entityMap: buildEntityMap(config.entities ?? []),
      entityPhysics: config.physics ?? {},
      relationPropagation: config.propagation ?? {},
      scenarios: config.scenarios ?? [],
      predictions: predict(
        config.physics ?? {},
        config.propagation ?? {},
        config.relations ?? [],
        config.scenarios ?? [],
        config.entities ?? []
      ),
      zoneMap: config.zoneMap ?? {},
      zoneLabels: config.zoneLabels ?? initialState.zoneLabels,
      liveIds: config.liveIds ?? [],
      floorConfig: config.floor ?? null,
      pinnedIds: new Set(config.pinnedIds ?? []),
      visibleIds: new Set(config.pinnedIds ?? []),
      activeScenario: config.scenarios?.[0]?.id ?? 'unchanged',
    });
  },
});
