import { supabase } from './supabase';

/**
 * Force PostgREST schema cache reload
 * Call this after making schema changes to ensure PostgREST recognizes new columns/tables
 */
export const reloadPostgRESTSchema = async (): Promise<void> => {
  try {
    // Execute a NOTIFY command to reload PostgREST schema cache
    const { error } = await supabase.rpc('reload_postgrest_schema');
    
    if (error) {
      console.warn('Failed to reload PostgREST schema cache:', error.message);
      // Fallback: try direct SQL notification
      try {
        await supabase.from('pg_notify').select().limit(0);
        const { error: notifyError } = await supabase
          .rpc('exec_sql', { sql: "NOTIFY pgrst, 'reload schema'" });
        if (notifyError) {
          console.warn('Fallback schema reload also failed:', notifyError.message);
        }
      } catch (fallbackError) {
        console.warn('Schema reload fallback failed:', fallbackError);
      }
    } else {
      console.log('✅ PostgREST schema cache reloaded successfully');
    }
  } catch (error) {
    console.warn('Error during schema reload:', error);
  }
};

/**
 * Verify that expected tables and columns exist
 * Useful for debugging schema issues
 */
export const verifySchema = async (): Promise<{
  specializationsTable: boolean;
  doctorsSpecializationId: boolean;
  clinicsTable: boolean;
}> => {
  try {
    // Test if we can access specializations table
    const { error: specError } = await supabase
      .from('specializations')
      .select('id')
      .limit(1);
    
    // Test if we can access doctors with specialization_id
    const { error: doctorsError } = await supabase
      .from('doctors')
      .select('specialization_id')
      .limit(1);
    
    // Test if we can access clinics table
    const { error: clinicsError } = await supabase
      .from('clinics')
      .select('id')
      .limit(1);
    
    const result = {
      specializationsTable: !specError,
      doctorsSpecializationId: !doctorsError,
      clinicsTable: !clinicsError
    };
    
    console.log('Schema verification:', result);
    return result;
  } catch (error) {
    console.error('Schema verification failed:', error);
    return {
      specializationsTable: false,
      doctorsSpecializationId: false,
      clinicsTable: false
    };
  }
};

/**
 * Test the problematic clinics query that was causing 42703 errors
 */
export const testClinicsQuery = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('clinics')
      .select(`
        *,
        doctors:clinic_doctors (
          id,
          created_at,
          doctor:doctors (
            id,
            first_name,
            last_name,
            specialization_id,
            specialization:specializations (
              id,
              name,
              display_name
            )
          )
        )
      `)
      .limit(1);
    
    if (error) {
      console.error('Clinics query test failed:', error);
      return false;
    }
    
    console.log('✅ Clinics query test passed');
    return true;
  } catch (error) {
    console.error('Clinics query test error:', error);
    return false;
  }
};
