import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { useLiveSignal } from './hooks/useLiveSignal';
import { FloorMapLayer } from './components/FloorMapLayer';
import { GraphWhiteboardLayer } from './components/GraphWhiteboardLayer';
import { KairOSOverlay } from './components/KairOSOverlay';
import { AnimatePresence, motion } from 'framer-motion';

// ── Scrubber constants (mirrors PredictionTimeline) ───────────────────────────

const PAST_MIN   = 30;
const FUTURE_MIN = 30;
const TOTAL_MIN  = PAST_MIN + FUTURE_MIN;

const STATE_COL = {
  normal:   '#2AF1E5', // Emerald
  warning:  '#FFB800', // Amber
  critical: '#EF4444', // Crimson
  failure:  '#FF3333', // Deep Red
};

const PILL_PAST   = '#546E7A';
const PILL_FUTURE = '#29B6C8';
const PILL_NOW_BG = '#FFFFFF';
const PILL_NOW_FG = '#111111';

const PAST_STATES = [
  { from: -30, to: -28, blister_machine: 'normal',  cartoner: 'normal'   },
  { from: -28, to: -12, blister_machine: 'warning', cartoner: 'normal'   },
  { from: -12, to:   0, blister_machine: 'warning', cartoner: 'critical' },
];

function toPct(t) {
  return ((t + PAST_MIN) / TOTAL_MIN) * 100;
}

// ── App toolbar ───────────────────────────────────────────────────────────────

const SHIFT_END_H = 22, SHIFT_END_M = 0;

function useShiftTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const hh = now.getHours(), mm = now.getMinutes();
  const timeStr = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  const remMins0 = (SHIFT_END_H * 60 + SHIFT_END_M) - (hh * 60 + mm);
  const remMins = remMins0 < 0 ? remMins0 + 1440 : remMins0;
  const remH = Math.floor(remMins / 60), remM = remMins % 60;
  const remStr = remH > 0 ? `${remH}h ${remM}m` : `${remM}m`;
  return { timeStr, remStr, urgent: remMins < 60 };
}

function AppToolbar() {
  const simulatedTime  = useAppStore(s => s.simulatedTime);
  const view             = useAppStore(s => s.view);
  const setSimulatedTime = useAppStore(s => s.setSimulatedTime);
  const isLive = simulatedTime === null;
  const { timeStr, remStr, urgent } = useShiftTime();
  const dark           = useAppStore(s => s.dark);
  const toggleDark     = useAppStore(s => s.toggleDark);
  const setView        = useAppStore(s => s.setView);
  const setPositions   = useAppStore(s => s.setPositions);

  return (
    <div style={{
      height: 44,
      background: 'rgba(24,32,44,0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center',
      padding: '0 14px',
      gap: 8,
      userSelect: 'none',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1 }}>✦</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>
          KairOS
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

      {/* Shift clock */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{timeStr}</span>
        <span style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Shift B</span>
        <span style={{ fontSize: '8px', fontWeight: 600, color: urgent ? '#FF8800' : 'rgba(255,255,255,0.35)', letterSpacing: '0.04em' }}>{remStr} left</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Time readout */}
      {!isLive && (
        <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
          {simulatedTime < 0 ? `t ${simulatedTime}m · HISTORY` : `t +${simulatedTime}m · SIM`}
        </span>
      )}

      {/* LIVE / ← LIVE */}
      {isLive ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_COL.normal, boxShadow: `0 0 5px ${STATE_COL.normal}88` }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: STATE_COL.normal, letterSpacing: '0.10em' }}>LIVE</span>
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

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

      {/* Theme toggle */}
      <button onClick={toggleDark} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '14px', color: 'rgba(255,255,255,0.7)',
        padding: '0 4px', display: 'flex', alignItems: 'center'
      }}>
        {dark ? '☀️' : '🌙'}
      </button>

      {/* View toggle — Analysis or ← Floor */}
      {view === 'floor' ? (
        <button onClick={() => setView('graph')} style={{
          background: 'rgba(41,182,200,0.18)',
          border: '1px solid rgba(41,182,200,0.45)',
          borderRadius: 20, padding: '3px 12px',
          cursor: 'pointer',
          color: '#29B6C8',
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          Analysis
        </button>
      ) : (
        <>
          <button onClick={() => setPositions({})} style={{
            background: 'none', border: '1px solid rgba(255,22,22,0.30)',
            borderRadius: 20, padding: '3px 12px', cursor: 'pointer',
            color: 'rgba(255,77,77,0.80)', fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.07em', flexShrink: 0, whiteSpace: 'nowrap'
          }}>
            Reset Layout
          </button>
          <button onClick={() => setView('floor')} style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.20)',
            borderRadius: 20, padding: '3px 12px',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.80)',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            ← Floor
          </button>
        </>
      )}

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

      {/* Facility */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22DD44', boxShadow: '0 0 5px #22DD4488' }} />
        <span style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.09em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Astellas · PKG-1
        </span>
      </div>
    </div>
  );
}

