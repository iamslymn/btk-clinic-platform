import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { 
  Doctor, 
  DoctorInsert, 
  DoctorUpdate, 
  DoctorWithWorkplaces,
  DoctorWithWorkplacesAndSpecialization,
  CreateDoctorForm,
  DoctorWorkplace,
  DoctorWorkplaceInsert,
  Specialization
} from '../../types';

// Get all doctors with workplaces and specializations
export const getDoctors = async (): Promise<DoctorWithWorkplacesAndSpecialization[]> => {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        specialization:specializations (
          id,
          name,
          display_name,
          description
        ),
        workplaces:doctor_workplaces (
          id,
          clinic_name,
          address,
          phone,
          created_at
        ),
        clinics:clinic_doctors (
          id,
          clinic:clinics (id, name, address)
        )
      `)
      .order('last_name', { ascending: true });

    if (error) {
      return [];
    }
    
    return data?.map(doctor => ({
      ...doctor,
      specialization: (doctor as any).specialization,
      workplaces: (doctor as any).workplaces || [],
      clinics: (doctor as any).clinics || []
    })) || [];
  } catch {
    return [];
  }
};

// Get a single doctor by ID with workplaces and specialization
export const getDoctorById = async (id: string): Promise<DoctorWithWorkplacesAndSpecialization> => {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      specialization:specializations (
        id,
        name,
        display_name,
        description
      ),
      workplaces:doctor_workplaces (
        id,
        clinic_name,
        address,
        phone,
        created_at
      ),
      clinics:clinic_doctors (
        id,
        clinic:clinics (id, name, address)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Doctor not found');

  return {
    ...data,
    specialization: (data as any).specialization,
    workplaces: (data as any).workplaces || [],
    clinics: (data as any).clinics || []
  };
};

// Create a new doctor (simplified)
export const createDoctor = async (doctorData: CreateDoctorForm): Promise<DoctorWithWorkplaces> => {
  try {
    // Validate required fields
    if (!doctorData.first_name?.trim() || !doctorData.last_name?.trim()) {
      throw new Error('First name and last name are required');
    }

    if (!doctorData.specialization_id?.trim()) {
      throw new Error('Please select a specialization');
    }

    if (!doctorData.total_category || !doctorData.planeta_category) {
      throw new Error('Please select both total and planeta categories');
    }

    if (!doctorData.gender) {
      throw new Error('Please select a gender');
    }

    if (!doctorData.phone?.trim()) {
      throw new Error('Phone number is required');
    }

    // Get the specialization details to extract the specialty name
    const { data: specializationData, error: specError } = await supabase
      .from('specializations')
      .select('name, display_name')
      .eq('id', doctorData.specialization_id.trim())
      .single();

    if (specError || !specializationData) {
      throw new Error('Invalid specialization selected. Please choose a valid specialization.');
    }

    // Use display_name if available, otherwise fall back to name
    const specialtyName = specializationData.display_name || specializationData.name;

    const primaryAddress = doctorData.address?.trim() || 'Ünvan qeyd olunmayıb.';

    // Create the doctor with all required legacy fields
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .insert({
        first_name: doctorData.first_name.trim(),
        last_name: doctorData.last_name.trim(),
        specialty: specialtyName, // Set the required specialty string field
        specialization_id: doctorData.specialization_id.trim(),
        category: doctorData.total_category, // Set the required category field (using total_category as primary)
        total_category: doctorData.total_category,
        planeta_category: doctorData.planeta_category,
        gender: doctorData.gender,
        phone: doctorData.phone.trim(),
        address: primaryAddress, // Set the required address field from first workplace
        email: null, // Explicitly set to null since email was removed from form
        location_lat: 40.0, // Default coordinates
        location_lng: 49.0   // Default coordinates for Azerbaijan
      })
      .select()
      .single();

    if (doctorError) {
      console.error('Database error creating doctor:', doctorError);
      throw new Error(`Failed to create doctor: ${doctorError.message}`);
    }

    if (!doctor) {
      throw new Error('Failed to create doctor: No data returned');
    }

    // Link doctor to selected clinics
    if ((doctorData as any).clinic_ids && (doctorData as any).clinic_ids.length > 0) {
      const records = (doctorData as any).clinic_ids.map((clinicId: string) => ({
        clinic_id: clinicId,
        doctor_id: doctor.id
      }));
      await supabase.from('clinic_doctors').insert(records);
    }

    return {
      ...doctor,
      workplaces: []
    };
  } catch (error: any) {
    console.error('Error in createDoctor:', error);
    // If it's already a formatted error, throw it as-is
    if (error?.message && typeof error.message === 'string') {
      throw error;
    }
    // Otherwise, provide a generic error message
    throw new Error('Failed to create doctor. Please check your input and try again.');
  }
};

// Update doctor (super_admin only)
export const updateDoctor = async (
  doctorId: string, 
  updates: Partial<CreateDoctorForm>
): Promise<DoctorWithWorkplaces> => {
  // Check if user is super_admin
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'super_admin') {
    throw new Error('Only super administrators can update doctors');
  }

  try {
    // Prepare doctor updates
    const doctorUpdates: DoctorUpdate = {};
    if (updates.first_name) doctorUpdates.first_name = updates.first_name;
    if (updates.last_name) doctorUpdates.last_name = updates.last_name;
    if (updates.total_category) doctorUpdates.total_category = updates.total_category;
    if (updates.planeta_category) doctorUpdates.planeta_category = updates.planeta_category;
    if (updates.gender) doctorUpdates.gender = updates.gender as any;
    if (updates.phone) doctorUpdates.phone = updates.phone;
    if ((updates as any).address !== undefined) doctorUpdates.address = (updates as any).address as any;

    // If specialization_id changes, also update derived 'specialty' string
    if (updates.specialization_id) {
      doctorUpdates.specialization_id = updates.specialization_id;
      const { data: spec } = await supabase
        .from('specializations')
        .select('name, display_name')
        .eq('id', updates.specialization_id)
        .single();
      if (spec) {
        (doctorUpdates as any).specialty = spec.display_name || spec.name;
      }
    }

    if (Object.keys(doctorUpdates).length > 0) {
      const { error: doctorError } = await supabase
        .from('doctors')
        .update(doctorUpdates)
        .eq('id', doctorId);

      if (doctorError) throw doctorError;
    }

    // Update clinics if clinic_ids provided
    if ((updates as any).clinic_ids) {
      await supabase
        .from('clinic_doctors')
        .delete()
        .eq('doctor_id', doctorId);

      const clinicIds: string[] = ((updates as any).clinic_ids as string[]) || [];
      if (clinicIds.length > 0) {
        const records = clinicIds.map((clinicId) => ({ clinic_id: clinicId, doctor_id: doctorId }));
        const { error: linkError } = await supabase.from('clinic_doctors').insert(records);
        if (linkError) throw linkError;
      }
    }

    // Return updated doctor
    return await getDoctorById(doctorId);
  } catch (error) {
    console.error('Error updating doctor:', error);
    throw error;
  }
};

// Delete doctor (super_admin only)
export const deleteDoctor = async (doctorId: string): Promise<void> => {
  // Check if user is super_admin
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'super_admin') {
    throw new Error('Only super administrators can delete doctors');
  }

  const { error } = await supabase
    .from('doctors')
    .delete()
    .eq('id', doctorId);

  if (error) throw error;
};

// Get doctors by specialization
export const getDoctorsBySpecialization = async (specializationId: string): Promise<DoctorWithWorkplaces[]> => {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      workplaces:doctor_workplaces (
        id,
        clinic_name,
        address,
        phone,
        created_at
      )
    `)
    .eq('specialization_id', specializationId)
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data?.map(doctor => ({
    ...doctor,
    workplaces: doctor.workplaces || []
  })) || [];
};

// Get doctors by clinic
export const getDoctorsByClinic = async (clinicId: string): Promise<DoctorWithWorkplaces[]> => {
  const { data, error } = await supabase
    .from('clinic_doctors')
    .select(`
      doctor:doctors (
        *,
        workplaces:doctor_workplaces (
          id,
          clinic_name,
          address,
          phone,
          created_at
        )
      )
    `)
    .eq('clinic_id', clinicId);

  if (error) throw error;
  return data?.map(item => ({
    ...item.doctor,
    workplaces: item.doctor?.workplaces || []
  })) || [];
};

// Search doctors
export const searchDoctors = async (query: string): Promise<DoctorWithWorkplacesAndSpecialization[]> => {
  if (!query.trim()) {
    return getDoctors();
  }

  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      specialization:specializations (
        id,
        name,
        display_name,
        description
      ),
      workplaces:doctor_workplaces (
        id,
        clinic_name,
        address,
        phone,
        created_at
      )
    `)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data?.map(doctor => ({
    ...doctor,
    specialization: doctor.specialization,
    workplaces: doctor.workplaces || []
  })) || [];
};
