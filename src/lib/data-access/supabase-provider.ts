// Supabase Implementation of Data Access Layer
// Simple, focused queries that can be easily replaced with any backend

import { supabase } from '../supabase';
import type {
  DataAccessProvider,
  AssignmentRepository,
  RepresentativeRepository,
  DoctorRepository,
  ProductRepository,
  BrandRepository,
  AssignmentProductRepository,
  SimpleAssignment,
  SimpleRepresentative,
  SimpleDoctor,
  SimpleProduct,
  SimpleBrand,
  SimpleAssignmentProduct,
} from './interfaces';

// Supabase Assignment Repository - Simple queries only
class SupabaseAssignmentRepository implements AssignmentRepository {
  async findAll(): Promise<SimpleAssignment[]> {
    const { data, error } = await supabase
      .from('rep_doctor_assignments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);
    return data || [];
  }

  async findById(id: string): Promise<SimpleAssignment | null> {
    const { data, error } = await supabase
      .from('rep_doctor_assignments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch assignment: ${error.message}`);
    }
    return data;
  }

  async findByRepresentative(repId: string): Promise<SimpleAssignment[]> {
    const { data, error } = await supabase
      .from('rep_doctor_assignments')
      .select('*')
      .eq('rep_id', repId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch assignments for rep: ${error.message}`);
    return data || [];
  }

  async findByRepAndDoctor(repId: string, doctorId: string): Promise<SimpleAssignment | null> {
    const { data, error } = await supabase
      .from('rep_doctor_assignments')
      .select('*')
      .eq('rep_id', repId)
      .eq('doctor_id', doctorId)
      .maybeSingle();

    if (error) {
      // Return null on not found; surface other errors
      if (error.code === 'PGRST116' || error.code === 'PGRST204') return null;
      throw new Error(`Failed to fetch assignment: ${error.message}`);
    }
    return data;
  }

  async findByDateRange(startDate: string, endDate: string): Promise<SimpleAssignment[]> {
    const { data, error } = await supabase
      .from('rep_doctor_assignments')
      .select('*')
      .gte('assignment_date', startDate)
      .lte('assignment_date', endDate)
      .order('assignment_date', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch assignments by date: ${error.message}`);
    return data || [];
  }

  async findRecurringSeries(): Promise<SimpleAssignment[]> {
    // Skip recurring assignments queries entirely - not supported in current schema
    // Silent return to avoid console spam
    return [];
  }

  async create(assignmentData: Omit<SimpleAssignment, 'id' | 'created_at'>): Promise<SimpleAssignment> {
    // Only use fields that exist in current database schema
    const dbAssignmentData = {
      rep_id: assignmentData.rep_id,
      doctor_id: assignmentData.doctor_id,
      visit_days: assignmentData.visit_days,
      start_time: (assignmentData as any).start_time ?? null,
      end_time: (assignmentData as any).end_time ?? null
    };
    
    const { data, error } = await supabase
      .from('rep_doctor_assignments')
      .insert(dbAssignmentData)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create assignment: ${error.message}`);
    return data;
  }

  async update(id: string, updates: Partial<SimpleAssignment>): Promise<SimpleAssignment> {
    const { data, error } = await supabase
      .from('rep_doctor_assignments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update assignment: ${error.message}`);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('rep_doctor_assignments')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
  }

  async deleteRecurringSeries(parentId: string): Promise<void> {
    // Skip recurring series deletion - not supported in current schema
    return;
  }
}

