// ── WidgetRenderer ─────────────────────────────────────────────────────────────
// Orchestrator. Three responsibilities, in order:
//
//   1. Gate    — run three-layer validation (WidgetGate)
//   2. Resolve — inject live tag value into props (liveDataProvider)
//   3. Mount   — render shell, strips, leaf component, children (WidgetMount)
//
// Props:
//   payload          — widget JSON (type, confidence, props, children, spatialBinding)
//   liveDataProvider — (tag: string) => number | undefined
//                      Injected by host. Widget components never import a store.
//   liveTagIds       — string[] of registered namespace tags (store.liveIds)
//                      Used by Layer 1.5 to detect hallucinated sensor references.
//                      Pass [] to skip the namespace check (backwards-compatible default).
//   onAction         — called when a widget performs an action (button click, etc.)
//   isChild          — suppress outer border/radius when rendering inside a layout
//   dark             — theme flag

import { gateWidget } from './WidgetGate';
import { BlockedWidget } from './WidgetPrimitives';
import { WidgetMount } from './WidgetMount';
import type { WidgetPayload, LiveDataProvider } from '../../types/widgets';

interface WidgetRendererProps {
  payload: WidgetPayload;
  onAction?: (data: Record<string, unknown>) => void;
  isChild?: boolean;
  liveDataProvider?: LiveDataProvider;
  liveTagIds?: string[];
  dark?: boolean;
}

const noop: LiveDataProvider = () => undefined;

export function WidgetRenderer({
  payload,
  onAction,
  isChild      = false,
  liveDataProvider = noop,
  liveTagIds   = [],
  dark         = true,
}: WidgetRendererProps) {
  // ── 1. Gate ─────────────────────────────────────────────────────────────────
  const gate = gateWidget(payload, liveDataProvider, liveTagIds);

  if (gate.outcome === 'blocked') {
    return (
      <BlockedWidget
        type={payload?.type ?? '?'}
        confidence={gate.confidence ?? 0}
        error={gate.error}
        dark={dark}
      />
    );
  }

  const { confidenceStatus, namespaceAmber, entry } = gate;

  // ── 2. Resolve live tag → concrete value ─────────────────────────────────
  // This is the only place live data resolution happens.
  // Widget components receive a plain number — they never know the source.
  const rawProps = payload.props ?? {};
  const resolvedProps = (rawProps.live && rawProps.tag)
    ? { ...rawProps, value: liveDataProvider(rawProps.tag as string) ?? rawProps.value }
    : rawProps;

  const componentProps: Record<string, unknown> = {
    ...resolvedProps,
    dark,
    onAction: entry.requiresAuth
      ? (data: Record<string, unknown>) => onAction?.({ ...data, requiresAuth: true, widgetType: payload.type })
      : onAction,
  };

  // ── 3. Mount ────────────────────────────────────────────────────────────────
  // renderChild is passed as a callback to WidgetMount to avoid a circular
  // import (WidgetRenderer → WidgetMount → WidgetRenderer).
  const renderChild = (child: WidgetPayload) => (
    <WidgetRenderer
      payload={child}
      onAction={onAction}
      isChild
      liveDataProvider={liveDataProvider}
      liveTagIds={liveTagIds}
      dark={dark}
    />
  );

  return (
    <WidgetMount
      payload={payload}
      componentProps={componentProps}
      confidenceStatus={confidenceStatus}
      namespaceAmber={namespaceAmber}
      entry={entry}
      isChild={isChild}
      dark={dark}
      renderChild={renderChild}
    />
  );
}
