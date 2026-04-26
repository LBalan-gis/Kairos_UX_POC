import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { KairOS } from '../kairos/KairOS';
import { useKairos } from '../kairos/KairosContext';

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
    panelBg:      'linear-gradient(170deg,rgba(247,248,246,0.99) 0%,rgba(238,240,237,0.99) 100%)',
    panelBorder:  'rgba(72,74,78,0.10)',
    panelShadow:  '-4px 0 14px rgba(72,74,78,0.06)',
    headerBg:     'rgba(247,248,246,0.76)',
    headerBorder: 'rgba(72,74,78,0.08)',
    brand:        '#0F766E',
    subtitle:     '#5E6668',
    closeBorder:  'rgba(72,74,78,0.10)',
    closeBg:      'rgba(72,74,78,0.05)',
    closeColor:   '#3D4652',
    placeholder:  '#6B7477',
  };
}

function KairosPanel({ onClose }: { onClose: () => void }) {
  const { dark } = useKairos();
  const T = getKairosTokens(dark);

  return (
    <motion.div
      initial={{ opacity: 0, x: '38.2vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '38.2vw' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="kairos-overlay-panel"
      style={{
        '--kai-panel-bg': T.panelBg,
        '--kai-panel-border': T.panelBorder,
        '--kai-panel-shadow': T.panelShadow,
        '--kai-header-bg': T.headerBg,
        '--kai-header-border': T.headerBorder,
        '--kai-brand': T.brand,
        '--kai-subtitle': T.subtitle,
        '--kai-close-border': T.closeBorder,
        '--kai-close-bg': T.closeBg,
        '--kai-close-color': T.closeColor,
        '--kai-input-placeholder': T.placeholder,
      } as CSSProperties}
    >
      <div className="kairos-overlay-header">
        <div className="kairos-overlay-headline">
          <div className="kairos-overlay-icon-wrap">
            <svg viewBox="0 0 100 100" width="20" height="20" className="kairos-overlay-icon">
              <path d="M 74 26 A 34 34 0 1 0 74 74" stroke={dark ? '#E2E8F0' : '#1A202C'} strokeWidth="6" fill="none" strokeLinecap="round" />
              <line x1="16" y1="50" x2="37" y2="50" stroke={dark ? '#E2E8F0' : '#1A202C'} strokeWidth="6" strokeLinecap="round" />
              <circle cx="50" cy="50" r="8" fill="#FF5000" style={{ animation: 'statusBlink 2.4s ease-in-out infinite', filter: 'drop-shadow(0 0 12px rgba(255,80,0,1))' }} />
              <circle cx="50" cy="50" r="8" fill="#FF5000" stroke={T.headerBg} strokeWidth="3" />
              <circle cx="63" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} />
              <circle cx="72" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} />
              <circle cx="81" cy="50" r="3" fill={dark ? '#E2E8F0' : '#1A202C'} />
            </svg>
          </div>
          <div className="kairos-overlay-title-block">
            <div className="kairos-overlay-title">KairOS</div>
            <div className="kairos-overlay-subtitle">Online · Monitoring 14 tags</div>
          </div>
        </div>
        <button onClick={onClose} className="kairos-overlay-close" type="button">×</button>
      </div>

      <KairOS.Thread />
      <KairOS.ChipRail />
      <KairOS.Input />
    </motion.div>
  );
}

export function KairosRuntime({ dark, onClose }: { dark: boolean; onClose: () => void }) {
  return (
    <KairOS.Provider>
      <KairosPanel onClose={onClose} />
      <KairOS.CFRGate />
    </KairOS.Provider>
  );
}
