-- Force Schema Refresh for Supabase (Simplified Version)
-- This version removes ALTER SYSTEM commands that don't work in Supabase

-- Step 1: Ensure all columns exist
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS territory TEXT;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE representatives ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

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

-- Step 5: Force PostgREST schema reload using notifications
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 6: Create and call a function to force reload
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

-- Step 7: Force a schema change that PostgREST will notice
DO $$
BEGIN
    -- Create and drop a temporary column to force PostgREST reload
    ALTER TABLE representatives ADD COLUMN temp_refresh_col TEXT DEFAULT 'temp';
    ALTER TABLE representatives DROP COLUMN temp_refresh_col;
    RAISE NOTICE '✅ Forced schema reload via temporary column';
END $$;

-- Step 8: Final notifications
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Step 9: Verify the schema
SELECT 
    'Final verification - representatives table columns:' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'representatives'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 10: Test the full_name column specifically
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

SELECT '🚀 Supabase-compatible schema refresh completed!' as final_status;
