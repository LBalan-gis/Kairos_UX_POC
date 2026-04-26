import type { Entity } from './domain';
import type { ChartKey } from './charts';

export interface KairosAction {
  label: string;
  cmd: string;
}

export interface KairosMetric {
  label: string;
  value: string;
  sub?: string;
  severity?: string;
  bar?: boolean;
}

export interface KairosBreakdownItem {
  label: string;
  value: string;
  detail: string;
  delta: string | null;
  severity: string;
}

export interface KairosReportRow {
  tag: string;
  name: string;
  current: string;
  target: string;
  status: string;
}

export interface KairosReportSection {
  label: string;
  text: string;
}

export interface KairosReport {
  type: string;
  pill: string;
  title: string;
  chartKey?: ChartKey;
  meta: string[];
  sections: KairosReportSection[];
  table: KairosReportRow[];
}

export interface KairosMessageData {
  text?: string;
  actions?: KairosAction[];
  chartKey?: ChartKey;
  otifAlert?: boolean;
  aegisTarget?: string;
  aegisField?: string;
  aegisValidSensors?: string;
  cfrPending?: boolean;
  breakdown?: KairosBreakdownItem[];
  metrics?: KairosMetric[];
  widget?: unknown;
  report?: KairosReport;
  tracePanel?: boolean;
  [key: string]: unknown;
}

export interface KairosMessage extends KairosMessageData {
  id: number;
  role: string;
  ts: string;
  sig: string;
  urgent: boolean;
}

export interface KairosLogEntry {
  id: string;
  ts: string;
  type: string;
  text: string;
}

export interface FocusResponse {
  text: string;
  chartKey?: ChartKey;
  actions: KairosAction[];
  metrics?: KairosMetric[];
}

export interface KnowledgeResponse {
  response: string;
  focusIds?: string[];
  chartKey?: ChartKey;
  otifAlert?: boolean;
  actions?: KairosAction[];
}

export type WidgetPresetMap = Record<string, { type: string; confidence: number; props: Record<string, unknown> }>;

export type EntityMap = Record<string, Entity>;
