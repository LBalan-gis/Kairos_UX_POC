import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { ActionLogEntry } from '../../types/store';
import './OpenClawTerminal.css';

// ── Local entry type ──────────────────────────────────────────────────────────

interface TerminalEntry extends ActionLogEntry {
  id: string;
  ts: string;
  type: string;
  text: string;
}

const mkEntry = (type: string, text: string): TerminalEntry => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return { id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts, type, text };
};

// ── Type colors ───────────────────────────────────────────────────────────────

const TYPE_COL_DARK: Record<string, string> = {
  sys:  '#2AF1E5',
  ok:   '#4ade80',
  err:  '#f87171',
  warn: '#fbbf24',
  info: 'rgba(255,255,255,0.50)',
};

const TYPE_COL_LIGHT: Record<string, string> = {
  sys:  '#0369A1',
  ok:   '#15803D',
  err:  '#DC2626',
  warn: '#B45309',
  info: 'rgba(0,0,0,0.55)',
};

// ── OpenClawTerminal ──────────────────────────────────────────────────────────

export function OpenClawTerminal() {
  const actionLog    = useAppStore(s => s.actionLog);
  const addActionLog = useAppStore(s => s.addActionLog);
  const dark         = useAppStore(s => s.dark);

  const [expanded, setExpanded] = useState(true);
  const [flash,    setFlash]    = useState(false);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const boots = [
      { delay:    0, type: 'sys',  text: 'KAIROS_SYS boot · Meridian v0.4.1' },
      { delay:  400, type: 'ok',   text: 'EtherCAT bus · 14 nodes online' },
      { delay:  900, type: 'sys',  text: 'MQTT broker · port 1883 · connected' },
      { delay: 1500, type: 'ok',   text: 'Physics engine · ready' },
      { delay: 2200, type: 'info', text: 'Watchdog armed · 500ms heartbeat' },
    ];
    const timers = boots.map(({ delay, type, text }) =>
      setTimeout(() => addActionLog(mkEntry(type, text)), delay)
    );
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (!expanded && actionLog.length > prevLenRef.current) {
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 800);
    }
    prevLenRef.current = actionLog.length;
  }, [actionLog.length, expanded]);

  const visible = actionLog.slice(-8) as TerminalEntry[];
  const TYPE_COL = dark ? TYPE_COL_DARK : TYPE_COL_LIGHT;

  const accentColor  = dark ? 'rgba(42,241,229,1)' : 'rgba(2,100,163,1)';
  const borderColor  = flash
    ? (dark ? 'rgba(108,184,255,0.45)' : 'rgba(61,126,245,0.32)')
    : (dark ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.10)');
  const shadowStyle  = flash
    ? (dark ? '0 0 10px rgba(108,184,255,0.22)' : '0 0 8px rgba(61,126,245,0.16)')
    : 'none';
  const headerBg     = dark ? 'rgba(76,141,255,0.07)' : 'rgba(61,126,245,0.05)';
  const headerBorder = dark ? 'rgba(148,163,184,0.10)' : 'rgba(15,23,42,0.08)';

  return (
    <div
      className="oct-shell"
      style={{
        '--oct-border': borderColor,
        '--oct-shadow': shadowStyle,
        '--oct-head-bg': headerBg,
        '--oct-head-border': headerBorder,
        '--oct-accent': dark ? '#9CC8FF' : '#2C66CE',
        '--oct-toggle': dark ? 'rgba(156,200,255,0.72)' : 'rgba(44,102,206,0.70)',
        '--oct-time': dark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.35)',
        '--oct-sys': dark ? '#9CC8FF' : '#2C66CE',
        '--oct-ok': dark ? '#7FE0A8' : '#178F51',
        '--oct-err': dark ? '#FF9B94' : '#C44740',
        '--oct-warn': dark ? '#FFD187' : '#A66A12',
        '--oct-info': dark ? 'rgba(255,255,255,0.50)' : 'rgba(15,23,42,0.55)',
      } as React.CSSProperties}
    >
      <div className={`oct-head${expanded ? '' : ' is-collapsed'}`}>
        <div className="oct-title">
          <div className="oct-live-dot" />
          <span className="oct-title-text">Meridian</span>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="oct-toggle"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {'>_'}
        </button>
      </div>

      {expanded && (
        <div ref={scrollRef} className="oct-log">
          {visible.map(entry => (
            <div key={entry.id} className="oct-row">
              <span className="oct-ts">[{entry.ts}]</span>
              <span className="oct-msg" data-type={entry.type} style={{ color: TYPE_COL[entry.type] ?? TYPE_COL.info }}>
                {entry.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
