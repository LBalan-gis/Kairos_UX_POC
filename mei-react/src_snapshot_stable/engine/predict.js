// ── Prediction engine ─────────────────────────────────────────────────────────
// Pure function — no React, no side effects, fully testable.
//
// Algorithm:
//   1. For each scenario, build a 1-minute resolution state timeline
//      (fine grain needed so propagation delays < 5 min are respected)
//   2. At each minute:
//      a. Compute sensor values via linear extrapolation + intervention override
//      b. Determine sensor states from thresholds
//      c. For each non-sensor entity, look up upstream states at (t − delayMin)
//         from the already-computed timeline, then map through damping
//      d. Compute batch metrics (gap, financial loss)
//   3. Sample the dense timeline at output step intervals (default 5 min)
//   4. Build outcome summary from final step

// ── State ordering ────────────────────────────────────────────────────────────

const STATE_RANK = { normal: 0, warning: 1, critical: 2, failure: 3 };
const RANK_STATE = ['normal', 'warning', 'critical', 'failure'];

function worstOf(a, b) {
  return STATE_RANK[a] >= STATE_RANK[b] ? a : b;
}

// Apply a damping factor to propagated severity.
// >0.7 → full propagation  |  0.5–0.7 → one level down  |  <0.5 → absorbed
function applyDamping(state, factor) {
  const rank = STATE_RANK[state] ?? 0;
  const dampedRank = Math.max(0, Math.round(rank * factor));
  return RANK_STATE[dampedRank] ?? 'normal';
}

// ── Sensor helpers ────────────────────────────────────────────────────────────

function sensorValueAt(physics, t, interventions) {
  const driftRate = physics.driftRate ?? 0;

  for (const iv of interventions) {
    if (t >= iv.at) {
      // Compute how long until target is reached at recovery rate
      const resolvedAt = iv.resolvedAt
        ?? Math.abs((physics.targetValue - physics.currentValue) / iv.value);

      const elapsed = t - iv.at;

      if (elapsed >= resolvedAt) return physics.targetValue;

      // Value up to intervention: currentValue + driftRate * iv.at
      // Value after intervention: + recoveryRate * elapsed
      const atIntervention = physics.currentValue + driftRate * iv.at;
      const raw = atIntervention + iv.value * elapsed;

      // Clamp: don't overshoot target
      return iv.value > 0
        ? Math.min(raw, physics.targetValue)
        : Math.max(raw, physics.targetValue);
    }
  }

  return physics.currentValue + driftRate * t;
}

function stateFromThresholds(value, thresholds, degradeDirection) {
  // Sort thresholds by severity (failure → critical → warning)
  const sorted = [...thresholds].sort((a, b) => STATE_RANK[b.severity] - STATE_RANK[a.severity]);

  for (const threshold of sorted) {
    const breached = degradeDirection === 'down'
      ? value <= threshold.value
      : value >= threshold.value;
    if (breached) return threshold.severity;
  }
  return 'normal';
}

// ── Core: compute one minute ──────────────────────────────────────────────────

function computeMinute(t, entityPhysics, relationPropagation, relations, interventions, timeline, RANK_HINTS) {
  const sensorValues = {};
  const states       = {};

  // ── Pass 1: sensors ───────────────────────────────────────────────────────
  for (const [id, p] of Object.entries(entityPhysics)) {
    if (p.type !== 'sensor') continue;

    const ivs   = interventions.filter(iv => iv.entityId === id);
    const value = sensorValueAt(p, t, ivs);

    sensorValues[id] = value;
    states[id]       = stateFromThresholds(value, p.thresholds, p.degradeDirection);
  }

  // ── Pass 2: non-sensor entities, in causal order ──────────────────────────
  const nonSensors = Object.entries(entityPhysics)
    .filter(([, p]) => p.type !== 'sensor')
    .sort(([a], [b]) => (RANK_HINTS[a] ?? 99) - (RANK_HINTS[b] ?? 99));

  for (const [id] of nonSensors) {
    const incomingRels = relations.filter(r => r.to === id);

    if (incomingRels.length === 0) {
      states[id] = 'normal';
      continue;
    }

    let worstState = 'normal';

    for (const rel of incomingRels) {
      const prop       = relationPropagation[rel.id] ?? { delayMin: 0, dampingFactor: 1 };
      const lookbackT  = Math.max(0, t - prop.delayMin);

      // Upstream state at the lookback time
      const upstreamState = lookbackT < t
        ? (timeline[lookbackT]?.states[rel.from] ?? 'normal')
        : (states[rel.from] ?? 'normal');

      const propagated = applyDamping(upstreamState, prop.dampingFactor ?? 1);
      worstState       = worstOf(worstState, propagated);
    }

    states[id] = worstState;
  }

  // ── Batch metrics ─────────────────────────────────────────────────────────
  const bfState    = states['blister_machine'] ?? 'normal';
  const gapPhysics = entityPhysics['planned_vs_actual'];
  const batchPhysics = entityPhysics['batch_current'];

  const gapRate    = gapPhysics?.gapRateByState?.[bfState] ?? 0;
  const batchGap   = (gapPhysics?.currentGap ?? 0) + gapRate * t;
  const unitsMissed = Math.round(batchGap);
  const financialLossGBP = +(batchGap * (batchPhysics?.unitValueGBP ?? 0)).toFixed(0);

  return { states, sensorValues, batchGap, unitsMissed, financialLossGBP };
}

// ── Scenario runner ───────────────────────────────────────────────────────────

function predictScenario(entityPhysics, relationPropagation, relations, scenario, horizonMin, stepMin, RANK_HINTS) {
  // Build 1-minute resolution timeline
  const timeline = {};
  for (let t = 0; t <= horizonMin; t++) {
    timeline[t] = computeMinute(
      t, entityPhysics, relationPropagation, relations,
      scenario.interventions, timeline, RANK_HINTS
    );
  }

  // Sample at output steps
  const steps = [];
  for (let t = 0; t <= horizonMin; t += stepMin) {
    const snap = timeline[t];
    steps.push({
      t,
      entityStates:     snap.states,
      sensorValues:     snap.sensorValues,
      batchGap:         snap.batchGap,
      unitsMissed:      snap.unitsMissed,
      financialLossGBP: snap.financialLossGBP,
    });
  }

  // Outcome: final step
  const last = steps[steps.length - 1];
  const outcome = {
    unitsMissed:      last.unitsMissed,
    financialLossGBP: last.financialLossGBP,
    batchAtRisk:      last.batchGap > (entityPhysics['batch_current']?.targetUnits ?? Infinity) * 0.1,
  };

  return {
    scenarioId:  scenario.id,
    label:       scenario.label,
    description: scenario.description,
    color:       scenario.color,
    confidence:  scenario.confidence,
    steps,
    outcome,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * predict(entityPhysics, relationPropagation, relations, scenarios, horizonMin, stepMin)
 *
 * Returns an array of scenario results, one per scenario.
 * Each result contains a `steps` array (sampled timeline) and an `outcome` summary.
 */
export function predict(
  entityPhysics,
  relationPropagation,
  relations,
  scenarios,
  entities = [],
  horizonMin = 30,
  stepMin    = 5
) {
  const RANK_HINTS = Object.fromEntries(entities.map(e => [e.id, e.rankHint ?? 99]));
  return scenarios.map(s =>
    predictScenario(entityPhysics, relationPropagation, relations, s, horizonMin, stepMin, RANK_HINTS)
  );
}
