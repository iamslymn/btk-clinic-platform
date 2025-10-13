import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, getUserProfile } from '../lib/supabase';
import { customAuth } from '../lib/customAuth';
import type { UserWithProfile, UserRole } from '../types';

interface AuthContextType {
  user: SupabaseUser | null;
  userProfile: UserWithProfile | null;
  representative: any | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, additionalData?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [representative, setRepresentative] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Global singleton to prevent multiple auth initializations across all instances
    if ((window as any).__authInitialized) {
      return;
    }
    (window as any).__authInitialized = true;

    let subscription: any = null;

    if (customAuth.isAuthenticated()) {
      const user = customAuth.getCurrentUser();
      const profile = customAuth.getUserProfile();

      setUser(user);
      setUserProfile(profile);
      setRepresentative(profile?.representative || null);
      setRole(profile?.role || null);

      setLoading(false);
    } else {
      setLoading(false);
    }

    // Single subscription setup
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Only use Supabase auth if custom auth isn't working
        if (!customAuth.isAuthenticated()) {
          // Handle Supabase auth change if needed
        }
      }
    );
    subscription = authSubscription;

    return () => {
      if (subscription) {
        subscription.unsubscribe();
        subscription = null;
      }
      // Reset singleton on unmount (for development hot reload)
      if (process.env.NODE_ENV === 'development') {
        (window as any).__authInitialized = false;
      }
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      setUserProfile(profile);
      setRole(profile.role);
    } catch (error) {
      // Continue with partial auth state
      setRole(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    
    try {
      // Use custom auth instead of broken Supabase client
      const authData = await customAuth.signIn(email, password);
      
      // Update React state
      const user = customAuth.getCurrentUser();
      const profile = customAuth.getUserProfile();
      
      setUser(user);
      setUserProfile(profile);
      setRepresentative(profile?.representative || null);
      setRole(profile?.role || null);
      

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Login failed' };
    }
  };

  const signOut = async () => {
    customAuth.signOut();
    setUser(null);
    setUserProfile(null);
    setRepresentative(null);
    setRole(null);
  };

  const signUp = async (
    email: string,
    password: string,
    userRole: UserRole,
    additionalData?: any
  ) => {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        role: userRole,
      });

    if (profileError) throw profileError;

    // Create role-specific profile
    if (userRole === 'manager' && additionalData?.full_name) {
      const { error: managerError } = await supabase
        .from('managers')
        .insert({
          user_id: authData.user.id,
          full_name: additionalData.full_name,
        });

      if (managerError) throw managerError;
    }

    if (userRole === 'rep' && additionalData?.full_name && additionalData?.manager_id) {
      const { error: repError } = await supabase
        .from('representatives')
        .insert({
          user_id: authData.user.id,
          manager_id: additionalData.manager_id,
          full_name: additionalData.full_name,
        });

      if (repError) throw repError;
    }
  };

  const value = {
    user,
    userProfile,
    representative,
    role,
    loading,
    signIn,
    signOut,
    signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Route protection hooks
export function useRequireAuth(requiredRole?: UserRole) {
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login
      window.location.href = '/login';
    }

    if (!loading && requiredRole && role !== requiredRole) {
      // Redirect to appropriate dashboard or show unauthorized
      throw new Error('Unauthorized');
    }
  }, [user, role, loading, requiredRole]);

  return { user, role, loading };
}

export function useManagerAuth() {
  return useRequireAuth('manager');
}

export function useSuperAdminAuth() {
  return useRequireAuth('super_admin');
}

export function useRepAuth() {
  return useRequireAuth('rep');
}