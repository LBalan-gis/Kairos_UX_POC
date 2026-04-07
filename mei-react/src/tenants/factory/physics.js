// ── Entity physics parameters ────────────────────────────────────────────────
// Keyed by entity id (matches entities.js).
// Kept separate to avoid bloating the graph/display data in entities.js.
//
// Types:
//   sensor     — physical reading with drift rate and thresholds
//   asset      — machine whose throughput is a multiplier of its upstream state
//   derived    — follows a parent entity 1:1
//   accumulator — value grows over time based on upstream state
//   gap        — measures divergence between plan and actual
//   queue      — buffer that fills/drains based on upstream throughput
//   batch      — batch-level reference for outcome calculations

export const ENTITY_PHYSICS = {

  // ── Sensors ────────────────────────────────────────────────────────────────

  film_tension: {
    type: 'sensor',
    currentValue: 34,       // N  (current reading)
    targetValue:  42,       // N  (setpoint / normal)
    unit: 'N',
    driftRate: -0.18,       // N/min — degrading
    degradeDirection: 'down', // lower value = worse state
    thresholds: [
      { value: 38, severity: 'warning'  },
      { value: 30, severity: 'critical' },
      { value: 24, severity: 'failure'  },
    ],
    recoveryRate: 2.5,      // N/min when tension roller is adjusted
  },

  env_humidity: {
    type: 'sensor',
    currentValue: 42,
    targetValue:  42,
    unit: '%RH',
    driftRate: 0,
    degradeDirection: 'up',
    thresholds: [
      { value: 55, severity: 'warning'  },
      { value: 65, severity: 'critical' },
    ],
    recoveryRate: 0,
  },

  // ── Assets ─────────────────────────────────────────────────────────────────

  blister_machine: {
    type: 'asset',
    unit: 'bpm',
    setpoint: 240,
    currentValue: 218,
    // Throughput as fraction of setpoint at each state
    stateMultipliers: {
      normal:   1.000,
      warning:  0.908,   // 218 / 240
      critical: 0.650,
      failure:  0.000,
    },
    uiMapper: (state, p) => ({
      Speed: `${Math.round(p.setpoint * (p.stateMultipliers[state] ?? 1))} bpm`
    }),
  },

  cartoner: {
    type: 'asset',
    unit: 'cpm',
    setpoint: 160,
    currentValue: 142,
    stateMultipliers: {
      normal:   1.000,
      warning:  0.888,   // 142 / 160
      critical: 0.500,
      failure:  0.000,
    },
    uiMapper: (state) => state === 'normal'
      ? { Faults: 'Clear', 'Starve Events': '0', 'Avg Gap': '-' }
      : {},
  },

  // ── Derived ────────────────────────────────────────────────────────────────

  blister_speed: {
    type: 'derived',        // mirrors blister_machine throughput
    unit: 'bpm',
    setpoint: 240,
    currentValue: 218,
    uiMapper: (state, p, getSibling) => {
      // It derives its speed from the blister_machine's state
      const bm = getSibling('blister_machine');
      const spd = Math.round(bm.setpoint * (bm.stateMultipliers[state] ?? 1));
      return { Actual: `${spd} bpm`, Deviation: spd - 240 === 0 ? '0 bpm' : `${spd - 240} bpm` };
    },
  },

  // ── Quality ────────────────────────────────────────────────────────────────

  reject_count: {
    type: 'quality',
    unit: '%',
    limitRate: 1.5,
    currentRate: 4.2,
    // Reject % at each blister_machine state
    rateByMachineState: {
      normal:   0.8,
      warning:  4.2,
      critical: 8.5,
      failure:  15.0,
    },
    uiMapper: (state, p) => ({
      Rate: `${p.rateByMachineState[state] ?? 0.8}%`
    }),
  },

  // ── Accumulators ───────────────────────────────────────────────────────────

  hidden_loss: {
    type: 'accumulator',
    unit: 'min',
    currentLoss: 23,        // minutes lost so far this shift
    // Hidden loss accumulation rate (min loss / real min) per upstream state
    rateByState: {
      normal:   0.00,
      warning:  0.40,
      critical: 0.85,
      failure:  1.00,
    },
    uiMapper: (state) => state === 'normal' ? { Severity: 'Stabilized' } : {},
  },

  // ── Gap ────────────────────────────────────────────────────────────────────

  planned_vs_actual: {
    type: 'gap',
    unit: 'units',
    currentGap: 1840,       // units behind plan right now
    // Gap widens at this rate (units/min) per blister_machine state
    gapRateByState: {
      normal:   0.0,
      warning:  2.3,
      critical: 4.5,
      failure:  8.0,
    },
  },

  // ── Queue ──────────────────────────────────────────────────────────────────

  serialization_queue: {
    type: 'queue',
    unit: 'units',
    queueCurrent: 340,
    thresholds: [
      { value: 200, severity: 'warning'  },
      { value: 500, severity: 'critical' },
    ],
    uiMapper: (state) => state === 'normal' ? { Queue: 'Clearing', Risk: 'Mitigated' } : {},
  },

  // ── Batch ──────────────────────────────────────────────────────────────────

  batch_current: {
    type: 'batch',
    unitValueGBP: 15.45,    // £ per unit packed
    targetUnits: 2960,
    currentUnits: 1120,
  },
};

// ── Relation propagation parameters ─────────────────────────────────────────
// Keyed by relation id (matches RELATIONS in entities.js).
//
//   delayMin       — minutes before downstream entity feels the upstream change
//   type           — 'immediate' | 'gradual' (gradual = one severity step absorbed)
//   dampingFactor  — 0–1, fraction of upstream severity that propagates
//                    >0.7 = full propagation, 0.5–0.7 = one level down, <0.5 = absorbed

export const RELATION_PROPAGATION = {
  r1:  { delayMin: 1,  type: 'immediate', dampingFactor: 1.0 }, // film_tension  → blister_machine
  r2:  { delayMin: 0,  type: 'immediate', dampingFactor: 1.0 }, // blister_machine → blister_speed (PLC)
  r3:  { delayMin: 2,  type: 'gradual',   dampingFactor: 0.9 }, // blister_machine → cartoner (buffer)
  r4:  { delayMin: 0,  type: 'gradual',   dampingFactor: 0.7 }, // blister_speed   → hidden_loss
  r5:  { delayMin: 0,  type: 'gradual',   dampingFactor: 0.9 }, // cartoner        → hidden_loss
  r6:  { delayMin: 0,  type: 'immediate', dampingFactor: 1.0 }, // hidden_loss     → planned_vs_actual
  r7:  { delayMin: 1,  type: 'gradual',   dampingFactor: 0.6 }, // cartoner        → serialization_queue
  r8:  { delayMin: 0,  type: 'immediate', dampingFactor: 1.0 }, // blister_machine → reject_count
  r9:  { delayMin: 0,  type: 'immediate', dampingFactor: 1.0 }, // reject_count    → planned_vs_actual
  r10: { delayMin: 0,  type: 'immediate', dampingFactor: 1.0 }, // planned_vs_actual → batch_current
};
