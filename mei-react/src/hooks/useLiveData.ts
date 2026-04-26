import { useEffect, useRef } from 'react';
import { supabase, supabaseReady } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { exceedsThreshold } from '../runtime/liveData';
import type { LiveReading, LastReadingSnapshot } from '../types/runtime';

export function useLiveData() {
  const applyLiveReading = useAppStore((state) => state.applyLiveReading);
  const lastRef = useRef<Record<string, LastReadingSnapshot>>({});

  useEffect(() => {
    if (!supabaseReady || !supabase) return;

    supabase
      .from('sensor_readings')
      .select('entity_id, value, state, metrics, inserted_at')
      .order('inserted_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error || !data) return;
        const seen = new Set<string>();
        (data as LiveReading[]).forEach((row) => {
          if (seen.has(row.entity_id)) return;
          seen.add(row.entity_id);
          lastRef.current[row.entity_id] = { value: row.value, state: row.state };
          applyLiveReading(row.entity_id, row.state, row.metrics, row.value);
        });
      });

    const channel = supabase
      .channel('live-sensor-readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          const next = payload.new as LiveReading;
          const { entity_id, value, state, metrics } = next;
          const last = lastRef.current[entity_id];
          const valueIsNoise = !exceedsThreshold(value, last);
          const stateUnchanged = !!last && last.state === state;
          if (valueIsNoise && stateUnchanged) return;

          lastRef.current[entity_id] = { value, state };
          applyLiveReading(entity_id, state, metrics, value);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyLiveReading]);
}
