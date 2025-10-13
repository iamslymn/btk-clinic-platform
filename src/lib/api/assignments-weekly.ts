import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { AssignmentWithDetails } from './assignments';

interface WeeklyAssignmentData {
  representativeId: string;
  doctorIds: string[];
  productIds: string[];
  startTime: string;
  endTime: string;
  weekday: number; // 0-6 (Sunday-Saturday)
  recurringWeeks: number;
  startDate: Date;
  notes?: string;
}

/**
 * Create recurring weekly assignments
 */
export const createWeeklyAssignments = async (data: WeeklyAssignmentData): Promise<string[]> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only managers and super administrators can create assignments');
  }

  const assignmentIds: string[] = [];

  try {
    // Generate all the weekly dates
    const weeklyDates = generateWeeklyDates(data.startDate, data.weekday, data.recurringWeeks);

    // Create assignments for each date
    for (const date of weeklyDates) {
      // For each doctor, create a separate assignment
      for (const doctorId of data.doctorIds) {
        const assignmentData = {
          rep_id: data.representativeId,
          doctor_id: doctorId,
          visit_days: [getWeekdayName(data.weekday)],
          start_time: data.startTime,
          end_time: data.endTime,
          assignment_date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          notes: data.notes || null,
          recurring_type: 'weekly' as const,
          recurring_parent_id: null, // Will be updated for child assignments
        };

        const { data: assignment, error: assignmentError } = await supabase
          .from('rep_doctor_assignments')
          .insert(assignmentData)
          .select()
          .single();

        if (assignmentError) throw assignmentError;
        if (!assignment) throw new Error('Failed to create assignment');

        assignmentIds.push(assignment.id);

        // Add products to the assignment
        if (data.productIds.length > 0) {
          const productAssignments = data.productIds.map(productId => ({
            assignment_id: assignment.id,
            product_id: productId,
          }));

          const { error: productsError } = await supabase
            .from('rep_doctor_products')
            .insert(productAssignments);

          if (productsError) throw productsError;
        }
      }
    }

    // Update all assignments to link them as a recurring series
    if (assignmentIds.length > 0) {
      const parentId = assignmentIds[0]; // First assignment is the parent
      
      // Update all assignments to reference the parent
      const { error: updateError } = await supabase
        .from('rep_doctor_assignments')
        .update({ recurring_parent_id: parentId })
        .in('id', assignmentIds);

      if (updateError) throw updateError;
    }

    return assignmentIds;
  } catch (error) {
    console.error('Error creating weekly assignments:', error);
    throw error;
  }
};

/**
 * Update a recurring assignment series
 */
export const updateWeeklyAssignments = async (
  parentId: string,
  updates: Partial<WeeklyAssignmentData>
): Promise<void> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only managers and super administrators can update assignments');
  }

  try {
    // Get all assignments in the series
    const { data: assignments, error: fetchError } = await supabase
      .from('rep_doctor_assignments')
      .select('id')
      .or(`id.eq.${parentId},recurring_parent_id.eq.${parentId}`);

    if (fetchError) throw fetchError;

    const assignmentIds = assignments?.map(a => a.id) || [];

    if (assignmentIds.length === 0) {
      throw new Error('No assignments found in the series');
    }

    // Update the assignments
    const assignmentUpdates: any = {};
    if (updates.startTime) assignmentUpdates.start_time = updates.startTime;
    if (updates.endTime) assignmentUpdates.end_time = updates.endTime;
    if (updates.notes !== undefined) assignmentUpdates.notes = updates.notes || null;

    if (Object.keys(assignmentUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('rep_doctor_assignments')
        .update(assignmentUpdates)
        .in('id', assignmentIds);

      if (updateError) throw updateError;
    }

    // Update products if specified
    if (updates.productIds !== undefined) {
      // Remove existing products for all assignments
      const { error: deleteError } = await supabase
        .from('rep_doctor_products')
        .delete()
        .in('assignment_id', assignmentIds);

      if (deleteError) throw deleteError;

      // Add new products if any
      if (updates.productIds.length > 0) {
        const productAssignments = assignmentIds.flatMap(assignmentId =>
          updates.productIds!.map(productId => ({
            assignment_id: assignmentId,
            product_id: productId,
          }))
        );

        const { error: insertError } = await supabase
          .from('rep_doctor_products')
          .insert(productAssignments);

        if (insertError) throw insertError;
      }
    }
  } catch (error) {
    console.error('Error updating weekly assignments:', error);
    throw error;
  }
};

