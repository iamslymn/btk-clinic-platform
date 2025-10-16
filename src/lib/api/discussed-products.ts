/**
 * API for managing discussed products (drugs) during visits
 * Allows representatives to record which products they discussed with doctors
 */

import { supabase } from '../supabase';
import { customAuth } from '../customAuth';

export interface DiscussedProduct {
  id: string;
  visit_id: string;
  product_id: string;
  created_at: string;
  updated_at: string;
}

export interface DiscussedProductDetailed {
  id: string;
  visit_id: string;
  product_id: string;
  created_at: string;
  product_name: string;
  product_description: string | null;
  brand_name: string;
  scheduled_date: string;
  visit_status: string;
  representative_name: string;
  doctor_name: string;
}

export interface ProductForSelection {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  description: string | null;
}

/**
 * Get all products available to a representative based on their assigned brands
 * @param repId - Representative ID
 * @returns List of products from representative's assigned brands
 */
export const getAvailableProductsForRep = async (repId: string): Promise<ProductForSelection[]> => {
  try {
    // Get representative's assigned brands
    const { data: repBrands, error: brandsError } = await supabase
      .from('representative_brands')
      .select('brand_id')
      .eq('representative_id', repId);

    if (brandsError) {
      console.error('Error fetching rep brands:', brandsError);
      throw brandsError;
    }

    if (!repBrands || repBrands.length === 0) {
      return [];
    }

    const brandIds = repBrands.map((rb: any) => rb.brand_id);

    // Get all products from these brands
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        brand_id,
        brands!inner(name)
      `)
      .in('brand_id', brandIds)
      .order('name');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    return (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      brand_id: p.brand_id,
      brand_name: (p.brands as any)?.name || 'Unknown',
      description: p.description
    }));
  } catch (error) {
    console.error('Error getting available products for rep:', error);
    throw error;
  }
};

/**
 * Get discussed products for a specific visit
 * @param visitId - Visit log ID
 * @returns List of discussed products with details
 */
export const getDiscussedProductsForVisit = async (visitId: string): Promise<DiscussedProductDetailed[]> => {
  try {
    const { data, error } = await supabase
      .from('visit_discussed_products_detailed')
      .select('*')
      .eq('visit_id', visitId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching discussed products:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting discussed products for visit:', error);
    throw error;
  }
};

/**
 * Get just the product IDs for a visit (for selection state)
 * @param visitId - Visit log ID
 * @returns Array of product IDs
 */
export const getDiscussedProductIds = async (visitId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('visit_discussed_products')
      .select('product_id')
      .eq('visit_id', visitId);

    if (error) {
      console.error('Error fetching discussed product IDs:', error);
      throw error;
    }

    return (data || []).map((d: any) => d.product_id);
  } catch (error) {
    console.error('Error getting discussed product IDs:', error);
    return [];
  }
};

/**
 * Add discussed products to a visit
 * Replaces all existing selections with new ones
 * @param visitId - Visit log ID
 * @param productIds - Array of product IDs to associate with the visit
 * @returns Success status
 */
export const updateDiscussedProducts = async (
  visitId: string,
  productIds: string[]
): Promise<void> => {
  try {
    const user = customAuth.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First, delete all existing discussed products for this visit
    const { error: deleteError } = await supabase
      .from('visit_discussed_products')
      .delete()
      .eq('visit_id', visitId);

    if (deleteError) {
      console.error('Error deleting old discussed products:', deleteError);
      throw deleteError;
    }

    // If no products selected, we're done
    if (productIds.length === 0) {
      return;
    }

    // Insert new discussed products
    const records = productIds.map(productId => ({
      visit_id: visitId,
      product_id: productId
    }));

    const { error: insertError } = await supabase
      .from('visit_discussed_products')
      .insert(records);

    if (insertError) {
      console.error('Error inserting discussed products:', insertError);
      throw insertError;
    }

    console.log(`✅ Updated discussed products for visit ${visitId}: ${productIds.length} products`);
  } catch (error) {
    console.error('Error updating discussed products:', error);
    throw error;
  }
};

/**
 * Add a single product to a visit's discussed products
 * @param visitId - Visit log ID
 * @param productId - Product ID to add
 */
export const addDiscussedProduct = async (
  visitId: string,
  productId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('visit_discussed_products')
      .insert({
        visit_id: visitId,
        product_id: productId
      });

    if (error) {
      // Ignore unique constraint violations (product already added)
      if (error.code === '23505') {
        console.log('Product already in discussed list');
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error adding discussed product:', error);
    throw error;
  }
};

/**
 * Remove a single product from a visit's discussed products
 * @param visitId - Visit log ID
 * @param productId - Product ID to remove
 */
export const removeDiscussedProduct = async (
  visitId: string,
  productId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('visit_discussed_products')
      .delete()
      .eq('visit_id', visitId)
      .eq('product_id', productId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error removing discussed product:', error);
    throw error;
  }
};

/**
 * Get discussed products summary for multiple visits (for reports/dashboards)
 * @param visitIds - Array of visit IDs
 * @returns Map of visit ID to array of product names
 */
export const getDiscussedProductsSummary = async (
  visitIds: string[]
): Promise<Record<string, string[]>> => {
  try {
    if (visitIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase
      .from('visit_discussed_products')
      .select(`
        visit_id,
        products!inner(name, description)
      `)
      .in('visit_id', visitIds);

    if (error) {
      console.error('Error fetching discussed products summary:', error);
      throw error;
    }

    // Group by visit_id
    const summary: Record<string, string[]> = {};
    (data || []).forEach((item: any) => {
      const visitId = item.visit_id;
      const productName = item.products?.name || 'Unknown';
      const description = item.products?.description;
      const fullName = description ? `${productName} (${description})` : productName;

      if (!summary[visitId]) {
        summary[visitId] = [];
      }
      summary[visitId].push(fullName);
    });

    return summary;
  } catch (error) {
    console.error('Error getting discussed products summary:', error);
    return {};
  }
};

