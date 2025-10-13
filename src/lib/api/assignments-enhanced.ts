import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { 
  Assignment, 
  AssignmentInsert, 
  AssignmentUpdate, 
  AssignmentWithDetails,
  AssignmentForm,
  AssignmentDoctor,
  AssignmentDoctorInsert
} from '../../types';

// Get all assignments with details
export const getAssignments = async (): Promise<AssignmentWithDetails[]> => {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      representative:representatives (
        id,
        first_name,
        last_name,
        user_id,
        manager_id
      ),
      clinic:clinics (
        id,
        name,
        address,
        phone,
        email
      ),
      doctors:assignment_doctors (
        id,
        created_at,
        doctor:doctors (
          id,
          first_name,
          last_name,
          specialization,
          total_category,
          planeta_category,
          gender,
          phone,
          email
        )
      ),
      meetings (
        id,
        start_time,
        end_time,
        status,
        notes,
        created_at
      )
    `)
    .order('assigned_date', { ascending: false });

  if (error) throw error;
  return data?.map(assignment => ({
    ...assignment,
    doctors: assignment.doctors || [],
    meetings: assignment.meetings || []
  })) || [];
};

// Get assignments for a specific representative
export const getAssignmentsForRepresentative = async (representativeId: string): Promise<AssignmentWithDetails[]> => {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      representative:representatives (
        id,
        first_name,
        last_name,
        user_id,
        manager_id
      ),
      clinic:clinics (
        id,
        name,
        address,
        phone,
        email
      ),
      doctors:assignment_doctors (
        id,
        created_at,
        doctor:doctors (
          id,
          first_name,
          last_name,
          specialization,
          total_category,
          planeta_category,
          gender,
          phone,
          email
        )
      ),
      meetings (
        id,
        start_time,
        end_time,
        status,
        notes,
        created_at
      )
    `)
    .eq('representative_id', representativeId)
    .order('assigned_date', { ascending: false });

  if (error) throw error;
  return data?.map(assignment => ({
    ...assignment,
    doctors: assignment.doctors || [],
    meetings: assignment.meetings || []
  })) || [];
};

// Get clinics linked to a representative
export const getClinicsForRepresentative = async (representativeId: string) => {
  const { data, error } = await supabase
    .from('representative_clinics')
    .select(`
      clinic:clinics (
        id,
        name,
        address
      )
    `)
    .eq('representative_id', representativeId);

  if (error) throw error;
  return (data || []).map((row: any) => row.clinic);
};

// Get assignments for a specific date
export const getAssignmentsForDate = async (date: string): Promise<AssignmentWithDetails[]> => {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      representative:representatives (
        id,
        first_name,
        last_name,
        user_id,
        manager_id
      ),
      clinic:clinics (
        id,
        name,
        address,
        phone,
        email
      ),
      doctors:assignment_doctors (
        id,
        created_at,
        doctor:doctors (
          id,
          first_name,
          last_name,
          specialization,
          total_category,
          planeta_category,
          gender,
          phone,
          email
        )
      ),
      meetings (
        id,
        start_time,
        end_time,
        status,
        notes,
        created_at
      )
    `)
    .eq('assigned_date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data?.map(assignment => ({
    ...assignment,
    doctors: assignment.doctors || [],
    meetings: assignment.meetings || []
  })) || [];
};

// Get today's assignments for a representative
export const getTodayAssignmentsForRepresentative = async (representativeId: string): Promise<AssignmentWithDetails[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      representative:representatives (
        id,
        first_name,
        last_name,
        user_id,
        manager_id
      ),
      clinic:clinics (
        id,
        name,
        address,
        phone,
        email
      ),
      doctors:assignment_doctors (
        id,
        created_at,
        doctor:doctors (
          id,
          first_name,
          last_name,
          specialization,
          total_category,
          planeta_category,
          gender,
          phone,
          email
        )
      ),
      meetings (
        id,
        start_time,
        end_time,
        status,
        notes,
        created_at
      )
    `)
    .eq('representative_id', representativeId)
    .eq('assigned_date', today)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data?.map(assignment => ({
    ...assignment,
    doctors: assignment.doctors || [],
    meetings: assignment.meetings || []
  })) || [];
};

