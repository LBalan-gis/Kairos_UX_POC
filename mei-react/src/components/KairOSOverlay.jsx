import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { KairOS } from './kairos/KairOS';
import { useKairos } from './kairos/KairosContext';

function getKairosTokens(dark) {
  return dark ? {
    panelBg:      'linear-gradient(170deg,rgba(22,28,36,0.85) 0%,rgba(16,20,28,0.85) 100%)',
    panelBorder:  'rgba(255,255,255,0.12)',
    panelShadow:  '0 1px 0 rgba(255,255,255,0.10) inset, 0 16px 48px rgba(0,0,0,0.60)',
    headerBg:     'rgba(30,40,50,0.4)',
    headerBorder: 'rgba(255,255,255,0.08)',
    brand:        '#2AF1E5',
    subtitle:     'rgba(255,255,255,0.60)',
    closeBorder:  'rgba(255,255,255,0.15)',
    closeBg:      'rgba(255,255,255,0.08)',
    closeColor:   'rgba(255,255,255,0.80)',
    placeholder:  'rgba(255,255,255,0.5)',
  } : {
    panelBg:      'linear-gradient(170deg,rgba(255,255,255,0.85) 0%,rgba(245,247,250,0.85) 100%)',
    panelBorder:  'rgba(0,0,0,0.10)',
    panelShadow:  '0 1px 0 rgba(255,255,255,0.80) inset, 0 16px 48px rgba(0,0,0,0.15)',
    headerBg:     'rgba(0,0,0,0.03)',
    headerBorder: 'rgba(0,0,0,0.06)',
    brand:        '#0284C7',
    subtitle:     'rgba(0,0,0,0.60)',
    closeBorder:  'rgba(0,0,0,0.12)',
    closeBg:      'rgba(0,0,0,0.05)',
    closeColor:   'rgba(0,0,0,0.70)',
    placeholder:  'rgba(0,0,0,0.4)',
  };
}

// ─── Inner panel — consumes context ──────────────────────────────────────────
function KairosPanel({ onClose }) {
  const { dark } = useKairos();
  const T = getKairosTokens(dark);

  return (
    <motion.div
      initial={{ opacity:0, x:'38.2vw' }}
      animate={{ opacity:1, x:0 }}
      exit={{ opacity:0, x:'38.2vw' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position:'fixed', top:96, right:0, bottom:0,
        width:'38.2vw',
        display:'flex', flexDirection:'column',
        background:T.panelBg,
        backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)',
        borderLeft:`1px solid ${T.panelBorder}`,
        boxShadow:T.panelShadow,
        zIndex:199, overflow:'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding:'13px 18px 11px', borderBottom:`1px solid ${T.headerBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:T.headerBg }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:20, height:20 }}>
            <svg viewBox="0 0 100 100" width="20" height="20" style={{ overflow: 'visible' }}>
              <path d="M 74 26 A 34 34 0 1 0 74 74" stroke={dark ? '#E2E8F0' : '#1A202C'} strokeWidth="6" fill="none" strokeLinecap="round" />
              <line x1="16" y1="50" x2="37" y2="50" stroke={dark ? '#E2E8F0' : '#1A202C'} strokeWidth="6" strokeLinecap="round" />
              
              {/* Blinking outer glow shadow */}
              <circle cx="50" cy="50" r="8" fill="#FF5000" style={{ animation: 'statusBlink 2.4s ease-in-out infinite', filter: 'drop-shadow(0 0 12px rgba(255,80,0,1))' }} />
              {/* Solid core with border matching header background to create negative space */}
              <circle cx="50" cy="50" r="8" fill="#FF5000" stroke={T.headerBg} strokeWidth="3" />
              
              {/* Fibonacci Trailing Dots */}
              <circle cx="63" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} />
              <circle cx="72" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} />
              <circle cx="81" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} />
            </svg>
          </div>
          <div>
            <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:T.brand, lineHeight:1.1 }}>KairOS</div>
            <div style={{ fontSize:10, color:T.subtitle, marginTop:1 }}>Online · Monitoring 14 tags</div>
          </div>
        </div>
        <button onClick={onClose} style={{ border:`1px solid ${T.closeBorder}`, background:T.closeBg, cursor:'pointer', width:26, height:26, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', color:T.closeColor, fontSize:14, lineHeight:1 }}>×</button>
      </div>

      <KairOS.Thread />
      <KairOS.ChipRail />
      <KairOS.Input />
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export const KairOSOverlay = () => {
  const kairosOpen  = useAppStore(s => s.kairosOpen);
  const closeKairos = useAppStore(s => s.closeKairos);
  const openKairos  = useAppStore(s => s.openKairos);
  const dark        = useAppStore(s => s.dark);
  const T           = getKairosTokens(dark);

  return (
    <>
      <style>{`
        .kai-thread::-webkit-scrollbar { width:3px; }
        .kai-thread::-webkit-scrollbar-track { background:transparent; }
        .kai-thread::-webkit-scrollbar-thumb { background:rgba(169,144,212,0.25); border-radius:4px; }
        .kai-chips::-webkit-scrollbar { display:none; }
        .kai-chips { scrollbar-width:none; -ms-overflow-style:none; }
        .kai-chip { transition:all 0.1s; }
        .kai-input:focus { outline:none; border-color:${T.brand} !important; }
        .kai-input::placeholder  { color:${T.placeholder}; }
      `}</style>

      <KairOS.Provider>
        <AnimatePresence mode="wait">
          {!kairosOpen && (
            <motion.button
              key="kai-invoker"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={openKairos}
              style={{
                position:'fixed', bottom:68, right:16, zIndex: 9999,
                width: 44, height: 44, borderRadius: '50%',
                border: `1px solid ${T.panelBorder}`,
                background: T.panelBg,
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                boxShadow: T.panelShadow,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 100 100" width="26" height="26" style={{ overflow: 'visible' }}>
                <path d="M 74 26 A 34 34 0 1 0 74 74" stroke={dark ? '#E2E8F0' : '#2A2F35'} strokeWidth="6" fill="none" strokeLinecap="round" />
                <line x1="16" y1="50" x2="37" y2="50" stroke={dark ? '#E2E8F0' : '#2A2F35'} strokeWidth="6" strokeLinecap="round" />
                <circle cx="50" cy="50" r="8" fill="#FF5000" stroke={dark ? '#111721' : '#FFFFFF'} strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 10px rgba(255,80,0,0.85))' }} />
                <circle cx="63" cy="50" r="3" fill={dark ? '#E2E8F0' : '#2A2F35'} />
                <circle cx="72" cy="50" r="3" fill={dark ? '#E2E8F0' : '#2A2F35'} />
                <circle cx="81" cy="50" r="3" fill={dark ? '#E2E8F0' : '#2A2F35'} />
              </svg>
            </motion.button>
          )}
          {kairosOpen && <KairosPanel key="kai-panel" onClose={closeKairos} />}
        </AnimatePresence>
        <KairOS.CFRGate />
      </KairOS.Provider>
    </>
  );
};
