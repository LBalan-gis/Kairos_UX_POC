// ── Widget Payload Schema & Confidence Gate ────────────────────────────────────
// Two-layer output validation:
//   Layer 1 (validatePayload)  — structural: does the JSON match the contract?
//   Layer 2 (checkConfidence)  — risk: is the LLM certain enough to render this?
//
// Invalid JSON → BlockedWidget (fast fail, nothing mounts)
// Low confidence on auth widget → BlockedWidget (hard block)
// Low confidence on display widget → AmberWrapper (visual degradation)
// All clear → render normally

import { WIDGET_REGISTRY } from './registry';

/**
 * Layer 1.5 — Namespace integrity check.
 *
 * Verifies that a live-tagged widget references a sensor that is actually
 * registered in the Unified Namespace. Catches LLM hallucinations that slip
 * past confidence gating (the LLM can self-report 0.94 on a fabricated tag).
 *
 * Distinct from Layer 2 (confidence): a tag mismatch is a namespace integrity
 * failure, not a probability estimate — it gets its own amber label.
 *
 * Returns:
 *   'ok'      — tag is registered, or widget has no live tag claim
 *   'amber'   — tag is claimed but not in the registered namespace
 *   'skip'    — liveTagIds was empty (caller didn't provide the list — skip check)
 */
export function checkTagExists(payload, liveTagIds = []) {
  const tag = payload.props?.tag;
  if (!tag || !payload.props?.live) return 'ok';     // no live tag claim — nothing to verify
  if (liveTagIds.length === 0)       return 'skip';  // namespace not provided — skip silently
  return liveTagIds.includes(tag) ? 'ok' : 'amber';
}

/**
 * Validates a widget payload against the structural contract.
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validatePayload(payload) {
  if (!payload || typeof payload !== 'object')
    return { valid: false, error: 'Payload must be an object.' };

  if (typeof payload.type !== 'string' || !payload.type.trim())
    return { valid: false, error: 'Missing required field: type (string).' };

  if (typeof payload.confidence !== 'number' || payload.confidence < 0 || payload.confidence > 1)
    return { valid: false, error: 'Field "confidence" must be a number between 0 and 1.' };

  if (!WIDGET_REGISTRY[payload.type])
    return { valid: false, error: `Unknown widget type: "${payload.type}". Not present in AEGIS registry.` };

  if (payload.props !== undefined && typeof payload.props !== 'object')
    return { valid: false, error: 'Field "props" must be an object.' };

  if (payload.spatialBinding !== undefined) {
    if (typeof payload.spatialBinding !== 'object')
      return { valid: false, error: 'Field "spatialBinding" must be an object.' };
    if (typeof payload.spatialBinding.entityId !== 'string' || !payload.spatialBinding.entityId)
      return { valid: false, error: 'spatialBinding.entityId must be a non-empty string.' };
  }

  if (payload.children !== undefined && !Array.isArray(payload.children))
    return { valid: false, error: 'Field "children" must be an array of widget payloads.' };

  return { valid: true };
}

/**
 * Checks whether the LLM's confidence is sufficient to render the widget.
 * Returns:
 *   'ok'      — render normally
 *   'amber'   — render with unverified suggestion wrapper
 *   'blocked' — refuse to render (hard block for auth widgets or near-zero confidence)
 */
export function checkConfidence(payload) {
  const entry = WIDGET_REGISTRY[payload.type];
  if (!entry) return 'blocked';

  const { confidenceThreshold, requiresAuth } = entry;

  if (payload.confidence < confidenceThreshold) {
    // Auth widgets (ActuatorButton) are hard-blocked below threshold — never amber
    if (requiresAuth) return 'blocked';
    return 'amber';
  }

  return 'ok';
}
