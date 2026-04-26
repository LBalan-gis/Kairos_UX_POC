import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

// ── Constants ──────────────────────────────────────────────────────────────────

const PAST_MIN   = 480; // 8 hours
const FUTURE_MIN = 30;
const TOTAL_MIN  = PAST_MIN + FUTURE_MIN;

const STATE_COL: Record<string, string> = {
  normal:   '#22DD44',
  warning:  '#FF8800',
  critical: '#FF2828',
  failure:  '#880000',
};

const PILL_PAST   = '#546E7A';
const PILL_FUTURE = '#29B6C8';
const PILL_NOW_BG = '#FFFFFF';
const PILL_NOW_FG = '#111111';

const PANEL_BG     = 'rgba(22, 30, 42, 0.72)';
const TEXT_DIM     = 'rgba(255,255,255,0.40)';
const TEXT_MED     = 'rgba(255,255,255,0.88)';
const RAIL_BG      = 'rgba(255,255,255,0.08)';

// ── Past history ───────────────────────────────────────────────────────────────

interface PastSegment {
  from: number;
  to: number;
  blister_machine: string;
  cartoner: string;
}

const PAST_STATES: PastSegment[] = [
  { from: -480, to: -420, blister_machine: 'normal',  cartoner: 'normal'   },
  { from: -420, to: -360, blister_machine: 'warning', cartoner: 'normal'   },
  { from: -360, to: -240, blister_machine: 'normal',  cartoner: 'normal'   },
  { from: -240, to: -180, blister_machine: 'warning', cartoner: 'normal'   },
  { from: -180, to:  -90, blister_machine: 'normal',  cartoner: 'normal'   },
  { from:  -90, to:  -60, blister_machine: 'warning', cartoner: 'normal'   },
  { from:  -60, to:  -28, blister_machine: 'warning', cartoner: 'warning'  },
  { from:  -28, to:  -12, blister_machine: 'warning', cartoner: 'normal'   },
  { from:  -12, to:    0, blister_machine: 'warning', cartoner: 'critical' },
];

export function lookupPastStates(t: number): Record<string, string> {
  const seg = PAST_STATES.find(s => t >= s.from && t < s.to)
           ?? PAST_STATES[PAST_STATES.length - 1];
  return { blister_machine: seg.blister_machine, cartoner: seg.cartoner };
}

