-- Meeting route tracking tables
-- Create a table to store incremental GPS points for a meeting route
-- Safe to run multiple times

create table if not exists public.meeting_route_points (
  id bigserial primary key,
  visit_log_id uuid not null references public.visit_logs(id) on delete cascade,
  rep_id uuid not null,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamp with time zone not null default now()
);

create index if not exists idx_meeting_route_points_visit on public.meeting_route_points(visit_log_id, recorded_at);

-- Optional materialized view or summary table can be added later for polylines


