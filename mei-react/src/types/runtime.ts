export interface LiveReading {
  entity_id: string;
  value?: number;
  state: string;
  metrics?: Record<string, string | number>;
  inserted_at?: string;
}

export interface LastReadingSnapshot {
  value?: number;
  state: string;
}
