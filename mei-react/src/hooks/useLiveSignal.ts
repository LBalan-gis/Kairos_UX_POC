import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useLiveSignal(intervalMs = 2400) {
  const bumpSignal = useAppStore((state) => state.bumpSignal);
  const liveIds = useAppStore((state) => state.liveIds);

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
  const ts = useAppStore((state) => (entityId ? state.signalTimestamps[entityId] ?? 0 : 0));
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