/**
 * Delete a recurring assignment series
 */
export const deleteWeeklyAssignments = async (parentId: string): Promise<void> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only managers and super administrators can delete assignments');
  }

  try {
    // Get all assignments in the series
    const { data: assignments, error: fetchError } = await supabase
      .from('rep_doctor_assignments')
      .select('id')
      .or(`id.eq.${parentId},recurring_parent_id.eq.${parentId}`);

    if (fetchError) throw fetchError;

    const assignmentIds = assignments?.map(a => a.id) || [];

    if (assignmentIds.length === 0) {
      throw new Error('No assignments found in the series');
    }

    // Delete all assignments in the series
    const { error: deleteError } = await supabase
      .from('rep_doctor_assignments')
      .delete()
      .in('id', assignmentIds);

    if (deleteError) throw deleteError;
  } catch (error) {
    console.error('Error deleting weekly assignments:', error);
    throw error;
  }
};

/**
 * Get assignments for a specific week
 */
export const getWeeklyAssignments = async (weekStartDate: Date): Promise<AssignmentWithDetails[]> => {
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  const { data, error } = await supabase
    .from('rep_doctor_assignments')
    .select(`
      *,
      representatives!rep_doctor_assignments_rep_id_fkey (
        id,
        first_name,
        last_name
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
      )
    `)
    .gte('assignment_date', weekStartDate.toISOString().split('T')[0])
    .lte('assignment_date', weekEndDate.toISOString().split('T')[0])
    .order('assignment_date', { ascending: true });

  if (error) throw error;
  
  return data?.map(assignment => ({
    ...assignment,
    representative: assignment.representatives,
    doctor: assignment.doctors,
    products: assignment.rep_doctor_products?.map((rdp: any) => ({
      ...rdp,
      product: rdp.products ? {
        ...rdp.products,
        brand: rdp.products.brands
      } : undefined
    })) || []
  })) || [];
};

/**
 * Get all recurring assignment series for management
 */
export const getRecurringAssignmentSeries = async (): Promise<AssignmentWithDetails[]> => {
  // Get only parent assignments (series heads)
  const { data, error } = await supabase
    .from('rep_doctor_assignments')
    .select(`
      *,
      representatives!rep_doctor_assignments_rep_id_fkey (
        id,
        first_name,
        last_name
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
      )
    `)
    .eq('recurring_type', 'weekly')
    .is('recurring_parent_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data?.map(assignment => ({
    ...assignment,
    representative: assignment.representatives,
    doctor: assignment.doctors,
    products: assignment.rep_doctor_products?.map((rdp: any) => ({
      ...rdp,
      product: rdp.products ? {
        ...rdp.products,
        brand: rdp.products.brands
      } : undefined
    })) || []
  })) || [];
};

// Helper functions

function generateWeeklyDates(startDate: Date, targetWeekday: number, weeks: number): Date[] {
  const dates = [];
  
  // Find the first occurrence of the target weekday
  const firstDate = new Date(startDate);
  const daysUntilTarget = (targetWeekday - firstDate.getDay() + 7) % 7;
  firstDate.setDate(firstDate.getDate() + daysUntilTarget);
  
  // Generate all weekly occurrences
  for (let i = 0; i < weeks; i++) {
    const date = new Date(firstDate);
    date.setDate(firstDate.getDate() + (i * 7));
    dates.push(date);
  }
  
  return dates;
}

function getWeekdayName(weekday: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[weekday];
}

export type { WeeklyAssignmentData };
