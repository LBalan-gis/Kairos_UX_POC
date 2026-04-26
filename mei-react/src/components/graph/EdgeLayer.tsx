import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { MotionValue } from 'framer-motion';
import { EDGE_STYLE } from './edgeStyle';
import type { Relation, ZoneId } from '../../types/domain';
import type { Position } from '../../types/store';

// Mirrors _edgePath from the original HTML exactly.
// a/b = { x, y, w, h, cx, cy } where cx=x+w/2, cy=y+h/2
interface Rect { x: number; y: number; w: number; h: number; cx: number; cy: number; }

function edgePath(a: Rect, b: Rect) {
  const dx = b.cx - a.cx;
  const sx = dx >= 0 ? a.x + a.w : a.x;
  const ex = dx >= 0 ? b.x       : b.x + b.w;
  const c1 = sx + Math.max(30, Math.abs(dx) * 0.26) * Math.sign(dx || 1);
  const c2 = ex - Math.max(30, Math.abs(dx) * 0.22) * Math.sign(dx || 1);
  return {
    d:  `M ${sx} ${a.cy} C ${c1} ${a.cy}, ${c2} ${b.cy}, ${ex} ${b.cy}`,
    lx: (a.cx + b.cx) / 2,
    ly: (a.cy + b.cy) / 2,
  };
}

// Edge priority tiers
const PRIMARY_SPINE = new Set(['r4','r5','r6','r7']);
const SPINE         = new Set(['r1','r2','r3']);
const BRANCH        = new Set(['r8','r9','r10','r12']);
const EXEC          = new Set(['r13','r14','r15','r16','r17','r18','r19','r20','r21']);

function priorityCls(r: Relation) {
  if (r.type === 'references')  return 'golden-ref reference';
  if (EXEC.has(r.id))           return 'exec';
  if (BRANCH.has(r.id))         return 'branch';
  if (PRIMARY_SPINE.has(r.id))  return 'primary-spine spine';
  if (SPINE.has(r.id))          return 'spine';
  return '';
}

function visualCls(r: Relation) {
  if (BRANCH.has(r.id)) return 'simulation';
  return EDGE_STYLE[r.type]?.cls ?? 'causal';
}

type MvEntry = { mx: MotionValue<number>; my: MotionValue<number> };
type NodeSize = { width: number; height: number };

interface EdgeLayerProps {
  relations: Relation[];
  positions: Record<string, Position>;
  sizes?: Record<string, NodeSize>;
  actualSizesRef?: RefObject<Record<string, NodeSize>>;
  focusEdgeIds?: Set<string>;
  focusId: string | null;
  mvReg?: RefObject<Record<string, MvEntry>>;
  isSimulating?: boolean;
  entityStateMap?: Record<string, string>;
  zoneMap?: Record<string, ZoneId>;
}

interface RenderEdge {
  r: Relation;
  d: string;
  lx: number;
  ly: number;
  vcls: string;
  pcls: string;
  dimmed: boolean;
  focused: boolean;
  labelText: string;
  simCls: string;
  simBranchCls: string;
  isPipeline: boolean;
  zoneCls: string;
}

