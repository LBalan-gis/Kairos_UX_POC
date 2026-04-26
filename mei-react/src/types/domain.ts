export type SeverityState = 'normal' | 'warning' | 'critical' | 'failure';
export type EntityState = SeverityState | 'simulation' | 'external';
export type ZoneId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type MetricValue = string | number;

export interface EntityMetadata {
  description?: string;
  detail?: string;
  confidence?: string;
  pathType?: 'risk' | 'recovery';
  [key: string]: string | number | boolean | undefined;
}

export interface Entity {
  id: string;
  type: string;
  label: string;
  state: EntityState;
  chart: string | null;
  rankHint?: number;
  projectionRole?: string;
  root_cause_probability: number | null;
  metadata?: EntityMetadata;
  metrics?: Record<string, MetricValue>;
  insight?: string;
  action?: string;
}

export interface RelationConsequence {
  label: string;
  sentiment: 'negative' | 'positive';
}

export interface Relation {
  id: string;
  from: string;
  to: string;
  type: string;
  consequence?: RelationConsequence;
}

export interface WalkthroughStep {
  id: string;
  role: string;
  note: string;
}
