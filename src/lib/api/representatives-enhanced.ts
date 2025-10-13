import { supabase, supabaseAdmin } from '../supabase';
import { customAuth } from '../customAuth';
import type { 
  Representative, 
  RepresentativeInsert, 
  RepresentativeUpdate, 
  RepresentativeWithDetails,
  CreateRepresentativeForm,
  RepresentativeTerritory,
  RepresentativeTerritoryInsert,
  RepresentativeBrand,
  RepresentativeBrandInsert,
  BakuDistrict
} from '../../types';

// Get all representatives with details (role-based access)
export const getRepresentatives = async (): Promise<RepresentativeWithDetails[]> => {
  // Check user role to determine data access level
  const userProfile = customAuth.getUserProfile();
  const isManager = userProfile?.role === 'manager';
  
  // Managers get limited representative data for privacy (no implicit join to users)
  const selectQuery = isManager ? `
    *,
    manager:managers (
      id,
      full_name
    ),
    territories:representative_territories (
      id,
      district,
      created_at
    ),
    clinics:representative_clinics (
      id,
      clinic:clinics (
        id,
        name,
        address
      )
    ),
    brands:representative_brands (
      id,
      created_at,
      brand:brands (
        id,
        name
      )
    )
  ` : `
    *,
    manager:managers (
      id,
      full_name
    ),
    territories:representative_territories (
      id,
      district,
      created_at
    ),
    clinics:representative_clinics (
      id,
      clinic:clinics (
        id,
        name,
        address
      )
    ),
    brands:representative_brands (
      id,
      created_at,
      brand:brands (
        id,
        name
      )
    ),
    assignments (
      id,
      assigned_date,
      notes,
      clinic:clinics (
        id,
        name,
        address
      ),
      doctors:assignment_doctors (
        id,
        doctor:doctors (
          id,
          first_name,
          last_name,
          specialization_id
        )
      )
    )
  `;

  const { data, error } = await supabase
    .from('representatives')
    .select(selectQuery)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const reps = data || [];
  if (reps.length === 0) return [];

  // Attach user via separate query using user_id
  const userIds = reps.map((r: any) => r.user_id).filter(Boolean);
  const { data: users } = await supabase
    .from('users')
    .select('id, email, role, created_at')
    .in('id', userIds as string[]);
  const idToUser = new Map((users || []).map((u: any) => [u.id, u]));

  return reps.map((rep: any) => ({
    ...rep,
    user: idToUser.get(rep.user_id),
    territories: rep.territories || [],
    clinics: rep.clinics || [],
    brands: rep.brands || [],
    assignments: rep.assignments || []
  }));
};