// Supabase Representative Repository
class SupabaseRepresentativeRepository implements RepresentativeRepository {
  async findAll(): Promise<SimpleRepresentative[]> {
    const { data, error } = await supabase
      .from('representatives')
      .select('*')
      .order('first_name', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch representatives: ${error.message}`);
    return data || [];
  }

  async findById(id: string): Promise<SimpleRepresentative | null> {
    const { data, error } = await supabase
      .from('representatives')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch representative: ${error.message}`);
    }
    return data;
  }

  async findByManager(managerId: string): Promise<SimpleRepresentative[]> {
    const { data, error } = await supabase
      .from('representatives')
      .select('*')
      .eq('manager_id', managerId)
      .order('first_name', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch representatives by manager: ${error.message}`);
    return data || [];
  }
}

// Supabase Doctor Repository
class SupabaseDoctorRepository implements DoctorRepository {
  async findAll(): Promise<SimpleDoctor[]> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('last_name', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch doctors: ${error.message}`);
    return data || [];
  }

  async findById(id: string): Promise<SimpleDoctor | null> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch doctor: ${error.message}`);
    }
    return data;
  }

  async findByIds(ids: string[]): Promise<SimpleDoctor[]> {
    if (ids.length === 0) return [];
    
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .in('id', ids);
    
    if (error) throw new Error(`Failed to fetch doctors by IDs: ${error.message}`);
    return data || [];
  }
}

// Supabase Product Repository
class SupabaseProductRepository implements ProductRepository {
  async findAll(): Promise<SimpleProduct[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch products: ${error.message}`);
    return data || [];
  }

  async findById(id: string): Promise<SimpleProduct | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
    return data;
  }

  async findByIds(ids: string[]): Promise<SimpleProduct[]> {
    if (ids.length === 0) return [];
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', ids);
    
    if (error) throw new Error(`Failed to fetch products by IDs: ${error.message}`);
    return data || [];
  }

  async findByAssignment(assignmentId: string): Promise<SimpleProduct[]> {
    // First get the product IDs from the junction table
    const { data: assignmentProducts, error: junctionError } = await supabase
      .from('rep_doctor_products')
      .select('product_id')
      .eq('assignment_id', assignmentId);
    
    if (junctionError) throw new Error(`Failed to fetch assignment products: ${junctionError.message}`);
    
    const productIds = assignmentProducts?.map(ap => ap.product_id) || [];
    return this.findByIds(productIds);
  }
}

// Supabase Brand Repository
class SupabaseBrandRepository implements BrandRepository {
  async findAll(): Promise<SimpleBrand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch brands: ${error.message}`);
    return data || [];
  }

  async findById(id: string): Promise<SimpleBrand | null> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch brand: ${error.message}`);
    }
    return data;
  }

  async findByIds(ids: string[]): Promise<SimpleBrand[]> {
    if (ids.length === 0) return [];
    
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .in('id', ids);
    
    if (error) throw new Error(`Failed to fetch brands by IDs: ${error.message}`);
    return data || [];
  }
}

// Assignment-Product Junction Repository
class SupabaseAssignmentProductRepository implements AssignmentProductRepository {
  async findByAssignment(assignmentId: string): Promise<SimpleAssignmentProduct[]> {
    const { data, error } = await supabase
      .from('rep_doctor_products')
      .select('*')
      .eq('assignment_id', assignmentId);
    
    if (error) throw new Error(`Failed to fetch assignment products: ${error.message}`);
    return data || [];
  }

  async findByAssignments(assignmentIds: string[]): Promise<SimpleAssignmentProduct[]> {
    if (assignmentIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('rep_doctor_products')
      .select('*')
      .in('assignment_id', assignmentIds);
    
    if (error) throw new Error(`Failed to fetch assignment products: ${error.message}`);
    return data || [];
  }

  async create(data: Omit<SimpleAssignmentProduct, 'id' | 'created_at'>): Promise<SimpleAssignmentProduct> {
    const { data: result, error } = await supabase
      .from('rep_doctor_products')
      .insert(data)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create assignment product: ${error.message}`);
    return result;
  }

  async deleteByAssignment(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('rep_doctor_products')
      .delete()
      .eq('assignment_id', assignmentId);
    
    if (error) throw new Error(`Failed to delete assignment products: ${error.message}`);
  }
}

// Export the complete Supabase provider
export const supabaseDataAccess: DataAccessProvider = {
  assignments: new SupabaseAssignmentRepository(),
  representatives: new SupabaseRepresentativeRepository(),
  doctors: new SupabaseDoctorRepository(),
  products: new SupabaseProductRepository(),
  brands: new SupabaseBrandRepository(),
};

// Export individual repositories for direct use if needed
export {
  SupabaseAssignmentRepository,
  SupabaseRepresentativeRepository,
  SupabaseDoctorRepository,
  SupabaseProductRepository,
  SupabaseBrandRepository,
  SupabaseAssignmentProductRepository,
};
