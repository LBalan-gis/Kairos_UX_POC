/**
 * KairOS OT Simulator — Astellas PKG-1
 *
 * Simulates a live fault chain on a pharmaceutical packaging line.
 * Writes sensor readings to Supabase every TICK_INTERVAL seconds.
 *
 * Usage:
 *   node index.js              — starts the fault (film tension drift)
 *   node index.js --reset      — resets all values back to normal
 *
 * While running, type and enter:
 *   c   — apply correction (tension roller adjusted, starts recovery)
 *   r   — reset all entities to normal state
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 5_000;   // real seconds between ticks
const SPEED_FACTOR     = 10;       // simulated minutes per real minute
const TICK_MINUTES     = (TICK_INTERVAL_MS / 1_000 / 60) * SPEED_FACTOR;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// ── Physics definitions (mirrors tenants/astellas/physics.js) ─────────────────

const THRESHOLDS = {
  film_tension: {
    value: 42, degradeDirection: 'down',
    driftRate: -0.18, recoveryRate: 2.5,
    thresholds: [
      { value: 38, severity: 'warning'  },
      { value: 30, severity: 'critical' },
      { value: 24, severity: 'failure'  },
    ],
  },
};

const PROPAGATION = [
  // { from, to, delayTicks, type, dampingFactor }
  { from: 'film_tension',   to: 'blister_machine',    delayTicks: Math.round(1 / TICK_MINUTES), type: 'immediate', dampingFactor: 1.0 },
  { from: 'blister_machine', to: 'blister_speed',     delayTicks: 0,                            type: 'immediate', dampingFactor: 1.0 },
  { from: 'blister_machine', to: 'cartoner',          delayTicks: Math.round(2 / TICK_MINUTES), type: 'gradual',   dampingFactor: 0.9 },
  { from: 'blister_machine', to: 'reject_count',      delayTicks: 0,                            type: 'immediate', dampingFactor: 1.0 },
  { from: 'blister_speed',   to: 'hidden_loss',       delayTicks: 0,                            type: 'gradual',   dampingFactor: 0.7 },
  { from: 'cartoner',        to: 'hidden_loss',       delayTicks: 0,                            type: 'gradual',   dampingFactor: 0.9 },
  { from: 'hidden_loss',     to: 'planned_vs_actual', delayTicks: 0,                            type: 'immediate', dampingFactor: 1.0 },
  { from: 'planned_vs_actual', to: 'batch_current',   delayTicks: 0,                            type: 'immediate', dampingFactor: 1.0 },
  { from: 'blister_machine', to: 'serialization_queue', delayTicks: Math.round(1 / TICK_MINUTES), type: 'gradual', dampingFactor: 0.6 },
];

const STATE_ORDER = ['normal', 'warning', 'critical', 'failure'];

// ── Simulation state ──────────────────────────────────────────────────────────

let sim = {
  film_tension:        { value: 34, driftRate: -0.18, state: 'warning' },
  blister_machine:     { state: 'warning' },
  blister_speed:       { state: 'warning' },
  cartoner:            { state: 'critical' },
  hidden_loss:         { currentLoss: 23, state: 'warning' },
  planned_vs_actual:   { currentGap: 1840, state: 'warning' },
  reject_count:        { state: 'warning' },
  batch_current:       { currentUnits: 1120, state: 'warning' },
  serialization_queue: { queueCurrent: 340, state: 'warning' },
};

// Pending propagations: { to, state, triggerAtTick }
const pending = [];
let tick = 0;
let corrected = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeSensorState(value, def) {
  const sorted = [...def.thresholds].sort((a, b) =>
    def.degradeDirection === 'down' ? a.value - b.value : b.value - a.value,
  );
  if (def.degradeDirection === 'down') {
    for (const t of sorted) {
      if (value <= t.value) return t.severity;
    }
  } else {
    for (const t of sorted) {
      if (value >= t.value) return t.severity;
    }
  }
  return 'normal';
}

function propagateState(upstreamState, type, dampingFactor) {
  if (type === 'immediate') return upstreamState;
  const idx = STATE_ORDER.indexOf(upstreamState);
  if (dampingFactor < 0.7 && idx > 0) return STATE_ORDER[idx - 1];
  return upstreamState;
}

function metricsFor(entityId) {
  const s = sim[entityId];
  switch (entityId) {
    case 'film_tension':
      return { Target: '42 N', Actual: `${s.value.toFixed(1)} N`, Delta: `${(s.value - 42).toFixed(1)} N` };
    case 'blister_machine': {
      const speedMap = { normal: 240, warning: 218, critical: 156, failure: 0 };
      return { Speed: `${speedMap[s.state] ?? 218} bpm`, Setpoint: '240 bpm', 'Film Temp': '162 °C' };
    }
    case 'blister_speed': {
      const speedMap = { normal: 240, warning: 218, critical: 156, failure: 0 };
      const spd = speedMap[s.state] ?? 218;
      return { Actual: `${spd} bpm`, Deviation: `${spd - 240} bpm` };
    }
    case 'cartoner': {
      return s.state === 'normal' ? { Faults: 'Clear', 'Starve Events': '0', 'Avg Gap': '-' } : {};
    }
    case 'hidden_loss':
      return s.state === 'normal' ? { Severity: 'Stabilized' } : {};
    case 'planned_vs_actual': {
      const gap = Math.round(s.currentGap);
      return { Planned: '2 960 units', Actual: `${2960 - gap} units`, Gap: `−${gap} units` };
    }
    case 'reject_count': {
      const rateMap = { normal: 0.8, warning: 4.2, critical: 8.5, failure: 15.0 };
      return { Rate: `${rateMap[s.state] ?? 4.2}%` };
    }
    case 'batch_current': {
      return { Units: `${Math.round(s.currentUnits)} packed`, OEE: s.state === 'normal' ? '92.4%' : '78.4%', SKU: '41829', Shift: 'B' };
    }
    case 'serialization_queue':
      return { Queue: `${Math.round(s.queueCurrent)} units`, Threshold: '200 units', Risk: 'Patient safety' };
    default:
      return {};
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────

function resetAll() {
  sim = {
    film_tension:        { value: 42, driftRate: -0.18, state: 'normal' },
    blister_machine:     { state: 'normal' },
    blister_speed:       { state: 'normal' },
    cartoner:            { state: 'normal' },
    hidden_loss:         { currentLoss: 0,    state: 'normal' },
    planned_vs_actual:   { currentGap: 0,     state: 'normal' },
    reject_count:        { state: 'normal' },
    batch_current:       { currentUnits: 2960, state: 'normal' },
    serialization_queue: { queueCurrent: 0,   state: 'normal' },
  };
  corrected = false;
  pending.length = 0;
  console.log('↺  All entities reset to normal');
}

// ── Tick ──────────────────────────────────────────────────────────────────────

async function runTick() {
  tick++;

  // ── Advance film_tension ─────────────────────────────────────────────────
  const ft = sim.film_tension;
  ft.value = Math.min(50, Math.max(0, ft.value + ft.driftRate * TICK_MINUTES));
  const ftDef = THRESHOLDS.film_tension;
  const prevFtState = ft.state;
  ft.state = computeSensorState(ft.value, ftDef);

  // If corrected, stop drift once target value reached
  if (corrected && ft.value >= ftDef.value) {
    ft.value = ftDef.value;
    ft.driftRate = 0;
  }

  // ── Advance accumulator / gap values ────────────────────────────────────
  const bmState = sim.blister_machine.state;
  const lossRateMap = { normal: 0.00, warning: 0.40, critical: 0.85, failure: 1.00 };
  const gapRateMap  = { normal: 0.00, warning: 2.3,  critical: 4.5,  failure: 8.0  };
  const unitsRateMap= { normal: 4.0,  warning: 3.6,  critical: 2.5,  failure: 0.0  };

  sim.hidden_loss.currentLoss       += lossRateMap[bmState]  * TICK_MINUTES;
  sim.planned_vs_actual.currentGap  += gapRateMap[bmState]   * TICK_MINUTES;
  sim.batch_current.currentUnits    += unitsRateMap[bmState]  * TICK_MINUTES;

  const queueDrainMap = { normal: -5, warning: 2, critical: 6, failure: 10 };
  sim.serialization_queue.queueCurrent = Math.max(0,
    sim.serialization_queue.queueCurrent + queueDrainMap[sim.cartoner.state] * TICK_MINUTES
  );

  // ── Queue propagation transitions ────────────────────────────────────────
  if (ft.state !== prevFtState) {
    PROPAGATION
      .filter(p => p.from === 'film_tension')
      .forEach(p => {
        pending.push({ to: p.to, state: propagateState(ft.state, p.type, p.dampingFactor), triggerAtTick: tick + p.delayTicks });
      });
  }

  // Fire pending propagations
  const toFire = pending.filter(p => p.triggerAtTick <= tick);
  toFire.forEach(p => {
    const prevState = sim[p.to]?.state;
    if (sim[p.to]) sim[p.to].state = p.state;
    if (sim[p.to]?.state !== prevState) {
      // Cascade further
      PROPAGATION
        .filter(pr => pr.from === p.to)
        .forEach(pr => {
          pending.push({ to: pr.to, state: propagateState(p.state, pr.type, pr.dampingFactor), triggerAtTick: tick + pr.delayTicks });
        });
    }
  });
  pending.splice(0, pending.length, ...pending.filter(p => p.triggerAtTick > tick));

  // ── Compute derived states from accumulator thresholds ───────────────────
  sim.planned_vs_actual.state = sim.planned_vs_actual.currentGap > 3000 ? 'critical'
    : sim.planned_vs_actual.currentGap > 1000 ? 'warning' : 'normal';

  sim.serialization_queue.state = sim.serialization_queue.queueCurrent > 500 ? 'critical'
    : sim.serialization_queue.queueCurrent > 200 ? 'warning' : 'normal';

  // ── Build rows and upsert ────────────────────────────────────────────────
  const rows = Object.entries(sim).map(([entity_id, s]) => ({
    entity_id,
    value:   entity_id === 'film_tension' ? s.value : null,
    state:   s.state,
    metrics: metricsFor(entity_id),
  }));

  const { error } = await supabase.from('sensor_readings').insert(rows);
  if (error) {
    console.error('Supabase write error:', error.message);
    return;
  }

  const ftVal = sim.film_tension.value.toFixed(1);
  const bmSt  = sim.blister_machine.state;
  const gap   = Math.round(sim.planned_vs_actual.currentGap);
  console.log(`[tick ${String(tick).padStart(4)}] FT=${ftVal}N  BM=${bmSt.padEnd(8)}  gap=−${gap} units${corrected ? '  ✓ recovering' : ''}`);
}

// ── CLI commands ──────────────────────────────────────────────────────────────

process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const cmd = data.trim().toLowerCase();
  if (cmd === 'c' || cmd === 'correct') {
    if (!corrected) {
      sim.film_tension.driftRate = THRESHOLDS.film_tension.recoveryRate;
      corrected = true;
      console.log('↑  Correction applied — tension roller recovery at +2.5 N/min');
    }
  } else if (cmd === 'r' || cmd === 'reset') {
    resetAll();
  } else {
    console.log('Commands: c = correct fault, r = reset to normal');
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────

if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL === 'your_supabase_project_url') {
  console.error('✗  Set SUPABASE_URL and SUPABASE_SERVICE_KEY in simulator/.env');
  process.exit(1);
}

if (process.argv.includes('--reset')) {
  resetAll();
  const rows = Object.entries(sim).map(([entity_id, s]) => ({
    entity_id, value: entity_id === 'film_tension' ? s.value : null,
    state: s.state, metrics: metricsFor(entity_id),
  }));
  await supabase.from('sensor_readings').insert(rows);
  console.log('Reset written to DB. Exiting.');
  process.exit(0);
}

console.log('KairOS OT Simulator — Astellas PKG-1');
console.log(`Tick interval: ${TICK_INTERVAL_MS / 1000}s  Speed: ${SPEED_FACTOR}x  (${TICK_MINUTES.toFixed(2)} sim-min/tick)`);
console.log('Commands: c = correct fault, r = reset\n');

// Run first tick immediately, then on interval
runTick();
setInterval(runTick, TICK_INTERVAL_MS);