// Get a single representative by ID with details
export const getRepresentativeById = async (id: string): Promise<RepresentativeWithDetails> => {
  const { data, error } = await supabase
    .from('representatives')
    .select(`
      *,
      manager:managers (
        id,
        full_name
      ),
      territories:representative_territories (
        id,
        district,
        created_at
      ),
      clinics:representative_clinics (
        id,
        clinic:clinics (
          id,
          name,
          address
        )
      ),
      brands:representative_brands (
        id,
        created_at,
        brand:brands (
          id,
          name
        )
      ),
      assignments (
        id,
        assigned_date,
        notes,
        clinic:clinics (
          id,
          name,
          address
        ),
        doctors:assignment_doctors (
          id,
          doctor:doctors (
            id,
            first_name,
            last_name,
            specialization_id
          )
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Representative not found');

  // Fetch user separately
  let userRecord: any | undefined = undefined;
  if ((data as any).user_id) {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('id', (data as any).user_id)
      .maybeSingle();
    userRecord = user || undefined;
  }

  return {
    ...(data as any),
    user: userRecord,
    territories: (data as any).territories || [],
    clinics: (data as any).clinics || [],
    brands: (data as any).brands || [],
    assignments: (data as any).assignments || []
  };
};

// Create a new representative with auth account (managers and super_admin)
export const createRepresentative = async (repData: CreateRepresentativeForm): Promise<RepresentativeWithDetails> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can create representatives');
  }

  // Validate required fields
  if (!repData.email || !repData.password || !repData.first_name || 
      !repData.last_name || !repData.manager_id) {
    throw new Error('Email, password, first name, last name, and manager are required');
  }

  if (!repData.clinic_ids || repData.clinic_ids.length === 0) {
    throw new Error('At least one clinic is required');
  }

  if (!repData.brand_ids || repData.brand_ids.length === 0) {
    throw new Error('At least one brand assignment is required');
  }

  // Check if admin client is available
  if (!supabaseAdmin) {
    throw new Error('Admin operations unavailable. Service role key not configured.');
  }

  try {
    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', repData.email.toLowerCase());

    if (checkError) {
      console.warn('Could not check for existing users:', checkError);
    }

    if (existingUsers && existingUsers.length > 0) {
      throw new Error(`A user with email ${repData.email} already exists in the system.`);
    }

    // Step 1: Create the auth user using admin API
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: repData.email.toLowerCase(),
      password: repData.password,
      email_confirm: true,
      user_metadata: {
        first_name: repData.first_name,
        last_name: repData.last_name,
        role: 'rep'
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      if (authError.message.includes('already exists') || authError.message.includes('already been registered')) {
        throw new Error('A user with this email address already exists');
      }
      throw new Error(`Failed to create user account: ${authError.message}`);
    }

    if (!authUser.user) {
      throw new Error('Failed to create user account - no user returned');
    }

    console.log('Auth user created successfully:', authUser.user.id);

    // Step 2: Create user record in public.users table
    const { error: publicUserError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: repData.email.toLowerCase(),
        role: 'rep',
      });

    if (publicUserError) {
      // Cleanup: Delete the auth user if public user creation failed
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      throw new Error(`Failed to create user profile: ${publicUserError.message}`);
    }

    // Step 3: Create representative record
    const { data: representativeData, error: repError } = await supabase
      .from('representatives')
      .insert({
        user_id: authUser.user.id,
        auth_user_id: authUser.user.id,
        manager_id: repData.manager_id,
        first_name: repData.first_name,
        last_name: repData.last_name
      })
      .select()
      .single();

    if (repError) {
      console.error('Representative creation error:', repError);
      
      // Cleanup: Delete the auth user and public user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        await supabase.from('users').delete().eq('id', authUser.user.id);
      } catch (cleanupError) {
        console.error('Failed to cleanup after representative creation failure:', cleanupError);
      }
      
      throw new Error(`Failed to create representative: ${repError.message}`);
    }

    if (!representativeData) {
      throw new Error('Failed to create representative - no data returned');
    }

    // Step 4: Create clinic assignments
    const clinicInserts = repData.clinic_ids.map(clinicId => ({
      representative_id: representativeData.id,
      clinic_id: clinicId
    }));

    const { error: clinicsError } = await supabase
      .from('representative_clinics')
      .insert(clinicInserts);

    if (clinicsError) {
      console.error('Clinic assignment error:', clinicsError);
      // Continue without failing - clinics can be added later
    }

    // Step 5: Create brand assignments
    const brandInserts: RepresentativeBrandInsert[] = repData.brand_ids.map(brandId => ({
      representative_id: representativeData.id,
      brand_id: brandId
    }));

    const { error: brandsError } = await supabase
      .from('representative_brands')
      .insert(brandInserts);

    if (brandsError) {
      console.error('Brand assignment error:', brandsError);
      // Continue without failing - brands can be added later
    }

    console.log('Representative created successfully:', {
      representative_id: representativeData.id,
      user_id: authUser.user.id,
      email: repData.email.toLowerCase(),
      first_name: repData.first_name,
      last_name: repData.last_name,
      manager_id: repData.manager_id,
    });

    // Return the created representative with details
    return await getRepresentativeById(representativeData.id);
  } catch (error) {
    console.error('Error creating representative:', error);
    throw error;
  }
};

// Update representative (managers and super_admin)
export const updateRepresentative = async (
  representativeId: string,
  updates: Partial<CreateRepresentativeForm> & { email?: string }
): Promise<RepresentativeWithDetails> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can update representatives');
  }

  try {
    // Update representative basic info
    const repUpdates: RepresentativeUpdate = {};
    if (updates.first_name) repUpdates.first_name = updates.first_name;
    if (updates.last_name) repUpdates.last_name = updates.last_name;
    if (updates.manager_id) repUpdates.manager_id = updates.manager_id;

    if (Object.keys(repUpdates).length > 0) {
      const { error: repError } = await supabase
        .from('representatives')
        .update(repUpdates)
        .eq('id', representativeId);

      if (repError) throw repError;
    }

    // Update user email if provided
    if (updates.email) {
      // Get representative to find user_id
      const { data: repUser, error: repUserError } = await supabase
        .from('representatives')
        .select('user_id')
        .eq('id', representativeId)
        .single();

      if (repUserError) throw repUserError;
      if (repUser?.user_id) {
        const { error: userError } = await supabase
          .from('users')
          .update({ email: updates.email.toLowerCase() })
          .eq('id', repUser.user_id);

        if (userError) throw userError;
      }
    }

    // Update clinics if provided
    if (updates.clinic_ids) {
      // Delete existing clinic links
      await supabase
        .from('representative_clinics')
        .delete()
        .eq('representative_id', representativeId);

      // Insert new clinic links
      if (updates.clinic_ids.length > 0) {
        const clinicInserts = updates.clinic_ids.map(clinicId => ({
          representative_id: representativeId,
          clinic_id: clinicId
        }));

        const { error: clinicsError } = await supabase
          .from('representative_clinics')
          .insert(clinicInserts);

        if (clinicsError) throw clinicsError;
      }
    }

    // Update brands if provided
    if (updates.brand_ids) {
      // Delete existing brand assignments
      await supabase
        .from('representative_brands')
        .delete()
        .eq('representative_id', representativeId);

      // Insert new brand assignments
      if (updates.brand_ids.length > 0) {
        const brandInserts: RepresentativeBrandInsert[] = updates.brand_ids.map(brandId => ({
          representative_id: representativeId,
          brand_id: brandId
        }));

        const { error: brandsError } = await supabase
          .from('representative_brands')
          .insert(brandInserts);

        if (brandsError) throw brandsError;
      }
    }

    // Return updated representative
    return await getRepresentativeById(representativeId);
  } catch (error) {
    console.error('Error updating representative:', error);
    throw error;
  }
};

// Delete representative (managers and super_admin)
export const deleteRepresentative = async (representativeId: string): Promise<void> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can delete representatives');
  }

  try {
    // Get representative to find user_id
    const { data: representative, error: fetchError } = await supabase
      .from('representatives')
      .select('user_id, auth_user_id')
      .eq('id', representativeId)
      .single();

    if (fetchError) throw fetchError;
    if (!representative) throw new Error('Representative not found');

    // Delete representative profile (this will cascade to territories and brands)
    const { error: deleteError } = await supabase
      .from('representatives')
      .delete()
      .eq('id', representativeId);

    if (deleteError) throw deleteError;

    // Delete user from public.users table
    if (representative.user_id) {
      await supabase
        .from('users')
        .delete()
        .eq('id', representative.user_id);
    }

    // Delete user from auth.users (requires admin API)
    if (supabaseAdmin && (representative.auth_user_id || representative.user_id)) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          representative.auth_user_id || representative.user_id
        );
      } catch (authDeleteError) {
        console.warn('Failed to delete auth user:', authDeleteError);
        // Don't throw error for auth deletion failure
      }
    }

    console.log('Representative deleted successfully');
  } catch (error) {
    console.error('Error deleting representative:', error);
    throw error;
  }
};

// Add territory to representative
export const addTerritoryToRepresentative = async (
  representativeId: string, 
  district: BakuDistrict
): Promise<RepresentativeTerritory> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can manage representative territories');
  }

  const { data, error } = await supabase
    .from('representative_territories')
    .insert({
      representative_id: representativeId,
      district: district
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Representative is already assigned to this territory');
    }
    throw error;
  }
  
  if (!data) throw new Error('Failed to add territory to representative');
  return data;
};

// Remove territory from representative
export const removeTerritoryFromRepresentative = async (
  representativeId: string, 
  district: BakuDistrict
): Promise<void> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can manage representative territories');
  }

  const { error } = await supabase
    .from('representative_territories')
    .delete()
    .eq('representative_id', representativeId)
    .eq('district', district);

  if (error) throw error;
};

// Add brand to representative
export const addBrandToRepresentative = async (
  representativeId: string, 
  brandId: string
): Promise<RepresentativeBrand> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can manage representative brands');
  }

  const { data, error } = await supabase
    .from('representative_brands')
    .insert({
      representative_id: representativeId,
      brand_id: brandId
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Representative is already assigned to this brand');
    }
    throw error;
  }
  
  if (!data) throw new Error('Failed to add brand to representative');
  return data;
};

// Remove brand from representative
export const removeBrandFromRepresentative = async (
  representativeId: string, 
  brandId: string
): Promise<void> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can manage representative brands');
  }

  const { error } = await supabase
    .from('representative_brands')
    .delete()
    .eq('representative_id', representativeId)
    .eq('brand_id', brandId);

  if (error) throw error;
};

// Search representatives
export const searchRepresentatives = async (query: string): Promise<RepresentativeWithDetails[]> => {
  if (!query.trim()) {
    return getRepresentatives();
  }
  // Search by name
  const baseSelect = `
    *,
    manager:managers (
      id,
      full_name
    ),
    territories:representative_territories (
      id,
      district,
      created_at
    ),
    clinics:representative_clinics (
      id,
      clinic:clinics (
        id,
        name,
        address
      )
    ),
    brands:representative_brands (
      id,
      created_at,
      brand:brands (
        id,
        name
      )
    )
  `;

  const { data: repsByName, error: nameError } = await supabase
    .from('representatives')
    .select(baseSelect)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .order('created_at', { ascending: false });
  if (nameError) throw nameError;

  // Search by email in users table, then fetch reps by user_id
  const { data: usersByEmail } = await supabase
    .from('users')
    .select('id, email, role, created_at')
    .ilike('email', `%${query}%`);

  let repsByEmail: any[] = [];
  const userIds = (usersByEmail || []).map((u: any) => u.id);
  if (userIds.length > 0) {
    const { data: repsEmail } = await supabase
      .from('representatives')
      .select(baseSelect)
      .in('user_id', userIds);
    repsByEmail = repsEmail || [];
  }

  // Combine and dedupe
  const allReps = [...(repsByName || []), ...repsByEmail];
  const unique = new Map<string, any>();
  allReps.forEach((r: any) => unique.set(r.id, r));
  const finalReps = Array.from(unique.values());

  // Attach users
  if (finalReps.length > 0) {
    const finalUserIds = finalReps.map((r: any) => r.user_id).filter(Boolean);
    const { data: users } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .in('id', finalUserIds as string[]);
    const idToUser = new Map((users || []).map((u: any) => [u.id, u]));
    return finalReps.map((rep: any) => ({
      ...rep,
      user: idToUser.get(rep.user_id),
      territories: rep.territories || [],
      clinics: rep.clinics || [],
      brands: rep.brands || [],
      assignments: rep.assignments || []
    }));
  }

  return [];
};