// Create a new assignment (managers and super_admin)
export const createAssignment = async (assignmentData: AssignmentForm): Promise<AssignmentWithDetails> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can create assignments');
  }

  // Validate required fields
  if (!assignmentData.representative_id || !assignmentData.clinic_id || 
      !assignmentData.assigned_date || !assignmentData.doctor_ids || 
      assignmentData.doctor_ids.length === 0) {
    throw new Error('Representative, clinic, date, and at least one doctor are required');
  }

  try {
    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        representative_id: assignmentData.representative_id,
        clinic_id: assignmentData.clinic_id,
        assigned_date: assignmentData.assigned_date,
        created_by: user.id,
        notes: assignmentData.notes || null
      })
      .select()
      .single();

    if (assignmentError) throw assignmentError;
    if (!assignment) throw new Error('Failed to create assignment');

    // Create assignment-doctor relationships
    const doctorInserts: AssignmentDoctorInsert[] = assignmentData.doctor_ids.map(doctorId => ({
      assignment_id: assignment.id,
      doctor_id: doctorId
    }));

    const { error: doctorsError } = await supabase
      .from('assignment_doctors')
      .insert(doctorInserts);

    if (doctorsError) {
      // Cleanup: delete the assignment if doctor assignment failed
      await supabase.from('assignments').delete().eq('id', assignment.id);
      throw doctorsError;
    }

    // Return the created assignment with details
    const { data: createdAssignment, error: fetchError } = await supabase
      .from('assignments')
      .select(`
        *,
        representative:representatives (
          id,
          first_name,
          last_name,
          user_id,
          manager_id
        ),
        clinic:clinics (
          id,
          name,
          address,
          phone,
          email
        ),
        doctors:assignment_doctors (
          id,
          created_at,
          doctor:doctors (
            id,
            first_name,
            last_name,
            specialization,
            total_category,
            planeta_category,
            gender,
            phone,
            email
          )
        ),
        meetings (
          id,
          start_time,
          end_time,
          status,
          notes,
          created_at
        )
      `)
      .eq('id', assignment.id)
      .single();

    if (fetchError) throw fetchError;
    if (!createdAssignment) throw new Error('Failed to fetch created assignment');

    return {
      ...createdAssignment,
      doctors: createdAssignment.doctors || [],
      meetings: createdAssignment.meetings || []
    };
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

// Update assignment (managers and super_admin)
export const updateAssignment = async (
  assignmentId: string, 
  updates: Partial<AssignmentForm>
): Promise<AssignmentWithDetails> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can update assignments');
  }

  try {
    // Update assignment basic info
    const assignmentUpdates: AssignmentUpdate = {};
    if (updates.representative_id) assignmentUpdates.representative_id = updates.representative_id;
    if (updates.clinic_id) assignmentUpdates.clinic_id = updates.clinic_id;
    if (updates.assigned_date) assignmentUpdates.assigned_date = updates.assigned_date;
    if (updates.notes !== undefined) assignmentUpdates.notes = updates.notes;

    if (Object.keys(assignmentUpdates).length > 0) {
      const { error: assignmentError } = await supabase
        .from('assignments')
        .update(assignmentUpdates)
        .eq('id', assignmentId);

      if (assignmentError) throw assignmentError;
    }

    // Update doctors if provided
    if (updates.doctor_ids) {
      // Delete existing doctor assignments
      await supabase
        .from('assignment_doctors')
        .delete()
        .eq('assignment_id', assignmentId);

      // Insert new doctor assignments
      if (updates.doctor_ids.length > 0) {
        const doctorInserts: AssignmentDoctorInsert[] = updates.doctor_ids.map(doctorId => ({
          assignment_id: assignmentId,
          doctor_id: doctorId
        }));

        const { error: doctorsError } = await supabase
          .from('assignment_doctors')
          .insert(doctorInserts);

        if (doctorsError) throw doctorsError;
      }
    }

    // Return updated assignment
    const { data: updatedAssignment, error: fetchError } = await supabase
      .from('assignments')
      .select(`
        *,
        representative:representatives (
          id,
          first_name,
          last_name,
          user_id,
          manager_id
        ),
        clinic:clinics (
          id,
          name,
          address,
          phone,
          email
        ),
        doctors:assignment_doctors (
          id,
          created_at,
          doctor:doctors (
            id,
            first_name,
            last_name,
            specialization,
            total_category,
            planeta_category,
            gender,
            phone,
            email
          )
        ),
        meetings (
          id,
          start_time,
          end_time,
          status,
          notes,
          created_at
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (fetchError) throw fetchError;
    if (!updatedAssignment) throw new Error('Assignment not found');

    return {
      ...updatedAssignment,
      doctors: updatedAssignment.doctors || [],
      meetings: updatedAssignment.meetings || []
    };
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

// Delete assignment (managers and super_admin)
export const deleteAssignment = async (assignmentId: string): Promise<void> => {
  // Check if user has permission
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || !['super_admin', 'manager'].includes(profile.role)) {
    throw new Error('Only administrators and managers can delete assignments');
  }

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) throw error;
};

// Get assignment by ID
export const getAssignmentById = async (assignmentId: string): Promise<AssignmentWithDetails> => {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      representative:representatives (
        id,
        first_name,
        last_name,
        user_id,
        manager_id
      ),
      clinic:clinics (
        id,
        name,
        address,
        phone,
        email
      ),
      doctors:assignment_doctors (
        id,
        created_at,
        doctor:doctors (
          id,
          first_name,
          last_name,
          specialization,
          total_category,
          planeta_category,
          gender,
          phone,
          email
        )
      ),
      meetings (
        id,
        start_time,
        end_time,
        status,
        notes,
        created_at
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Assignment not found');

  return {
    ...data,
    doctors: data.doctors || [],
    meetings: data.meetings || []
  };
};
