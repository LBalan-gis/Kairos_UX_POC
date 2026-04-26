import type { Entity, Relation, ZoneId } from './domain';
import type { ChartKey } from './charts';
import type { FloorConfig } from './floor';
import type { SpatialWidgetEntry } from './widgets';
import type {
  EntityPhysicsMap,
  PredictionResult,
  RelationPropagationMap,
  Scenario,
} from './simulation';
import type { GraphContentConfig, TenantConfig } from './config';
import type { PlantRuntimeContext } from '../domain/plant/model';

export type AppView = 'floor' | 'graph' | 'kpi';

export interface Position {
  x: number;
  y: number;
}

export interface PinnedChart {
  id: string;
  title: string;
  chartKey: ChartKey;
}

export interface PendingMachine {
  id?: string;
  line?: string;
  [key: string]: unknown;
}

export interface ActionLogEntry {
  id?: string;
  [key: string]: unknown;
}

export interface SimulationStoreState {
  scenarios: Scenario[];
  predictions: PredictionResult[];
  simulatedTime: number | null;
  activeScenario: string;
}

export interface PlantStoreState extends PlantRuntimeContext {}

export interface AppStoreState {
  entities: Entity[];
  relations: Relation[];
  entityMap: Record<string, Entity>;
  entityPhysics: EntityPhysicsMap;
  relationPropagation: RelationPropagationMap;
  simulation: SimulationStoreState;
  plant: PlantStoreState;
  zoneMap: Record<string, ZoneId>;
  zoneLabels: Record<ZoneId, string>;
  floorConfig: FloorConfig | null;
  graphConfig: GraphContentConfig | null;
  view: AppView;
  positions: Record<string, Position>;
  pinnedIds: Set<string>;
  tempIds: Set<string>;
  visibleIds: Set<string>;
  focusId: string | null;
  focusNeighborhood: Set<string>;
  focusEdgeIds: Set<string>;
  dark: boolean;
  kairosOpen: boolean;
  kairosEntityId: string | null;
  pinnedCharts: PinnedChart[];
  onboardingOpen: boolean;
  pendingMachines: PendingMachine[];
  actionLog: ActionLogEntry[];
  spatialWidgets: SpatialWidgetEntry[];
}

export interface AppStoreActions {
  setView: (view: AppView) => void;
  initEngine: (config: TenantConfig) => void;
  setPositions: (positions: Record<string, Position>) => void;
  setNodePosition: (id: string, pos: Position) => void;
  enterFocus: (entityId: string) => void;
  exitFocus: () => void;
  revealAll: () => void;
  pinNode: (id: string) => void;
  setSimulatedTime: (time: number | null) => void;
  setActiveScenario: (id: string) => void;
  setPredictions: (predictions: PredictionResult[]) => void;
  applyLiveReading: (
    entityId: string,
    state: Entity['state'],
    metrics?: Record<string, string | number>,
    value?: number
  ) => void;
  toggleDark: () => void;
  openKairos: (entityId?: string | null) => void;
  closeKairos: () => void;
  pinChart: (item: PinnedChart) => void;
  unpinChart: (id: string) => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  addPendingMachine: (machine: PendingMachine) => void;
  setMachineOffline: (id: string) => void;
  setMachineOnline: (id: string) => void;
  clearOffline: () => void;
  addActionLog: (entry: ActionLogEntry) => void;
  clearActionLog: () => void;
  addSpatialWidget: (widget: SpatialWidgetEntry) => void;
  removeSpatialWidget: (id: string) => void;
  clearSpatialWidgets: () => void;
  bumpSignal: (ids: string[]) => void;
}

export type AppStore = AppStoreState & AppStoreActions;
