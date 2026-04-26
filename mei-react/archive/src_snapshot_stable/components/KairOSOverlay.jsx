import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

export const KairOSOverlay = () => {
  const kairosOpen     = useAppStore((s) => s.kairosOpen);
  const kairosEntityId = useAppStore((s) => s.kairosEntityId);
  const entityMap      = useAppStore((s) => s.entityMap);
  const closeKairos    = useAppStore((s) => s.closeKairos);
  const openKairos     = useAppStore((s) => s.openKairos);

  const entity = kairosEntityId ? entityMap[kairosEntityId] : null;

  return (
    <>
      {/* Orb */}
      <button
        onClick={() => kairosOpen ? closeKairos() : openKairos()}
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #7A5CAD 0%, #4A5AA8 100%)',
          boxShadow: '0 4px 20px rgba(122,92,173,0.4)',
          cursor: 'pointer',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          color: 'white',
        }}
        title="KairOS"
      >
        ✦
      </button>

      {/* Pane */}
      <AnimatePresence>
        {kairosOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: 96,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 420,
              maxHeight: '60vh',
              overflowY: 'auto',
              background: 'rgba(22,30,42,0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 1px 0 0 rgba(255,255,255,0.14) inset, 0 20px 60px rgba(0,0,0,0.40)',
              zIndex: 199,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7A5CAD' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A990D4' }}>
                  KairOS
                </span>
              </div>
              <button onClick={closeKairos} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.45)' }}>×</button>
            </div>

            {entity ? (
              <>
                <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
                  {entity.label}
                </p>
                {entity.metadata?.detail && (
                  <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.55)' }}>
                    {entity.metadata.detail}
                  </p>
                )}
                {entity.insight && (
                  <div style={{ background: 'rgba(122,92,173,0.18)', borderLeft: '3px solid #7A5CAD', borderRadius: 4, padding: '10px 12px', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.80)' }}>{entity.insight}</div>
                    {entity.action && (
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#A990D4', marginTop: 4 }}>
                        → {entity.action}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.60)', lineHeight: 1.6 }}>
                Film tension drift on BM-1101 is starving the line — 23 min hidden micro-stop loss unlogged.
                Root cause probability <strong>83%</strong>. Adjust tension roller to 42 N to recover shift target in 12 min.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
