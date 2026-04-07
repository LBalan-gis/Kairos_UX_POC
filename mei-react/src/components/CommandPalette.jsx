import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

const COMMANDS = [
  { id: 'gen_inc', icon: '📄', title: 'Generate Incident Report', desc: 'Create a formal deviation log for the active anomaly', action: (dispatch) => dispatch('generate incident report') },
  { id: 'gen_bat', icon: '📦', title: 'Generate Batch Record', desc: 'Snapshot output and quality metrics for the current run', action: (dispatch) => dispatch('generate batch report') },
  { id: 'gen_shf', icon: '⏱️', title: 'Generate Shift Handover', desc: 'Summarize open deviations and line status for next shift', action: (dispatch) => dispatch('generate shift report') },
  { id: 'sim_cor', icon: '🔧', title: 'Simulate Correction', desc: 'Run the physics prediction engine on a resolved state', action: (dispatch) => dispatch('simulate correction') },
  { id: 'shw_drf', icon: '📉', title: 'Show Drift Path', desc: 'Highlight the upstream propagation of the current fault', action: (dispatch) => dispatch('drift path') },
  { id: 'thm_drk', icon: '🌙', title: 'Toggle Dark Mode', desc: 'Switch interface contrast theme', action: (dispatch, store) => { store.toggleDark(); dispatch(''); } },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const openKairos = useAppStore(s => s.openKairos);
  const toggleDark = useAppStore(s => s.toggleDark);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
      setSearch('');
      setActiveIndex(0);
    }
  }, [open]);

  const filtered = COMMANDS.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.desc.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  const executeCommand = (cmd) => {
    setOpen(false);
    if (!cmd.action) return;
    
    cmd.action((msg) => {
      if (msg) {
        openKairos();
        // DisPATCH to window for Kairos to pick up
        window.dispatchEvent(new CustomEvent('kairos-cmd', { detail: msg }));
      }
    }, { toggleDark });
  };

  const handleKeyMap = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) {
        executeCommand(filtered[activeIndex]);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)'
        }} onClick={() => setOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: 540, background: '#111721', border: '1px solid #30363D',
              borderRadius: 12, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {/* Input Header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #30363D' }}>
              <span style={{ color: '#8FA0BE', fontSize: 18, marginRight: 12 }}>⚡</span>
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyMap}
                placeholder="Type a command or search..."
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 16, color: '#E8F0FF', fontWeight: 500
                }}
              />
              <span style={{ fontSize: 11, color: '#8FA0BE', background: '#21262D', padding: '4px 8px', borderRadius: 4, fontWeight: 600 }}>ESC</span>
            </div>

            {/* Command List */}
            <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 0' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', color: '#8FA0BE', fontSize: 14 }}>No commands found.</div>
              ) : (
                filtered.map((cmd, i) => (
                  <div
                    key={cmd.id}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setActiveIndex(i)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '12px 20px', cursor: 'pointer',
                      background: i === activeIndex ? '#1A2332' : 'transparent',
                      borderLeft: i === activeIndex ? '3px solid #58A6FF' : '3px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: 20, marginRight: 16, opacity: 0.9 }}>{cmd.icon}</span>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 14, color: i === activeIndex ? '#58A6FF' : '#E8F0FF', fontWeight: 600 }}>{cmd.title}</span>
                      <span style={{ fontSize: 12, color: '#8FA0BE', marginTop: 2 }}>{cmd.desc}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid #30363D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0D1117' }}>
              <span style={{ fontSize: 11, color: '#8b949e' }}>Use <strong>↑↓</strong> to navigate, <strong>Enter</strong> to select</span>
              <span style={{ fontSize: 11, color: '#8b949e', fontWeight: 500 }}>Mei OS Cmd</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
