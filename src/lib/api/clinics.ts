import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { 
  Clinic, 
  ClinicInsert, 
  ClinicUpdate, 
  ClinicWithDoctors,
  CreateClinicForm,
  ClinicDoctor,
  DoctorWithWorkplaces
} from '../../types';

// Get all clinics
export const getClinics = async (): Promise<Clinic[]> => {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get all clinics with their doctors
export const getClinicsWithDoctors = async (): Promise<ClinicWithDoctors[]> => {
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
          total_category,
          planeta_category,
          gender,
          phone,
          email,
          created_at,
          updated_at,
          specialization:specializations (
            id,
            name,
            display_name,
            description
          )
        )
      )
    `)
    .order('name', { ascending: true });

  if (error) throw error;
  return data?.map(clinic => ({
    ...clinic,
    doctors: clinic.doctors || []
  })) || [];
};

// Get counts of doctors per clinic (robust client-side reduction)
export const getClinicDoctorCounts = async (): Promise<Record<string, number>> => {
  const { data, error } = await supabase
    .from('clinic_doctors')
    .select('clinic_id');

  if (error) throw error;
  const counts: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    const id = row.clinic_id;
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
};

// Get a single clinic by ID
export const getClinicById = async (id: string): Promise<Clinic> => {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Clinic not found');
  return data;
};

// Get a single clinic with doctors
export const getClinicWithDoctors = async (id: string): Promise<ClinicWithDoctors> => {
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
          total_category,
          planeta_category,
          gender,
          phone,
          email,
          created_at,
          updated_at,
          specialization:specializations (
            id,
            name,
            display_name,
            description
          )
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Clinic not found');

  return {
    ...data,
    doctors: data.doctors || []
  };
};

// Create a new clinic (managers and super_admin)
export const createClinic = async (clinicData: CreateClinicForm): Promise<Clinic> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can create clinics');
  }

  // Validate required fields
  if (!clinicData.name || !clinicData.address) {
    throw new Error('Clinic name and address are required');
  }

  const { data, error } = await supabase
    .from('clinics')
    .insert({
      name: clinicData.name,
      address: clinicData.address,
      phone: clinicData.phone || null,
      email: clinicData.email || null
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create clinic');
  return data;
};

// Update clinic (managers and super_admin)
export const updateClinic = async (
  clinicId: string, 
  updates: Partial<CreateClinicForm>
): Promise<Clinic> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can update clinics');
  }

  const clinicUpdates: ClinicUpdate = {};
  if (updates.name) clinicUpdates.name = updates.name;
  if (updates.address) clinicUpdates.address = updates.address;
  if (updates.phone !== undefined) clinicUpdates.phone = updates.phone;
  if (updates.email !== undefined) clinicUpdates.email = updates.email;

  const { data, error } = await supabase
    .from('clinics')
    .update(clinicUpdates)
    .eq('id', clinicId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Clinic not found');
  return data;
};

// Delete clinic (managers and super_admin)
export const deleteClinic = async (clinicId: string): Promise<void> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can delete clinics');
  }

  const { error } = await supabase
    .from('clinics')
    .delete()
    .eq('id', clinicId);

  if (error) throw error;
};

// Add doctor to clinic
export const addDoctorToClinic = async (clinicId: string, doctorId: string): Promise<ClinicDoctor> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can manage clinic doctors');
  }

  const { data, error } = await supabase
    .from('clinic_doctors')
    .insert({
      clinic_id: clinicId,
      doctor_id: doctorId
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Doctor is already assigned to this clinic');
    }
    throw error;
  }
  
  if (!data) throw new Error('Failed to add doctor to clinic');
  return data;
};

// Remove doctor from clinic
export const removeDoctorFromClinic = async (clinicId: string, doctorId: string): Promise<void> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can manage clinic doctors');
  }

  const { error } = await supabase
    .from('clinic_doctors')
    .delete()
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId);

  if (error) throw error;
};

// Get doctors available to add to a clinic (not already in the clinic)
export const getAvailableDoctorsForClinic = async (clinicId: string): Promise<DoctorWithWorkplaces[]> => {
  // Get all doctors
  const { data: allDoctors, error: doctorsError } = await supabase
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
    .order('last_name', { ascending: true });

  if (doctorsError) throw doctorsError;

  // Get doctors already in this clinic
  const { data: clinicDoctors, error: clinicDoctorsError } = await supabase
    .from('clinic_doctors')
    .select('doctor_id')
    .eq('clinic_id', clinicId);

  if (clinicDoctorsError) throw clinicDoctorsError;

  const assignedDoctorIds = new Set(clinicDoctors?.map(cd => cd.doctor_id) || []);

  // Filter out doctors already in the clinic
  const availableDoctors = (allDoctors || [])
    .filter(doctor => !assignedDoctorIds.has(doctor.id))
    .map(doctor => ({
      ...doctor,
      workplaces: doctor.workplaces || []
    }));

  return availableDoctors;
};

// Search clinics
export const searchClinics = async (query: string): Promise<Clinic[]> => {
  if (!query.trim()) {
    return getClinics();
  }

  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .or(`name.ilike.%${query}%,address.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};
