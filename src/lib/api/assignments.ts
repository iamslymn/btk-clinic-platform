import { supabase } from '../supabase';
import { createNotification } from './notifications';
import type { 
  RepDoctorAssignment,
  RepDoctorProduct, 
  VisitGoal,
  Representative,
  Doctor,
  Product,
  Brand
} from '../../types';

// Extended assignment type with all relationships
export interface AssignmentWithDetails extends RepDoctorAssignment {
  representative?: Representative;
  doctor?: Doctor;
  products?: (RepDoctorProduct & {
    product?: Product & {
      brand?: Brand;
    };
  })[];
  visit_goals?: VisitGoal[];
}

// Get all assignments for the current manager
export const getAssignments = async (): Promise<AssignmentWithDetails[]> => {
  const { data, error } = await supabase
    .from('rep_doctor_assignments')
    .select(`
      *,
      representatives!rep_doctor_assignments_rep_id_fkey (
        id,
        full_name,
        user_id
      ),
      doctors!rep_doctor_assignments_doctor_id_fkey (
        id,
        first_name,
        last_name,
        specialty,
        category,
        address
      ),
      rep_doctor_products (
        id,
        product_id,
        products (
          id,
          name,
          description,
          brands (
            id,
            name
          )
        )
      ),
      visit_goals (
        id,
        visits_per_week,
        start_date,
        recurring_weeks,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data?.map(assignment => ({
    ...assignment,
    representative: assignment.representatives as Representative,
    doctor: assignment.doctors as Doctor,
    products: assignment.rep_doctor_products?.map((rdp: any) => ({
      ...rdp,
      product: rdp.products ? {
        ...rdp.products,
        brand: rdp.products.brands
      } as Product & { brand?: Brand } : undefined
    })) || [],
    visit_goals: assignment.visit_goals || []
  })) || [];
};

// Get assignments for a specific representative
export const getAssignmentsForRep = async (repId: string): Promise<AssignmentWithDetails[]> => {
  const { data, error } = await supabase
    .from('rep_doctor_assignments')
    .select(`
      *,
      doctors!rep_doctor_assignments_doctor_id_fkey (
        id,
        first_name,
        last_name,
        specialty,
        category,
        address,
        location_lat,
        location_lng
      ),
      rep_doctor_products (
        id,
        product_id,
        products (
          id,
          name,
          description,
          brands (
            id,
            name
          )
        )
      ),
      visit_goals (
        id,
        visits_per_week,
        start_date,
        recurring_weeks
      )
    `)
    .eq('rep_id', repId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data?.map(assignment => ({
    ...assignment,
    doctor: assignment.doctors as Doctor,
    products: assignment.rep_doctor_products?.map((rdp: any) => ({
      ...rdp,
      product: rdp.products ? {
        ...rdp.products,
        brand: rdp.products.brands
      } as Product & { brand?: Brand } : undefined
    })) || [],
    visit_goals: assignment.visit_goals || []
  })) || [];
};

// Create a new assignment
export const createAssignment = async (assignmentData: {
  rep_id: string;
  doctor_id: string;
  visit_days: string[];
  start_time: string;
  end_time: string;
  product_ids: string[];
  visits_per_week?: number;
  start_date?: string; // YYYY-MM-DD
  recurring_weeks?: number; // limit how many weeks it repeats
}): Promise<AssignmentWithDetails> => {
  // First check if an assignment already exists for the same rep and doctor
  const { data: existing } = await supabase
    .from('rep_doctor_assignments')
    .select('id')
    .eq('rep_id', assignmentData.rep_id)
    .eq('doctor_id', assignmentData.doctor_id)
    .maybeSingle();

  if (existing) {
    // Update the existing assignment to avoid unique constraint conflict
    const { error: updErr } = await supabase
      .from('rep_doctor_assignments')
      .update({
        visit_days: assignmentData.visit_days,
        start_time: assignmentData.start_time,
        end_time: assignmentData.end_time,
      })
      .eq('id', existing.id);
    if (updErr) throw updErr;

    // Replace products
    await supabase
      .from('rep_doctor_products')
      .delete()
      .eq('assignment_id', existing.id);
    if (assignmentData.product_ids && assignmentData.product_ids.length > 0) {
      const productAssignments = assignmentData.product_ids.map(productId => ({
        assignment_id: existing.id,
        product_id: productId,
      }));
      const { error: productsError } = await supabase
        .from('rep_doctor_products')
        .insert(productAssignments);
      if (productsError) throw productsError;
    }

    // Upsert visit goal
    if (assignmentData.visits_per_week !== undefined) {
      const { data: goal } = await supabase
        .from('visit_goals')
        .select('id')
        .eq('assignment_id', existing.id)
        .maybeSingle();
      if (goal) {
        const { error: goalUpdErr } = await supabase
          .from('visit_goals')
          .update({
            visits_per_week: assignmentData.visits_per_week,
            start_date: assignmentData.start_date || null,
            recurring_weeks: assignmentData.recurring_weeks || null,
          })
          .eq('id', goal.id);
        if (goalUpdErr) throw goalUpdErr;
      } else if (assignmentData.visits_per_week && assignmentData.visits_per_week > 0) {
        const { error: goalInsErr } = await supabase
          .from('visit_goals')
          .insert({
            assignment_id: existing.id,
            visits_per_week: assignmentData.visits_per_week,
            start_date: assignmentData.start_date || null,
            recurring_weeks: assignmentData.recurring_weeks || null,
          });
        if (goalInsErr) throw goalInsErr;
      }

    // Return the updated assignment with relations
    const assignments = await getAssignments();
    const updated = assignments.find(a => a.id === existing.id);
    if (!updated) throw new Error('Assignment updated but not found');
    return updated;
  }

  // Create the main assignment (no existing)
  const { data: assignment, error: assignmentError } = await supabase
    .from('rep_doctor_assignments')
    .insert({
      rep_id: assignmentData.rep_id,
      doctor_id: assignmentData.doctor_id,
      visit_days: assignmentData.visit_days,
      start_time: assignmentData.start_time,
      end_time: assignmentData.end_time,
    })
    .select()
    .single();

  if (assignmentError) throw assignmentError;
  if (!assignment) throw new Error('Failed to create assignment');

  // Add products to the assignment
  if (assignmentData.product_ids.length > 0) {
    const productAssignments = assignmentData.product_ids.map(productId => ({
      assignment_id: assignment.id,
      product_id: productId,
    }));

    const { error: productsError } = await supabase
      .from('rep_doctor_products')
      .insert(productAssignments);

    if (productsError) throw productsError;
  }

  // Create visit goal if specified
  if (assignmentData.visits_per_week && assignmentData.visits_per_week > 0) {
    const { error: goalError } = await supabase
      .from('visit_goals')
      .insert({
        assignment_id: assignment.id,
        visits_per_week: assignmentData.visits_per_week,
        // Optional recurrence window metadata if columns exist
        start_date: assignmentData.start_date || null,
        recurring_weeks: assignmentData.recurring_weeks || null,
      });

    if (goalError) throw goalError;
  }

  // Return the created assignment with all relationships
  const assignments = await getAssignments();
  const createdAssignment = assignments.find(a => a.id === assignment.id);
  
  if (!createdAssignment) throw new Error('Assignment created but not found');
  try {
    await createNotification({
      title: 'Yeni görüş təyin olundu',
      message: 'Sizə yeni görüş təyin olundu.',
      link: '/rep/schedule',
      recipientRole: 'rep'
    });
  } catch {}
  return createdAssignment;
};

// Update an assignment
export const updateAssignment = async (
  assignmentId: string, 
  updates: {
    visit_days?: string[];
    start_time?: string;
    end_time?: string;
    product_ids?: string[];
    visits_per_week?: number;
  }
): Promise<void> => {
  // Update the main assignment
  const assignmentUpdates: any = {};
  if (updates.visit_days) assignmentUpdates.visit_days = updates.visit_days;
  if (updates.start_time) assignmentUpdates.start_time = updates.start_time;
  if (updates.end_time) assignmentUpdates.end_time = updates.end_time;

  if (Object.keys(assignmentUpdates).length > 0) {
    const { error } = await supabase
      .from('rep_doctor_assignments')
      .update(assignmentUpdates)
      .eq('id', assignmentId);

    if (error) throw error;
  }

  // Update products if specified
  if (updates.product_ids !== undefined) {
    // Remove existing products
    await supabase
      .from('rep_doctor_products')
      .delete()
      .eq('assignment_id', assignmentId);

    // Add new products
    if (updates.product_ids.length > 0) {
      const productAssignments = updates.product_ids.map(productId => ({
        assignment_id: assignmentId,
        product_id: productId,
      }));

      const { error: productsError } = await supabase
        .from('rep_doctor_products')
        .insert(productAssignments);

      if (productsError) throw productsError;
    }
  }

  // Update visit goal if specified
  if (updates.visits_per_week !== undefined) {
    // First try to update existing goal
  const { data: existingGoal } = await supabase
      .from('visit_goals')
      .select('id')
      .eq('assignment_id', assignmentId)
      .maybeSingle();

    if (existingGoal) {
      if (updates.visits_per_week > 0) {
        // Update existing goal
        const { error } = await supabase
          .from('visit_goals')
          .update({ visits_per_week: updates.visits_per_week })
          .eq('id', existingGoal.id);
        
        if (error) throw error;
      } else {
        // Delete goal if set to 0
        const { error } = await supabase
          .from('visit_goals')
          .delete()
          .eq('id', existingGoal.id);
        
        if (error) throw error;
      }
    } else if (updates.visits_per_week > 0) {
      // Create new goal
      const { error } = await supabase
        .from('visit_goals')
        .insert({
          assignment_id: assignmentId,
          visits_per_week: updates.visits_per_week,
        });
      
      if (error) throw error;
    }
  }
};

// Delete an assignment
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('rep_doctor_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
};

// Get available doctors (not assigned to a specific rep)
export const getAvailableDoctors = async (repId?: string): Promise<Doctor[]> => {
  let query = supabase
    .from('doctors')
    .select('*')
    .order('last_name', { ascending: true });

  if (repId) {
    // Get doctors not already assigned to this rep
    const { data: assignedDoctorIds } = await supabase
      .from('rep_doctor_assignments')
      .select('doctor_id')
      .eq('rep_id', repId);

    const excludeIds = assignedDoctorIds?.map(a => a.doctor_id) || [];
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Get assignment statistics
export const getAssignmentStats = async () => {
  // Get total assignments
  const { count: totalAssignments } = await supabase
    .from('rep_doctor_assignments')
    .select('*', { count: 'exact', head: true });

  // Get assignments with goals
  const { count: assignmentsWithGoals } = await supabase
    .from('visit_goals')
    .select('*', { count: 'exact', head: true });

  // Get all assignments data to calculate unique counts
  const { data: allAssignments } = await supabase
    .from('rep_doctor_assignments')
    .select('rep_id, doctor_id');

  // Calculate unique reps and doctors on client side
  const uniqueRepIds = new Set(allAssignments?.map(a => a.rep_id) || []);
  const uniqueDoctorIds = new Set(allAssignments?.map(a => a.doctor_id) || []);

  return {
    totalAssignments: totalAssignments || 0,
    assignmentsWithGoals: assignmentsWithGoals || 0,
    activeReps: uniqueRepIds.size,
    assignedDoctors: uniqueDoctorIds.size,
  };
};