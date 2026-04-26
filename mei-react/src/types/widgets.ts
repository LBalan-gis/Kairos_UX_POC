import type React from 'react';

export type WidgetType =
  | 'gauge'
  | 'chart'
  | 'table'
  | 'stat'
  | 'action'
  | 'control'
  | 'layout';

export type WidgetAnchor = 'top' | 'bottom';

export interface SpatialBinding {
  entityId: string;
  anchor?: WidgetAnchor;
}

export interface WidgetPayload {
  type: WidgetType | string;
  confidence?: number;
  props?: Record<string, unknown>;
  children?: WidgetPayload[];
  spatialBinding?: SpatialBinding;
}

export interface SpatialWidgetEntry {
  id: string;
  payload: WidgetPayload;
}

export interface FloorWidgetAnchor {
  id: string;
  entityId?: string;
  x: number;
  z: number;
  h: number;
}

// ── Widget system types ───────────────────────────────────────────────────────

export type ConfidenceStatus = 'ok' | 'amber' | 'blocked';
export type TagCheckResult   = 'ok' | 'amber' | 'skip';

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export interface WidgetRegistryEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.LazyExoticComponent<React.ComponentType<any>> | null;
  confidenceThreshold: number;
  requiresAuth: boolean;
  description: string;
}

export type GateResult =
  | { outcome: 'blocked'; error?: string; confidence?: number; type?: string }
  | { outcome: 'render'; confidenceStatus: ConfidenceStatus; namespaceAmber: boolean; entry: WidgetRegistryEntry };

export type LiveDataProvider = (tag: string) => unknown;
