import type { Entity, Relation } from '../types/domain';
import type {
  EntityPhysicsMap,
  PhysicsEntity,
  PredictionResult,
  PredictionStep,
  RelationPropagationMap,
  Scenario,
} from '../types/simulation';

const STATE_RANK = { normal: 0, warning: 1, critical: 2, failure: 3 } as const;
const RANK_STATE = ['normal', 'warning', 'critical', 'failure'] as const;

type SeverityState = keyof typeof STATE_RANK;
type TimelineMinute = Omit<PredictionStep, 't' | 'entityStates'> & {
  states: Record<string, SeverityState>;
};

function worstOf(a: SeverityState, b: SeverityState): SeverityState {
  return STATE_RANK[a] >= STATE_RANK[b] ? a : b;
}

function applyDamping(state: SeverityState, factor: number): SeverityState {
  const rank = STATE_RANK[state] ?? 0;
  const dampedRank = Math.max(0, Math.round(rank * factor));
  return RANK_STATE[dampedRank] ?? 'normal';
}

function sensorValueAt(
  physics: PhysicsEntity,
  t: number,
  interventions: Scenario['interventions']
): number {
  const driftRate = physics.driftRate ?? 0;

  for (const intervention of interventions) {
    if (t >= intervention.at) {
      const resolvedAt = intervention.resolvedAt
        ?? Math.abs(((physics.targetValue ?? 0) - (physics.currentValue ?? 0)) / intervention.value);
      const elapsed = t - intervention.at;

      if (elapsed >= resolvedAt) return physics.targetValue ?? physics.currentValue ?? 0;

      const atIntervention = (physics.currentValue ?? 0) + driftRate * intervention.at;
      const raw = atIntervention + intervention.value * elapsed;

      return intervention.value > 0
        ? Math.min(raw, physics.targetValue ?? raw)
        : Math.max(raw, physics.targetValue ?? raw);
    }
  }

  return (physics.currentValue ?? 0) + driftRate * t;
}

function stateFromThresholds(
  value: number,
  thresholds: NonNullable<PhysicsEntity['thresholds']>,
  degradeDirection: PhysicsEntity['degradeDirection']
): SeverityState {
  const sorted = [...thresholds].sort((a, b) => STATE_RANK[b.severity] - STATE_RANK[a.severity]);

  for (const threshold of sorted) {
    const breached = degradeDirection === 'down'
      ? value <= threshold.value
      : value >= threshold.value;
    if (breached) return threshold.severity;
  }
  return 'normal';
}

function computeMinute(
  t: number,
  entityPhysics: EntityPhysicsMap,
  relationPropagation: RelationPropagationMap,
  relations: Relation[],
  interventions: Scenario['interventions'],
  timeline: Record<number, TimelineMinute>,
  rankHints: Record<string, number>
): TimelineMinute {
  const sensorValues: Record<string, number> = {};
  const states: Record<string, SeverityState> = {};

  for (const [id, physics] of Object.entries(entityPhysics)) {
    if (physics.type !== 'sensor') continue;

    const matchingInterventions = interventions.filter((intervention) => intervention.entityId === id);
    const value = sensorValueAt(physics, t, matchingInterventions);

    sensorValues[id] = value;
    states[id] = stateFromThresholds(
      value,
      physics.thresholds ?? [],
      physics.degradeDirection ?? 'up'
    );
  }

  const nonSensors = Object.entries(entityPhysics)
    .filter(([, physics]) => physics.type !== 'sensor')
    .sort(([a], [b]) => (rankHints[a] ?? 99) - (rankHints[b] ?? 99));

  for (const [id] of nonSensors) {
    const incomingRelations = relations.filter((relation) => relation.to === id);

    if (incomingRelations.length === 0) {
      states[id] = 'normal';
      continue;
    }

    let worstState: SeverityState = 'normal';

    for (const relation of incomingRelations) {
      const propagation = relationPropagation[relation.id] ?? { delayMin: 0, dampingFactor: 1, type: 'immediate' };
      const lookbackT = Math.max(0, t - propagation.delayMin);
      const upstreamState = lookbackT < t
        ? (timeline[lookbackT]?.states[relation.from] ?? 'normal')
        : (states[relation.from] ?? 'normal');

      const propagated = applyDamping(upstreamState, propagation.dampingFactor ?? 1);
      worstState = worstOf(worstState, propagated);
    }

    states[id] = worstState;
  }

  const blisterState = states.blister_machine ?? 'normal';
  const gapPhysics = entityPhysics.planned_vs_actual;
  const batchPhysics = entityPhysics.batch_current;
  const gapRate = gapPhysics?.gapRateByState?.[blisterState] ?? 0;
  const batchGap = (gapPhysics?.currentGap ?? 0) + gapRate * t;
  const unitsMissed = Math.round(batchGap);
  const financialLossGBP = +(batchGap * (batchPhysics?.unitValueGBP ?? 0)).toFixed(0);

  return { states, sensorValues, batchGap, unitsMissed, financialLossGBP };
}

function predictScenario(
  entityPhysics: EntityPhysicsMap,
  relationPropagation: RelationPropagationMap,
  relations: Relation[],
  scenario: Scenario,
  horizonMin: number,
  stepMin: number,
  rankHints: Record<string, number>
): PredictionResult {
  const timeline: Record<number, TimelineMinute> = {};
  for (let t = 0; t <= horizonMin; t++) {
    timeline[t] = computeMinute(
      t,
      entityPhysics,
      relationPropagation,
      relations,
      scenario.interventions,
      timeline,
      rankHints
    );
  }

  const steps: PredictionStep[] = [];
  for (let t = 0; t <= horizonMin; t += stepMin) {
    const snapshot = timeline[t];
    steps.push({
      t,
      entityStates: snapshot.states,
      sensorValues: snapshot.sensorValues,
      batchGap: snapshot.batchGap,
      unitsMissed: snapshot.unitsMissed,
      financialLossGBP: snapshot.financialLossGBP,
    });
  }

  const last = steps[steps.length - 1];

  return {
    scenarioId: scenario.id,
    label: scenario.label,
    description: scenario.description,
    color: scenario.color,
    confidence: scenario.confidence,
    steps,
    outcome: {
      unitsMissed: last.unitsMissed,
      financialLossGBP: last.financialLossGBP,
      batchAtRisk: last.batchGap > (entityPhysics.batch_current?.targetUnits ?? Infinity) * 0.1,
    },
  };
}

export function predict(
  entityPhysics: EntityPhysicsMap,
  relationPropagation: RelationPropagationMap,
  relations: Relation[],
  scenarios: Scenario[],
  entities: Entity[] = [],
  horizonMin = 30,
  stepMin = 5
): PredictionResult[] {
  const rankHints = Object.fromEntries(entities.map((entity) => [entity.id, entity.rankHint ?? 99]));
  return scenarios.map((scenario) =>
    predictScenario(entityPhysics, relationPropagation, relations, scenario, horizonMin, stepMin, rankHints)
  );
}
