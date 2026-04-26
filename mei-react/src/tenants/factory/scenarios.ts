import type { Scenario } from '../../types/simulation';

export const SCENARIOS: Scenario[] = [
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
        at: 0,
        entityId: 'film_tension',
        action: 'set_drift_rate',
        value: 2.5,
      },
    ],
    confidence: 0.94,
  },
];
