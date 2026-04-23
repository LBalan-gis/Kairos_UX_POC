import { useEffect, useRef } from 'react';
import { supabase, supabaseReady } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

// ── Noise threshold ────────────────────────────────────────────────────────────
// A sensor reading is considered noise if the numeric value has not deviated
// by more than RELATIVE_THRESHOLD (0.5 % of the reference value) AND the
// state label has not changed.
//
// This prevents React re-renders — and downstream physics recomputes — from
// pressure/temperature sensors that fluctuate within instrument noise bands.
//
// Absolute floor (ABSOLUTE_FLOOR) handles the edge case where the reference
// value is near zero, which would otherwise make the relative threshold too tight.
const RELATIVE_THRESHOLD = 0.005; // 0.5 %
const ABSOLUTE_FLOOR     = 0.01;  // always pass through changes ≥ 0.01 units

function exceedsThreshold(newValue, last) {
  if (last === undefined || newValue === undefined) return true;
  const ref   = Math.abs(last.value ?? 0);
  const delta = Math.abs(newValue - (last.value ?? 0));
  return delta >= Math.max(ABSOLUTE_FLOOR, ref * RELATIVE_THRESHOLD);
}

export function useLiveData() {
  const applyLiveReading = useAppStore((s) => s.applyLiveReading);

  // Track the last dispatched value + state per entity.
  // Keyed by entity_id. Never triggers a re-render — purely a filter.
  const lastRef = useRef({}); // entity_id → { value: number, state: string }

  useEffect(() => {
    if (!supabaseReady) return;

    // ── 1. Seed current state from latest reading per entity ─────────────────
    supabase
      .from('sensor_readings')
      .select('entity_id, value, state, metrics, inserted_at')
      .order('inserted_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error || !data) return;
        const seen = new Set();
        data.forEach((row) => {
          if (seen.has(row.entity_id)) return;
          seen.add(row.entity_id);
          // Seed always dispatches — we're initialising, not in the hot path.
          lastRef.current[row.entity_id] = { value: row.value, state: row.state };
          applyLiveReading(row.entity_id, row.state, row.metrics, row.value);
        });
      });

    // ── 2. Subscribe to new inserts (event-driven, WebSocket) ────────────────
    const channel = supabase
      .channel('live-sensor-readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          const { entity_id, value, state, metrics } = payload.new;
          const last = lastRef.current[entity_id];

          // Gate: skip if the reading is within instrument noise AND the
          // machine state hasn't changed. Both conditions must hold to suppress.
          const valueIsNoise = !exceedsThreshold(value, last);
          const stateUnchanged = last && last.state === state;
          if (valueIsNoise && stateUnchanged) return;

          lastRef.current[entity_id] = { value, state };
          applyLiveReading(entity_id, state, metrics, value);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [applyLiveReading]);
}
