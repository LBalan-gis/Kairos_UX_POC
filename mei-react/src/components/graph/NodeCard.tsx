import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { MetricSparkline } from './MetricSparkline';
import { KinematicMetric } from './KinematicMetric';
import { getGraphNodeClassNames } from './graphPresentation';
import { useSignalAge } from '../../hooks/useLiveSignal';
import type { Entity, ZoneId } from '../../types/domain';
import type { GraphContentConfig } from '../../types/config';
import type { Position } from '../../types/store';

const SIGNAL_TYPES = new Set(['Sensor', 'QualityState', 'ControlParameter', 'Asset']);

// ─── Pipeline Uplink card (ExternalSystem nodes) ──────────────────────────
const SYS_ICONS: Record<string, string> = { sys_mes: '⬡', sys_qa: '◈', sys_erp: '⬡', serialization_queue: '⬡' };
const SYS_TYPE: Record<string, string> = {
  sys_mes:              'MES · Execution Layer',
  sys_qa:               'QA · Approval Layer',
  sys_erp:              'ERP · Cost Sync',
  serialization_queue:  'Serialization · Traceability',
};

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  'Pending':       { color: '#16A34A', label: 'Cloud sync · Receiving' },
  'On hold':       { color: '#D97706', label: 'Hold · Approval required' },
  'Sync pending':  { color: '#D97706', label: 'Sync pending · Queued' },
  'warning':       { color: '#D97706', label: 'Warning' },
  'critical':      { color: '#DC2626', label: 'Critical' },
};

interface NodeCardProps {
  entity: Entity;
  position: Position;
  size?: { width?: number; height?: number };
  isFocused: boolean;
  isFocal: boolean;
  isDimmed: boolean;
  simulatedTime: number | null;
  zone?: ZoneId;
  graphConfig?: GraphContentConfig | null;
  onDragEnd?: (id: string, x: number, y: number) => void;
  onClick?: (id: string) => void;
  onDrag?: (id: string, x: number, y: number) => void;
  onRegister?: (id: string, mx: MotionValue<number>, my: MotionValue<number>) => void;
  onSizeChange?: (id: string, size: { width: number; height: number }) => void;
}

