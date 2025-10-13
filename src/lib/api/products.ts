import { supabase } from '../supabase';
import type { Product, ProductInsert, ProductUpdate, Brand } from '../../types';

// Get all products for the current manager with brand information
export const getProducts = async (): Promise<(Product & { brand?: Brand })[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands!products_brand_id_fkey (
        id,
        name
      )
    `)
    .order('name', { ascending: true });

  if (error) throw error;
  return data?.map(product => ({
    ...product,
    brand: product.brands as Brand
  })) || [];
};

// Get all products for a specific brand
export const getProductsByBrand = async (brandId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('brand_id', brandId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get a single product by ID
export const getProduct = async (id: string): Promise<Product & { brand?: Brand }> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands!products_brand_id_fkey (
        id,
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Product not found');
  
  return {
    ...data,
    brand: data.brands as Brand
  };
};

// Create a new product
export const createProduct = async (productData: ProductInsert): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create product');
  return data;
};

// Update a product
export const updateProduct = async (id: string, updates: Partial<ProductUpdate>): Promise<Product> => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update product');
  return data;
};

// Delete a product
export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Search products by name or description
export const searchProducts = async (query: string): Promise<(Product & { brand?: Brand })[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brands!products_brand_id_fkey (
        id,
        name
      )
    `)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data?.map(product => ({
    ...product,
    brand: product.brands as Brand
  })) || [];
};