import type { Relation, WalkthroughStep, ZoneId, Entity } from './domain';
import type { EntityPhysicsMap, PhysicsEntity, RelationPropagationMap, Scenario } from './simulation';
import type { FloorConfig } from './floor';

export type PlantReportPhysicsField =
  keyof Pick<
    PhysicsEntity,
    | 'currentValue'
    | 'currentRate'
    | 'currentLoss'
    | 'currentGap'
    | 'queueCurrent'
    | 'currentUnits'
    | 'targetUnits'
    | 'currentOee'
  >;

export interface PlantReportMetricBinding {
  entityId: string;
  source: 'physics';
  field: PlantReportPhysicsField;
  fallback: number;
}

export interface PlantReportBindings {
  oee: PlantReportMetricBinding;
  speed: PlantReportMetricBinding;
  tension: PlantReportMetricBinding;
}

export interface GraphContentConfig {
  defaultFocusId: string;
  headerDescription: string;
  defaultWhyItMatters: string;
  detailNarratives: Record<string, string>;
  nodeClasses?: Record<string, string[]>;
  typeClasses?: Partial<Record<Entity['type'], string>>;
  simulationBindings?: {
    sensorMetric?: {
      entityId: string;
      metricKey: string;
      deltaKey: string;
      targetValue: number;
      unit: string;
      decimals?: number;
    };
    unitsMissedMetric?: {
      entityId: string;
      metricKey: string;
      unitLabel: string;
      negativePrefix?: string;
    };
    financialLossMetric?: {
      entityId: string;
      riskMetricKey: string;
      recoveryMetricKey: string;
      currencySymbol?: string;
      divisor?: number;
      rounding?: 'round' | 'ceil';
      suffix?: string;
    };
  };
}

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
  plantReportBindings: PlantReportBindings;
  graph: GraphContentConfig;
  walkthrough: WalkthroughStep[];
  floor?: FloorConfig;
}
