-- STEP 2 (run after alter-visit-status-enum.sql committed):
-- Set default and backfill safely

ALTER TABLE visit_logs ALTER COLUMN status SET DEFAULT 'planned';

-- Optional cleanup for old NULLs
UPDATE visit_logs SET status = 'planned' WHERE status IS NULL;

