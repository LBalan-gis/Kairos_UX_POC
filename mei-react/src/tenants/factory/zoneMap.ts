import type { WalkthroughStep, ZoneId } from '../../types/domain';

export const ZONE_MAP: Record<string, ZoneId> = {
  batch_golden: "A",
  film_tension: "B",
  blister_speed: "B",
  env_humidity: "B",
  blister_machine: "C",
  cartoner: "C",
  hidden_loss: "D",
  planned_vs_actual: "D",
  reject_count: "D",
  impact_yield: "D",
  batch_current: "E",
  sim_unchanged: "E",
  sim_corrected: "E",
  serialization_queue: "F",
  sys_erp: "F",
  sys_mes: "F",
  sys_qa: "F",
};

export const ZONE_LABELS: Record<ZoneId, string> = {
  A: "Context",
  B: "Root Cause",
  C: "Hidden Loss",
  D: "Impact",
  E: "Batch Risk / Simulation",
  F: "Systems (impacted)",
};

export const ZONE_X: Record<ZoneId, number> = {
  A: 60,
  B: 260,
  C: 620,
  D: 1020,
  E: 1300,
  F: 1520,
};

export const WALKTHROUGH: WalkthroughStep[] = [
  { id: "film_tension", role: "Root cause", note: "Film tension drift on BM-1101 — 34 min above baseline, causing speed reduction" },
  { id: "blister_speed", role: "Contributing factor", note: "Blister speed dropped to 218 bpm vs 240 setpoint — cartoner now starved" },
  { id: "planned_vs_actual", role: "Output gap", note: "1,840 units behind plan — gap widening at 2.3 units/min" },
  { id: "hidden_loss", role: "Active incident", note: "OEE-2026-031 open — 23 min hidden micro-stop loss unlogged" },
];

export const LIVE_IDS: string[] = [
  "film_tension",
  "blister_speed",
  "blister_machine",
  "cartoner",
  "hidden_loss",
  "reject_count",
  "planned_vs_actual",
  "batch_current",
  "serialization_queue",
];
