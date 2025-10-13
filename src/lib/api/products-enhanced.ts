import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { 
  ProductUpdate, 
  ProductWithDetails,
  CreateProductForm
} from '../../types';

// Get all products with brand details
export const getProducts = async (): Promise<ProductWithDetails[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands (
        id,
        name
      )
    `)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((product: any) => ({
    ...product,
    brand: product.brand,
    priority_specializations: product.priority_specializations || []
  }));
};

// Get products by brand
export const getProductsByBrand = async (brandId: string): Promise<ProductWithDetails[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands (
        id,
        name
      )
    `)
    .eq('brand_id', brandId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((product: any) => ({
    ...product,
    brand: product.brand,
    priority_specializations: product.priority_specializations || []
  }));
};

// Get products for a representative (based on assigned brands)
export const getProductsForRepresentative = async (representativeId: string): Promise<ProductWithDetails[]> => {
  // Get representative's brands
  const { data: repBrands, error: brandsError } = await supabase
    .from('representative_brands')
    .select('brand_id')
    .eq('representative_id', representativeId);

  if (brandsError) throw brandsError;
  
  const brandIds = (repBrands || []).map((rb: any) => rb.brand_id);
  
  if (brandIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands (
        id,
        name
      )
    `)
    .in('brand_id', brandIds)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((product: any) => ({
    ...product,
    brand: product.brand,
    priority_specializations: product.priority_specializations || []
  }));
};

// Get products by specialization priority
export const getProductsBySpecialization = async (specialization: string): Promise<ProductWithDetails[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands (
        id,
        name
      )
    `)
    .contains('priority_specializations', [specialization])
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((product: any) => ({
    ...product,
    brand: product.brand,
    priority_specializations: product.priority_specializations || []
  }));
};

// Get a single product by ID
export const getProductById = async (id: string): Promise<ProductWithDetails> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands (
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
    brand: (data as any).brand,
    priority_specializations: (data as any).priority_specializations || []
  } as any;
};

// Create a new product with optional PDF upload
export const createProduct = async (productData: CreateProductForm): Promise<ProductWithDetails> => {
  // Permission: allow managers and super_admin
  const profile = customAuth.getUserProfile();
  if (!profile || !['manager', 'super_admin'].includes((profile as any).role)) {
    throw new Error('Only managers and super administrators can create products');
  }

  // Ensure we have a valid auth session for storage
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error('Giriş tələb olunur. Zəhmət olmasa yenidən daxil olun.');
  }

  // Upload PDF if provided (use anon client with session)
  let pdfUrl: string | null = null;
  if ((productData as any).pdf_file instanceof File) {
    const file = (productData as any).pdf_file as File;
    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `products/${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(filePath);
    pdfUrl = publicUrl.publicUrl || null;
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      brand_id: (productData as any).brand_id,
      name: (productData as any).name,
      description: (productData as any).description || null,
      priority_specializations: (productData as any).priority_specializations || [],
      pdf_url: pdfUrl,
      annotations: (productData as any).annotations || null
    })
    .select(`
      *,
      brand:brands (
        id,
        name
      )
    `)
    .single();

  if (error || !data) {
    throw new Error('Failed to create product');
  }

  return {
    ...data,
    brand: (data as any).brand,
    priority_specializations: (data as any).priority_specializations || []
  } as any;
};

// Update product
export const updateProduct = async (
  productId: string, 
  updates: Partial<CreateProductForm>
): Promise<ProductWithDetails> => {
  // Permission: allow managers and super_admin
  const profile = customAuth.getUserProfile();
  if (!profile || !['manager', 'super_admin'].includes((profile as any).role)) {
    throw new Error('Only managers and super administrators can update products');
  }

  // Ensure session exists for uploads
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error('Giriş tələb olunur. Zəhmət olmasa yenidən daxil olun.');
  }

  // Upload new PDF if provided
  let pdfUrl: string | undefined;
  if ((updates as any).pdf_file instanceof File) {
    const file = (updates as any).pdf_file as File;
    const fileExt = file.name.split('.').pop() || 'pdf';
    const filePath = `products/${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (uploadError) throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    const { data: publicUrl } = supabase.storage.from('documents').getPublicUrl(filePath);
    pdfUrl = publicUrl.publicUrl || undefined;
  }

  const productUpdates: ProductUpdate = {} as any;
  if ((updates as any).brand_id) (productUpdates as any).brand_id = (updates as any).brand_id;
  if ((updates as any).name) (productUpdates as any).name = (updates as any).name;
  if ((updates as any).description !== undefined) (productUpdates as any).description = (updates as any).description;
  if ((updates as any).priority_specializations) (productUpdates as any).priority_specializations = (updates as any).priority_specializations;
  if (pdfUrl !== undefined) (productUpdates as any).pdf_url = pdfUrl;
  if ((updates as any).annotations !== undefined) (productUpdates as any).annotations = (updates as any).annotations;

  const { data, error } = await supabase
    .from('products')
    .update(productUpdates)
    .eq('id', productId)
    .select(`
      *,
      brand:brands (
        id,
        name
      )
    `)
    .single();

  if (error || !data) {
    throw new Error('Failed to update product');
  }

  return {
    ...data,
    brand: (data as any).brand,
    priority_specializations: (data as any).priority_specializations || []
  } as any;
};

// Delete product (simplified - no security)
export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const { data: product } = await supabase
      .from('products')
      .select('pdf_url')
      .eq('id', productId)
      .single();

    await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if ((product as any)?.pdf_url) {
      try {
        const fileName = (product as any).pdf_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('documents')
            .remove([`products/${fileName}`]);
        }
      } catch {}
    }
  } catch {}
};

// Search products
export const searchProducts = async (query: string): Promise<ProductWithDetails[]> => {
  if (!query.trim()) {
    return getProducts();
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands (
        id,
        name
      )
    `)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,annotations.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((product: any) => ({
    ...product,
    brand: product.brand,
    priority_specializations: product.priority_specializations || []
  }));
};