export function NodeCard({
  entity, position, size,
  isFocused, isFocal, isDimmed, simulatedTime,
  zone, graphConfig,
  onDragEnd, onClick, onDrag,
  onRegister, onSizeChange,
}: NodeCardProps) {
  const mx = useMotionValue(position.x);
  const my = useMotionValue(position.y);
  const cardRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useLayoutEffect(() => {
    onRegister?.(entity.id, mx, my);
  }, [entity.id, mx, my, onRegister]);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const w = cardRef.current.offsetWidth;
    const h = cardRef.current.offsetHeight;
    if (w && h) onSizeChange?.(entity.id, { width: w, height: h });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isDragging.current) mx.set(position.x);
  }, [position.x, mx]);

  useEffect(() => {
    if (!isDragging.current) my.set(position.y);
  }, [position.y, my]);

  const signalAge = useSignalAge(SIGNAL_TYPES.has(entity.type) ? entity.id : null);

  const { root_cause_probability: rcp, metadata, metrics, insight, action, state, type, label } = entity;

  // ── Simulation scenario → IF condition outcome card ──────────────────────
  if (type === 'SimulationScenario') {
    const isRisk     = metadata?.pathType === 'risk';
    const clr        = isRisk ? '#DC2626' : '#15803D';
    const borderClr  = isRisk ? 'rgba(220,38,38,0.60)'  : 'rgba(21,128,61,0.50)';
    const bgClr      = isRisk ? 'rgba(254,242,242,1)'   : 'rgba(240,253,244,1)';
    const condLabel  = isRisk ? 'IF UNCHANGED' : 'IF CORRECTED';
    const riskLabel  = isRisk ? 'High risk' : 'Low risk';
    const metricEntries = Object.entries(metrics ?? {});
    return (
      <motion.div
        ref={cardRef}
        drag
        dragMomentum={false}
        style={{ x: mx, y: my, position: 'absolute', width: size?.width ?? 300,
          zIndex: isFocused ? 100 : isFocal ? 50 : 10,
          background: bgClr, border: `2px dashed ${borderClr}`, borderRadius: 12,
          padding: '16px 18px', boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isDimmed ? 0.18 : 1, filter: isDimmed ? 'grayscale(0.6) brightness(0.8)' : 'none' }}
        whileDrag={{ cursor: 'grabbing', zIndex: 999, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={[isDimmed ? 'dimmed' : '', isFocused ? 'focus-root' : '', isFocal ? 'focal' : ''].filter(Boolean).join(' ') || undefined}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onTap={() => onClick?.(entity.id)}
        onDragStart={() => { isDragging.current = true; }}
        onDrag={() => { onDrag?.(entity.id, mx.get(), my.get()); }}
        onDragEnd={() => { isDragging.current = false; onDragEnd?.(entity.id, mx.get(), my.get()); }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: clr }}>{condLabel}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: clr, background: isRisk ? 'rgba(239,68,68,0.10)' : 'rgba(22,163,74,0.10)', padding: '2px 8px', borderRadius: 10 }}>{riskLabel}</span>
        </div>

        {metadata?.description && (
          <div style={{ fontSize: 11, color: '#64748B', marginBottom: 12, lineHeight: 1.4 }}>{metadata.description}</div>
        )}

        {metricEntries.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(metricEntries.length, 3)}, 1fr)`, gap: '4px 10px', marginBottom: 12 }}>
            {metricEntries.map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: clr, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        <MetricSparkline entityId={entity.id} simulatedTime={simulatedTime} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
          {insight && <div style={{ fontSize: 11, color: '#64748B', flex: 1, lineHeight: 1.4 }}>{insight}</div>}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: clr, whiteSpace: 'nowrap' }}>Risk: {isRisk ? 'High' : 'Low'}</div>
        </div>
      </motion.div>
    );
  }

  // ── External system → compact system panel (light card) ─────────────────
  if (state === 'external' || type === 'ExternalSystem') {
    const workflowVal = (metrics?.Workflow as string) ?? state ?? '';
    const dotInfo = STATUS_DOT[workflowVal] ?? STATUS_DOT[state] ?? { color: '#16A34A', label: 'Online' };
    return (
      <motion.div
        ref={cardRef}
        drag
        dragMomentum={false}
        style={{ x: mx, y: my, position: 'absolute', width: 200, zIndex: isFocused ? 100 : isFocal ? 50 : 10 }}
        animate={{ opacity: isDimmed ? 0.08 : 1, filter: isDimmed ? 'grayscale(1) brightness(0.8)' : 'none' }}
        whileDrag={{ cursor: 'grabbing', zIndex: 999, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onTap={() => onClick?.(entity.id)}
        onDragStart={() => { isDragging.current = true; }}
        onDrag={() => { onDrag?.(entity.id, mx.get(), my.get()); }}
        onDragEnd={() => { isDragging.current = false; onDragEnd?.(entity.id, mx.get(), my.get()); }}
      >
        <div className="sys-panel">
          <div className="sys-panel-header">
            <span className="sys-panel-icon">{SYS_ICONS[entity.id] ?? '⬡'}</span>
            <div>
              <div className="sys-panel-type">{SYS_TYPE[entity.id] ?? 'Data Pipeline'}</div>
              <div className="sys-panel-name">{label}</div>
            </div>
          </div>
          <div className="sys-panel-metrics">
            {Object.entries(metrics ?? {}).map(([k, v]) => (
              <div key={k} className="sys-panel-row">
                <span className="sys-panel-key">{k}</span>
                <span className="sys-panel-val">{v}</span>
              </div>
            ))}
          </div>
          <div className="sys-panel-status">
            <span className="sys-panel-dot" style={{ background: dotInfo.color }} />
            <span className="sys-panel-status-text">{dotInfo.label}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const typeClass = `type-${type.toLowerCase().replace(/\s+/g, '')}`;
  const presentationClasses = getGraphNodeClassNames(entity, graphConfig);

  const cardClass = [
    'node-card',
    typeClass,
    ...presentationClasses,
    `state-${state}`,
    zone ? `zone-${zone.toLowerCase()}` : '',
    isDimmed    ? 'dimmed'     : '',
    isFocused   ? 'focus-root' : '',
    isFocal     ? 'focal'      : '',
    (simulatedTime !== null && simulatedTime > 0) ? 'simulating' : '',
  ].filter(Boolean).join(' ');

  return (
    <motion.div
      ref={cardRef}
      drag
      dragMomentum={false}
      style={{
        x: mx, y: my,
        position: 'absolute',
        width: size?.width ?? 320,
        zIndex: isFocused ? 100 : isFocal ? 50 : 10,
      }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: isDimmed ? 0.18 : 1,
        filter:  isDimmed ? 'grayscale(0.6) brightness(0.8)' : 'none',
      }}
      whileDrag={{ cursor: 'grabbing', zIndex: 999, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cardClass}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onTap={() => { onClick?.(entity.id); }}
      onDragStart={() => { isDragging.current = true; }}
      onDrag={() => { onDrag?.(entity.id, mx.get(), my.get()); }}
      onDragEnd={() => {
        isDragging.current = false;
        onDragEnd?.(entity.id, mx.get(), my.get());
      }}
    >
      {/* Header */}
      <div className="node-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-label">{type}</div>
          <div className="node-title">{label}</div>
        </div>
        {state && state !== 'normal' && state !== 'external' && (
          <div className={`state-badge ${state}`}>{state}</div>
        )}
      </div>

      {/* Body */}
      <div className="node-body">
        {metadata?.description && (
          <div className="sub">{metadata.description}</div>
        )}

        {signalAge && (
          <div className="signal-age">Updated {signalAge}</div>
        )}

        {metrics && Object.keys(metrics).length > 0 && (
          <div className="metrics">
            {Object.entries(metrics).map(([k, v]) => {
              const rawStr = String(v).trim();
              const numMatch = rawStr.match(/^-?[\d\s,.]*\d/);
              if (!numMatch || isNaN(parseFloat(numMatch[0].replace(/[\s,]/g, '')))) {
                return (
                  <div className="metric" key={k}>
                    <span>{k}</span>
                    <b className="text-val">{v}</b>
                  </div>
                );
              }
              const valStr = numMatch[0];
              const val = parseFloat(valStr.replace(/[\s,]/g, ''));
              const suffix = rawStr.substring(valStr.length);
              const isInt = Math.floor(val) === val;
              return (
                <div className="metric" key={k}>
                  <span>{k}</span>
                  <b><KinematicMetric value={val} decimals={isInt ? 0 : 1} suffix={suffix} /></b>
                </div>
              );
            })}
          </div>
        )}

        <MetricSparkline entityId={entity.id} simulatedTime={simulatedTime} />

        {insight && (
          <div className="kairos-section">
            <div className="kairos-header">
              <span className="kairos-label">KAIROS</span>
              {(metadata?.confidence !== undefined || rcp !== null) && (
                <span className="kairos-conf">
                  {metadata?.confidence !== undefined
                    ? `${Math.round(Number(metadata.confidence) * 100)}% conf`
                    : `${Math.round((rcp ?? 0) * 100)}% conf`}
                </span>
              )}
            </div>
            <div className="kairos-insight">{insight}</div>
          </div>
        )}

        {action && (
          <div className="card-actions">
            <div className="card-actions-label">ACTIONS</div>
            <div className="card-action-row">
              <span className="card-action-text">⚡ {action}</span>
            </div>
            <button
              className="card-add-action"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('kairos-cmd', { detail: `action:${entity.id}` }));
              }}
            >+ Add to action list</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
