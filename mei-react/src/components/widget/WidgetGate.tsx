// ── Widget Gate ────────────────────────────────────────────────────────────────
// Pure function (not a component, not a hook) that runs the three-layer
// validation pipeline and returns a gate result.
//
// Layer 1   — Structural: does the JSON match the contract?
// Layer 1.5 — Namespace: does the live tag exist in the registered namespace?
// Layer 2   — Confidence: is the LLM certain enough to render this?
//
// Returns one of two shapes:
//   { outcome: 'blocked', error?, confidence?, type? }
//   { outcome: 'render',  confidenceStatus, tagMissing, namespaceAmber, entry }
//
// Callers render <BlockedWidget> on 'blocked', or pass the render result to
// WidgetMount for display. WidgetRenderer is the only intended caller.

import { WIDGET_REGISTRY } from '../../widgets/registry';
import { validatePayload, checkConfidence, checkTagExists } from '../../widgets/schema';
import type { WidgetPayload, GateResult, LiveDataProvider } from '../../types/widgets';

export function gateWidget(payload: WidgetPayload, liveDataProvider: LiveDataProvider, liveTagIds: string[]): GateResult {
  // ── Layer 1: structural validation ─────────────────────────────────────────
  const validation = validatePayload(payload);
  if (!validation.valid) {
    return { outcome: 'blocked', error: validation.error };
  }

  const entry = WIDGET_REGISTRY[payload.type];

  // ── Layer 1.5: namespace integrity ─────────────────────────────────────────
  // Catches hallucinated tags that slip past confidence gating.
  // A tag absent from the registered namespace forces amber regardless of
  // the LLM's self-reported confidence score.
  const tagCheck = checkTagExists(payload, liveTagIds);
  const namespaceAmber = tagCheck === 'amber'; // 'skip' → false (no penalty without list)

  // ── Layer 2: confidence gate ────────────────────────────────────────────────
  const confidenceStatus = checkConfidence(payload);
  if (confidenceStatus === 'blocked') {
    return { outcome: 'blocked', confidence: payload.confidence, type: payload.type };
  }

  return {
    outcome: 'render',
    // Namespace failure overrides confidence — both result in amber but carry
    // distinct labels so operators can distinguish "LLM was unsure" vs
    // "LLM hallucinated a sensor".
    confidenceStatus: namespaceAmber ? 'amber' : confidenceStatus,
    namespaceAmber,
    entry,
  };
}
