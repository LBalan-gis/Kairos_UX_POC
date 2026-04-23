import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

const TYPE_COL = {
  sys:  '#2AF1E5',
  ok:   '#4ade80',
  err:  '#f87171',
  warn: '#fbbf24',
  info: 'rgba(255,255,255,0.38)',
};

const TYPE_PREFIX = {
  sys:  'KAIROS_SYS',
  ok:   'OK        ',
  err:  'ERROR     ',
  warn: 'WARN      ',
  info: 'INFO      ',
};

export function ActionLedger() {
  const [open, setOpen] = useState(false);
  const actionLog    = useAppStore(s => s.actionLog);
  const clearLog     = useAppStore(s => s.clearActionLog);
  const logRef       = useRef(null);
  const prevLen      = useRef(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (logRef.current && open) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
    if (actionLog.length > prevLen.current && !open) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    prevLen.current = actionLog.length;
  }, [actionLog, open]);

  return (
    <div style={{ position: 'fixed', bottom: 28, left: 16, zIndex: 199, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, pointerEvents: 'auto' }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              width: 420, height: 220,
              background: 'rgba(5,10,18,0.97)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(42,241,229,0.14)',
              borderRadius: 12,
              boxShadow: '0 0 0 1px rgba(42,241,229,0.05), 0 20px 60px rgba(0,0,0,0.70)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px 5px', borderBottom: '1px solid rgba(42,241,229,0.08)', background: 'rgba(42,241,229,0.03)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2AF1E5', boxShadow: '0 0 6px #2AF1E5' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#2AF1E5', letterSpacing: '0.10em', fontFamily: 'monospace' }}>KAIROS_SYS</span>
                <span style={{ fontSize: 9, color: 'rgba(42,241,229,0.35)', fontFamily: 'monospace' }}>action ledger</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={clearLog} style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.06em' }}>CLR</button>
                <button onClick={() => setOpen(false)} style={{ fontSize: 12, color: 'rgba(255,255,255,0.30)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
            </div>

            {/* Log body */}
            <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 10px', fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace', fontSize: 10.5, lineHeight: 1.75 }}>
              {actionLog.length === 0 ? (
                <div style={{ color: 'rgba(42,241,229,0.20)', fontStyle: 'italic' }}>No actions issued yet. Commands executed by KairOS will appear here.</div>
              ) : actionLog.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 10, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <span style={{ color: 'rgba(255,255,255,0.20)', flexShrink: 0 }}>[{e.ts}]</span>
                  <span style={{ color: TYPE_COL[e.type], flexShrink: 0 }}>{TYPE_PREFIX[e.type] || 'INFO      '}</span>
                  <span style={{ color: e.type === 'ok' ? '#4ade80' : e.type === 'err' ? '#f87171' : 'rgba(255,255,255,0.72)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="KairOS Action Ledger"
        style={{
          width: 34, height: 34, borderRadius: 9,
          background: open ? 'rgba(42,241,229,0.10)' : 'rgba(5,10,18,0.85)',
          border: `1px solid ${open ? 'rgba(42,241,229,0.38)' : flash ? 'rgba(42,241,229,0.50)' : 'rgba(42,241,229,0.16)'}`,
          backdropFilter: 'blur(16px)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#2AF1E5' : flash ? '#2AF1E5' : 'rgba(255,255,255,0.35)',
          fontSize: 11.5, fontFamily: 'monospace', fontWeight: 700,
          boxShadow: flash && !open ? '0 0 10px rgba(42,241,229,0.25)' : 'none',
          transition: 'all 0.18s',
        }}
      >&gt;_</button>
    </div>
  );
}
