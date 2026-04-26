import type { Entity, Relation, ZoneId } from '../../types/domain';
import type { Position } from '../../types/store';
import type { GraphContentConfig } from '../../types/config';
import type { SimulationContext } from '../../domain/simulation/model';
import type { EntityPhysicsMap } from '../../types/simulation';
import { buildProjectionRelations } from '../../engine/relations';
import { selectLatestPredictionStep } from '../../domain/simulation/selectors';
import { getSeverityTone, getStateBadgeTone, getZoneColor } from './graphTheme';

export type ContributorVM = {
  id: string;
  label: string;
  severity: 'High' | 'Medium' | 'Normal';
  severityTone: string;
  zoneColor: string;
};

export type StateBadgeVM = {
  label: string;
  background: string;
  text: string;
  border: string;
};

export type MetricVM = {
  key: string;
  value: string;
  negative: boolean;
  tone: 'default' | 'negative';
};

export type DetailPanelVM = {
  zoneColor: string;
  description: string | null;
  confidence: number | null;
  stateBadge: StateBadgeVM | null;
  metrics: MetricVM[];
  contributors: ContributorVM[];
  whyItMatters: string;
};

export type GraphBoardVM = {
  simulatedTime: number | null;
  isSimulating: boolean;
  effectiveEntities: Entity[];
  boardEntities: Entity[];
  entityStateMap: Record<string, Entity['state']> | null;
  hiddenCount: number;
  positions: Record<string, Position>;
  projectionRelations: Relation[];
  focusedEntity: Entity | null;
};

function formatGraphSensorMetric(value: number, targetValue: number, unit: string, decimals = 1) {
  return {
    actual: `${value.toFixed(decimals)} ${unit}`,
    delta: `${value - targetValue > 0 ? '+' : ''}${(value - targetValue).toFixed(decimals)} ${unit}`,
  };
}

function formatGraphUnitsMissed(value: number, unitLabel: string, negativePrefix = '−') {
  return `${negativePrefix}${value.toLocaleString('en-US').replace(/,/g, ' ')} ${unitLabel}`;
}

function formatGraphFinancialLoss({
  value,
  currencySymbol = '£',
  divisor = 1000,
  rounding = 'round',
  suffix = 'K loss',
}: {
  value: number;
  currencySymbol?: string;
  divisor?: number;
  rounding?: 'round' | 'ceil';
  suffix?: string;
}) {
  const scaled = divisor === 0 ? value : value / divisor;
  const rounded = rounding === 'ceil' ? Math.ceil(scaled) : Math.round(scaled);
  return `${currencySymbol}${Math.max(1, rounded)}${suffix}`;
}

export function buildGraphDetailPanelVM({
  entity,
  relations,
  entities,
  zoneMap,
  graphConfig,
  dark,
}: {
  entity: Entity;
  relations: Relation[];
  entities: Entity[];
  zoneMap: Record<string, ZoneId>;
  graphConfig: GraphContentConfig | null;
  dark: boolean;
}): DetailPanelVM {
  const zoneColor = getZoneColor(zoneMap?.[entity.id], dark);
  const contributors = relations
    .filter((relation) => relation.to === entity.id)
    .map((relation) => entities.find((candidate) => candidate.id === relation.from))
    .filter((candidate): candidate is Entity => Boolean(candidate))
    .slice(0, 4)
    .map((contributor) => ({
      id: contributor.id,
      label: contributor.label,
      zoneColor: getZoneColor(zoneMap?.[contributor.id], dark),
      severity: contributor.state === 'critical' ? 'High' : contributor.state === 'warning' ? 'Medium' : 'Normal',
      severityTone: getSeverityTone(contributor.state === 'critical' ? 'High' : contributor.state === 'warning' ? 'Medium' : 'Normal'),
    }));

  const metrics = Object.entries(entity.metrics || {}).map(([key, rawValue]) => {
    const value = String(rawValue);
    const negative = value.startsWith('−') || value.startsWith('-');
    return {
      key,
      value,
      negative,
      tone: negative ? 'negative' : 'default',
    };
  });

  const badgeTone = getStateBadgeTone(entity.state);
  const stateBadge = badgeTone
    ? {
        label: entity.state?.toUpperCase() ?? '',
        background: badgeTone.background,
        text: badgeTone.text,
        border: badgeTone.border,
      }
    : null;

  const whyItMatters = graphConfig?.detailNarratives[entity.id]
    ?? entity.metadata?.description
    ?? graphConfig?.defaultWhyItMatters
    ?? 'This node is part of the active causal chain impacting batch OEE and output targets.';

  return {
    zoneColor,
    description: entity.metadata?.description ?? null,
    confidence: entity.root_cause_probability,
    stateBadge,
    metrics,
    contributors,
    whyItMatters,
  };
}

