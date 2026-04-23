import { useEffect, useState } from 'react';
import { EDGE_STYLE } from './edgeStyle';

// Mirrors _edgePath from the original HTML exactly.
// a/b = { x, y, w, h, cx, cy } where cx=x+w/2, cy=y+h/2
function edgePath(a, b) {
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

// Mirrors HTML renderEdges priority classification exactly
const PRIMARY_SPINE = new Set(['r4','r5','r6','r7']);
const SPINE         = new Set(['r1','r2','r3','r4','r5','r6','r7']);
const BRANCH        = new Set(['r9','r10','r11','r12']);
const EXEC          = new Set(['r13','r14','r15','r16']);

function priorityCls(r) {
  if (r.id === 'r8')           return 'golden-ref reference';
  if (EXEC.has(r.id))          return 'exec';
  if (BRANCH.has(r.id))        return 'branch';
  if (PRIMARY_SPINE.has(r.id)) return 'primary-spine spine';
  if (SPINE.has(r.id))         return 'spine';
  return '';
}

function visualCls(r) {
  if (BRANCH.has(r.id)) return 'simulation';
  return EDGE_STYLE[r.type]?.cls ?? 'causal';
}

function labelWidth(text) { return text.length * 6.5 + 16; }
function consequenceWidth(text) { return text.length * 7 + 20; }

export function EdgeLayer({ relations, positions, sizes, actualSizesRef, focusEdgeIds, focusId, mvReg, isSimulating, entityStateMap }) {
  const [renderData, setRenderData] = useState([]);

  useEffect(() => {
    let frameId;
    const loop = () => {
      const data = relations.map((r) => {
        // Read live position from MotionValues, fall back to stored position
        const px = mvReg?.current?.[r.from]?.mx?.get() ?? positions[r.from]?.x;
        const py = mvReg?.current?.[r.from]?.my?.get() ?? positions[r.from]?.y;
        const qx = mvReg?.current?.[r.to]?.mx?.get()   ?? positions[r.to]?.x;
        const qy = mvReg?.current?.[r.to]?.my?.get()   ?? positions[r.to]?.y;

        if (px === undefined || py === undefined || qx === undefined || qy === undefined) return null;

        // Prefer actual measured size, fall back to layout estimate
        const pw = actualSizesRef?.current?.[r.from]?.width  ?? sizes?.[r.from]?.width  ?? 320;
        const ph = actualSizesRef?.current?.[r.from]?.height ?? sizes?.[r.from]?.height ?? 160;
        const qw = actualSizesRef?.current?.[r.to]?.width    ?? sizes?.[r.to]?.width    ?? 320;
        const qh = actualSizesRef?.current?.[r.to]?.height   ?? sizes?.[r.to]?.height   ?? 160;

        const a = { x: px, y: py, w: pw, h: ph, cx: px + pw / 2, cy: py + ph / 2 };
        const b = { x: qx, y: qy, w: qw, h: qh, cx: qx + qw / 2, cy: qy + qh / 2 };

        const path  = edgePath(a, b);
        const vcls  = visualCls(r);
        const pcls  = priorityCls(r);

        // Mirrors applyFocus: focused iff edge ID is in the BFS-traversed set
        const focused = focusId !== null && !!focusEdgeIds?.has(r.id);
        const dimmed  = focusId !== null && !focusEdgeIds?.has(r.id);

        const labelText = r.type.replace(/_/g, ' ');

        // Simulation scrub: highlight edge by source entity predicted state
        const srcState   = isSimulating ? (entityStateMap?.[r.from] ?? 'normal') : 'normal';
        const simCls     = isSimulating && srcState !== 'normal' ? `sim-${srcState}` : '';
        const isPipeline = r.to.startsWith('sys_');

        return { r, ...path, vcls, pcls, dimmed, focused, labelText, simCls, isPipeline };
      }).filter(Boolean);

      setRenderData(data);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [relations, positions, sizes, focusEdgeIds, focusId, mvReg, isSimulating, entityStateMap]);

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
      <defs>
        {/* We use CSS variables directly for stroke/fill so the exact theme logic is preserved perfectly */}
        <marker id="arrow-material"   markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="18" refY="12" orient="auto"><polygon points="0,4 16,12 0,20" fill="var(--material)" /></marker>
        <marker id="arrow-causal"     markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="16" refY="12" orient="auto"><path d="M2,2 L16,12 L2,22" fill="none" stroke="#64748B" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter"/></marker>
        <marker id="arrow-deviation"  markerUnits="userSpaceOnUse" markerWidth="28" markerHeight="24" refX="20" refY="12" orient="auto"><path d="M0,2 L10,12 L0,22 M10,2 L20,12 L10,22" fill="none" stroke="var(--deviation)" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter"/></marker>
        <marker id="arrow-control"    markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="16" refY="12" orient="auto"><circle cx="12" cy="12" r="6" fill="var(--control)" /></marker>
        <marker id="arrow-simulation" markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="18" refY="12" orient="auto"><polygon points="12,2 20,12 12,22 4,12" fill="none" stroke="var(--simulation)" strokeWidth="3" strokeLinejoin="miter" /></marker>
        <marker id="arrow-system"     markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="16" refY="12" orient="auto"><rect x="4" y="6" width="12" height="12" fill="var(--system)" /></marker>
        <marker id="arrow-golden"     markerUnits="userSpaceOnUse" markerWidth="24" markerHeight="24" refX="16" refY="12" orient="auto"><path d="M2,2 L16,12 L2,22" fill="none" stroke="var(--golden)" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter"/></marker>
      </defs>

      {/* Edge paths — drawn first so labels sit on top */}
      {renderData.map(({ r, d, vcls, pcls, dimmed, focused, simCls, isPipeline }) => {
        let markerPrefix = EDGE_STYLE[r.type]?.marker ?? 'arrow-causal';
        if (pcls.includes('golden-ref')) markerPrefix = 'arrow-golden';

        const srcState = entityStateMap?.[r.from] ?? 'normal';
        const isPulsing = srcState !== 'normal';

        return (
          <g key={`edge-group-${r.id}`}>
            <path
              key={`path-${r.id}`}
              className={['edge', vcls, pcls, dimmed ? 'dimmed' : '', focused ? 'focused' : '', simCls].filter(Boolean).join(' ')}
              d={d}
              markerEnd={`url(#${markerPrefix})`}
            />
            {/* Live Energy Pulse Overlay */}
            {isPulsing && !dimmed && (
              <path
                key={`pulse-${r.id}`}
                className={`edge energy-pulse pulse-${srcState}`}
                d={d}
              />
            )}
            {/* Pipeline feed animation — edges into external system nodes */}
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
        const w = labelWidth(labelText);
        const h = 16;
        const consequence = r.consequence;
        const cw = consequence ? consequenceWidth(consequence.label) : 0;
        const ch = 18;
        const isNeg = consequence?.sentiment === 'negative';
        return (
          <g key={`lbl-${r.id}`}>
            <rect
              x={lx - w / 2} y={ly - h - 2} width={w} height={h} rx="4"
              fill="#ffffff" stroke="rgba(60,72,88,0.12)" strokeWidth="0.5"
            />
            <text
              className={`edge-label ${vcls}${focused ? ' focused' : ''}`}
              x={lx} y={ly - 7} textAnchor="middle"
            >
              {labelText}
            </text>
            {consequence && (
              <g>
                <rect
                  x={lx - cw / 2} y={ly + 4} width={cw} height={ch} rx="4"
                  className={`consequence-badge ${isNeg ? 'consequence-neg' : 'consequence-pos'}`}
                />
                <text
                  x={lx} y={ly + 16}
                  textAnchor="middle"
                  className={`edge-label consequence-text ${isNeg ? 'deviation' : 'control'}`}
                >
                  {consequence.label}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
