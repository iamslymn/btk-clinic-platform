-- One-time cleanup: mark any logically completed active visits as completed
-- Conditions: status=in_progress AND end_time IS NOT NULL -> status=completed

UPDATE visit_logs
SET status = 'completed'
WHERE status = 'in_progress'
  AND end_time IS NOT NULL;


