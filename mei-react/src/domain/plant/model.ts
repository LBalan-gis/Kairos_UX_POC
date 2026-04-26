import type { PlantReportBindings } from '../../types/config';

export interface PlantRuntimeContext {
  liveIds: string[];
  offlineIds: Set<string>;
  signalTimestamps: Record<string, number>;
  reportBindings: PlantReportBindings;
}

export interface PlantReportMetrics {
  oee: number;
  speed: number;
  tension: number;
}
