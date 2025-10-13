-- Make rep_doctor_assignments start_time and end_time nullable (day-only visits)
ALTER TABLE rep_doctor_assignments
  ALTER COLUMN start_time DROP NOT NULL,
  ALTER COLUMN end_time DROP NOT NULL;


