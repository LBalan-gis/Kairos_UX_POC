import { CSSProperties, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { projectSimulationTimeline, selectSimulationContext } from '../../domain/simulation/selectors';

const PRED_PAST = 30;
const HIST_PAST = 480;
const FUTURE_MIN = 40;

function toPct(t: number, pastMin: number) {
  return ((t + pastMin) / (pastMin + FUTURE_MIN)) * 100;
}

interface EventMarker {
  t: number;
  label: string;
  col: string;
}

export function ScrubberBar() {
  const simulation = useAppStore(useShallow(selectSimulationContext));
  const setSimulatedTime = useAppStore((state) => state.setSimulatedTime);
  const setActiveScenario = useAppStore((state) => state.setActiveScenario);

  const [histMode, setHistMode] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pastMin = histMode ? HIST_PAST : PRED_PAST;
  const timeline = useMemo(() => projectSimulationTimeline(simulation), [simulation]);
  const predictions = simulation.predictions;
  const simulatedTime = timeline.simulatedTime;
  const activeScenario = timeline.activeScenarioId;

  const returnToLive = useCallback(() => {
    setHistMode(false);
    setSimulatedTime(null);
  }, [setSimulatedTime]);

  const rawTimeFromEvent = useCallback((event: MouseEvent<HTMLDivElement> | globalThis.MouseEvent) => {
    if (!trackRef.current) return null;
    const rect = trackRef.current.getBoundingClientRect();
    const raw = (event.clientX - rect.left) / rect.width * (pastMin + FUTURE_MIN) - pastMin;
    return Math.round(Math.max(-pastMin, Math.min(FUTURE_MIN, raw)) * 10) / 10;
  }, [pastMin]);

  const handleMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const time = rawTimeFromEvent(event);
    if (time === null) return;
    setSimulatedTime(time);
    setDragging(true);
  }, [rawTimeFromEvent, setSimulatedTime]);

  const handleMouseMove = useCallback((event: globalThis.MouseEvent) => {
    if (!dragging) return;
    const time = rawTimeFromEvent(event);
    if (time !== null) setSimulatedTime(time);
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

  const isLive = simulatedTime === null;
  const nowPct = toPct(0, pastMin);
  const scrubPct = isLive ? nowPct : toPct(simulatedTime, pastMin);
  const riskPct = toPct(FUTURE_MIN * 0.75, pastMin);

  const majorTicks = useMemo(() => {
    const out: number[] = [];
    const step = histMode ? 60 : 10;
    for (let t = -pastMin; t <= FUTURE_MIN; t += step) out.push(t);
    return out;
  }, [histMode, pastMin]);

  const eventMarkers: EventMarker[] = histMode
    ? [
        { t: -420, label: 'Drift A', col: 'var(--timeline-past)' },
        { t: -360, label: 'Fixed', col: 'var(--timeline-future)' },
        { t: -90, label: 'Drift B', col: 'var(--timeline-past)' },
        { t: -60, label: 'CTN', col: 'var(--timeline-risk)' },
      ].filter((event) => event.t >= -pastMin)
    : [
        { t: -20, label: 'Anomaly\nDetected', col: 'var(--timeline-past)' },
        { t: -10, label: 'Impact\nRising', col: 'var(--timeline-past)' },
        { t: 34, label: 'Risk Threshold\n+34m', col: 'var(--timeline-risk)' },
      ];

  return (
    <div className="tl-shell">
      <div className="tl-bar">
        <div className="tl-history">
          <button
            className={`tl-toggle${histMode ? ' active' : ''}`}
            onClick={() => {
              setHistMode((value) => !value);
              if (!histMode) setSimulatedTime(null);
            }}
            type="button"
          >
            <span className="tl-toggle-icon">⏱</span>
            <span>History</span>
          </button>
          <button
            className={`tl-live${isLive && !histMode ? ' active' : ''}`}
            onClick={returnToLive}
            type="button"
          >
            <span className="tl-live-dot" />
            <span>Live</span>
          </button>
        </div>

        <div className="tl-scenarios">
          {!histMode && (timeline.scenarios.map((scenario) => {
            const active = scenario.isActive;
            const isRisk = scenario.isRiskPath;
            const chipClass = `tl-chip${active ? ' is-active' : ''}${isRisk ? ' is-risk' : ' is-corrected'}`;
            const chipStyles = {
              '--tl-chip-active-bg': active && isRisk ? 'var(--timeline-risk)' : 'transparent',
              '--tl-chip-active-border': isRisk ? 'var(--timeline-risk)' : 'var(--timeline-future)',
              '--tl-chip-active-text': active
                ? (isRisk ? '#fff' : 'var(--timeline-future)')
                : (isRisk ? 'var(--timeline-risk)' : 'var(--timeline-future)'),
            } as CSSProperties;
            return (
              <button
                key={scenario.id}
                className={chipClass}
                onClick={() => setActiveScenario(scenario.id)}
                style={chipStyles}
              >
                {isRisk ? 'IF UNCHANGED' : 'IF CORRECTED'} <span className="tl-chip-confidence">{Math.round(scenario.confidence * 100)}%</span>
              </button>
            );
          }))}
        </div>

        <div className="tl-stage-panel">
          <div
            ref={trackRef}
            className="tl-track"
            onMouseDown={handleMouseDown}
            style={{ cursor: dragging ? 'grabbing' : 'crosshair' }}
          >
            <div className="tl-line tl-line-past" style={{ left: 0, width: `${nowPct}%` }} />
            <div className="tl-line tl-line-future" style={{ left: `${nowPct}%`, width: `${riskPct - nowPct}%` }} />
            <div className="tl-line tl-line-risk" style={{ left: `${riskPct}%` }} />

            {majorTicks.map((t) => {
              const pct = toPct(t, pastMin);
              const isNow = t === 0;
              const isPast = t < 0;
              const isRisk = t > 0 && pct >= riskPct;
              const color = isNow ? 'var(--timeline-now)' : isPast ? 'var(--timeline-past)' : isRisk ? 'var(--timeline-risk)' : 'var(--timeline-future)';
              const label = isNow ? null : t > 0 ? `+${t}m` : `${t}m`;
              return (
                <div
                  key={t}
                  className={`tl-marker${isNow ? ' is-now' : ''}`}
                  style={{
                    left: `${pct}%`,
                    '--tl-marker-color': color,
                    zIndex: isNow ? 8 : 4,
                  } as CSSProperties}
                >
                  <div className="tl-marker-dot" />
                  {label && (
                    <div className="tl-marker-label">{label}</div>
                  )}
                </div>
              );
            })}

            <div className="tl-now-pill-wrap" style={{ left: `${nowPct}%` }}>
              <div className="tl-now-pill-label">NOW</div>
              <div className="tl-now-stem" />
            </div>

            {eventMarkers.map((event) => {
              const pct = toPct(event.t, pastMin);
              return (
                <div
                  key={event.t}
                  className="tl-event-marker"
                  style={{ left: `${pct}%`, '--tl-event-color': event.col } as CSSProperties}
                >
                  <div className="tl-event-marker-line" />
                  <div className="tl-event-marker-label">{event.label}</div>
                </div>
              );
            })}

            {!histMode && timeline.scenarios.some((scenario) => scenario.id === 'corrected') && (
              <div
                className="tl-corrected-guide"
                style={{ left: `${nowPct}%` }}
              />
            )}

            {!isLive && <div className="tl-handle" style={{ left: `${scrubPct}%` }} />}
          </div>
        </div>
      </div>
    </div>
  );
}