export function buildGraphBoardVM({
  entities,
  relations,
  visibleIds,
  storedPos,
  layoutPos,
  focusId,
  simulation,
  graphConfig,
  entityPhysics,
}: {
  entities: Entity[];
  relations: Relation[];
  visibleIds: Set<string>;
  storedPos: Record<string, Position>;
  layoutPos: Record<string, Position>;
  focusId: string | null;
  simulation: SimulationContext;
  graphConfig: GraphContentConfig | null;
  entityPhysics: EntityPhysicsMap;
}): GraphBoardVM {
  const simulatedTime = simulation.simulatedTime;
  const isSimulating = simulatedTime !== null && simulatedTime > 0;

  let effectiveEntities = entities;
  if (isSimulating) {
    const step = selectLatestPredictionStep(simulation);
    if (step) {
      effectiveEntities = entities.map((entity) => {
        const nextState = step.entityStates?.[entity.id];
        const patch: Partial<Entity> = {};
        const sensorMetricBinding = graphConfig?.simulationBindings?.sensorMetric;
        const unitsMissedMetricBinding = graphConfig?.simulationBindings?.unitsMissedMetric;
        const financialLossMetricBinding = graphConfig?.simulationBindings?.financialLossMetric;

        if (nextState) patch.state = nextState;

        if (
          sensorMetricBinding &&
          entity.id === sensorMetricBinding.entityId &&
          step.sensorValues?.[sensorMetricBinding.entityId] !== undefined
        ) {
          const value = step.sensorValues[sensorMetricBinding.entityId];
          const formatted = formatGraphSensorMetric(
            value,
            sensorMetricBinding.targetValue,
            sensorMetricBinding.unit,
            sensorMetricBinding.decimals
          );
          patch.metrics = {
            ...entity.metrics,
            [sensorMetricBinding.metricKey]: formatted.actual,
            [sensorMetricBinding.deltaKey]: formatted.delta,
          };
        }

        if (nextState) {
          const physicsDef = entityPhysics[entity.id];
          if (physicsDef?.uiMapper) {
            const mappedMetrics = physicsDef.uiMapper(nextState, physicsDef, (id) => entityPhysics[id]);
            patch.metrics = { ...entity.metrics, ...mappedMetrics };
          }
        }

        if (
          unitsMissedMetricBinding &&
          entity.id === unitsMissedMetricBinding.entityId &&
          step.unitsMissed !== undefined
        ) {
          patch.metrics = {
            ...entity.metrics,
            [unitsMissedMetricBinding.metricKey]: formatGraphUnitsMissed(
              step.unitsMissed,
              unitsMissedMetricBinding.unitLabel,
              unitsMissedMetricBinding.negativePrefix
            ),
          };
        }

        if (
          financialLossMetricBinding &&
          entity.id === financialLossMetricBinding.entityId &&
          step.financialLossGBP !== undefined
        ) {
          const lossStr = formatGraphFinancialLoss({
            value: step.financialLossGBP,
            currencySymbol: financialLossMetricBinding.currencySymbol,
            divisor: financialLossMetricBinding.divisor,
            rounding: financialLossMetricBinding.rounding,
            suffix: financialLossMetricBinding.suffix,
          });
          patch.metrics = simulation.activeScenarioId === 'corrected'
            ? { ...entity.metrics, [financialLossMetricBinding.recoveryMetricKey]: lossStr }
            : { ...entity.metrics, [financialLossMetricBinding.riskMetricKey]: lossStr };
        }

        return Object.keys(patch).length > 0 ? { ...entity, ...patch } : entity;
      });
    }
  }

  const boardEntities = effectiveEntities.filter((entity) => visibleIds.has(entity.id));
  const entityStateMap = isSimulating
    ? Object.fromEntries(effectiveEntities.map((entity) => [entity.id, entity.state]))
    : null;

  return {
    simulatedTime,
    isSimulating,
    effectiveEntities,
    boardEntities,
    entityStateMap,
    hiddenCount: entities.length - visibleIds.size,
    positions: { ...layoutPos, ...storedPos },
    projectionRelations: buildProjectionRelations(entities, relations).filter(
      (relation) => visibleIds.has(relation.from) && visibleIds.has(relation.to)
    ),
    focusedEntity: focusId ? effectiveEntities.find((entity) => entity.id === focusId) ?? null : null,
  };
}
