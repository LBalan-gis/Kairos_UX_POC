import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { useLiveSignal } from './hooks/useLiveSignal';
import { useLiveData } from './hooks/useLiveData';
import { usePredictWorker } from './hooks/usePredictWorker';
import { FloorMapLayer } from './components/FloorMapLayer';
import { GraphWhiteboardLayer } from './components/GraphWhiteboardLayer';
import { KairOSOverlay } from './components/KairOSOverlay';
import { KPIDashboard } from './components/KPIDashboard';
import { MachineOnboardingWizard } from './components/MachineOnboardingWizard';
import { CommandPalette } from './components/CommandPalette';
import { ActionLedger } from './components/ActionLedger';
import { AnimatePresence, motion } from 'framer-motion';

// ── Scrubber constants ────────────────────────────────────────────────────────

const PRED_PAST = 30;   // default: ±30 min — keeps future predictions visible
const HIST_PAST = 480;  // history mode: 8-hour CCTV window
const FUTURE_MIN = 30;

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
  // Shift A (8h–5h ago) — normal baseline run
  { from: -480, to: -420, blister_machine: 'normal',   cartoner: 'normal'   },
  // Early tension drift episode (5h–4h ago)
  { from: -420, to: -360, blister_machine: 'warning',  cartoner: 'normal'   },
  // Corrected, back to normal (4h–3h ago)
  { from: -360, to: -240, blister_machine: 'normal',   cartoner: 'normal'   },
  // Second drift episode — minor (3h–2h ago)
  { from: -240, to: -180, blister_machine: 'warning',  cartoner: 'normal'   },
  // Recovered again (2h–90m ago)
  { from: -180, to:  -90, blister_machine: 'normal',   cartoner: 'normal'   },
  // Shift B starts, tension starts drifting again (90m–60m)
  { from:  -90, to:  -60, blister_machine: 'warning',  cartoner: 'normal'   },
  // Drift worsening, cartoner affected (60m–28m)
  { from:  -60, to:  -28, blister_machine: 'warning',  cartoner: 'warning'  },
  // Current incident window (28m–12m ago)
  { from:  -28, to:  -12, blister_machine: 'warning',  cartoner: 'normal'   },
  // Current state (12m ago → now)
  { from:  -12, to:    0, blister_machine: 'warning',  cartoner: 'critical' },
];