// ── Scrubber bar — attached directly below toolbar ────────────────────────────

function ScrubberBar() {
  const predictions     = useAppStore(s => s.predictions);
  const simulatedTime   = useAppStore(s => s.simulatedTime);
  const activeScenario  = useAppStore(s => s.activeScenario);
  const setSimulatedTime  = useAppStore(s => s.setSimulatedTime);
  const setActiveScenario = useAppStore(s => s.setActiveScenario);

  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const rawTimeFromEvent = useCallback((e) => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const raw  = (e.clientX - rect.left) / rect.width * TOTAL_MIN - PAST_MIN;
    return Math.round(Math.max(-PAST_MIN, Math.min(FUTURE_MIN, raw)) * 10) / 10;
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const t = rawTimeFromEvent(e);
    if (t === null) return;
    setSimulatedTime(t);
    setDragging(true);
  }, [rawTimeFromEvent, setSimulatedTime]);

  const handleMouseMove = useCallback((e) => {
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
      bands: p.steps.reduce((acc, step, i) => {
        if (step.t < 0) return acc;
        const next = p.steps[i + 1];
        if (!next) return acc;
        acc.push({
          left:  toPct(step.t),
          width: toPct(next.t) - toPct(step.t),
          col:   STATE_COL[step.entityStates?.['blister_machine'] ?? 'normal'],
        });
        return acc;
      }, []),
    }));
  }, [predictions, activeScenario]);

  const ticks = useMemo(() => {
    const out = [];
    for (let t = -PAST_MIN; t <= FUTURE_MIN; t += 5) {
      out.push({ t, major: t % 10 === 0 });
    }
    return out;
  }, []);

  return (
    <div style={{
      flexShrink: 0,
      background: 'rgba(24,32,44,0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.10)',
      display: 'flex', alignItems: 'center',
      padding: '0 14px',
      gap: 8,
      userSelect: 'none',
      height: 36,
    }}>

      {/* Scenario badges */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
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
                border: 'none', borderRadius: 20,
                padding: '2px 10px',
                cursor: 'pointer',
                color: active ? '#fff' : 'rgba(255,255,255,0.40)',
                fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'background 0.15s', whiteSpace: 'nowrap', lineHeight: 1.4,
              }}
            >
              {p.label}
              <span style={{ marginLeft: 4, opacity: 0.55, fontWeight: 400, fontSize: '8px' }}>
                {Math.round(p.confidence * 100)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          flex: 1,
          position: 'relative',
          height: 18,
          cursor: dragging ? 'grabbing' : 'crosshair',
          borderRadius: 5,
          overflow: 'visible',
          minWidth: 0,
        }}
      >
        {/* Rail */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 5 }} />

        {/* Past state bands */}
        {PAST_STATES.map((seg, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${toPct(seg.from)}%`,
            width: `${toPct(seg.to) - toPct(seg.from)}%`,
            top: 0, bottom: 0,
            background: STATE_COL[seg.blister_machine],
            opacity: 0.75,
            borderRadius: i === 0 ? '5px 0 0 5px' : 0,
          }} />
        ))}

        {/* Scenario bands */}
        {allBands.map(sc => (
          <div key={sc.scenarioId}>
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
                borderRadius: i === sc.bands.length - 1 ? '0 5px 5px 0' : 0,
              }} />
            ))}
          </div>
        ))}

        {/* NOW line */}
        <div style={{
          position: 'absolute', left: `${nowPct}%`,
          top: -4, bottom: -2, width: 1.5,
          background: 'rgba(255,255,255,0.40)',
          transform: 'translateX(-50%)',
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* Pills ON the track */}
        {ticks.map(({ t, major }) => {
          if (!major) return null;
          if (t === -PAST_MIN || t === FUTURE_MIN) return null;
          const isNow = t === 0;
          return (
            <div key={t} style={{
              position: 'absolute',
              left: `${toPct(t)}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: isNow ? 8 : 6,
            }}>
              <div style={{
                background: isNow ? PILL_NOW_BG : t < 0 ? PILL_PAST : PILL_FUTURE,
                borderRadius: 20,
                padding: isNow ? '2px 7px' : '1px 6px',
                fontSize: isNow ? '7px' : '6.5px',
                fontWeight: isNow ? 800 : 600,
                color: isNow ? PILL_NOW_FG : '#fff',
                letterSpacing: isNow ? '0.08em' : '0.04em',
                whiteSpace: 'nowrap',
                lineHeight: 1.5,
              }}>
                {isNow ? 'NOW' : t > 0 ? `+${t}m` : `${t}m`}
              </div>
            </div>
          );
        })}

        {/* Minor ticks */}
        {ticks.map(({ t, major }) => major ? null : (
          <div key={t} style={{
            position: 'absolute',
            left: `${toPct(t)}%`,
            top: 0, bottom: 0,
            width: 1,
            background: 'rgba(255,255,255,0.12)',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }} />
        ))}

        {/* Scrub cursor */}
        {!isLive && (
          <div style={{
            position: 'absolute', left: `${scrubPct}%`,
            top: -5, bottom: -3, width: 2,
            background: '#fff',
            transform: 'translateX(-50%)',
            pointerEvents: 'none', zIndex: 9,
            borderRadius: 1,
          }}>
            <div style={{
              position: 'absolute', top: -1, left: '50%',
              transform: 'translate(-50%, -100%) rotate(45deg)',
              width: 6, height: 6, background: '#fff', borderRadius: 1,
            }} />
          </div>
        )}

        {/* LIVE pulse */}
        {isLive && (
          <div style={{
            position: 'absolute', left: `${nowPct}%`,
            top: '50%', transform: 'translate(-50%, -50%)',
            width: 7, height: 7, borderRadius: '50%',
            background: STATE_COL.normal,
            boxShadow: `0 0 7px ${STATE_COL.normal}99`,
            zIndex: 9, pointerEvents: 'none',
          }} />
        )}
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App({ config }) {
  const initEngine = useAppStore(s => s.initEngine);
  const initialized = useRef(false);

  useEffect(() => {
    if (config && !initialized.current) {
      initEngine(config);
      initialized.current = true;
    }
  }, [config, initEngine]);

  useLiveSignal();

  const view = useAppStore((s) => s.view);
  const dark  = useAppStore((s) => s.dark);

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{
      width: '100%', height: '100vh', overflow: 'hidden',
      background: dark ? '#161A23' : '#E4DFD8',
      display: 'grid',
      gridTemplateRows: '44px 44px 1fr',
    }}>
      {/* Row 1: Toolbar — grid gives it exactly 44px, nothing can shrink or cover it */}
      <AppToolbar />

      {/* Row 2: Scrubber — same chrome as toolbar, flush beneath it */}
      <div style={{ background: 'rgba(24,32,44,0.97)', overflow: 'hidden' }}>
        <ScrubberBar />
      </div>

      {/* Row 3: Content — 1fr = everything left */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence initial={false}>
          {view === 'floor' && (
            <motion.div
              key="floor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 1 }}
            >
              <FloorMapLayer />
            </motion.div>
          )}

          {view === 'graph' && (
            <motion.div
              key="graph"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 2 }}
            >
              <GraphWhiteboardLayer />
              <KairOSOverlay />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
