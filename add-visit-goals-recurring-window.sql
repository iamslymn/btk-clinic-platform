-- Add finite recurrence window to visit goals
-- Safe to run multiple times; uses IF NOT EXISTS

ALTER TABLE visit_goals
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS recurring_weeks INTEGER;

-- Optional: backfill nulls (no-op defaults)
-- UPDATE visit_goals SET recurring_weeks = 0 WHERE recurring_weeks IS NULL;

