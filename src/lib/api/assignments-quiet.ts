// Quiet stubs for old assignment APIs to eliminate console errors
// These provide graceful fallbacks while we migrate to the new architecture

import type { AssignmentWithDetails } from './assignments';

// Stub function that returns empty results instead of making failing queries
export const getWeeklyAssignments = async (weekStart: Date): Promise<AssignmentWithDetails[]> => {
  // Silent stub - no console spam
  return [];
};

export const createWeeklyAssignments = async (data: any): Promise<any> => {
  // Simple implementation: create multiple individual assignments for weekly recurrence
  const { supabase } = await import('../supabase');
  const assignmentIds: string[] = [];

  try {
    // Generate dates for the specified number of weeks
    const dates = [];
    const startDate = new Date(data.startDate);
    
    for (let i = 0; i < (data.recurringWeeks || 4); i++) {
      const assignmentDate = new Date(startDate);
      assignmentDate.setDate(startDate.getDate() + (i * 7));
      dates.push(assignmentDate);
    }

    // Create assignments for each doctor (only once due to unique constraint)
    for (const doctorId of data.doctorIds) {
      // Check if assignment already exists
      const { data: existingAssignment } = await supabase
        .from('rep_doctor_assignments')
        .select('id, visit_days')
        .eq('rep_id', data.representativeId)
        .eq('doctor_id', doctorId)
        .single();

      let assignment;
      const weekday = getWeekdayName(data.weekday);

      if (existingAssignment) {
        // Update existing assignment to include the new weekday
        const currentDays = existingAssignment.visit_days || [];
        const updatedDays = [...new Set([...currentDays, weekday])]; // Remove duplicates

        const { data: updatedAssignment, error: updateError } = await supabase
          .from('rep_doctor_assignments')
          .update({
            visit_days: updatedDays,
            start_time: data.startTime,
            end_time: data.endTime
          })
          .eq('id', existingAssignment.id)
          .select()
          .single();

        if (updateError) {
          console.warn(`Failed to update assignment for doctor ${doctorId}:`, updateError.message);
          continue;
        }
        assignment = updatedAssignment;
      } else {
        // Create new assignment
        const assignmentData = {
          rep_id: data.representativeId,
          doctor_id: doctorId,
          visit_days: [weekday],
          start_time: data.startTime,
          end_time: data.endTime
        };

        const { data: newAssignment, error } = await supabase
          .from('rep_doctor_assignments')
          .insert(assignmentData)
          .select()
          .single();

        if (error) {
          console.warn(`Failed to create assignment for doctor ${doctorId}:`, error.message);
          continue;
        }
        assignment = newAssignment;
      }

      if (!assignment) continue;
      assignmentIds.push(assignment.id);

      // Upsert a finite recurrence window in visit_goals so calendar respects end-date
      try {
        const startDateStr = new Date(data.startDate).toISOString().split('T')[0];
        const recurringWeeks = Number(data.recurringWeeks || 0) || 0;
        // Ensure a goal exists and carry recurrence metadata (visits_per_week defaults to 1)
        const { data: existingGoal } = await supabase
          .from('visit_goals')
          .select('id')
          .eq('assignment_id', assignment.id)
          .maybeSingle();

        if (existingGoal) {
          await supabase
            .from('visit_goals')
            .update({
              visits_per_week: 1,
              // @ts-ignore: columns added by migration
              start_date: startDateStr,
              // @ts-ignore
              recurring_weeks: recurringWeeks
            })
            .eq('id', existingGoal.id);
        } else {
          await supabase
            .from('visit_goals')
            .insert({
              assignment_id: assignment.id,
              visits_per_week: 1,
              // @ts-ignore: columns added by migration
              start_date: startDateStr,
              // @ts-ignore
              recurring_weeks: recurringWeeks
            });
        }
      } catch (goalErr: any) {
        console.warn('visit_goals upsert failed (recurrence window may not be enforced):', goalErr?.message || goalErr);
      }

      // Add products if provided (remove existing ones first)
      if (data.productIds && data.productIds.length > 0) {
        // Remove existing products for this assignment
        await supabase
          .from('rep_doctor_products')
          .delete()
          .eq('assignment_id', assignment.id);

        // Add new products
        const productRecords = data.productIds.map((productId: string) => ({
          assignment_id: assignment.id,
          product_id: productId
        }));

        const { error: productError } = await supabase
          .from('rep_doctor_products')
          .insert(productRecords);

        if (productError) console.warn('Failed to add some products:', productError.message);
      }
    }

    return assignmentIds;
  } catch (error: any) {
    console.error('Error creating weekly assignments:', error);
    throw new Error(`Failed to create weekly assignments: ${error.message}`);
  }
};

function getWeekdayName(weekdayIndex: number): string {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays[weekdayIndex] || 'Monday';
}

export const getAssignmentsForRep = async (repId: string): Promise<AssignmentWithDetails[]> => {
  // Silent stub - no console spam
  return [];
};

export const getAssignmentsWithDetails = async (): Promise<AssignmentWithDetails[]> => {
  // Silent stub - no console spam
  return [];
};
