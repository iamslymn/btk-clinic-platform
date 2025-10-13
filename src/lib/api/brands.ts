import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { Brand, BrandInsert, BrandUpdate } from '../../types';

// Get all brands for the current manager
export const getBrands = async (): Promise<Brand[]> => {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get a single brand by ID
export const getBrand = async (id: string): Promise<Brand> => {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Brand not found');
  return data;
};

// Create a new brand
export const createBrand = async (brandData: Omit<BrandInsert, 'manager_id'>): Promise<Brand> => {
  // Get current user from custom auth
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile) throw new Error('Not authenticated');

  let managerId: string | null = null;
  if ((profile as any).role === 'manager') {
    const { data: manager } = await supabase
      .from('managers')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!manager) throw new Error('Manager profile not found');
    managerId = manager.id;
  }

  const { data, error } = await supabase
    .from('brands')
    .insert({
      ...brandData,
      manager_id: managerId,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create brand');
  return data;
};

// Update a brand
export const updateBrand = async (id: string, updates: Partial<BrandUpdate>): Promise<Brand> => {
  const { data, error } = await supabase
    .from('brands')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update brand');
  return data;
};

// Delete a brand
export const deleteBrand = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Search brands by name
export const searchBrands = async (query: string): Promise<Brand[]> => {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};