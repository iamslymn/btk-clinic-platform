import { supabase, supabaseAdmin } from '../supabase';
import { customAuth } from '../customAuth';
import type { Representative, User } from '../../types';
import { createClient } from '@supabase/supabase-js';

// Get all representatives for the current manager
export const getRepresentatives = async (): Promise<(Representative & { user?: User })[]> => {
  try {
    // Get representatives directly from the table
    const { data: reps, error: repsError } = await supabase
      .from('representatives')
      .select('*')
      .order('full_name', { ascending: true });

    if (repsError) {
      console.error('Error fetching representatives:', repsError);
      return [];
    }

    if (!reps || reps.length === 0) {
      console.log('No representatives found in database');
      return [];
    }

    // Get user data for each representative
    const repsWithUsers = await Promise.all(
      reps.map(async (rep) => {
        try {
          const userId = (rep as any).user_id;
          if (!userId) {
            console.warn(`No user ID for representative ${rep.full_name} (${rep.id})`);
            return { ...rep, user: null } as any;
          }

          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, role, created_at')
            .eq('id', userId)
            .maybeSingle();

          return { ...rep, user } as any;
        } catch (error) {
          console.warn(`Error fetching user for representative ${rep.id}:`, error);
          return { ...rep, user: null } as any;
        }
      })
    );

    return repsWithUsers as any;
  } catch (error) {
    console.error('Error in getRepresentatives:', error);
    return [];
  }
};

// Get a single representative by ID
export const getRepresentative = async (id: string): Promise<Representative & { user?: User }> => {
  // First get the representative
  const { data: rep, error: repError } = await supabase
    .from('representatives')
    .select('*')
    .eq('id', id)
    .single();

  if (repError) throw repError;
  if (!rep) throw new Error('Representative not found');

  // Then get the user data
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, role')
      .eq('id', (rep as any).user_id)
      .maybeSingle();

    if (userError) {
      console.warn(`Could not find user for representative ${rep.id}:`, userError);
      return { ...rep, user: null } as any;
    }

    if (!user) {
      console.warn(`No user record found for representative ${rep.full_name} (${rep.id})`);
      return { ...rep, user: null } as any;
    }

    return { ...rep, user } as any;
  } catch (error) {
    console.warn(`Error fetching user for representative ${rep.id}:`, error);
    return { ...rep, user: null } as any;
  }
};

// Create a new representative with proper Supabase Auth account
export const createRepresentative = async (repData: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  territory?: string;
  hire_date?: string;
  notes?: string | null;
  clinic_ids?: string[];
  brand_ids?: string[];
}): Promise<Representative> => {
  try {
    console.log('Creating representative with auth account:', repData.email);

    // Only managers and super_admin can create reps
    const currentProfile = customAuth.getUserProfile();
    if (!currentProfile || !['manager', 'super_admin'].includes((currentProfile as any).role)) {
      throw new Error('Only managers and super administrators can create representatives');
    }

    // Resolve manager_id (for manager, it must exist; for super_admin, pick the first manager as fallback)
    let managerId: string | null = null;
    if ((currentProfile as any).role === 'manager' && (currentProfile as any).manager) {
      managerId = (currentProfile as any).manager.id;
    } else if ((currentProfile as any).role === 'super_admin') {
      const { data: firstManager } = await supabase
        .from('managers')
        .select('id')
        .limit(1)
        .maybeSingle();
      managerId = firstManager?.id || null;
      if (!managerId) throw new Error('No manager found. Please create a manager first.');
    }

    // Attempt to create Auth user using Admin API if available; else fallback to isolated signUp on a temp client
    let newAuthUserId: string | null = null;
    if ((supabaseAdmin as any)?.auth?.admin) {
      try {
        const { data: adminUser, error: adminErr } = await (supabaseAdmin as any).auth.admin.createUser({
          email: repData.email.toLowerCase(),
          password: repData.password,
          email_confirm: true,
          user_metadata: { full_name: repData.full_name, role: 'rep' }
        });
        if (adminErr) throw adminErr;
        newAuthUserId = adminUser.user?.id || null;
      } catch (e: any) {
        console.warn('Admin createUser failed, falling back to signUp:', e?.message || e);
      }
    }

    if (!newAuthUserId) {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
      const temp = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'btk-temp-signup' }
      });
      const { data: signUpRes, error: signUpErr } = await temp.auth.signUp({
        email: repData.email.toLowerCase(),
        password: repData.password,
        options: { data: { role: 'rep', full_name: repData.full_name } }
      });
      if (signUpErr || !signUpRes.user) {
        throw new Error(signUpErr?.message || 'Failed to create user account');
      }
      newAuthUserId = signUpRes.user.id;
    }

    // Prepare names
    const parts = (repData.full_name || '').trim().split(/\s+/);
    const firstName = parts[0] || repData.full_name;
    const lastName = parts.slice(1).join(' ') || '-';

    // Create public.users row
    const { error: publicUserError } = await supabase
      .from('users')
      .insert({
        id: newAuthUserId,
        email: repData.email.toLowerCase(),
        role: 'rep'
      });
    if (publicUserError) throw publicUserError;

    // Create representatives row (include first_name/last_name for schemas that require them)
    const { data: representativeData, error: repError } = await supabase
      .from('representatives')
      .insert({
        user_id: newAuthUserId,
        manager_id: managerId,
        first_name: firstName,
        last_name: lastName,
        full_name: repData.full_name
      } as any)
      .select()
      .single();
    if (repError) throw repError;

    // Optional: create clinic and brand links (best-effort)
    if (representativeData && repData.clinic_ids && repData.clinic_ids.length > 0) {
      const clinicInserts = repData.clinic_ids.map((clinicId) => ({ representative_id: representativeData.id, clinic_id: clinicId }));
      await supabase.from('representative_clinics').insert(clinicInserts);
    }
    if (representativeData && repData.brand_ids && repData.brand_ids.length > 0) {
      const brandInserts = repData.brand_ids.map((brandId) => ({ representative_id: representativeData.id, brand_id: brandId }));
      await supabase.from('representative_brands').insert(brandInserts);
    }

    return {
      id: representativeData.id,
      user_id: newAuthUserId,
      manager_id: managerId!,
      full_name: repData.full_name,
      phone: null,
      territory: null,
      hire_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
  } catch (error) {
    console.error('Error creating representative:', error);
    throw error;
  }
};

