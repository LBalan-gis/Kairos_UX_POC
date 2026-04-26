// ── Widget Mount ───────────────────────────────────────────────────────────────
// Pure rendering component. Receives pre-validated, pre-resolved data from
// WidgetRenderer and produces the final DOM tree.
//
// Single responsibility: visual structure only.
//   • Shell (border, background, radius)
//   • Amber strip — confidence degraded OR namespace integrity failure
//   • CFR strip   — requiresAuth widgets
//   • Layout title — layout type only
//   • Leaf render — Suspense + lazy component
//   • Child slots — renderChild() callback, injected by WidgetRenderer
//
// Children are NOT rendered by this component directly. WidgetRenderer passes
// a `renderChild` callback to avoid a circular import dependency.
// (WidgetRenderer → WidgetMount → WidgetRenderer would form a cycle.)

import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { WidgetSkeleton } from './WidgetPrimitives';
import type { WidgetPayload, WidgetRegistryEntry, ConfidenceStatus } from '../../types/widgets';

interface WidgetMountProps {
  payload: WidgetPayload;
  componentProps: Record<string, unknown>;
  confidenceStatus: ConfidenceStatus;
  namespaceAmber: boolean;
  entry: WidgetRegistryEntry;
  isChild?: boolean;
  dark?: boolean;
  renderChild: (child: WidgetPayload, i: number) => ReactNode;
}

export function WidgetMount({
  payload,
  componentProps,
  confidenceStatus,
  namespaceAmber,
  entry,
  isChild,
  dark,
  renderChild,
}: WidgetMountProps) {
  const isLayout      = payload.type === 'layout';
  const Component     = entry?.component;
  const hasChildren   = (payload.children?.length ?? 0) > 0;
  const childDirection = (payload.props?.direction as string) ?? 'column';
  const borderColor   = confidenceStatus === 'amber'
    ? 'rgba(245,158,11,0.40)'
    : (dark ? 'rgba(42,241,229,0.14)' : 'rgba(0,0,0,0.12)');

  // Amber strip label differs by failure mode so operators can distinguish
  // "LLM was uncertain" from "LLM hallucinated a sensor tag".
  const amberLabel    = namespaceAmber ? '⊘ TAG NOT IN NAMESPACE' : '⚠ UNVERIFIED';
  const amberSubLabel = namespaceAmber
    ? `tag "${payload.props?.tag as string}" is not registered`
    : `${((payload.confidence ?? 0) * 100).toFixed(0)}% confidence`;

  return (
    <div style={{
      background:   dark ? 'rgba(6,12,22,0.96)' : 'rgba(255,255,255,0.85)',
      border:       isChild ? 'none' : `1px solid ${borderColor}`,
      borderRadius: isChild ? 0 : 10,
      overflow:     'hidden',
    }}>

      {/* Amber strip — confidence degraded or namespace integrity failure */}
      {confidenceStatus === 'amber' && !isChild && (
        <div style={{ padding: '4px 12px', background: dark ? 'rgba(245,158,11,0.07)' : '#FEF3C7', borderBottom: `1px solid ${dark ? 'rgba(245,158,11,0.2)' : '#FDE68A'}`, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 8, fontWeight: 800, color: dark ? '#FBBF24' : '#B45309', letterSpacing: '0.1em' }}>{amberLabel}</span>
          <span style={{ marginLeft: 'auto', fontSize: 8, color: dark ? '#FCD34D' : '#D97706', fontWeight: 600 }}>{amberSubLabel}</span>
        </div>
      )}

      {/* CFR strip — auth-gated widgets only */}
      {entry?.requiresAuth && !isChild && (
        <div style={{ padding: '3px 12px', background: dark ? 'rgba(16,185,129,0.05)' : '#D1FAE5', borderBottom: `1px solid ${dark ? 'rgba(16,185,129,0.2)' : '#A7F3D0'}`, display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: dark ? '#34D399' : '#059669', letterSpacing: '0.1em' }}>✓ 21 CFR PART 11</span>
        </div>
      )}

      {/* Layout title — layout type only */}
      {isLayout && payload.props?.title && (
        <div style={{ padding: '12px 16px 8px', borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.5)', textTransform: 'uppercase' }}>
            {payload.props.title as string}
          </div>
        </div>
      )}

      {/* Leaf component — lazy chunk, skipped for layout (pure container) */}
      {!isLayout && Component && (
        <Suspense fallback={<WidgetSkeleton dark={dark} />}>
          <Component {...componentProps} />
        </Suspense>
      )}

      {/* Children — rendered via renderChild callback injected by WidgetRenderer */}
      {hasChildren && (
        <div style={{
          display:       'flex',
          flexDirection: childDirection as 'row' | 'column',
          flexWrap:      childDirection === 'row' ? 'wrap' : 'nowrap',
          borderTop:     !isLayout || payload.props?.title
            ? (dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.06)')
            : 'none',
        }}>
          {payload.children!.map((child, i) => (
            <div key={i} style={{
              flex:       childDirection === 'row' ? '1 1 0' : undefined,
              minWidth:   childDirection === 'row' ? 160 : undefined,
              borderLeft: childDirection === 'row' && i > 0 ? (dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.06)') : 'none',
              borderTop:  childDirection === 'column' && i > 0 ? (dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.05)') : 'none',
            }}>
              {renderChild(child, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
