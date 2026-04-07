-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

create table if not exists sensor_readings (
  id          bigint generated always as identity primary key,
  entity_id   text        not null,
  value       numeric,
  state       text        not null,
  metrics     jsonb,
  inserted_at timestamptz not null default now()
);

-- Index for fast latest-per-entity queries
create index if not exists sensor_readings_entity_time
  on sensor_readings (entity_id, inserted_at desc);

-- Allow anon reads (React app uses anon key)
alter table sensor_readings enable row level security;

create policy "anon can read"
  on sensor_readings for select
  using (true);

-- Real-time: enable the table for Realtime broadcasts
alter publication supabase_realtime add table sensor_readings;