function toPct(t, pastMin) {
  return ((t + pastMin) / (pastMin + FUTURE_MIN)) * 100;
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

      {/* View toggle */}
      {view === 'floor' ? (
        <>
          <button onClick={() => setView('graph')} style={{
            background: 'rgba(41,182,200,0.18)', border: '1px solid rgba(41,182,200,0.45)',
            borderRadius: 20, padding: '3px 12px', cursor: 'pointer', color: '#29B6C8',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', flexShrink: 0, whiteSpace: 'nowrap',
          }}>Analysis</button>
          <button onClick={() => setView('kpi')} style={{
            background: 'rgba(88,166,255,0.14)', border: '1px solid rgba(88,166,255,0.35)',
            borderRadius: 20, padding: '3px 12px', cursor: 'pointer', color: '#58a6ff',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', flexShrink: 0, whiteSpace: 'nowrap',
          }}>KPI Dashboard</button>
        </>
      ) : view === 'kpi' ? (
        <button onClick={() => setView('floor')} style={{
          background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)',
          borderRadius: 20, padding: '3px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.80)',
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', flexShrink: 0, whiteSpace: 'nowrap',
        }}>← Floor</button>
      ) : (
        <>
          <button onClick={() => setPositions({})} style={{
            background: 'none', border: '1px solid rgba(255,22,22,0.30)',
            borderRadius: 20, padding: '3px 12px', cursor: 'pointer',
            color: 'rgba(255,77,77,0.80)', fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.07em', flexShrink: 0, whiteSpace: 'nowrap'
          }}>Reset Layout</button>
          <button onClick={() => setView('floor')} style={{
            background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)',
            borderRadius: 20, padding: '3px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.80)',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', flexShrink: 0, whiteSpace: 'nowrap',
          }}>← Floor</button>
        </>
      )}

      <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

      {/* Facility */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22DD44', boxShadow: '0 0 5px #22DD4488' }} />
        <span style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.09em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          PKG-1 · Line 1
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

  const [histMode, setHistMode] = useState(false);
  const pastMin = histMode ? HIST_PAST : PRED_PAST;

  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const rawTimeFromEvent = useCallback((e) => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const raw  = (e.clientX - rect.left) / rect.width * (pastMin + FUTURE_MIN) - pastMin;
    return Math.round(Math.max(-pastMin, Math.min(FUTURE_MIN, raw)) * 10) / 10;
  }, [pastMin]);

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
  const nowPct   = toPct(0, pastMin);
  const scrubPct = isLive ? nowPct : toPct(simulatedTime, pastMin);

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
          left:  toPct(step.t, pastMin),
          width: toPct(next.t, pastMin) - toPct(step.t, pastMin),
          col:   STATE_COL[step.entityStates?.['blister_machine'] ?? 'normal'],
        });
        return acc;
      }, []),
    }));
  }, [predictions, activeScenario, pastMin]);

  const ticks = useMemo(() => {
    const out = [];
    if (histMode) {
      // History mode: coarse ticks for 8h window, fine ticks near NOW
      for (let t = -HIST_PAST; t < -30; t += 30) {
        out.push({ t, major: t % 60 === 0, label: t % 60 === 0 ? `${t/60}h` : null });
      }
      for (let t = -30; t <= FUTURE_MIN; t += 5) {
        out.push({ t, major: t % 10 === 0, label: null });
      }
    } else {
      // Default: ±30 min, tick every 5, label every 10
      for (let t = -PRED_PAST; t <= FUTURE_MIN; t += 5) {
        out.push({ t, major: t % 10 === 0, label: null });
      }
    }
    return out;
  }, [histMode]);

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
      height: 52,
    }}>

      {/* History mode toggle */}
      <button
        onClick={() => { setHistMode(h => !h); if (!histMode) setSimulatedTime(null); }}
        title={histMode ? 'Switch to prediction view' : 'Switch to 8h history view'}
        style={{
          fontSize: '8px', fontWeight: 700, padding: '2px 9px', borderRadius: 20,
          letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
          cursor: 'pointer', transition: 'all 0.15s',
          background: histMode ? 'rgba(84,110,122,0.35)' : 'none',
          border: histMode ? '1px solid rgba(84,110,122,0.60)' : '1px solid rgba(255,255,255,0.14)',
          color: histMode ? '#90A4AE' : 'rgba(255,255,255,0.38)',
        }}
      >
        {histMode ? '⏴ −8h' : '⏴ History'}
      </button>

      {/* Scenario badges — hidden in history mode */}
      {!histMode && <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
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
      </div>}

      {/* Track */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          flex: 1,
          position: 'relative',
          height: 26,
          cursor: dragging ? 'grabbing' : 'crosshair',
          borderRadius: 6,
          overflow: 'visible',
          minWidth: 0,
        }}
      >
        {/* Rail */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.12)', borderRadius: 6, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.40)' }} />

        {/* Past state bands — only show segments within the current window */}
        {PAST_STATES.filter(seg => seg.to > -pastMin).map((seg, i) => {
          const fromClamped = Math.max(seg.from, -pastMin);
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `${toPct(fromClamped, pastMin)}%`,
              width: `${toPct(seg.to, pastMin) - toPct(fromClamped, pastMin)}%`,
              top: 0, bottom: 0,
              background: STATE_COL[seg.blister_machine],
              opacity: 0.88,
              borderRadius: fromClamped === -pastMin ? '5px 0 0 5px' : 0,
            }} />
          );
        })}

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

        {/* CCTV drift event markers — only visible in histMode */}
        {histMode && [
          { t: -420, col: '#FFB800', label: '⚠ Drift A' },
          { t: -360, col: '#2AF1E5', label: '✓ Fixed'   },
          { t:  -90, col: '#FFB800', label: '⚠ Drift B' },
          { t:  -60, col: '#EF4444', label: '⚠ CTN'     },
        ].filter(ev => ev.t >= -pastMin).map(ev => (
          <div key={ev.t} style={{ position:'absolute', left:`${toPct(ev.t, pastMin)}%`, top:0, bottom:0, pointerEvents:'none', zIndex:7, transform:'translateX(-50%)' }}>
            <div style={{ position:'absolute', top:0, bottom:0, width:1.5, background:ev.col, opacity:0.80 }} />
            <div style={{ position:'absolute', bottom:'calc(100% + 3px)', left:'50%', transform:'translateX(-50%)', background:'rgba(14,20,32,0.97)', border:`1px solid ${ev.col}66`, borderRadius:4, padding:'2px 6px', whiteSpace:'nowrap', fontSize:'7px', fontWeight:700, color:ev.col, letterSpacing:'0.04em' }}>
              {ev.label}
            </div>
          </div>
        ))}

        {/* NOW line */}
        <div style={{
          position: 'absolute', left: `${nowPct}%`,
          top: -4, bottom: -2, width: 2,
          background: 'rgba(255,255,255,0.70)',
          transform: 'translateX(-50%)',
          pointerEvents: 'none', zIndex: 5,
          boxShadow: '0 0 4px rgba(255,255,255,0.40)',
        }} />

        {/* Pills ON the track */}
        {ticks.map(({ t, major, label }) => {
          if (!major) return null;
          if (t === -pastMin || t === FUTURE_MIN) return null;
          const isNow = t === 0;
          const pillLabel = isNow ? 'NOW' : label ? label : (t > 0 ? `+${t}m` : `${t}m`);
          return (
            <div key={t} style={{
              position: 'absolute',
              left: `${toPct(t, pastMin)}%`,
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
                {pillLabel}
              </div>
            </div>
          );
        })}

        {/* Minor ticks */}
        {ticks.map(({ t, major }) => major ? null : (
          <div key={t} style={{
            position: 'absolute',
            left: `${toPct(t, pastMin)}%`,
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
  useLiveData();
  usePredictWorker(); // off-thread physics engine — subscribes to entityPhysics changes

  const view = useAppStore((s) => s.view);
  const dark  = useAppStore((s) => s.dark);
  const kairosOpen = useAppStore((s) => s.kairosOpen);

  return (
    <div data-theme={dark ? 'dark' : 'light'} style={{
      width: '100%', height: '100vh', overflow: 'hidden',
      background: dark ? '#161A23' : '#E4DFD8',
      display: 'grid',
      gridTemplateRows: '44px 52px 1fr',
    }}>
      {/* Row 1: Toolbar — grid gives it exactly 44px, nothing can shrink or cover it */}
      <AppToolbar />

      {/* Row 2: Scrubber — same chrome as toolbar, flush beneath it */}
      <div style={{ background: 'rgba(24,32,44,0.97)' }}>
        <ScrubberBar />
      </div>

      {/* Row 3: Content — 1fr = everything left */}
      <div style={{ position: 'relative', overflow: 'hidden', display: 'flex' }}>
        <div style={{
          position: 'relative', height: '100%',
          width: kairosOpen ? 'calc(100% - 38.2vw)' : '100%',
          transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
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
            </motion.div>
          )}

          {view === 'kpi' && (
            <motion.div
              key="kpi"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}
            >
              <KPIDashboard />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
        <KairOSOverlay />
      </div>

      <ActionLedger />
      <MachineOnboardingWizard />
      <CommandPalette />
    </div>
  );
}
