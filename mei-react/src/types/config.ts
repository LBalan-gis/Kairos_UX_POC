import type { Relation, WalkthroughStep, ZoneId, Entity } from './domain';
import type { EntityPhysicsMap, RelationPropagationMap, Scenario } from './simulation';
import type { FloorConfig } from './floor';

export interface TenantConfig {
  tenantId: string;
  siteName: string;
  entities: Entity[];
  relations: Relation[];
  physics: EntityPhysicsMap;
  propagation: RelationPropagationMap;
  scenarios: Scenario[];
  zoneMap: Record<string, ZoneId>;
  zoneLabels: Record<ZoneId, string>;
  pinnedIds: string[];
  liveIds: string[];
  walkthrough: WalkthroughStep[];
  floor?: FloorConfig;
}
