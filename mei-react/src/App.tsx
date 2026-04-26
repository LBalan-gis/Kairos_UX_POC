import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store/useAppStore';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { AppToolbar } from './components/layout/AppToolbar';
import { ScrubberBar } from './components/layout/ScrubberBar';
import { KairOSOverlay } from './components/layout/KairOSOverlay';
import type { TenantConfig } from './types/config';
import './components/layout/AppToolbar.css';

const FloorMapLayer = lazy(() =>
  import('./components/floor/FloorMapLayer').then((module) => ({ default: module.FloorMapLayer }))
);
const GraphWhiteboardLayer = lazy(() =>
  import('./components/graph/GraphWhiteboardLayer').then((module) => ({ default: module.GraphWhiteboardLayer }))
);
const KPIDashboard = lazy(() =>
  import('./components/kpi/KPIDashboard').then((module) => ({ default: module.KPIDashboard }))
);
const MachineOnboardingWizard = lazy(() =>
  import('./components/onboarding/MachineOnboardingWizard').then((module) => ({ default: module.MachineOnboardingWizard }))
);
const CommandPalette = lazy(() =>
  import('./components/command/CommandPalette').then((module) => ({ default: module.CommandPalette }))
);

function AppSurface() {
  const view = useAppStore((state) => state.view);
  const kairosOpen = useAppStore((state) => state.kairosOpen);
  const [hasVisitedFloor, setHasVisitedFloor] = useState(view === 'floor');

  useEffect(() => {
    if (view === 'floor') {
      setHasVisitedFloor(true);
    }
  }, [view]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', height: '100%' }}>
      <div
        style={{
          position: 'relative',
          height: '100%',
          width: kairosOpen ? 'calc(100% - 38.2vw)' : '100%',
        }}
      >
        {hasVisitedFloor && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: view === 'floor' ? 'block' : 'none' }}>
            <Suspense fallback={null}><FloorMapLayer /></Suspense>
            <div style={{ position: 'absolute', top: 6, left: 'var(--layout-floor-stage-left)', right: 12, zIndex: 30, pointerEvents: 'none' }}>
              <ScrubberBar />
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {view === 'graph' && (
            <motion.div
              key="graph"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 2 }}
            >
              <Suspense fallback={null}><GraphWhiteboardLayer /></Suspense>
              <div style={{ position: 'absolute', top: 6, left: 12, right: 12, zIndex: 30, pointerEvents: 'none' }}>
                <ScrubberBar />
              </div>
            </motion.div>
          )}

          {view === 'kpi' && (
            <motion.div
              key="kpi"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column' }}
            >
              <Suspense fallback={null}><KPIDashboard /></Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <KairOSOverlay />
    </div>
  );
}

export default function App({ config }: { config: TenantConfig }) {
  useAppBootstrap(config);

  const dark = useAppStore((state) => state.dark);

  return (
    <div
      data-theme={dark ? 'dark' : 'light'}
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: dark ? '#000000' : '#FFFFFF',
        display: 'grid',
        gridTemplateRows: '44px 1fr',
      }}
    >
      <AppToolbar />
      <AppSurface />
      <Suspense fallback={null}><MachineOnboardingWizard /></Suspense>
      <Suspense fallback={null}><CommandPalette /></Suspense>
    </div>
  );
}
