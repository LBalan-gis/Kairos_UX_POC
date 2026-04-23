// ── Widget Registry ────────────────────────────────────────────────────────────
// Single source of truth for all generative UI widget types.
//
// Each `component` uses React.lazy() pointing at its own file under types/.
// This forces Vite to emit a separate JS chunk per widget type, enabling:
//   1. On-demand loading — Chart.js (~200 kB) only loads when a chart widget
//      is actually rendered, not on app boot.
//   2. Widget Store hot-loading — future third-party widgets can be fetched
//      as remote chunk URLs and registered here at runtime without a redeploy.
//   3. Per-widget cache invalidation — updating one widget type doesn't bust
//      the cache for the others.
//
// To register a new widget:
//   1. Create src/widgets/types/MyWidget.jsx with a named export
//   2. Add an entry below — the lazy() call is the only wiring needed
//   3. The AEGIS manifest auto-generates from this file at inference time

import { lazy } from 'react';

export const WIDGET_REGISTRY = {
  gauge: {
    component:           lazy(() => import('./types/Gauge.jsx').then(m => ({ default: m.WidgetGauge }))),
    confidenceThreshold: 0.75,
    requiresAuth:        false,
    description:         'Radial or linear KPI gauge for a single numeric reading. Props: value, max, unit, label, variant (radial|linear), warnAt, critAt, live.',
  },
  chart: {
    component:           lazy(() => import('./types/Chart.jsx').then(m => ({ default: m.WidgetChart }))),
    confidenceThreshold: 0.75,
    requiresAuth:        false,
    description:         'Chart.js-powered chart. Props: chartType (line|bar|doughnut|radar|scatter|area), datasets [{label,data,color,fill}], labels, height, xLabel, yLabel.',
  },
  stat: {
    component:           lazy(() => import('./types/Stat.jsx').then(m => ({ default: m.WidgetStat }))),
    confidenceThreshold: 0.72,
    requiresAuth:        false,
    description:         'Single KPI stat with large numeric value, optional delta and target. Props: label, value, unit, delta, deltaLabel, target, targetLabel, tag.',
  },
  table: {
    component:           lazy(() => import('./types/Table.jsx').then(m => ({ default: m.WidgetTable }))),
    confidenceThreshold: 0.75,
    requiresAuth:        false,
    description:         'Structured table with optional status LED column. Props: title, columns (string[]), rows (object[]), statusCol.',
  },
  action: {
    component:           lazy(() => import('./types/Action.jsx').then(m => ({ default: m.WidgetAction }))),
    confidenceThreshold: 0.95,    // hard block below threshold — never amber
    requiresAuth:        true,    // always triggers CFR Part 11 gate before onAction fires
    description:         'Authorized execution command targeting a physical asset. Props: label, action, machineId, risk (low|medium|high).',
  },
  control: {
    component:           lazy(() => import('./types/Control.jsx').then(m => ({ default: m.WidgetControl }))),
    confidenceThreshold: 0.78,
    requiresAuth:        false,
    description:         'Interactive form control. Props: controlType (switch|checkbox|radio|select|slider|number|text|textarea|calendar|clock|button|label|badge), label, value, options[], min, max, step, unit, placeholder, rows, sub, variant, action, machineId, risk, disabled.',
  },
  layout: {
    component:           null,   // pure container — WidgetRenderer renders children directly
    confidenceThreshold: 0.70,
    requiresAuth:        false,
    description:         'Composable container. Renders any mix of child widgets. Props: title (optional), direction (row|column, default column). Children are any valid widget payloads.',
  },
};

// Returns a lightweight manifest for AEGIS context injection.
// Injected into the LLM system prompt at inference time to prevent hallucination.
export function buildAegisManifest(liveTagIds = []) {
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
