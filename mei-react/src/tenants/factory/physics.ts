import type { EntityPhysicsMap, RelationPropagationMap } from '../../types/simulation';

export const ENTITY_PHYSICS: EntityPhysicsMap = {
  film_tension: {
    type: 'sensor',
    currentValue: 34,
    targetValue: 42,
    unit: 'N',
    driftRate: -0.18,
    degradeDirection: 'down',
    thresholds: [
      { value: 38, severity: 'warning' },
      { value: 30, severity: 'critical' },
      { value: 24, severity: 'failure' },
    ],
    recoveryRate: 2.5,
  },
  env_humidity: {
    type: 'sensor',
    currentValue: 42,
    targetValue: 42,
    unit: '%RH',
    driftRate: 0,
    degradeDirection: 'up',
    thresholds: [
      { value: 55, severity: 'warning' },
      { value: 65, severity: 'critical' },
    ],
    recoveryRate: 0,
  },
  blister_machine: {
    type: 'asset',
    unit: 'bpm',
    setpoint: 240,
    currentValue: 218,
    stateMultipliers: {
      normal: 1.0,
      warning: 0.908,
      critical: 0.65,
      failure: 0.0,
    },
    uiMapper: (state, physics) => ({
      Speed: `${Math.round((physics.setpoint ?? 0) * (physics.stateMultipliers?.[state] ?? 1))} bpm`,
    }),
  },
  cartoner: {
    type: 'asset',
    unit: 'cpm',
    setpoint: 160,
    currentValue: 142,
    stateMultipliers: {
      normal: 1.0,
      warning: 0.888,
      critical: 0.5,
      failure: 0.0,
    },
    uiMapper: (state) => state === 'normal'
      ? { Faults: 'Clear', 'Starve Events': '0', 'Avg Gap': '-' }
      : {},
  },
  blister_speed: {
    type: 'derived',
    unit: 'bpm',
    setpoint: 240,
    currentValue: 218,
    uiMapper: (state, _physics, getSibling) => {
      const blisterMachine = getSibling('blister_machine');
      const speed = Math.round((blisterMachine?.setpoint ?? 0) * (blisterMachine?.stateMultipliers?.[state] ?? 1));
      return {
        Actual: `${speed} bpm`,
        Deviation: speed - 240 === 0 ? '0 bpm' : `${speed - 240} bpm`,
      };
    },
  },
  reject_count: {
    type: 'quality',
    unit: '%',
    limitRate: 1.5,
    currentRate: 4.2,
    rateByMachineState: {
      normal: 0.8,
      warning: 4.2,
      critical: 8.5,
      failure: 15.0,
    },
    uiMapper: (state, physics) => ({
      Rate: `${physics.rateByMachineState?.[state] ?? 0.8}%`,
    }),
  },
  hidden_loss: {
    type: 'accumulator',
    unit: 'min',
    currentLoss: 23,
    rateByState: {
      normal: 0.0,
      warning: 0.4,
      critical: 0.85,
      failure: 1.0,
    },
    uiMapper: (state) => state === 'normal' ? { Severity: 'Stabilized' } : {},
  },
  planned_vs_actual: {
    type: 'gap',
    unit: 'units',
    currentGap: 1840,
    gapRateByState: {
      normal: 0.0,
      warning: 2.3,
      critical: 4.5,
      failure: 8.0,
    },
  },
  serialization_queue: {
    type: 'queue',
    unit: 'units',
    queueCurrent: 340,
    thresholds: [
      { value: 200, severity: 'warning' },
      { value: 500, severity: 'critical' },
    ],
    uiMapper: (state) => state === 'normal' ? { Queue: 'Clearing', Risk: 'Mitigated' } : {},
  },
  batch_current: {
    type: 'batch',
    unitValueGBP: 15.45,
    targetUnits: 2960,
    currentUnits: 1120,
  },
};

export const RELATION_PROPAGATION: RelationPropagationMap = {
  r1: { delayMin: 1, type: 'immediate', dampingFactor: 1.0 },
  r2: { delayMin: 0, type: 'immediate', dampingFactor: 1.0 },
  r3: { delayMin: 2, type: 'gradual', dampingFactor: 0.9 },
  r4: { delayMin: 0, type: 'gradual', dampingFactor: 0.7 },
  r5: { delayMin: 0, type: 'gradual', dampingFactor: 0.9 },
  r6: { delayMin: 0, type: 'immediate', dampingFactor: 1.0 },
  r7: { delayMin: 1, type: 'gradual', dampingFactor: 0.6 },
  r8: { delayMin: 0, type: 'immediate', dampingFactor: 1.0 },
  r9: { delayMin: 0, type: 'immediate', dampingFactor: 1.0 },
  r10: { delayMin: 0, type: 'immediate', dampingFactor: 1.0 },
};
