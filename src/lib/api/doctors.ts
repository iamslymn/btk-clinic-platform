import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { Doctor, DoctorInsert, DoctorUpdate } from '../../types';

// Get all doctors for the current manager
export const getDoctors = async (): Promise<Doctor[]> => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get a single doctor by ID
export const getDoctor = async (id: string): Promise<Doctor> => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Doctor not found');
  return data;
};

// Create a new doctor (simplified)
export const createDoctor = async (doctorData: Omit<DoctorInsert, 'manager_id'>): Promise<Doctor> => {
  try {
    const { data, error } = await supabase
      .from('doctors')
      .insert({
        ...doctorData,
        manager_id: 'default-manager-id',
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create doctor');
    }
    
    return data;
  } catch (error) {
    throw new Error('Failed to create doctor');
  }
};

// Update a doctor
export const updateDoctor = async (id: string, updates: Partial<DoctorUpdate>): Promise<Doctor> => {
  const { data, error } = await supabase
    .from('doctors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update doctor');
  return data;
};

// Delete a doctor
export const deleteDoctor = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('doctors')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Search doctors by name or specialty
export const searchDoctors = async (query: string): Promise<Doctor[]> => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,specialty.ilike.%${query}%`)
    .order('last_name', { ascending: true });

  if (error) throw error;
  return data || [];
};