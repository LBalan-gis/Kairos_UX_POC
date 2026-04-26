import { ENTITIES, RELATIONS } from './entities';
import { ENTITY_PHYSICS, RELATION_PROPAGATION } from './physics';
import { SCENARIOS } from './scenarios';
import { ZONE_MAP, ZONE_LABELS, LIVE_IDS, WALKTHROUGH } from './zoneMap';
import { FLOOR_CONFIG } from './floor';
import type { TenantConfig } from '../../types/config';

export const FactoryConfig: TenantConfig = {
  tenantId: 'factory',
  siteName: 'PKG-1 · Line 1',
  entities: ENTITIES,
  relations: RELATIONS,
  physics: ENTITY_PHYSICS,
  propagation: RELATION_PROPAGATION,
  scenarios: SCENARIOS,
  zoneMap: ZONE_MAP,
  zoneLabels: ZONE_LABELS,
  floor: FLOOR_CONFIG,
  pinnedIds: [
    'film_tension',
    'blister_machine',
    'hidden_loss',
    'planned_vs_actual',
    'reject_count',
    'batch_current',
    'sim_unchanged',
    'sim_corrected',
    'impact_yield',
  ],
  liveIds: LIVE_IDS,
  walkthrough: WALKTHROUGH,
};
