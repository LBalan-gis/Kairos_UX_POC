export type MetricSeverity = 'crit' | 'warn' | 'ok';
export type FloorLineTheme = 'l1' | 'l2';

export interface FloorMachineMetric {
  tag: string;
  label: string;
  value: string;
  s: MetricSeverity;
}

export interface FloorMachine {
  id: string;
  label: string;
  type: string;
  stateLabel: string;
  state: string;
  color: string;
  componentClass: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  entityId?: string;
  lineTheme?: FloorLineTheme;
  metrics?: FloorMachineMetric[];
}

export interface FloorLine {
  id: string;
  label: string;
  lineTheme: FloorLineTheme;
  lz: number;
  armZCenter: number;
  armLen: number;
  armZFar: number;
  order: string[];
  machines: FloorMachine[];
}

export interface FloorCausalSeg {
  xCenter: number;
  xLen: number;
  fromEntity: string;
  dampingFactor: number;
}

export interface FloorBounds {
  w: number;
  d: number;
  cx: number;
  cz: number;
}

export interface FloorConfig {
  bounds: FloorBounds;
  cleanRooms: Array<{ cx: number; cz: number }>;
  lines: FloorLine[];
  causalSegs: FloorCausalSeg[];
  armSeg: { fromEntity: string; dampingFactor: number };
}