export function EdgeLayer({ relations, positions, sizes, actualSizesRef, focusEdgeIds, focusId, mvReg, isSimulating, entityStateMap, zoneMap }: EdgeLayerProps) {
  const [renderData, setRenderData] = useState<RenderEdge[]>([]);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      const data = relations.map((r) => {
        const px = mvReg?.current?.[r.from]?.mx?.get() ?? positions[r.from]?.x;
        const py = mvReg?.current?.[r.from]?.my?.get() ?? positions[r.from]?.y;
        const qx = mvReg?.current?.[r.to]?.mx?.get()   ?? positions[r.to]?.x;
        const qy = mvReg?.current?.[r.to]?.my?.get()   ?? positions[r.to]?.y;

        if (px === undefined || py === undefined || qx === undefined || qy === undefined) return null;

        const pw = actualSizesRef?.current?.[r.from]?.width  ?? sizes?.[r.from]?.width  ?? 320;
        const ph = actualSizesRef?.current?.[r.from]?.height ?? sizes?.[r.from]?.height ?? 160;
        const qw = actualSizesRef?.current?.[r.to]?.width    ?? sizes?.[r.to]?.width    ?? 320;
        const qh = actualSizesRef?.current?.[r.to]?.height   ?? sizes?.[r.to]?.height   ?? 160;

        const a: Rect = { x: px, y: py, w: pw, h: ph, cx: px + pw / 2, cy: py + ph / 2 };
        const b: Rect = { x: qx, y: qy, w: qw, h: qh, cx: qx + qw / 2, cy: qy + qh / 2 };

        const path  = edgePath(a, b);
        const vcls  = visualCls(r);
        const pcls  = priorityCls(r);

        const focused = focusId !== null && !!focusEdgeIds?.has(r.id);
        const dimmed  = focusId !== null && !focusEdgeIds?.has(r.id);

        const simBranchCls = r.to === 'sim_unchanged' ? 'sim-branch-unchanged'
                           : r.to === 'sim_corrected' ? 'sim-branch-corrected'
                           : '';

        const labelText = r.type.replace(/_/g, ' ');

        const srcState  = isSimulating ? (entityStateMap?.[r.from] ?? 'normal') : 'normal';
        const simCls    = isSimulating && srcState !== 'normal' ? `sim-${srcState}` : '';
        const isPipeline = r.to.startsWith('sys_');

        const srcZone   = zoneMap?.[r.from];
        const zoneCls   = srcZone ? `zone-edge-${srcZone.toLowerCase()}` : '';

        return { r, ...path, vcls, pcls, dimmed, focused, labelText, simCls, simBranchCls, isPipeline, zoneCls };
      }).filter((x): x is RenderEdge => x !== null);

      setRenderData(data);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [relations, positions, sizes, focusEdgeIds, focusId, mvReg, isSimulating, entityStateMap, zoneMap]);

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
      <defs>
        <marker id="arrow-std"    markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" refX="18" refY="10" orient="auto"><path d="M0,2 L18,10 L0,18 Z" fill="context-stroke"/></marker>
        <marker id="arrow-golden" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20" refX="18" refY="10" orient="auto"><path d="M0,2 L18,10 L0,18 Z" fill="context-stroke" opacity="0.6"/></marker>
      </defs>

      {/* Edge paths — drawn first so labels sit on top */}
      {renderData.map(({ r, d, vcls, pcls, dimmed, focused, simCls, simBranchCls, isPipeline, zoneCls }) => {
        const markerPrefix = pcls.includes('golden-ref') ? 'arrow-golden' : 'arrow-std';
        const srcState = entityStateMap?.[r.from] ?? 'normal';
        const isPulsing = srcState !== 'normal';

        return (
          <g key={`edge-group-${r.id}`}>
            <path
              key={`path-${r.id}`}
              className={['edge', vcls, pcls, simBranchCls, dimmed ? 'dimmed' : '', focused ? 'focused' : '', simCls].filter(Boolean).join(' ')}
              d={d}
              markerEnd={`url(#${markerPrefix})`}
            />
            {isPulsing && !dimmed && (
              <path
                key={`pulse-${r.id}`}
                className={`edge energy-pulse pulse-${srcState}`}
                d={d}
              />
            )}
            {isPipeline && !dimmed && (
              <path
                key={`pipeline-${r.id}`}
                className="edge pipeline-feed"
                d={d}
              />
            )}
          </g>
        );
      })}

      {/* Edge labels — rendered on top of paths */}
      {renderData.map(({ r, lx, ly, dimmed, focused, labelText, vcls }) => {
        if (dimmed) return null;
        const consequence = r.consequence;
        const isNeg = consequence?.sentiment === 'negative';
        return (
          <g key={`lbl-${r.id}`}>
            <text
              className={`edge-label ${vcls}${focused ? ' focused' : ''}`}
              x={lx} y={ly - 5} textAnchor="middle"
            >
              {labelText}
            </text>
            {consequence && (
              <text
                x={lx} y={ly + 12}
                textAnchor="middle"
                className={`edge-label consequence-text ${isNeg ? 'deviation' : 'control'}`}
              >
                {consequence.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
