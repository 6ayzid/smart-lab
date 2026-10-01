-- 001_initial_schema.sql
-- Schema migration for Research Survey Platform

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Surveys Table
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- 2. Respondent Sessions Table
create table if not exists public.respondent_sessions (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null,
  respondent_email text default 'anonymous',
  device_context jsonb not null default '{}'::jsonb,
  quality_score int not null default 100,
  status text not null default 'high_integrity',
  penalty_breakdown jsonb default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

-- 3. Responses Table
create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.respondent_sessions(id) on delete cascade,
  item_id text not null,
  answer_value text,
  created_at timestamptz not null default now()
);

-- 4. Telemetry Logs Table
create table if not exists public.telemetry_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.respondent_sessions(id) on delete cascade,
  item_id text not null,
  timing_metrics jsonb not null default '{}'::jsonb,
  interaction_metrics jsonb not null default '{}'::jsonb,
  quality_flags text[] default array[]::text[]
);

-- Indices for analytics queries
create index if not exists idx_sessions_quality_score on public.respondent_sessions(quality_score);
create index if not exists idx_sessions_status on public.respondent_sessions(status);
create index if not exists idx_responses_session_id on public.responses(session_id);
create index if not exists idx_telemetry_session_id on public.telemetry_logs(session_id);

-- Enable Row Level Security (RLS) on all tables
alter table public.surveys enable row level security;
alter table public.respondent_sessions enable row level security;
alter table public.responses enable row level security;
alter table public.telemetry_logs enable row level security;

-- Grant standard permissions to anon and authenticated roles
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- 1. Surveys Policies (Allow public read & insert)
drop policy if exists "Allow public select" on public.surveys;
create policy "Allow public select" on public.surveys
  for select
  using (true);

drop policy if exists "Allow public insert" on public.surveys;
create policy "Allow public insert" on public.surveys
  for insert
  with check (true);

-- 2. Respondent Sessions Policies (Allow public insert, select, delete, update)
drop policy if exists "Allow public insert" on public.respondent_sessions;
create policy "Allow public insert" on public.respondent_sessions
  for insert
  with check (true);

drop policy if exists "Allow public select" on public.respondent_sessions;
create policy "Allow public select" on public.respondent_sessions
  for select
  using (true);

drop policy if exists "Allow public delete" on public.respondent_sessions;
create policy "Allow public delete" on public.respondent_sessions
  for delete
  using (true);

drop policy if exists "Allow public update" on public.respondent_sessions;
create policy "Allow public update" on public.respondent_sessions
  for update
  using (true)
  with check (true);

-- 3. Responses Policies (Allow public insert, select, delete, update)
drop policy if exists "Allow public insert" on public.responses;
create policy "Allow public insert" on public.responses
  for insert
  with check (true);

drop policy if exists "Allow public select" on public.responses;
create policy "Allow public select" on public.responses
  for select
  using (true);

drop policy if exists "Allow public delete" on public.responses;
create policy "Allow public delete" on public.responses
  for delete
  using (true);

drop policy if exists "Allow public update" on public.responses;
create policy "Allow public update" on public.responses
  for update
  using (true)
  with check (true);

-- 4. Telemetry Logs Policies (Allow public insert, select, delete, update)
drop policy if exists "Allow public insert" on public.telemetry_logs;
create policy "Allow public insert" on public.telemetry_logs
  for insert
  with check (true);

drop policy if exists "Allow public select" on public.telemetry_logs;
create policy "Allow public select" on public.telemetry_logs
  for select
  using (true);

drop policy if exists "Allow public delete" on public.telemetry_logs;
create policy "Allow public delete" on public.telemetry_logs
  for delete
  using (true);

drop policy if exists "Allow public update" on public.telemetry_logs;
create policy "Allow public update" on public.telemetry_logs
  for update
  using (true)
  with check (true);
