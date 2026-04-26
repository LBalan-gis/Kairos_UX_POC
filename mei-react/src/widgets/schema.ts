import { WIDGET_REGISTRY } from './registry';
import type { WidgetPayload, ValidationResult, ConfidenceStatus, TagCheckResult } from '../types/widgets';

/**
 * Layer 1.5 — Namespace integrity check.
 * Returns 'ok' | 'amber' | 'skip'
 */
export function checkTagExists(payload: WidgetPayload, liveTagIds: string[] = []): TagCheckResult {
  const tag  = payload.props?.tag;
  const live = payload.props?.live;
  if (!tag || !live)           return 'ok';
  if (liveTagIds.length === 0) return 'skip';
  return liveTagIds.includes(tag as string) ? 'ok' : 'amber';
}

/**
 * Layer 1 — Structural validation.
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validatePayload(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== 'object')
    return { valid: false, error: 'Payload must be an object.' };

  const p = payload as Record<string, unknown>;

  if (typeof p.type !== 'string' || !p.type.trim())
    return { valid: false, error: 'Missing required field: type (string).' };

  if (typeof p.confidence !== 'number' || p.confidence < 0 || p.confidence > 1)
    return { valid: false, error: 'Field "confidence" must be a number between 0 and 1.' };

  if (!WIDGET_REGISTRY[p.type])
    return { valid: false, error: `Unknown widget type: "${p.type}". Not present in AEGIS registry.` };

  if (p.props !== undefined && typeof p.props !== 'object')
    return { valid: false, error: 'Field "props" must be an object.' };

  if (p.spatialBinding !== undefined) {
    if (typeof p.spatialBinding !== 'object')
      return { valid: false, error: 'Field "spatialBinding" must be an object.' };
    const sb = p.spatialBinding as Record<string, unknown>;
    if (typeof sb.entityId !== 'string' || !sb.entityId)
      return { valid: false, error: 'spatialBinding.entityId must be a non-empty string.' };
  }

  if (p.children !== undefined && !Array.isArray(p.children))
    return { valid: false, error: 'Field "children" must be an array of widget payloads.' };

  return { valid: true };
}

/**
 * Layer 2 — Confidence gate.
 * Returns 'ok' | 'amber' | 'blocked'
 */
export function checkConfidence(payload: WidgetPayload): ConfidenceStatus {
  const entry = WIDGET_REGISTRY[payload.type];
  if (!entry) return 'blocked';

  const { confidenceThreshold, requiresAuth } = entry;
  const confidence = payload.confidence ?? 0;

  if (confidence < confidenceThreshold) {
    if (requiresAuth) return 'blocked';
    return 'amber';
  }

  return 'ok';
}
