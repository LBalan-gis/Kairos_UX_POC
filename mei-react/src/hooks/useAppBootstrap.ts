import { useEffect, useRef } from 'react';
import type { TenantConfig } from '../types/config';
import { useAppStore } from '../store/useAppStore';
import { useLiveSignal } from './useLiveSignal';
import { useLiveData } from './useLiveData';
import { usePredictWorker } from './usePredictWorker';

export function useAppBootstrap(config: TenantConfig) {
  const initEngine = useAppStore((state) => state.initEngine);
  const initialized = useRef(false);

  useEffect(() => {
    if (config && !initialized.current) {
      initEngine(config);
      initialized.current = true;
    }
  }, [config, initEngine]);

  useLiveSignal();
  useLiveData();
  usePredictWorker();
}
