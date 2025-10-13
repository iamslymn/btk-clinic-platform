import { supabase } from '../supabase';
import type { Specialization } from '../../types';

// Get all specializations
export const getSpecializations = async (): Promise<Specialization[]> => {
  const { data, error } = await supabase
    .from('specializations')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get a single specialization by ID
export const getSpecializationById = async (id: string): Promise<Specialization> => {
  const { data, error } = await supabase
    .from('specializations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Specialization not found');
  return data;
};

// Get specialization by name
export const getSpecializationByName = async (name: string): Promise<Specialization> => {
  const { data, error } = await supabase
    .from('specializations')
    .select('*')
    .eq('name', name)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Specialization not found');
  return data;
};

// Search specializations
export const searchSpecializations = async (query: string): Promise<Specialization[]> => {
  if (!query.trim()) {
    return getSpecializations();
  }

  const { data, error } = await supabase
    .from('specializations')
    .select('*')
    .or(`display_name.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('display_name', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Create specialization (super_admin)
export const createSpecialization = async (data: { name: string; display_name: string; description?: string }): Promise<Specialization> => {
  // Pre-check for duplicates by name or display_name
  const { data: existing } = await supabase
    .from('specializations')
    .select('id')
    .or(`name.eq.${data.name},display_name.eq.${data.display_name}`)
    .maybeSingle();

  if (existing) {
    throw new Error('A specialization with the same key or display name already exists');
  }

  const { data: result, error } = await supabase
    .from('specializations')
    .insert({
      name: data.name,
      display_name: data.display_name,
      description: data.description || null
    })
    .select('*')
    .single();

  if (error) {
    // Friendly message for unique constraint conflicts
    if ((error as any).code === '23505' || (error as any).details?.includes('already exists')) {
      throw new Error('A specialization with the same key or display name already exists');
    }
    throw error;
  }
  return result as Specialization;
};

// Update specialization (super_admin)
export const updateSpecialization = async (id: string, updates: Partial<{ name: string; display_name: string; description?: string }>): Promise<Specialization> => {
  // If changing name or display_name, ensure uniqueness
  if (updates.name || updates.display_name) {
    const orParts: string[] = [];
    if (updates.name) orParts.push(`name.eq.${updates.name}`);
    if (updates.display_name) orParts.push(`display_name.eq.${updates.display_name}`);

    if (orParts.length > 0) {
      const { data: existing } = await supabase
        .from('specializations')
        .select('id')
        .or(orParts.join(','))
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('A specialization with the same key or display name already exists');
      }
    }
  }

  const { data, error } = await supabase
    .from('specializations')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if ((error as any).code === '23505') {
      throw new Error('A specialization with the same key or display name already exists');
    }
    throw error;
  }
  return data as Specialization;
};

// Delete specialization (super_admin)
export const deleteSpecialization = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('specializations')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
