import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Extend globalThis for stable singleton storage
declare global {
  var __btkSupabaseClient: any;
  var __btkSupabaseAdmin: any;
  var __btkSupabaseInitialized: boolean;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create stable singleton clients to prevent GoTrueClient warnings
// Store on globalThis to survive HMR and avoid multiple instances
const createSupabaseClient = () => {
  if (!globalThis.__btkSupabaseClient) {
    globalThis.__btkSupabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        // Keep a single persisted session so storage uploads include auth automatically
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: 'btk-clinic-auth'
      }
    });
  }
  return globalThis.__btkSupabaseClient;
};

const createSupabaseAdmin = () => {
  if (!supabaseServiceKey) return null;

  if (!globalThis.__btkSupabaseAdmin) {
    globalThis.__btkSupabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storageKey: 'btk-clinic-admin'
      }
    });
  }
  return globalThis.__btkSupabaseAdmin;
};

// Export lazy singleton instances
let _supabase: any = null;
let _supabaseAdmin: any = null;

export const supabase = new Proxy({} as any, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = createSupabaseClient();
    }
    return _supabase[prop];
  }
});

export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createSupabaseAdmin();
    }
    return _supabaseAdmin?.[prop];
  }
});

// Skip admin warnings

// Test connection on startup (only once per session)
if (typeof window !== 'undefined' && !globalThis.__btkSupabaseInitialized) {
  globalThis.__btkSupabaseInitialized = true;
  // Skip connection test
}

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to get user profile with role (simplified)
export const getUserProfile = async (userId: string) => {
  // Step 1: Get basic user data (no joins to avoid recursion)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (userError || !userData) {
    throw new Error('User not found');
  }

  // Step 2: Get manager profile if user is a manager (simplified)
  let managerData = null;
  if (userData.role === 'manager' || userData.role === 'super_admin') {
    const { data: manager } = await supabase
      .from('managers')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    managerData = manager;
  }

  // Step 3: Get representative profile if user is a representative (simplified)
  let representativeData = null;
  if (userData.role === 'rep') {
    const { data: representative } = await supabase
      .from('representatives')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    representativeData = representative;
  }

  // Step 4: Combine data (mimicking the old structure)
  const profile = {
    ...userData,
    manager: managerData,
    representative: representativeData,
  };

  return profile;
};