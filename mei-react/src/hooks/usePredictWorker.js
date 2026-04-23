// ── Prediction Worker Hook ─────────────────────────────────────────────────────
// Manages the predict.worker.js lifecycle.
//
// Responsibilities:
//   1. Spawn the worker once on mount; terminate on unmount.
//   2. Subscribe to Zustand store — dispatch to worker whenever entityPhysics
//      reference changes (set by applyLiveReading or initEngine).
//   3. Debounce rapid sensor bursts into a single compute cycle (200 ms).
//   4. On worker response, write predictions back to the store via setPredictions.
//
// The store knows nothing about the worker. This hook is the only bridge.

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import PredictWorker from '../engine/predict.worker.js?worker';

// Debounce interval — batches sensor readings that arrive within this window
// into a single physics compute. 200 ms is imperceptible to operators and
// removes ~80 % of redundant predict() calls on a busy line.
const DEBOUNCE_MS = 200;

export function usePredictWorker() {
  const workerRef  = useRef(null);
  const timerRef   = useRef(null);
  const setPredictions = useAppStore((s) => s.setPredictions);

  // ── Debounced dispatch ────────────────────────────────────────────────────────
  const dispatch = useCallback((payload) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      workerRef.current?.postMessage(payload);
      timerRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  // ── Worker lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    const worker = new PredictWorker();
    workerRef.current = worker;

    worker.onmessage = ({ data }) => setPredictions(data);
    worker.onerror   = (err)     => console.error('[PredictWorker]', err.message);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      worker.terminate();
    };
  }, [setPredictions]);

  // ── Store subscription ────────────────────────────────────────────────────────
  // Watch entityPhysics reference — it changes on every applyLiveReading call.
  // Use Zustand's raw subscribe (no middleware needed) to avoid React re-render
  // overhead from useAppStore inside the subscription closure.
  useEffect(() => {
    let prevPhysics = useAppStore.getState().entityPhysics;

    const unsubscribe = useAppStore.subscribe((state) => {
      if (state.entityPhysics === prevPhysics) return;
      prevPhysics = state.entityPhysics;

      dispatch({
        entityPhysics:      state.entityPhysics,
        relationPropagation: state.relationPropagation,
        relations:           state.relations,
        scenarios:           state.scenarios,
        entities:            state.entities,
      });
    });

    return unsubscribe;
  }, [dispatch]);
}
