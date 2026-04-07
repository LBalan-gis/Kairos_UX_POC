// ── Prediction scenarios ──────────────────────────────────────────────────────
// Each scenario defines a set of interventions applied at specific times.
// The prediction engine runs each scenario forward from NOW and returns
// a timeline of entity states + batch metrics.
//
// interventions:
//   at          — minutes from NOW when the intervention fires
//   entityId    — which entity is affected
//   action      — 'set_drift_rate' | 'set_value'
//   value       — new drift rate (N/min) or absolute value
//   resolvedAt  — minutes after `at` when the entity reaches its target
//                 (computed automatically if omitted: targetValue - currentValue / |value|)

export const SCENARIOS = [
  {
    id: 'unchanged',
    label: 'If unchanged',
    description: 'No intervention — fault chain continues to propagate',
    color: '#CC3030',
    interventions: [],
    confidence: 0.87,
  },
  {
    id: 'corrected',
    label: 'Tension roller adjusted',
    description: 'Adjust FT-1101 tension roller to 42 N · clear CTN-1101 queue',
    color: '#22AA44',
    interventions: [
      {
        at: 0,                      // apply immediately
        entityId: 'film_tension',
        action: 'set_drift_rate',
        value: 2.5,                 // N/min recovery (positive = improving)
        // resolvedAt computed by engine: (42 - 34) / 2.5 = 3.2 min
      },
    ],
    confidence: 0.94,
  },
];
