import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

const mkEntry = (type, text) => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return { id: `mc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, ts, type, text };
};

// Dark-mode type colors — bright enough to read on dark bg
const TYPE_COL_DARK = {
  sys:  '#2AF1E5',
  ok:   '#4ade80',
  err:  '#f87171',
  warn: '#fbbf24',
  info: 'rgba(255,255,255,0.50)',
};

// Light-mode type colors — dark enough to read on white bg
const TYPE_COL_LIGHT = {
  sys:  '#0369A1',
  ok:   '#15803D',
  err:  '#DC2626',
  warn: '#B45309',
  info: 'rgba(0,0,0,0.55)',
};

export function OpenClawTerminal() {
  const actionLog    = useAppStore(s => s.actionLog);
  const addActionLog = useAppStore(s => s.addActionLog);
  const dark         = useAppStore(s => s.dark);

  const [expanded, setExpanded] = useState(true);
  const [flash,    setFlash]    = useState(false);
  const scrollRef  = useRef(null);
  const prevLenRef = useRef(0);
  const flashTimer = useRef(null);

  // Boot sequence
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

  // Auto-scroll to bottom when expanded and new entries arrive
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Flash border when collapsed and a new entry arrives
    if (!expanded && actionLog.length > prevLenRef.current) {
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 800);
    }
    prevLenRef.current = actionLog.length;
  }, [actionLog.length, expanded]);

  const visible = actionLog.slice(-8);
  const TYPE_COL = dark ? TYPE_COL_DARK : TYPE_COL_LIGHT;

  const accentColor = dark ? 'rgba(42,241,229,1)' : 'rgba(2,100,163,1)';
  const borderStyle = flash
    ? `1px solid ${dark ? 'rgba(42,241,229,0.55)' : 'rgba(2,100,163,0.50)'}`
    : `1px solid ${dark ? 'rgba(42,241,229,0.15)' : 'rgba(0,0,0,0.10)'}`;
  const shadowStyle = flash
    ? `0 0 8px ${dark ? 'rgba(42,241,229,0.4)' : 'rgba(2,100,163,0.25)'}`
    : 'none';

  return (
    <div style={{
      width:          '100%',
      borderTop:      borderStyle,
      boxShadow:      shadowStyle,
      transition:     'border 0.15s, box-shadow 0.15s',
      pointerEvents:  'auto',
      overflow:       'hidden',
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '5px 10px',
        background:     dark ? 'rgba(42,241,229,0.06)' : 'rgba(2,100,163,0.05)',
        borderBottom:   expanded
          ? `1px solid ${dark ? 'rgba(42,241,229,0.10)' : 'rgba(0,0,0,0.08)'}`
          : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 5px #4ade8099',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: '"Fira Code","Cascadia Code","Consolas",monospace',
            fontSize:   9,
            fontWeight: 700,
            color:      dark ? 'rgba(42,241,229,0.80)' : 'rgba(2,100,163,0.85)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}>
            MERIDIAN
          </span>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background:  'transparent',
            border:      'none',
            cursor:      'pointer',
            color:       dark ? 'rgba(42,241,229,0.60)' : 'rgba(2,100,163,0.65)',
            fontFamily:  '"Fira Code","Cascadia Code","Consolas",monospace',
            fontSize:    11,
            lineHeight:  1,
            padding:     '1px 3px',
            borderRadius: 3,
            transition:  'color 0.12s',
          }}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {'>_'}
        </button>
      </div>

      {/* Log body */}
      {expanded && (
        <div
          ref={scrollRef}
          style={{
            maxHeight:  132,
            overflowY:  'auto',
            overflowX:  'hidden',
            padding:    '6px 10px 8px',
            fontFamily: '"Fira Code","Cascadia Code","Consolas",monospace',
            fontSize:   10,
            lineHeight: 1.7,
          }}
        >
          {visible.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <span style={{ color: dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.35)', flexShrink: 0 }}>
                [{entry.ts}]
              </span>
              <span style={{ color: TYPE_COL[entry.type] ?? TYPE_COL.info, wordBreak: 'break-word' }}>
                {entry.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
