import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import PredictWorker from '../engine/predict.worker?worker';
import type { AppStore } from '../types/store';
import type { Entity, Relation } from '../types/domain';
import type {
  EntityPhysicsMap,
  PredictionResult,
  RelationPropagationMap,
  Scenario,
} from '../types/simulation';

const DEBOUNCE_MS = 200;

interface PredictWorkerPayload {
  entityPhysics: EntityPhysicsMap;
  relationPropagation: RelationPropagationMap;
  relations: Relation[];
  scenarios: Scenario[];
  entities: Entity[];
}

interface PredictWorkerInstance extends Worker {
  onmessage: ((this: Worker, ev: MessageEvent<PredictionResult[]>) => unknown) | null;
}

export function usePredictWorker() {
  const workerRef = useRef<PredictWorkerInstance | null>(null);
  const timerRef = useRef<number | null>(null);
  const setPredictions = useAppStore((state) => state.setPredictions);

  const dispatch = useCallback((payload: PredictWorkerPayload) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      workerRef.current?.postMessage(payload);
      timerRef.current = null;
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const worker = new PredictWorker() as PredictWorkerInstance;
    workerRef.current = worker;

    worker.onmessage = ({ data }) => setPredictions(data);
    worker.onerror = (error) => console.error('[PredictWorker]', error.message);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      worker.terminate();
    };
  }, [setPredictions]);

  useEffect(() => {
    let prevPhysics = useAppStore.getState().entityPhysics;

    const unsubscribe = useAppStore.subscribe((state: AppStore) => {
      if (state.entityPhysics === prevPhysics) return;
      prevPhysics = state.entityPhysics;

      dispatch({
        entityPhysics: state.entityPhysics,
        relationPropagation: state.relationPropagation,
        relations: state.relations,
        scenarios: state.simulation.scenarios,
        entities: state.entities,
      });
    });

    return unsubscribe;
  }, [dispatch]);
}
