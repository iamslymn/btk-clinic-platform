-- Debug helper: list rows that will block instant visits
-- Replace :rep_id with the representative UUID before running

SELECT id,
       rep_id,
       doctor_id,
       scheduled_date,
       status,
       start_time,
       end_time,
       created_at,
       updated_at
FROM visit_logs
WHERE rep_id = :rep_id
  AND status = 'in_progress'
  AND end_time IS NULL
  AND scheduled_date = current_date
ORDER BY created_at DESC;


