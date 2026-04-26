import type { SeverityState } from '../../types/domain';

export type InterventionAction = 'set_drift_rate' | 'set_value';
export type PhysicsEntityType =
  | 'sensor'
  | 'asset'
  | 'derived'
  | 'quality'
  | 'accumulator'
  | 'gap'
  | 'queue'
  | 'batch';
export type PropagationType = 'immediate' | 'gradual';
export type SimulationMode = 'live' | 'history' | 'scenario';

export interface ScenarioIntervention {
  at: number;
  entityId: string;
  action: InterventionAction;
  value: number;
  resolvedAt?: number;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  color: string;
  interventions: ScenarioIntervention[];
  confidence: number;
}

export interface Threshold {
  value: number;
  severity: SeverityState;
}

export type PhysicsUiMapper = (
  state: SeverityState,
  physics: PhysicsEntity,
  getSibling: (id: string) => PhysicsEntity | undefined
) => Record<string, string | number>;

export interface PhysicsEntity {
  type: PhysicsEntityType;
  unit?: string;
  currentValue?: number;
  targetValue?: number;
  driftRate?: number;
  degradeDirection?: 'up' | 'down';
  thresholds?: Threshold[];
  recoveryRate?: number;
  setpoint?: number;
  stateMultipliers?: Partial<Record<SeverityState, number>>;
  limitRate?: number;
  currentRate?: number;
  rateByMachineState?: Partial<Record<SeverityState, number>>;
  currentLoss?: number;
  rateByState?: Partial<Record<SeverityState, number>>;
  currentGap?: number;
  gapRateByState?: Partial<Record<SeverityState, number>>;
  queueCurrent?: number;
  unitValueGBP?: number;
  targetUnits?: number;
  currentUnits?: number;
  currentOee?: number;
  uiMapper?: PhysicsUiMapper;
}

export type EntityPhysicsMap = Record<string, PhysicsEntity>;

export interface RelationPropagation {
  delayMin: number;
  type: PropagationType;
  dampingFactor: number;
}

export type RelationPropagationMap = Record<string, RelationPropagation>;

export interface PredictionStep {
  t: number;
  entityStates: Record<string, SeverityState>;
  sensorValues: Record<string, number>;
  batchGap: number;
  unitsMissed: number;
  financialLossGBP: number;
}

export interface PredictionOutcome {
  unitsMissed: number;
  financialLossGBP: number;
  batchAtRisk: boolean;
}

export interface PredictionResult {
  scenarioId: string;
  label: string;
  description: string;
  color: string;
  confidence: number;
  steps: PredictionStep[];
  outcome: PredictionOutcome;
}

export interface SimulationContext {
  scenarios: Scenario[];
  predictions: PredictionResult[];
  activeScenarioId: string;
  simulatedTime: number | null;
}

export interface SimulationScenarioOption {
  id: string;
  label: string;
  confidence: number;
  color: string;
  isRiskPath: boolean;
  isActive: boolean;
}

export interface SimulationTimelineProjection {
  mode: SimulationMode;
  simulatedTime: number | null;
  activeScenarioId: string;
  scenarios: SimulationScenarioOption[];
  activePrediction: PredictionResult | null;
}
