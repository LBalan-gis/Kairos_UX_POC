import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/useAppStore';
import { selectPlantRuntime, selectSignalTimestamp } from '../domain/plant/selectors';

export function useLiveSignal(intervalMs = 2400) {
  const bumpSignal = useAppStore((state) => state.bumpSignal);
  const { liveIds } = useAppStore(useShallow(selectPlantRuntime));

  useEffect(() => {
    if (liveIds.length === 0) return;

    bumpSignal(liveIds);
    const timer = window.setInterval(() => {
      bumpSignal(liveIds);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [bumpSignal, intervalMs, liveIds]);
}

export function useSignalAge(entityId: string | null) {
  const ts = useAppStore((state) => selectSignalTimestamp(entityId, state));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ts) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ts]);

  if (!ts) return '';
  const delta = Math.floor((now - ts) / 1000);
  if (delta < 10) return 'just now';
  if (delta < 60) return `${delta}s ago`;
  if (delta < 120) return '1 min ago';
  return `${Math.floor(delta / 60)} min ago`;
}
