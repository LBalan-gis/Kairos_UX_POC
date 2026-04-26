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
  plantReportBindings: {
    oee: { entityId: 'batch_current', source: 'physics', field: 'currentOee', fallback: 78.4 },
    speed: { entityId: 'blister_machine', source: 'physics', field: 'currentValue', fallback: 218 },
    tension: { entityId: 'film_tension', source: 'physics', field: 'currentValue', fallback: 34 },
  },
  graph: {
    defaultFocusId: 'film_tension',
    headerDescription: 'CT-1101 micro-stops are causing hidden loss that is impacting OEE and batch risk.',
    defaultWhyItMatters: 'This node is part of the active causal chain impacting batch OEE and output targets.',
    typeClasses: {
      GoldenBatch: 'anchor-card',
      SimulationScenario: 'simulation-card',
      ExternalSystem: 'system-card',
    },
    nodeClasses: {
      batch_golden: ['reference-node'],
      batch_current: ['anchor-card', 'primary-analytical'],
      hidden_loss: ['primary-analytical'],
      planned_vs_actual: ['primary-analytical'],
      impact_yield: ['primary-analytical'],
    },
    detailNarratives: {
      film_tension:
        'Film tension drift is the confirmed root cause at 97% confidence. Every minute unresolved widens the output gap by 2.3 units.',
      hidden_loss:
        'CT-1101 micro-jams are running below the 2-minute OEE logging threshold — they never appear in standard downtime reports yet drive 23 min of hidden loss.',
      planned_vs_actual:
        'The shift will miss its target by 2,200 units — a £34K shift value impact — unless film tension is corrected within the next 15 minutes.',
    },
    simulationBindings: {
      sensorMetric: {
        entityId: 'film_tension',
        metricKey: 'Actual',
        deltaKey: 'Delta',
        targetValue: 42,
        unit: 'N',
        decimals: 1,
      },
      unitsMissedMetric: {
        entityId: 'planned_vs_actual',
        metricKey: 'Gap',
        unitLabel: 'units',
        negativePrefix: '−',
      },
      financialLossMetric: {
        entityId: 'impact_yield',
        riskMetricKey: 'Unchanged',
        recoveryMetricKey: 'Corrected',
        currencySymbol: '£',
        divisor: 1000,
        rounding: 'round',
        suffix: 'K loss',
      },
    },
  },
  walkthrough: WALKTHROUGH,
};
