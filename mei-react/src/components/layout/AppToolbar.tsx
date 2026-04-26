import { CSSProperties, useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

const SHIFT_END_H = 22;
const SHIFT_END_M = 0;

function useShiftTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const hh = now.getHours();
  const mm = now.getMinutes();
  const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const remMins0 = (SHIFT_END_H * 60 + SHIFT_END_M) - (hh * 60 + mm);
  const remMins = remMins0 < 0 ? remMins0 + 1440 : remMins0;
  const remH = Math.floor(remMins / 60);
  const remM = remMins % 60;
  const remStr = remH > 0 ? `${remH}h ${remM}m` : `${remM}m`;

  return { timeStr, remStr, urgent: remMins < 60 };
}

function navBtn(active: boolean, color = 'var(--normal)'): CSSProperties {
  return {
    border: `1px solid ${color}`,
    background: active ? color : 'transparent',
    color: active ? 'var(--text-inverse)' : color,
  };
}

export function AppToolbar() {
  const simulatedTime = useAppStore((state) => state.simulatedTime);
  const view = useAppStore((state) => state.view);
  const setSimulatedTime = useAppStore((state) => state.setSimulatedTime);
  const dark = useAppStore((state) => state.dark);
  const toggleDark = useAppStore((state) => state.toggleDark);
  const setView = useAppStore((state) => state.setView);
  const setPositions = useAppStore((state) => state.setPositions);
  const isLive = simulatedTime === null;
  const { timeStr, remStr, urgent } = useShiftTime();

  return (
    <div className="tb-root">
      <div className="tb-brand">
        <svg viewBox="0 0 100 100" width="14" height="14" style={{ overflow: 'visible', flexShrink: 0 }}>
          <path d="M 74 26 A 34 34 0 1 0 74 74" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
          <line x1="16" y1="50" x2="37" y2="50" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          <circle cx="50" cy="50" r="8" fill="#FF5000" />
          <circle cx="63" cy="50" r="3" fill="currentColor" />
          <circle cx="72" cy="50" r="3" fill="currentColor" />
          <circle cx="81" cy="50" r="3" fill="currentColor" />
        </svg>
        <span className="tb-brand-name">KairOS</span>
      </div>

      <div className="tb-divider" />

      <div className="tb-live">
        <div className="tb-live-dot" />
        {isLive
          ? <span className="tb-live-label">LIVE</span>
          : <button className="tb-live-btn" onClick={() => setSimulatedTime(null)}>← LIVE</button>}
      </div>

      <span className="tb-clock">{timeStr}</span>
      <span className="tb-shift">
        Shift B · <span style={{ color: urgent ? 'var(--warning)' : dark ? 'rgba(255,255,255,0.38)' : 'rgba(15,23,42,0.42)' }}>{remStr} left</span>
      </span>

      {!isLive && (
        <span className="tb-sim-label">
          {simulatedTime < 0 ? `t ${simulatedTime}m · HISTORY` : `t +${simulatedTime}m · SIM`}
        </span>
      )}

      <div className="tb-spacer" />

      {view === 'floor' && (
        <>
          <button className="tb-nav-btn" onClick={() => setView('graph')} style={navBtn(false)}>Analysis</button>
          <button className="tb-nav-btn" onClick={() => setView('kpi')} style={navBtn(false, 'var(--maintenance)')}>KPI Dashboard</button>
        </>
      )}
      {view === 'graph' && (
        <>
          <button className="tb-nav-btn" onClick={() => setPositions({})} style={navBtn(false, 'var(--critical)')}>Reset Layout</button>
          <button className="tb-nav-btn" onClick={() => setView('floor')} style={navBtn(true)}>Floor Map</button>
        </>
      )}
      {view === 'kpi' && (
        <button className="tb-nav-btn" onClick={() => setView('floor')} style={navBtn(true)}>Floor Map</button>
      )}

      <div className="tb-divider" />
      <button className="tb-theme-btn" onClick={toggleDark} title="Toggle theme">
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="tb-facility">
        <div className="tb-facility-dot" />
        <span className="tb-facility-label">PKG-1 · Line 1</span>
      </div>
    </div>
  );
}