function toPct(t: number): number {
  return ((t + PAST_MIN) / TOTAL_MIN) * 100;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PredictionTimeline() {
  const predictions      = useAppStore(s => s.predictions);
  const simulatedTime    = useAppStore(s => s.simulatedTime);
  const activeScenario   = useAppStore(s => s.activeScenario);
  const setSimulatedTime   = useAppStore(s => s.setSimulatedTime);
  const setActiveScenario  = useAppStore(s => s.setActiveScenario);
  const setView            = useAppStore(s => s.setView);

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(true);

  const rawTimeFromEvent = useCallback((e: MouseEvent | React.MouseEvent): number | null => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const raw  = (e.clientX - rect.left) / rect.width * TOTAL_MIN - PAST_MIN;
    return Math.round(Math.max(-PAST_MIN, Math.min(FUTURE_MIN, raw)) * 10) / 10;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const t = rawTimeFromEvent(e);
    if (t === null) return;
    setSimulatedTime(t);
    setDragging(true);
  }, [rawTimeFromEvent, setSimulatedTime]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const t = rawTimeFromEvent(e);
    if (t !== null) setSimulatedTime(t);
  }, [dragging, rawTimeFromEvent, setSimulatedTime]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const isLive   = simulatedTime === null;
  const nowPct   = toPct(0);
  const scrubPct = isLive ? nowPct : toPct(simulatedTime);

  const allBands = useMemo(() => {
    if (!predictions) return [];
    return predictions.map(p => ({
      scenarioId: p.scenarioId,
      active: p.scenarioId === activeScenario,
      bands: p.steps.reduce<Array<{ left: number; width: number; col: string }>>((acc, step, i) => {
        if (step.t < 0) return acc;
        const next = p.steps[i + 1];
        if (!next) return acc;
        acc.push({
          left:  toPct(step.t),
          width: toPct(next.t) - toPct(step.t),
          col:   STATE_COL[step.entityStates?.['blister_machine'] ?? 'normal'] ?? STATE_COL.normal,
        });
        return acc;
      }, []),
    }));
  }, [predictions, activeScenario]);

  const ticks = useMemo(() => {
    const out: Array<{ t: number; major: boolean }> = [];
    for (let t = -PAST_MIN; t <= FUTURE_MIN; t += 5) {
      out.push({ t, major: t % 10 === 0 });
    }
    return out;
  }, []);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      zIndex: 10, pointerEvents: 'none',
    }}>
      {!open && (
        <button onClick={() => setOpen(true)} style={{
          position: 'absolute', top: 10, right: 14,
          pointerEvents: 'auto',
          background: PANEL_BG,
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 4px 16px rgba(0,0,0,0.35)',
          width: 36, height: 36,
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
            <rect x="0" y="0" width="15" height="2" rx="1" fill="currentColor" opacity="0.8"/>
            <rect x="0" y="4.5" width="10" height="2" rx="1" fill="currentColor" opacity="0.5"/>
            <rect x="0" y="9" width="6" height="2" rx="1" fill="currentColor" opacity="0.3"/>
          </svg>
        </button>
      )}

      <div style={{
        margin: '10px 14px',
        background: PANEL_BG,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderRadius: 12,
        border: `1px solid rgba(255,255,255,0.12)`,
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 6px 24px rgba(0,0,0,0.40)',
        padding: '8px 14px 10px',
        pointerEvents: open ? 'auto' : 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        transition: 'clip-path 0.38s cubic-bezier(0.22,1,0.36,1)',
        clipPath: open ? 'inset(0 0 0 0% round 12px)' : 'inset(0 0 0 100% round 12px)',
      }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {predictions?.map(p => {
            const active = activeScenario === p.scenarioId;
            const badgeBg = active
              ? (p.scenarioId === 'unchanged' ? STATE_COL.warning : STATE_COL.normal)
              : 'rgba(255,255,255,0.10)';
            return (
              <button key={p.scenarioId}
                onClick={() => setActiveScenario(p.scenarioId)}
                style={{
                  background: badgeBg,
                  border: 'none',
                  borderRadius: 20,
                  padding: '3px 11px',
                  cursor: 'pointer',
                  color: active ? '#fff' : TEXT_DIM,
                  fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                }}
              >
                {p.label}
                <span style={{ marginLeft: 5, opacity: 0.55, fontWeight: 400, fontSize: '8px' }}>
                  {Math.round(p.confidence * 100)}%
                </span>
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {!isLive && (
            <span style={{ fontSize: '9px', fontWeight: 600, color: TEXT_MED, letterSpacing: '0.05em' }}>
              {simulatedTime < 0 ? `t ${simulatedTime}m · HISTORY` : `t +${simulatedTime}m · SIM`}
            </span>
          )}

          <button onClick={() => setView('graph')} style={{
            background: 'rgba(41,182,200,0.18)',
            border: '1px solid rgba(41,182,200,0.45)',
            borderRadius: 20, padding: '2px 11px',
            cursor: 'pointer',
            color: '#29B6C8',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em',
          }}>
            Analysis
          </button>

          {isLive ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: STATE_COL.normal,
                boxShadow: `0 0 5px ${STATE_COL.normal}88`,
              }} />
              <span style={{ fontSize: '9px', fontWeight: 700, color: STATE_COL.normal, letterSpacing: '0.10em' }}>
                LIVE
              </span>
            </div>
          ) : (
            <button onClick={() => setSimulatedTime(null)} style={{
              background: 'rgba(34,221,68,0.15)',
              border: '1px solid rgba(34,221,68,0.35)',
              borderRadius: 20, padding: '2px 10px',
              cursor: 'pointer',
              color: STATE_COL.normal,
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            }}>
              ← LIVE
            </button>
          )}

          <button onClick={() => setOpen(false)} style={{
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: TEXT_DIM,
            padding: '2px 2px', marginLeft: 4,
            display: 'flex', alignItems: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative', height: 22, marginBottom: 4 }}>
            {ticks.map(({ t, major }) => {
              if (!major) return null;
              if (t === -PAST_MIN || t === FUTURE_MIN) return null;
              const isNow = t === 0;
              return (
                <div key={t} style={{
                  position: 'absolute',
                  left: `${toPct(t)}%`,
                  top: 0,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}>
                  <div style={{
                    background: isNow ? PILL_NOW_BG : t < 0 ? PILL_PAST : PILL_FUTURE,
                    borderRadius: 20,
                    padding: '2px 7px',
                    fontSize: '7px',
                    fontWeight: isNow ? 800 : 600,
                    color: isNow ? PILL_NOW_FG : '#fff',
                    letterSpacing: isNow ? '0.08em' : '0.04em',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.5,
                    border: 'none',
                  }}>
                    {isNow ? 'NOW' : t > 0 ? `+${t}m` : `${t}m`}
                  </div>
                </div>
              );
            })}

            {ticks.map(({ t, major }) => major ? null : (
              <div key={t} style={{
                position: 'absolute',
                left: `${toPct(t)}%`,
                bottom: 0, top: 'auto',
                transform: 'translateX(-50%)',
                width: 1, height: 5,
                background: 'rgba(255,255,255,0.22)',
                pointerEvents: 'none',
              }} />
            ))}
          </div>

          <div
            ref={trackRef}
            onMouseDown={handleMouseDown}
            style={{
              position: 'relative',
              height: 10,
              cursor: dragging ? 'grabbing' : 'crosshair',
              borderRadius: 4,
              overflow: 'visible',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0,
              background: RAIL_BG,
              borderRadius: 4,
            }} />

            {PAST_STATES.map((seg, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${toPct(seg.from)}%`,
                width: `${toPct(seg.to) - toPct(seg.from)}%`,
                top: 0, bottom: 0,
                background: STATE_COL[seg.blister_machine],
                opacity: 0.75,
                borderRadius: i === 0 ? '4px 0 0 4px' : 0,
              }} />
            ))}

            {allBands.map(sc => (
              <React.Fragment key={sc.scenarioId}>
                {sc.bands.map((band, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${band.left}%`,
                    width: `${band.width}%`,
                    top:    sc.active ? 0 : 'auto',
                    bottom: 0,
                    height: sc.active ? '100%' : 3,
                    background: band.col,
                    opacity: sc.active ? 0.85 : 0.28,
                    zIndex: sc.active ? 2 : 1,
                    borderRadius: i === sc.bands.length - 1 ? '0 4px 4px 0' : 0,
                  }} />
                ))}
              </React.Fragment>
            ))}

            <div style={{
              position: 'absolute', left: `${nowPct}%`,
              top: -5, bottom: -3, width: 1.5,
              background: 'rgba(255,255,255,0.50)',
              transform: 'translateX(-50%)',
              pointerEvents: 'none', zIndex: 5,
            }} />

            {!isLive && (
              <div style={{
                position: 'absolute', left: `${scrubPct}%`,
                top: -6, bottom: -3,
                width: 2,
                background: '#fff',
                transform: 'translateX(-50%)',
                pointerEvents: 'none', zIndex: 6,
                borderRadius: 1,
              }}>
                <div style={{
                  position: 'absolute', top: -1, left: '50%',
                  transform: 'translate(-50%, -100%) rotate(45deg)',
                  width: 7, height: 7,
                  background: '#fff',
                  borderRadius: 1,
                }} />
              </div>
            )}

            {isLive && (
              <div style={{
                position: 'absolute', left: `${nowPct}%`,
                top: '50%', transform: 'translate(-50%, -50%)',
                width: 7, height: 7, borderRadius: '50%',
                background: STATE_COL.normal,
                boxShadow: `0 0 7px ${STATE_COL.normal}99`,
                zIndex: 6,
              }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
