import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { Manager, Representative } from '../../types';

// Extended manager type with relationships
export interface ManagerWithDetails extends Manager {
  user?: {
    id: string;
    email: string;
    role: string;
    created_at: string;
  };
  representatives?: Representative[];
  stats?: {
    totalRepresentatives: number;
    totalDoctors: number;
    totalAssignments: number;
    totalVisits: number;
    completionRate: number;
  };
}

// Get all managers with their details
export const getManagers = async (): Promise<ManagerWithDetails[]> => {
  try {
    // Try the PostgREST foreign key relationship syntax first
    const { data, error } = await supabase
      .from('managers')
      .select(`
        *,
        users!managers_user_id_fkey (
          id,
          email,
          role,
          created_at
        ),
        representatives (
          id,
          first_name,
          last_name,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('PostgREST relationship query failed, falling back to manual join:', error.message);
      
      // Fallback: Manual join approach
      const { data: managersData, error: managersError } = await supabase
        .from('managers')
        .select('*')
        .order('created_at', { ascending: false });

      if (managersError) throw managersError;

      // Manually fetch users and representatives for each manager
      const managersWithDetails = await Promise.all(
        (managersData || []).map(async (manager) => {
          // Get user data
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, role, created_at')
            .eq('id', manager.user_id)
            .single();

          // Get representatives data
          const { data: repsData } = await supabase
            .from('representatives')
            .select('id, first_name, last_name, created_at')
            .eq('manager_id', manager.id);

          const stats = await getManagerStats(manager.id);
          
          return {
            ...manager,
            user: userData,
            users: userData, // Keep both for compatibility
            representatives: repsData || [],
            stats
          };
        })
      );

      return managersWithDetails;
    }

    // If PostgREST relationship worked, enhance with statistics
    const managersWithStats = await Promise.all(
      (data || []).map(async (manager) => {
        const stats = await getManagerStats(manager.id);
        return {
          ...manager,
          user: manager.users,
          representatives: manager.representatives || [],
          stats
        };
      })
    );

    return managersWithStats;
  } catch (error) {
    console.error('Error in getManagers:', error);
    throw error;
  }
};

// Get a single manager by ID
export const getManagerById = async (managerId: string): Promise<ManagerWithDetails> => {
  try {
    // Try PostgREST relationship syntax first
    const { data, error } = await supabase
      .from('managers')
      .select(`
        *,
        users!managers_user_id_fkey (
          id,
          email,
          role,
          created_at
        ),
        representatives (
          id,
          first_name,
          last_name,
          created_at
        )
      `)
      .eq('id', managerId)
      .single();

    if (error) {
      console.warn('PostgREST relationship query failed for single manager, falling back to manual join:', error.message);
      
      // Fallback: Manual join approach
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('*')
        .eq('id', managerId)
        .single();

      if (managerError) throw managerError;
      if (!managerData) throw new Error('Manager not found');

      // Get user data
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .eq('id', managerData.user_id)
        .single();

      // Get representatives data
      const { data: repsData } = await supabase
        .from('representatives')
        .select('id, first_name, last_name, created_at')
        .eq('manager_id', managerId);

      const stats = await getManagerStats(managerId);

      return {
        ...managerData,
        user: userData,
        users: userData, // Keep both for compatibility
        representatives: repsData || [],
        stats
      };
    }

    if (!data) throw new Error('Manager not found');

    const stats = await getManagerStats(managerId);

    return {
      ...data,
      user: data.users,
      representatives: data.representatives || [],
      stats
    };
  } catch (error) {
    console.error('Error in getManagerById:', error);
    throw error;
  }
};

// Get manager statistics  
export const getManagerStats = async (managerId: string): Promise<{
  totalRepresentatives: number;
  totalDoctors: number; 
  totalAssignments: number;
  totalVisits: number;
  completionRate: number;
}> => {
  try {
    // Get representatives count
    const { count: totalRepresentatives } = await supabase
      .from('representatives')
      .select('*', { count: 'exact', head: true })
      .eq('manager_id', managerId);

    // Doctors are managed by super_admin only, not by managers
    const totalDoctors = 0;

    // Get assignments count (through representatives) - using current schema
    const { data: managerReps } = await supabase
      .from('representatives')
      .select('id')
      .eq('manager_id', managerId);

    const repIds = managerReps?.map(r => r.id) || [];
    
    let totalAssignments = 0;
    let totalVisits = 0;
    let completedVisits = 0;

    if (repIds.length > 0) {
      // Get assignments count (using current schema: rep_doctor_assignments)
      const { count: assignmentsCount } = await supabase
        .from('rep_doctor_assignments')
        .select('*', { count: 'exact', head: true })
        .in('rep_id', repIds);

      totalAssignments = assignmentsCount || 0;

      // Get visits count and completion rate (using current schema: visit_logs)
      const { data: visits } = await supabase
        .from('visit_logs')
        .select('status')
        .in('rep_id', repIds);

      totalVisits = visits?.length || 0;
      completedVisits = visits?.filter(v => v.status === 'completed').length || 0;
    }

    const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;

    return {
      totalRepresentatives: totalRepresentatives || 0,
      totalDoctors: totalDoctors || 0,
      totalAssignments,
      totalVisits,
      completionRate
    };
  } catch (error) {
    console.error('Error getting manager stats:', error);
    return {
      totalRepresentatives: 0,
      totalDoctors: 0,
      totalAssignments: 0,
      totalVisits: 0,
      completionRate: 0
    };
  }
};

// Create a new manager using direct database operations
export const createManager = async (managerData: {
  email: string;
  password: string;
  full_name: string;
}): Promise<ManagerWithDetails> => {
  try {
    // Check if user is super_admin using customAuth (same pattern as other API calls)
    const user = customAuth.getCurrentUser();
    const profile = customAuth.getUserProfile();

    if (!user || !profile || profile.role !== 'super_admin') {
      throw new Error('Only super administrators can create managers');
    }

    // For now, we'll use direct database operations instead of Edge Function
    // This is a temporary solution until the Edge Function authentication is fixed

    try {
      // Step 1: Create Supabase Auth user directly
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: managerData.email,
        password: managerData.password,
        options: {
          data: {
            role: 'manager',
            full_name: managerData.full_name
          }
        }
      });

      if (authError || !authUser.user) {
        console.error('Auth user creation error:', authError);
        throw new Error(authError?.message || 'Failed to create user account');
      }

      console.log('Auth user created:', authUser.user.id);

      try {
        // Step 2: Create user record in users table
        const { data: userRecord, error: userRecordError } = await supabase
          .from('users')
          .insert({
            id: authUser.user.id,
            email: managerData.email,
            role: 'manager'
          })
          .select()
          .single();

        if (userRecordError) {
          console.error('User record creation error:', userRecordError);
          // Clean up auth user if user record creation fails
          await supabase.auth.admin.deleteUser(authUser.user);
          throw new Error(userRecordError.message || 'Failed to create user record');
        }

        // Step 3: Create manager profile
        const { data: managerRecord, error: managerError } = await supabase
          .from('managers')
          .insert({
            user_id: authUser.user.id,
            full_name: managerData.full_name
          })
          .select()
          .single();

        if (managerError) {
          console.error('Manager record creation error:', managerError);
          // Clean up user record
          await supabase.from('users').delete().eq('id', authUser.user.id);
          await supabase.auth.admin.deleteUser(authUser.user);
          throw new Error(managerError.message || 'Failed to create manager profile');
        }

        // Return the complete manager record with relationships
        return await getManagerById(managerRecord.id);

      } catch (error) {
        console.error('Database operation error:', error);
        // Clean up auth user on any database error
        await supabase.auth.admin.deleteUser(authUser.user);
        throw error;
      }

    } catch (authError: any) {
      console.error('Auth creation error:', authError);
      throw new Error(authError.message || 'Failed to create manager account');
    }

  } catch (error: any) {
    console.error('Manager creation error:', error);
    throw new Error(error.message || 'Failed to create manager');
  }
};

// Update manager
export const updateManager = async (
  managerId: string, 
  updates: { full_name?: string }
): Promise<void> => {
  const { error } = await supabase
    .from('managers')
    .update(updates)
    .eq('id', managerId);

  if (error) throw error;
};

// Delete manager (Note: This also requires server-side user deletion)
export const deleteManager = async (managerId: string): Promise<void> => {
  // Note: In production, this should also delete the user from Supabase Auth
  // which requires server-side implementation
  
  try {
    // Get manager to find user_id
    const { data: manager, error: fetchError } = await supabase
      .from('managers')
      .select('user_id')
      .eq('id', managerId)
      .single();

    if (fetchError) throw fetchError;
    if (!manager) throw new Error('Manager not found');

    // Delete manager profile (this will cascade to representatives via foreign key)
    const { error: deleteError } = await supabase
      .from('managers')
      .delete()
      .eq('id', managerId);

    if (deleteError) throw deleteError;

    // Note: In production, you would also need to delete the user from Supabase Auth
    // This requires the Admin API and server-side implementation:
    // await supabase.auth.admin.deleteUser(manager.user_id);

    console.warn('⚠️ Manager deleted from database, but user still exists in Supabase Auth. Use server-side Admin API to fully remove the user.');
    
  } catch (error) {
    throw error;
  }
};

// Search managers
export const searchManagers = async (query: string): Promise<ManagerWithDetails[]> => {
  if (!query.trim()) {
    return getManagers();
  }

  try {
    // Try PostgREST relationship syntax first
    const { data, error } = await supabase
      .from('managers')
      .select(`
        *,
        users!managers_user_id_fkey (
          id,
          email,
          role,
          created_at
        ),
        representatives (
          id,
          first_name,
          last_name,
          created_at
        )
      `)
      .or(`full_name.ilike.%${query}%,users.email.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('PostgREST relationship search failed, falling back to manual approach:', error.message);
      
      // Fallback: Search managers manually and join data
      const { data: managersData, error: managersError } = await supabase
        .from('managers')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .order('created_at', { ascending: false });

      if (managersError) throw managersError;

      // Also search by user email
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .ilike('email', `%${query}%`);

      const userIds = usersData?.map(u => u.id) || [];
      
      const { data: managersByEmail } = await supabase
        .from('managers')
        .select('*')
        .in('user_id', userIds);

      // Combine results and deduplicate
      const allManagers = [...(managersData || []), ...(managersByEmail || [])]
        .filter((manager, index, self) => 
          index === self.findIndex(m => m.id === manager.id)
        );

      // Manually join data for each manager
      const managersWithDetails = await Promise.all(
        allManagers.map(async (manager) => {
          // Get user data
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, role, created_at')
            .eq('id', manager.user_id)
            .single();

          // Get representatives data
          const { data: repsData } = await supabase
            .from('representatives')
            .select('id, first_name, last_name, created_at')
            .eq('manager_id', manager.id);

          const stats = await getManagerStats(manager.id);
          
          return {
            ...manager,
            user: userData,
            users: userData, // Keep both for compatibility
            representatives: repsData || [],
            stats
          };
        })
      );

      return managersWithDetails;
    }

    // If PostgREST relationship worked, enhance with statistics
    const managersWithStats = await Promise.all(
      (data || []).map(async (manager) => {
        const stats = await getManagerStats(manager.id);
        return {
          ...manager,
          user: manager.users,
          representatives: manager.representatives || [],
          stats
        };
      })
    );

    return managersWithStats;
  } catch (error) {
    console.error('Error in searchManagers:', error);
    throw error;
  }
};