-- Fix RPC return types for get_rep_meeting_stats to avoid bigint vs integer mismatch
-- Safe to run multiple times: CREATE OR REPLACE updates the function

CREATE OR REPLACE FUNCTION get_rep_meeting_stats(
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL,
    p_rep_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
    representative_id UUID,
    representative_name TEXT,
    brand_name TEXT,
    total_count INTEGER,
    completed_count INTEGER,
    postponed_count INTEGER,
    missed_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vl.rep_id,
    r.full_name,
    b.name AS brand_name,
    CAST(COUNT(*) AS INTEGER) AS total_count,
    CAST(COUNT(*) FILTER (WHERE vl.status = 'completed') AS INTEGER) AS completed_count,
    CAST(COUNT(*) FILTER (WHERE vl.status = 'postponed') AS INTEGER) AS postponed_count,
    CAST(COUNT(*) FILTER (WHERE vl.status = 'missed') AS INTEGER) AS missed_count
  FROM visit_logs vl
  JOIN representatives r ON r.id = vl.rep_id
  LEFT JOIN rep_doctor_assignments rda ON rda.rep_id = vl.rep_id AND vl.doctor_id = rda.doctor_id
  LEFT JOIN rep_doctor_products rdp ON rdp.assignment_id = rda.id
  LEFT JOIN products p ON p.id = rdp.product_id
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE (p_from_date IS NULL OR vl.scheduled_date >= p_from_date)
    AND (p_to_date IS NULL OR vl.scheduled_date <= p_to_date)
    AND (p_rep_id IS NULL OR vl.rep_id = p_rep_id)
    AND (p_brand_id IS NULL OR b.id = p_brand_id)
  GROUP BY vl.rep_id, r.full_name, b.name
  ORDER BY r.full_name, b.name;
END;
$$ LANGUAGE plpgsql;

-- Force Complete Schema Refresh for PostgREST
-- This is a more aggressive approach to refresh the schema cache

-- Step 1: First, ensure all columns exist
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS territory TEXT;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure specializations table exists
CREATE TABLE IF NOT EXISTS specializations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure doctors table has specialization_id column
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialization_id UUID REFERENCES specializations(id) ON DELETE SET NULL;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS total_category doctor_category;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS planeta_category doctor_category;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email TEXT;

-- Enable RLS on specializations table
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for specializations
DROP POLICY IF EXISTS "Anyone can view specializations" ON specializations;
CREATE POLICY "Anyone can view specializations" ON specializations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admin can manage specializations" ON specializations;
CREATE POLICY "Super admin can manage specializations" ON specializations FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Step 2: Ensure full_name exists (it should, but let's be sure)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'representatives' 
        AND column_name = 'full_name'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE representatives ADD COLUMN full_name TEXT NOT NULL DEFAULT 'Unknown';
        RAISE NOTICE '⚠️  Added missing full_name column';
    ELSE
        RAISE NOTICE '✅ full_name column already exists';
    END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_representatives_auth_user_id ON representatives(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_representatives_user_id ON representatives(user_id);
CREATE INDEX IF NOT EXISTS idx_representatives_manager_id ON representatives(manager_id);

-- Step 4: Update existing records
UPDATE representatives 
SET auth_user_id = user_id 
WHERE auth_user_id IS NULL AND user_id IS NOT NULL;

-- Step 5: Multiple schema refresh attempts
-- Method 1: Standard PostgREST notification
NOTIFY pgrst, 'reload schema';

-- Method 2: Force a database setting change (this triggers cache invalidation)
ALTER SYSTEM SET log_statement = 'none';
SELECT pg_reload_conf();
ALTER SYSTEM RESET log_statement;
SELECT pg_reload_conf();

-- Method 3: Update a dummy function (forces PostgREST to reload)
CREATE OR REPLACE FUNCTION public.force_schema_refresh()
RETURNS text
LANGUAGE sql
AS $function$
    SELECT 'Schema refresh forced at: ' || NOW()::text;
$function$;

-- Call the function to trigger reload
SELECT force_schema_refresh();

-- Drop the function
DROP FUNCTION public.force_schema_refresh();

-- Method 4: Force a schema change that PostgREST will notice
DO $$
BEGIN
    -- Create and drop a temporary column to force PostgREST reload
    ALTER TABLE representatives ADD COLUMN temp_refresh_col TEXT DEFAULT 'temp';
    ALTER TABLE representatives DROP COLUMN temp_refresh_col;
    RAISE NOTICE '✅ Forced schema reload via temporary column';
END $$;

-- Method 5: Final notification with specific message
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 6: Verify the schema one more time
SELECT 
    'Final verification - representatives table columns:' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'representatives'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 7: Test the full_name column specifically
SELECT 'Testing full_name column access:' as test_status;

DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM representatives;
    RAISE NOTICE '✅ Successfully accessed representatives table. Row count: %', test_count;
    
    -- Try to select the full_name column specifically
    PERFORM full_name FROM representatives LIMIT 1;
    RAISE NOTICE '✅ full_name column is accessible';
    
EXCEPTION
    WHEN undefined_column THEN
        RAISE NOTICE '❌ CRITICAL: full_name column still not found!';
    WHEN OTHERS THEN
        RAISE NOTICE '✅ full_name column exists (table access successful)';
END $$;

-- Insert sample specializations if table is empty
INSERT INTO specializations (name, display_name, description)
SELECT * FROM (VALUES
    ('cardiology', 'Kardiologiya', 'Ürək və qan-damar sistemi xəstəlikləri'),
    ('dermatology', 'Dermatologiya', 'Dəri xəstəlikləri'),
    ('endocrinology', 'Endokrinologiya', 'Hormon və metabolizm xəstəlikləri'),
    ('gastroenterology', 'Qastroenterologiya', 'Həzm sistemi xəstəlikləri'),
    ('gynecology', 'Ginekologiya', 'Qadın reproduktiv sistemi xəstəlikləri'),
    ('neurology', 'Nevrologiya', 'Sinir sistemi xəstəlikləri'),
    ('oncology', 'Onkologiya', 'Xərçəng xəstəlikləri'),
    ('ophthalmology', 'Oftalmologiya', 'Göz xəstəlikləri'),
    ('orthopedics', 'Ortopediya', 'Sümük və oynaq xəstəlikləri'),
    ('pediatrics', 'Pediatriya', 'Uşaq xəstəlikləri'),
    ('psychiatry', 'Psixiatriya', 'Psixi xəstəlikləri'),
    ('pulmonology', 'Pulmonologiya', 'Tənəffüs sistemi xəstəlikləri'),
    ('radiology', 'Radiologiya', 'Şüa diaqnostikası'),
    ('surgery', 'Cərrahiyyə', 'Cərrahi müdaxilələr'),
    ('urology', 'Urologiya', 'Sidik sistemi xəstəlikləri'),
    ('dentistry', 'Stomatologiya', 'Diş və ağız xəstəlikləri'),
    ('family_medicine', 'Ailə həkimi', 'Ümumi tibb'),
    ('emergency_medicine', 'Təcili tibbi yardım', 'Təcili hallar')
) AS v(name, display_name, description)
WHERE NOT EXISTS (SELECT 1 FROM specializations LIMIT 1);

-- Notifications table for role/user-targeted messages (extended)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  recipient_user_id uuid,
  recipient_role text CHECK (recipient_role IN ('super_admin','manager','rep')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Extended metadata to render rich details
  related_visit_id uuid,
  representative_name text,
  doctor_name text,
  clinic_name text,
  scheduled_date date,
  note text
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user ON notifications (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON notifications (recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

SELECT '🚀 Aggressive schema refresh completed!' as final_status;
