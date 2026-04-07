import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";

/**
 * Starts the live signal simulation tick.
 * Call once at the app root. Updates signalTimestamps in the store every 2.4s.
 */
export function useLiveSignal(intervalMs = 2400) {
  const bumpSignal = useAppStore((s) => s.bumpSignal);
  const liveIds = useAppStore((s) => s.liveIds);

  useEffect(() => {
    if (liveIds.length === 0) return;
    // seed initial timestamps
    bumpSignal(liveIds);

    const timer = setInterval(() => {
      bumpSignal(liveIds);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [bumpSignal, intervalMs, liveIds]);
}

/**
 * Returns a human-readable age string for a node's last signal update.
 * e.g. "just now", "2 min ago", "stale"
 */
export function useSignalAge(entityId) {
  const ts = useAppStore((s) => s.signalTimestamps[entityId] ?? 0);
  const [now, setNow] = useState(() => Date.now());
  
  useEffect(() => {
    if (!ts) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ts]);
  
  if (!ts) return "";
  const delta = Math.floor((now - ts) / 1000);
  if (delta < 10)  return "just now";
  if (delta < 60)  return `${delta}s ago`;
  if (delta < 120) return "1 min ago";
  return `${Math.floor(delta / 60)} min ago`;
}
