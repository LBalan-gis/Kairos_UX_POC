import { useEffect } from 'react';
import { supabase, supabaseReady } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export function useLiveData() {
  const applyLiveReading = useAppStore((s) => s.applyLiveReading);

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
        // Keep only the most recent row per entity_id
        const seen = new Set();
        data.forEach((row) => {
          if (seen.has(row.entity_id)) return;
          seen.add(row.entity_id);
          applyLiveReading(row.entity_id, row.state, row.metrics, row.value);
        });
      });

    // ── 2. Subscribe to new inserts ──────────────────────────────────────────
    const channel = supabase
      .channel('live-sensor-readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          const { entity_id, value, state, metrics } = payload.new;
          applyLiveReading(entity_id, state, metrics, value);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [applyLiveReading]);
}
