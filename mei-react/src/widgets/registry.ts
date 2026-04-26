import { lazy } from 'react';
import type { WidgetRegistryEntry } from '../types/widgets';

export const WIDGET_REGISTRY: Record<string, WidgetRegistryEntry> = {
  gauge: {
    component:           lazy(() => import('./types/Gauge').then(m => ({ default: m.WidgetGauge }))),
    confidenceThreshold: 0.75,
    requiresAuth:        false,
    description:         'Radial or linear KPI gauge for a single numeric reading. Props: value, max, unit, label, variant (radial|linear), warnAt, critAt, live.',
  },
  chart: {
    component:           lazy(() => import('./types/Chart').then(m => ({ default: m.WidgetChart }))),
    confidenceThreshold: 0.75,
    requiresAuth:        false,
    description:         'Chart.js-powered chart. Props: chartType (line|bar|doughnut|radar|scatter|area), datasets [{label,data,color,fill}], labels, height, xLabel, yLabel.',
  },
  stat: {
    component:           lazy(() => import('./types/Stat').then(m => ({ default: m.WidgetStat }))),
    confidenceThreshold: 0.72,
    requiresAuth:        false,
    description:         'Single KPI stat with large numeric value, optional delta and target. Props: label, value, unit, delta, deltaLabel, target, targetLabel, tag.',
  },
  table: {
    component:           lazy(() => import('./types/Table').then(m => ({ default: m.WidgetTable }))),
    confidenceThreshold: 0.75,
    requiresAuth:        false,
    description:         'Structured table with optional status LED column. Props: title, columns (string[]), rows (object[]), statusCol.',
  },
  action: {
    component:           lazy(() => import('./types/Action').then(m => ({ default: m.WidgetAction }))),
    confidenceThreshold: 0.95,
    requiresAuth:        true,
    description:         'Authorized execution command targeting a physical asset. Props: label, action, machineId, risk (low|medium|high).',
  },
  control: {
    component:           lazy(() => import('./types/Control').then(m => ({ default: m.WidgetControl }))),
    confidenceThreshold: 0.78,
    requiresAuth:        false,
    description:         'Interactive form control. Props: controlType (switch|checkbox|radio|select|slider|number|text|textarea|calendar|clock|button|label|badge), label, value, options[], min, max, step, unit, placeholder, rows, sub, variant, action, machineId, risk, disabled.',
  },
  layout: {
    component:           null,
    confidenceThreshold: 0.70,
    requiresAuth:        false,
    description:         'Composable container. Renders any mix of child widgets. Props: title (optional), direction (row|column, default column). Children are any valid widget payloads.',
  },
  schematic: {
    component:           lazy(() => import('./types/Schematic').then(m => ({ default: m.Schematic }))),
    confidenceThreshold: 0.80,
    requiresAuth:        false,
    description:         'Orthogonal causality schematic displaying upstream nodes, a focus node, and downstream impacts. Props: nodes: { upstream, focus, downstream }.',
  },
};

export function buildAegisManifest(liveTagIds: string[] = []) {
  return {
    registeredWidgets: Object.entries(WIDGET_REGISTRY).map(([type, def]) => ({
      type,
      confidenceThreshold: def.confidenceThreshold,
      requiresAuth:        def.requiresAuth,
      description:         def.description,
    })),
    liveTagIds,
    generatedAt: new Date().toISOString(),
  };
}
