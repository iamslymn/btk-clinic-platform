-- Representative to Clinics junction table
-- Run this on your Supabase/Postgres instance

create table if not exists public.representative_clinics (
  id uuid primary key default gen_random_uuid(),
  representative_id uuid not null references public.representatives(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (representative_id, clinic_id)
);

-- Helpful index for lookups
create index if not exists idx_rep_clinics_rep on public.representative_clinics(representative_id);
create index if not exists idx_rep_clinics_clinic on public.representative_clinics(clinic_id);


