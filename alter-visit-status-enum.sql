-- STEP 1 (run this file alone): extend enum values only
-- Note: Do NOT set defaults or use the new values in the same transaction.
-- After this completes successfully, run the companion script
--   alter-visit-status-default.sql

ALTER TYPE visit_status ADD VALUE IF NOT EXISTS 'planned';
ALTER TYPE visit_status ADD VALUE IF NOT EXISTS 'in_progress';

