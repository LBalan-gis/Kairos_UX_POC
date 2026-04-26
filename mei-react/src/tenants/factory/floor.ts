import type { FloorConfig } from '../../types/floor';

export const FLOOR_CONFIG: FloorConfig = {
  bounds: { w: 18.5, d: 14.0, cx: -1.0, cz: 2.25 },
  projection: {
    stateLabels: {
      normal: 'NORMAL',
      warning: 'WARNING',
      critical: 'CRITICAL',
      offline: 'OFFLINE',
      starved: 'STARVED',
      pending: 'PENDING',
    },
    componentDims: {
      BlisterMachine:       { w: 2.8, h: 1.2, d: 1.4 },
      Cartoner:             { w: 1.8, h: 1.8, d: 1.2 },
      SerializationStation: { w: 1.2, h: 1.5, d: 1.0 },
      InspectionMachine:    { w: 1.1, h: 1.8, d: 1.0 },
      Checkweigher:         { w: 1.4, h: 0.85, d: 1.2 },
      Labeler:              { w: 1.0, h: 1.3, d: 1.0 },
    },
    defaultDims: { w: 1.4, h: 1.2, d: 1.2 },
    pendingPlacement: {
      baseX: 8.2,
      xStep: 2.4,
      defaultLineRef: 'L1',
      defaultComponentClass: 'BlisterMachine',
      defaultColor: 'g1',
      defaultState: 'pending',
    },
  },

  cleanRooms: [
    { cx: -7.75, cz: -1.5 },
    { cx: -7.75, cz: 5.75 },
  ],

  causalSegs: [
    { xCenter: -5.75, xLen: 3.5, fromEntity: 'cartoner', dampingFactor: 0.9 },
  ],

  armSeg: { fromEntity: 'blister_machine', dampingFactor: 0.9 },

  lines: [
    {
      id: 'L1',
      label: 'Line 1',
      lineTheme: 'l1',
      lz: 0,
      armZCenter: -1.25,
      armLen: 2.5,
      armZFar: -2.5,
      order: ['bf_1101', 'ctn_1101', 'agg_1101', 'vis_1101', 'cw_1101', 'lab_1101'],
      machines: [
        {
          id: 'bf_1101', label: 'BF-1101', type: 'Blister Former',
          stateLabel: 'WARNING', state: 'warning', color: 'g1',
          lineTheme: 'l1',
          componentClass: 'BlisterMachine',
          x: -7.5, z: -2.5, w: 2.8, h: 1.2, d: 1.4,
          entityId: 'blister_machine',
          metrics: [
            { tag: 'FT-1101', label: 'Film Tension',  value: '34 N',    s: 'warn' },
            { tag: 'ST-1101', label: 'Blister Speed', value: '218 bpm', s: 'warn' },
            { tag: 'KPI-OEE', label: 'OEE',           value: '78.4 %',  s: 'warn' },
          ],
        },
        {
          id: 'ctn_1101', label: 'CTN-1101', type: 'Cartoner',
          stateLabel: 'CRITICAL', state: 'critical', color: 'g2',
          lineTheme: 'l1',
          componentClass: 'Cartoner',
          x: -7.5, z: 0.0, w: 1.8, h: 1.8, d: 1.2,
          entityId: 'cartoner',
          metrics: [
            { tag: 'ST-1101', label: 'Pack Rate',    value: '142 cpm', s: 'crit' },
            { tag: 'QE-1101', label: 'Reject Count', value: '14',      s: 'crit' },
            { tag: 'KPI-OEE', label: 'OEE',          value: '61.2 %',  s: 'crit' },
          ],
        },
        {
          id: 'agg_1101', label: 'AGG-1101', type: 'Aggregation Station',
          stateLabel: 'WARNING', state: 'warning', color: 'g3',
          lineTheme: 'l1',
          componentClass: 'SerializationStation',
          x: -4.0, z: 0.0, w: 1.2, h: 1.5, d: 1.0,
          entityId: 'serialization_queue',
          metrics: [
            { tag: 'AR-1101', label: 'Scan Rate', value: '99.1 %', s: 'warn' },
            { tag: 'QE-1101', label: 'Rejects',   value: '3',      s: 'warn' },
            { tag: 'KPI-OEE', label: 'OEE',       value: '82.7 %', s: 'warn' },
          ],
        },
        {
          id: 'vis_1101', label: 'VIS-1101', type: 'Vision Inspection System',
          stateLabel: 'NORMAL', state: 'normal', color: 'g2',
          lineTheme: 'l1',
          componentClass: 'InspectionMachine',
          x: -0.5, z: 0.0, w: 1.1, h: 1.8, d: 1.0,
          metrics: [
            { tag: 'AE-1101', label: 'Throughput',  value: '312 u/min', s: 'ok' },
            { tag: 'QE-1101', label: 'Reject Rate', value: '0.3 %',     s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',         value: '94.1 %',    s: 'ok' },
          ],
        },
        {
          id: 'cw_1101', label: 'CW-1101', type: 'Checkweigher',
          stateLabel: 'NORMAL', state: 'normal', color: 'g4',
          lineTheme: 'l1',
          componentClass: 'Checkweigher',
          x: 2.8, z: 0.0, w: 1.4, h: 0.85, d: 1.2,
          metrics: [
            { tag: 'WT-1101', label: 'Mean Weight', value: '482 mg', s: 'ok' },
            { tag: 'WT-1102', label: 'Std Dev',     value: '1.2 mg', s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',         value: '96.8 %', s: 'ok' },
          ],
        },
        {
          id: 'lab_1101', label: 'LAB-1101', type: 'Labeler',
          stateLabel: 'NORMAL', state: 'normal', color: 'g3',
          lineTheme: 'l1',
          componentClass: 'Labeler',
          x: 5.8, z: 0.0, w: 1.0, h: 1.3, d: 1.0,
          metrics: [
            { tag: 'ST-1102', label: 'Label Rate', value: '298 /min', s: 'ok' },
            { tag: 'QE-1102', label: 'Rejects',    value: '0',        s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',        value: '97.2 %',   s: 'ok' },
          ],
        },
      ],
    },
    {
      id: 'L2',
      label: 'Line 2',
      lineTheme: 'l2',
      lz: 4.5,
      armZCenter: 5.75,
      armLen: 2.5,
      armZFar: 7.0,
      order: ['bf_1201', 'ctn_1201', 'agg_1201', 'vis_1201', 'cw_1201', 'lab_1201'],
      machines: [
        {
          id: 'bf_1201', label: 'BF-1201', type: 'Blister Former',
          stateLabel: 'NORMAL', state: 'normal', color: 'g5',
          lineTheme: 'l2',
          componentClass: 'BlisterMachine',
          x: -7.5, z: 7.0, w: 2.8, h: 1.2, d: 1.4,
          metrics: [
            { tag: 'FT-1201', label: 'Film Tension',  value: '36 N',    s: 'ok' },
            { tag: 'ST-1201', label: 'Blister Speed', value: '224 bpm', s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',           value: '91.2 %',  s: 'ok' },
          ],
        },
        {
          id: 'ctn_1201', label: 'CTN-1201', type: 'Cartoner',
          stateLabel: 'NORMAL', state: 'normal', color: 'g4',
          lineTheme: 'l2',
          componentClass: 'Cartoner',
          x: -7.5, z: 4.5, w: 1.8, h: 1.8, d: 1.2,
          metrics: [
            { tag: 'ST-1201', label: 'Pack Rate', value: '158 cpm', s: 'ok' },
            { tag: 'QE-1201', label: 'Rejects',   value: '2',       s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',       value: '93.4 %',  s: 'ok' },
          ],
        },
        {
          id: 'agg_1201', label: 'AGG-1201', type: 'Aggregation Station',
          stateLabel: 'NORMAL', state: 'normal', color: 'g3',
          lineTheme: 'l2',
          componentClass: 'SerializationStation',
          x: -4.0, z: 4.5, w: 1.2, h: 1.5, d: 1.0,
          metrics: [
            { tag: 'AR-1201', label: 'Scan Rate', value: '99.8 %', s: 'ok' },
            { tag: 'QE-1201', label: 'Rejects',   value: '0',      s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',       value: '95.3 %', s: 'ok' },
          ],
        },
        {
          id: 'vis_1201', label: 'VIS-1201', type: 'Vision Inspection System',
          stateLabel: 'NORMAL', state: 'normal', color: 'g2',
          lineTheme: 'l2',
          componentClass: 'InspectionMachine',
          x: -0.5, z: 4.5, w: 1.1, h: 1.8, d: 1.0,
          metrics: [
            { tag: 'AE-1201', label: 'Throughput',  value: '318 u/min', s: 'ok' },
            { tag: 'QE-1201', label: 'Reject Rate', value: '0.2 %',     s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',         value: '95.8 %',    s: 'ok' },
          ],
        },
        {
          id: 'cw_1201', label: 'CW-1201', type: 'Checkweigher',
          stateLabel: 'NORMAL', state: 'normal', color: 'g5',
          lineTheme: 'l2',
          componentClass: 'Checkweigher',
          x: 2.8, z: 4.5, w: 1.4, h: 0.85, d: 1.2,
          metrics: [
            { tag: 'WT-1201', label: 'Mean Weight', value: '481 mg', s: 'ok' },
            { tag: 'WT-1202', label: 'Std Dev',     value: '1.1 mg', s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',         value: '97.5 %', s: 'ok' },
          ],
        },
        {
          id: 'lab_1201', label: 'LAB-1201', type: 'Labeler',
          stateLabel: 'NORMAL', state: 'normal', color: 'g1',
          lineTheme: 'l2',
          componentClass: 'Labeler',
          x: 5.8, z: 4.5, w: 1.0, h: 1.3, d: 1.0,
          metrics: [
            { tag: 'ST-1202', label: 'Label Rate', value: '302 /min', s: 'ok' },
            { tag: 'QE-1202', label: 'Rejects',    value: '0',        s: 'ok' },
            { tag: 'KPI-OEE', label: 'OEE',        value: '98.1 %',   s: 'ok' },
          ],
        },
      ],
    },
  ],
};