// Update a representative
export const updateRepresentative = async (id: string, updates: {
  full_name?: string;
  email?: string;
}): Promise<Representative> => {
  // Update representative profile
  const { data: rep, error: repError } = await supabase
    .from('representatives')
    .update({
      full_name: updates.full_name,
    })
    .eq('id', id)
    .select()
    .single();

  if (repError) throw repError;
  if (!rep) throw new Error('Failed to update representative');

  // Update user email if provided
  if (updates.email && (rep as any).user_id) {
    const { error: userError } = await supabase
      .from('users')
      .update({ email: updates.email })
      .eq('id', (rep as any).user_id);

    if (userError) throw userError;
  }

  return rep as any;
};

// Delete a representative
export const deleteRepresentative = async (id: string): Promise<void> => {
  // Get the representative to find user_id
  const { data: rep } = await supabase
    .from('representatives')
    .select('user_id')
    .eq('id', id)
    .single();

  // Delete representative record (this should cascade to delete user via foreign key)
  const { error: repError } = await supabase
    .from('representatives')
    .delete()
    .eq('id', id);

  if (repError) throw repError;

  // Delete the public user if we have the user_id
  if ((rep as any)?.user_id) {
    await supabase
      .from('users')
      .delete()
      .eq('id', (rep as any).user_id);
  }
};

// Search representatives by name or email
export const searchRepresentatives = async (query: string): Promise<(Representative & { user?: User })[]> => {
  // Get all representatives first
  const { data: reps, error: repsError } = await supabase
    .from('representatives')
    .select('*')
    .ilike('full_name', `%${query}%`)
    .order('full_name', { ascending: true });

  if (repsError) throw repsError;
  if (!reps) return [] as any;

  // Also search by email in users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')
    .ilike('email', `%${query}%`);

  if (usersError) throw usersError;

  // Get representatives matching user emails
  const userIds = users?.map(u => u.id) || [];
  const { data: repsByEmail, error: repsByEmailError } = userIds.length > 0 
    ? await supabase
        .from('representatives')
        .select('*')
        .in('user_id', userIds)
        .order('full_name', { ascending: true })
    : { data: [], error: null } as any;

  if (repsByEmailError) throw repsByEmailError as any;

  // Combine and deduplicate results
  const allReps = [...(reps || []), ...((repsByEmail as any) || [])];
  const uniqueReps = allReps.filter((rep: any, index: number, self: any[]) => 
    index === self.findIndex((r: any) => r.id === rep.id)
  );

  // Get user data for each representative
  const repsWithUsers = await Promise.all(
    uniqueReps.map(async (rep: any) => {
      try {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('email, role')
          .eq('id', rep.user_id)
          .maybeSingle();

        if (userError) {
          console.warn(`Could not find user for representative ${rep.id}:`, userError);
          return { ...rep, user: null } as any;
        }

        if (!user) {
          console.warn(`No user record found for representative ${rep.full_name} (${rep.id})`);
          return { ...rep, user: null } as any;
        }

        return { ...rep, user } as any;
      } catch (error) {
        console.warn(`Error fetching user for representative ${rep.id}:`, error);
        return { ...rep, user: null } as any;
      }
    })
  );

  return repsWithUsers as any;
};

// Get representative statistics
export const getRepresentativeStats = async (representativeId: string): Promise<{
  totalDoctors: number;
  totalVisits: number;
  totalAssignments: number;
  completionRate: number;
}> => {
  try {
    // Get assignments count for this representative
    const { count: totalAssignments } = await supabase
      .from('rep_doctor_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('rep_id', representativeId);

    // Get doctors count through assignments
    const { data: assignments } = await supabase
      .from('rep_doctor_assignments')
      .select('doctor_id')
      .eq('rep_id', representativeId);

    const doctorIds = assignments?.map(a => a.doctor_id) || [];
    const totalDoctors = new Set(doctorIds).size;

    // Get visits count and completion rate
    const { data: visits } = await supabase
      .from('visit_logs')
      .select('status')
      .eq('rep_id', representativeId);

    const totalVisits = visits?.length || 0;
    const completedVisits = visits?.filter(v => v.status === 'completed').length || 0;
    const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;

    return {
      totalDoctors,
      totalVisits,
      totalAssignments: totalAssignments || 0,
      completionRate
    };
  } catch (error) {
    console.error('Error getting representative stats:', error);
    return {
      totalDoctors: 0,
      totalVisits: 0,
      totalAssignments: 0,
      completionRate: 0
    };
  }
};