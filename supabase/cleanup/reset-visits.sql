-- Reset visit-related data only (safe cleanup)
-- This clears logs and auxiliary visit-related tables but leaves reps, doctors, clinics, brands, products intact

BEGIN;

-- Delete route points (depends on visit_logs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'meeting_route_points'
  ) THEN
    EXECUTE 'DELETE FROM meeting_route_points';
  END IF;
END$$;

-- Delete visit logs
DELETE FROM visit_logs;

-- Delete visit_goals (per-assignment metadata)
DELETE FROM visit_goals;

-- Optionally clear rep_doctor_products if you consider visit-specific product associations
-- (Keeps assignments themselves)
DELETE FROM rep_doctor_products;

COMMIT;
