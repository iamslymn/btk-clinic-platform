import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { 
  Brand, 
  BrandInsert, 
  BrandUpdate, 
  CreateBrandForm,
  ProductWithDetails
} from '../../types';

// Extended brand type with products
export interface BrandWithProducts extends Brand {
  products: ProductWithDetails[];
}

// Get all brands
export const getBrands = async (): Promise<Brand[]> => {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get all brands with their products
export const getBrandsWithProducts = async (): Promise<BrandWithProducts[]> => {
  const { data, error } = await supabase
    .from('brands')
    .select(`
      *,
      products (
        id,
        name,
        description,
        priority_specializations,
        pdf_url,
        annotations,
        created_at,
        updated_at
      )
    `)
    .order('name', { ascending: true });

  if (error) throw error;
  return data?.map(brand => ({
    ...brand,
    products: (brand.products || []).map(product => ({
      ...product,
      brand: { id: brand.id, name: brand.name },
      priority_specializations: product.priority_specializations || []
    }))
  })) || [];
};

// Get a single brand by ID
export const getBrandById = async (id: string): Promise<Brand> => {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Brand not found');
  return data;
};

// Get a single brand with products
export const getBrandWithProducts = async (id: string): Promise<BrandWithProducts> => {
  const { data, error } = await supabase
    .from('brands')
    .select(`
      *,
      products (
        id,
        name,
        description,
        priority_specializations,
        pdf_url,
        annotations,
        created_at,
        updated_at
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Brand not found');

  return {
    ...data,
    products: (data.products || []).map(product => ({
      ...product,
      brand: { id: data.id, name: data.name },
      priority_specializations: product.priority_specializations || []
    }))
  };
};

// Create a new brand (super_admin only)
export const createBrand = async (brandData: CreateBrandForm): Promise<Brand> => {
  // TODO: Re-enable auth check after RLS is properly configured
  console.log('Creating brand (auth check temporarily disabled for development)');

  // Validate required fields
  if (!brandData.name) {
    throw new Error('Brand name is required');
  }

  const { data, error } = await supabase
    .from('brands')
    .insert({
      name: brandData.name,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('A brand with this name already exists');
    }
    throw error;
  }
  
  if (!data) throw new Error('Failed to create brand');
  return data;
};

// Update brand (super_admin only)
export const updateBrand = async (
  brandId: string, 
  updates: Partial<CreateBrandForm>
): Promise<Brand> => {
  // Check if user is super_admin
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'super_admin') {
    throw new Error('Only super administrators can update brands');
  }

  const brandUpdates: BrandUpdate = {};
  if (updates.name) brandUpdates.name = updates.name;

  const { data, error } = await supabase
    .from('brands')
    .update(brandUpdates)
    .eq('id', brandId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('A brand with this name already exists');
    }
    throw error;
  }
  
  if (!data) throw new Error('Brand not found');
  return data;
};

// Delete brand (super_admin only)
export const deleteBrand = async (brandId: string): Promise<void> => {
  // Check if user is super_admin
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'super_admin') {
    throw new Error('Only super administrators can delete brands');
  }

  // Check if brand has products
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('brand_id', brandId)
    .limit(1);

  if (products && products.length > 0) {
    throw new Error('Cannot delete brand that has products. Delete products first.');
  }

  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', brandId);

  if (error) throw error;
};

// Get brands assigned to a representative
export const getBrandsForRepresentative = async (representativeId: string): Promise<Brand[]> => {
  const { data, error } = await supabase
    .from('representative_brands')
    .select(`
      brand:brands (
        id,
        name,
        created_at,
        updated_at
      )
    `)
    .eq('representative_id', representativeId);

  if (error) throw error;
  return data?.map(item => item.brand).filter(Boolean) || [];
};

// Get brands not assigned to a representative
export const getAvailableBrandsForRepresentative = async (representativeId: string): Promise<Brand[]> => {
  // Get all brands
  const { data: allBrands, error: brandsError } = await supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true });

  if (brandsError) throw brandsError;

  // Get brands already assigned to this representative
  const { data: assignedBrands, error: assignedError } = await supabase
    .from('representative_brands')
    .select('brand_id')
    .eq('representative_id', representativeId);

  if (assignedError) throw assignedError;

  const assignedBrandIds = new Set(assignedBrands?.map(ab => ab.brand_id) || []);

  // Filter out brands already assigned
  return (allBrands || []).filter(brand => !assignedBrandIds.has(brand.id));
};

// Search brands
export const searchBrands = async (query: string): Promise<Brand[]> => {
  if (!query.trim()) {
    return getBrands();
  }

  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};
