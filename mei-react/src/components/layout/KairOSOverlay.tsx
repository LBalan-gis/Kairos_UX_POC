import { lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CSSProperties } from 'react';
import { useAppStore } from '../../store/useAppStore';
import './KairOSOverlay.css';

const KairosRuntime = lazy(() =>
  import('./KairosRuntime').then((module) => ({ default: module.KairosRuntime }))
);

interface KairosTokens {
  panelBg: string;
  panelBorder: string;
  panelShadow: string;
  headerBg: string;
  headerBorder: string;
  brand: string;
  subtitle: string;
  closeBorder: string;
  closeBg: string;
  closeColor: string;
  placeholder: string;
}

function getKairosTokens(dark: boolean): KairosTokens {
  return dark ? {
    panelBg:      'linear-gradient(170deg,rgba(22,28,36,0.96) 0%,rgba(16,20,28,0.96) 100%)',
    panelBorder:  'rgba(255,255,255,0.12)',
    panelShadow:  '-1px 0 8px rgba(0,0,0,0.30)',
    headerBg:     'rgba(30,40,50,0.4)',
    headerBorder: 'rgba(255,255,255,0.08)',
    brand:        '#9BD2FF',
    subtitle:     'rgba(255,255,255,0.60)',
    closeBorder:  'rgba(255,255,255,0.15)',
    closeBg:      'rgba(255,255,255,0.08)',
    closeColor:   'rgba(255,255,255,0.80)',
    placeholder:  'rgba(255,255,255,0.5)',
  } : {
    panelBg:      'linear-gradient(170deg,rgba(248,244,236,0.99) 0%,rgba(239,234,224,0.99) 100%)',
    panelBorder:  'rgba(38,42,48,0.09)',
    panelShadow:  '-4px 0 14px rgba(38,42,48,0.04)',
    headerBg:     'rgba(248,244,236,0.76)',
    headerBorder: 'rgba(38,42,48,0.07)',
    brand:        '#0F766E',
    subtitle:     '#5F655F',
    closeBorder:  'rgba(38,42,48,0.09)',
    closeBg:      'rgba(38,42,48,0.04)',
    closeColor:   '#3D4652',
    placeholder:  '#6E756F',
  };
}

export const KairOSOverlay = () => {
  const kairosOpen  = useAppStore((state) => state.kairosOpen);
  const closeKairos = useAppStore((state) => state.closeKairos);
  const openKairos  = useAppStore((state) => state.openKairos);
  const dark        = useAppStore((state) => state.dark);
  const T           = getKairosTokens(dark);

  return (
    <>
      <AnimatePresence mode="wait">
        {!kairosOpen && (
          <motion.button
            key="kai-invoker"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={openKairos}
            className="kairos-overlay-launcher"
            style={{
              '--kai-launcher-bg': T.panelBg,
              '--kai-launcher-border': T.panelBorder,
              '--kai-launcher-shadow': T.panelShadow,
            } as CSSProperties}
          >
            <svg viewBox="0 0 100 100" width="26" height="26" className="kairos-overlay-launcher-icon">
              <path d="M 74 26 A 34 34 0 1 0 74 74" stroke={dark ? '#E2E8F0' : '#2A2F35'} strokeWidth="6" fill="none" strokeLinecap="round" />
              <line x1="16" y1="50" x2="37" y2="50" stroke={dark ? '#E2E8F0' : '#2A2F35'} strokeWidth="6" strokeLinecap="round" />
              <circle cx="50" cy="50" r="8" fill="#FF5000" stroke={dark ? '#111721' : '#FFFFFF'} strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 10px rgba(255,80,0,0.85))' }} />
              <circle cx="63" cy="50" r="3" fill={dark ? '#E2E8F0' : '#2A2F35'} />
              <circle cx="72" cy="50" r="3" fill={dark ? '#E2E8F0' : '#2A2F35'} />
              <circle cx="81" cy="50" r="3" fill={dark ? '#E2E8F0' : '#2A2F35'} />
            </svg>
          </motion.button>
        )}
        {kairosOpen && (
          <Suspense fallback={null}>
            <KairosRuntime key="kai-panel" dark={dark} onClose={closeKairos} />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
};
