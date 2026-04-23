import { useEffect, useLayoutEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { InsightChip } from './InsightChip';
import { MetricSparkline } from './MetricSparkline';
import { KinematicMetric } from './KinematicMetric';
import { useSignalAge } from '../../hooks/useLiveSignal';

const SIGNAL_TYPES = new Set(['Sensor', 'QualityState', 'ControlParameter', 'Asset']);

// ─── Pipeline Uplink card (ExternalSystem nodes) ──────────────────────────
const PIPELINE_SYNC = {
  'Pending':      { color: '#2AF1E5', pulse: true,  status: 'Cloud Sync · Receiving' },
  'On hold':      { color: '#FFB800', pulse: false, status: 'Hold · Approval Required' },
  'Sync pending': { color: '#FFB800', pulse: false, status: 'Sync Pending · Queued' },
};

const SYS_ICONS = { sys_mes: '⬡', sys_qa: '◈', sys_erp: '⬡' };
const SYS_FULL  = {
  sys_mes: 'Manufacturing Execution System',
  sys_qa:  'Quality Assurance Layer',
  sys_erp: 'Enterprise Resource Planning',
};

function layoutClass(entity) {
  if (entity.type === 'GoldenBatch' || entity.id === 'batch_current') return 'anchor-card';
  if (entity.type === 'SimulationScenario') return 'simulation-card';
  if (entity.type === 'ExternalSystem')     return 'system-card';
  return 'process-card';
}

function specialClass(entity) {
  const c = [];
  if (entity.id === 'batch_golden') c.push('reference-node');
  if (['hidden_loss','batch_current','planned_vs_actual','impact_yield'].includes(entity.id))
    c.push('primary-analytical');
  return c.join(' ');
}

export function NodeCard({
  entity, position, size,
  isFocused, isFocal, isDimmed, simulatedTime,
  onDragEnd, onClick, onDrag,
  onRegister, onSizeChange,
}) {
  const mx = useMotionValue(position.x);
  const my = useMotionValue(position.y);
  const cardRef = useRef(null);

  // Track whether this card is currently being dragged.
  // While dragging, we must NOT sync from the position prop — that would
  // fight the gesture and snap the card back on every store update.
  const isDragging = useRef(false);

  // Register this card's MotionValues with the parent registry so
  // the parent can move sibling cards directly without store updates.
  // useLayoutEffect so registration is complete before the parent's
  // useLayoutEffect fires (children run before parent in layout phase).
  useLayoutEffect(() => {
    onRegister?.(entity.id, mx, my);
  }, [entity.id, mx, my, onRegister]);

  // Report actual rendered height to parent — used for accurate collision detection.
  // Runs after first paint so offsetHeight is real, not estimated.
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const w = cardRef.current.offsetWidth;
    const h = cardRef.current.offsetHeight;
    if (w && h) onSizeChange?.(entity.id, { width: w, height: h });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync layout/store position changes → MotionValue, but never during drag.
  useEffect(() => {
    if (!isDragging.current) mx.set(position.x);
  }, [position.x, mx]);

  useEffect(() => {
    if (!isDragging.current) my.set(position.y);
  }, [position.y, my]);

  const signalAge = useSignalAge(SIGNAL_TYPES.has(entity.type) ? entity.id : null);

  const { root_cause_probability: rcp, metadata, metrics, insight, action, state, type, label } = entity;

  // ── External system → pipeline uplink rendering ──────────────────────────
  if (state === 'external') {
    const workflowVal = metrics?.Workflow ?? '';
    const sync = PIPELINE_SYNC[workflowVal] ?? { color: '#2AF1E5', pulse: true, status: 'Online' };
    return (
      <motion.div
        ref={cardRef}
        drag
        dragMomentum={false}
        style={{ x: mx, y: my, position: 'absolute', width: 220, zIndex: isFocused ? 100 : isFocal ? 50 : 10 }}
        animate={{
          opacity: isDimmed ? 0.05 : 1,
          filter:  isDimmed ? 'blur(1.5px) grayscale(1) brightness(0.4)' : 'none',
        }}
        whileDrag={{ cursor: 'grabbing', zIndex: 999, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        onTap={() => onClick?.(entity.id)}
        onDragStart={() => { isDragging.current = true; }}
        onDrag={() => { onDrag?.(entity.id, mx.get(), my.get()); }}
        onDragEnd={() => { isDragging.current = false; onDragEnd?.(entity.id, mx.get(), my.get()); }}
      >
        <div className="pipeline-uplink" style={{ '--pipe-color': sync.color, borderLeft: `3px solid ${sync.color}` }}>
          {/* Header */}
          <div className="pu-header">
            <span className="pu-icon" style={{ color: sync.color }}>{SYS_ICONS[entity.id] ?? '⬡'}</span>
            <div>
              <div className="pu-type">Data Pipeline</div>
              <div className="pu-title">{label}</div>
            </div>
          </div>

          {/* Full system name */}
          <div className="pu-fullname">{SYS_FULL[entity.id] ?? metadata?.description}</div>

          {/* Animated data-flow bar */}
          <div className="pu-flow-bar">
            <div className="pu-flow-track" />
          </div>

          {/* Metrics */}
          <div className="pu-metrics">
            {Object.entries(metrics ?? {}).map(([k, v]) => (
              <div key={k} className="pu-metric-row">
                <span className="pu-metric-key">{k}</span>
                <span className="pu-metric-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Sync status LED */}
          <div className="pu-status">
            <div
              className={`pu-led ${sync.pulse ? 'pu-led-active' : 'pu-led-pending'}`}
              style={{ background: sync.color, boxShadow: sync.pulse ? `0 0 6px ${sync.color}` : 'none' }}
            />
            <span className="pu-status-text" style={{ color: sync.color }}>{sync.status}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const typeClass = `type-${type.toLowerCase().replace(/\s+/g, '')}`;

  const cardClass = [
    'node-card',
    typeClass,
    layoutClass(entity),
    specialClass(entity),
    `state-${state}`,
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
        opacity: isDimmed ? 0.05 : 1,
        filter:  isDimmed ? 'blur(1.5px) grayscale(1) brightness(0.4)' : 'none',
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

        {rcp !== null && rcp !== undefined && (
          <div className="metric-probability">
            <span>Root cause likelihood</span>
            <b><KinematicMetric value={rcp * 100} decimals={0} suffix="%" /></b>
          </div>
        )}

        {/* Dynamic Metric Chart Component */}
        <MetricSparkline entityId={entity.id} simulatedTime={simulatedTime} />

        {insight && (
          <InsightChip
            insight={insight}
            action={action}
            confidence={metadata?.confidence}
            onClick={() => onClick?.(entity.id)}
          />
        )}
      </div>
    </motion.div>
  );
}
