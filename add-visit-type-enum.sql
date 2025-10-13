-- Add visit_type enum and column to visit_logs for instant visits

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_type') THEN
    CREATE TYPE visit_type AS ENUM ('scheduled', 'instant');
  END IF;
END $$;

ALTER TABLE visit_logs
ADD COLUMN IF NOT EXISTS visit_type visit_type NOT NULL DEFAULT 'scheduled';


