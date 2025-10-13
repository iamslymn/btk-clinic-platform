// Simplified Assignment Service
// Clean, portable data fetching that replaces complex Supabase queries

import { dataAccess } from '../data-access/config';
import { supabase } from '../supabase';
import type {
  SimpleAssignment,
  SimpleRepresentative,
  SimpleDoctor,
  SimpleProduct,
  SimpleBrand,
} from '../data-access/interfaces';

// UI-friendly composed types
export interface AssignmentListItem {
  id: string;
  rep_id: string;
  doctor_id: string;
  visit_days: string[];
  start_time: string | null;
  end_time: string | null;
  assignment_date?: string;
  notes?: string;
  recurring_type?: string;
  created_at: string;
  visit_goals?: any[];
  
  // Composed data
  representative?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string; // computed
  };
  doctor?: {
    id: string;
    first_name: string;
    last_name: string;
    specialty: string;
    category: string;
    address: string;
  };
  products?: {
    id: string;
    name: string;
    brand_name?: string;
  }[];
}

export interface CreateAssignmentData {
  rep_id: string;
  doctor_id: string;
  visit_days: string[];
  start_time: string;
  end_time: string;
  product_ids: string[];
  assignment_date?: string;
  notes?: string;
}

export class SimpleAssignmentService {
  /**
   * Get all assignments with basic related data
   * Replaces: complex .select() queries with joins
   */
  async getAllAssignments(): Promise<AssignmentListItem[]> {
    try {
      // Step 1: Get assignments (simple query)
      const assignments = await dataAccess.assignments.findAll();
      
      // Step 2: Enrich with related data
      return this.enrichAssignments(assignments);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      throw new Error('Failed to load assignments');
    }
  }

  /**
   * Get assignments for a specific representative
   */
  async getAssignmentsForRep(repId: string): Promise<AssignmentListItem[]> {
    try {
      const assignments = await dataAccess.assignments.findByRepresentative(repId);
      return this.enrichAssignments(assignments);
    } catch (error) {
      console.error('Failed to fetch rep assignments:', error);
      throw new Error('Failed to load representative assignments');
    }
  }

  /**
   * Get weekly assignments (for calendar view)
   */
  async getWeeklyAssignments(weekStartDate: Date): Promise<AssignmentListItem[]> {
    try {
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 6);
      
      const startDateStr = weekStartDate.toISOString().split('T')[0];
      const endDateStr = weekEndDate.toISOString().split('T')[0];
      
      const assignments = await dataAccess.assignments.findByDateRange(startDateStr, endDateStr);
      return this.enrichAssignments(assignments);
    } catch (error) {
      console.error('Failed to fetch weekly assignments:', error);
      throw new Error('Failed to load weekly assignments');
    }
  }

  /**
   * Get recurring assignment series (parent assignments only)
   */
  async getRecurringAssignments(): Promise<AssignmentListItem[]> {
    try {
      const assignments = await dataAccess.assignments.findRecurringSeries();
      return this.enrichAssignments(assignments);
    } catch (error) {
      // Graceful degradation - don't spam console with errors
      console.info('ℹ️ Recurring assignments not available in current setup');
      return [];
    }
  }

  /**
   * Create a new assignment or update existing one
   */
  async createAssignment(assignmentData: CreateAssignmentData): Promise<AssignmentListItem> {
    try {
      // Step 1: Check if assignment already exists
      const existingAssignment = await dataAccess.assignments.findByRepAndDoctor(
        assignmentData.rep_id,
        assignmentData.doctor_id
      );

      let assignment: SimpleAssignment;

      if (existingAssignment) {
        // Update existing assignment
        assignment = await dataAccess.assignments.update(existingAssignment.id, {
          visit_days: assignmentData.visit_days,
          start_time: assignmentData.start_time,
          end_time: assignmentData.end_time
        });

        // Delete existing product associations and recreate them
        await this.deleteAssignmentProducts(existingAssignment.id);
      } else {
        // Create new assignment
        assignment = await dataAccess.assignments.create({
          rep_id: assignmentData.rep_id,
          doctor_id: assignmentData.doctor_id,
          visit_days: assignmentData.visit_days,
          start_time: assignmentData.start_time,
          end_time: assignmentData.end_time
          // assignment_date and notes removed - not in current database schema
        });
      }

      // Step 2: Create product associations if provided
      if (assignmentData.product_ids && assignmentData.product_ids.length > 0) {
        await this.createAssignmentProducts(assignment.id, assignmentData.product_ids);
      }

      // Step 3: Return enriched assignment
      const [enrichedAssignment] = await this.enrichAssignments([assignment]);
      return enrichedAssignment;
    } catch (error) {
      console.error('Failed to create/update assignment:', error);
      throw new Error('Failed to create/update assignment');
    }
  }

  /**
   * Create product associations for an assignment
   */
  private async createAssignmentProducts(assignmentId: string, productIds: string[]): Promise<void> {
    try {
      const productRecords = productIds.map(productId => ({
        assignment_id: assignmentId,
        product_id: productId
      }));

      const { error } = await supabase
        .from('rep_doctor_products')
        .insert(productRecords);

      if (error) {
        console.warn('Failed to create assignment products:', error.message);
        // Don't throw error - assignment creation should succeed even if products fail
      }
    } catch (error) {
      console.warn('Failed to create assignment products:', error);
    }
  }

  /**
   * Delete product associations for an assignment
   */
  private async deleteAssignmentProducts(assignmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('rep_doctor_products')
        .delete()
        .eq('assignment_id', assignmentId);

      if (error) {
        console.warn('Failed to delete assignment products:', error.message);
        // Don't throw error - assignment update should succeed even if products deletion fails
      }
    } catch (error) {
      console.warn('Failed to delete assignment products:', error);
    }
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      await dataAccess.assignments.delete(assignmentId);
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      throw new Error('Failed to delete assignment');
    }
  }

  /**
   * Delete a recurring assignment series
   */
  async deleteRecurringAssignments(parentId: string): Promise<void> {
    try {
      await dataAccess.assignments.deleteRecurringSeries(parentId);
    } catch (error) {
      console.error('Failed to delete recurring assignments:', error);
      throw new Error('Failed to delete recurring assignments');
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats() {
    try {
      const assignments = await dataAccess.assignments.findAll();
      const representatives = await dataAccess.representatives.findAll();
      
      // Calculate stats from the simple data
      const uniqueRepIds = new Set(assignments.map(a => a.rep_id));
      const uniqueDoctorIds = new Set(assignments.map(a => a.doctor_id));
      const assignmentsWithGoals = assignments.filter(a => a.recurring_type).length;

      return {
        totalAssignments: assignments.length,
        assignmentsWithGoals,
        activeReps: uniqueRepIds.size,
        assignedDoctors: uniqueDoctorIds.size,
      };
    } catch (error) {
      console.error('Failed to fetch assignment stats:', error);
      return {
        totalAssignments: 0,
        assignmentsWithGoals: 0,
        activeReps: 0,
        assignedDoctors: 0,
      };
    }
  }

  // Private helper methods

  /**
   * Enrich assignments with related data
   * This replaces complex database joins with simple in-memory composition
   */
  private async enrichAssignments(assignments: SimpleAssignment[]): Promise<AssignmentListItem[]> {
    if (assignments.length === 0) return [];

    try {
      // Get unique IDs for batch fetching
      const repIds = [...new Set(assignments.map(a => a.rep_id))];
      const doctorIds = [...new Set(assignments.map(a => a.doctor_id))];
      const assignmentIds = assignments.map(a => a.id);

      // Fetch related data in parallel (simple queries)
      const [representatives, doctors, goals] = await Promise.all([
        this.fetchRepresentatives(repIds),
        dataAccess.doctors.findByIds(doctorIds),
        // Fetch visit_goals with recurrence window if available
        (async () => {
          try {
            const { supabase } = await import('../supabase');
            const { data, error } = await supabase
              .from('visit_goals')
              .select('*')
              .in('assignment_id', assignmentIds);
            if (error) return [] as any[];
            return data || [];
          } catch {
            return [] as any[];
          }
        })()
      ]);

      // Create lookup maps for efficient joining
      const repMap = new Map(representatives.map(r => [r.id, r]));
      const doctorMap = new Map(doctors.map(d => [d.id, d]));

      // Compose the final result
      return assignments.map(assignment => ({
        id: assignment.id,
        rep_id: assignment.rep_id,
        doctor_id: assignment.doctor_id,
        visit_days: assignment.visit_days,
        start_time: assignment.start_time as any,
        end_time: assignment.end_time as any,
        assignment_date: assignment.assignment_date,
        notes: assignment.notes,
        recurring_type: assignment.recurring_type,
        created_at: assignment.created_at,
        
        // Composed data
        representative: this.mapRepresentative(repMap.get(assignment.rep_id)),
        doctor: this.mapDoctor(doctorMap.get(assignment.doctor_id)),
        products: [], // TODO: Implement product loading when junction table is ready
        // Attach visit_goals in minimal form so calendar can respect recurring window
        visit_goals: (goals as any[]).filter(g => g.assignment_id === assignment.id)
      }));
    } catch (error) {
      console.error('Failed to enrich assignments:', error);
      // Return basic assignments without relations rather than failing completely
      return assignments.map(assignment => ({
        id: assignment.id,
        rep_id: assignment.rep_id,
        doctor_id: assignment.doctor_id,
        visit_days: assignment.visit_days,
        start_time: assignment.start_time,
        end_time: assignment.end_time,
        assignment_date: assignment.assignment_date,
        notes: assignment.notes,
        recurring_type: assignment.recurring_type,
        created_at: assignment.created_at,
      }));
    }
  }

  private async fetchRepresentatives(ids: string[]): Promise<SimpleRepresentative[]> {
    if (ids.length === 0) return [];
    
    // For now, get all and filter. Future backends can implement findByIds
    const allReps = await dataAccess.representatives.findAll();
    return allReps.filter(rep => ids.includes(rep.id));
  }

  private mapRepresentative(rep?: SimpleRepresentative) {
    if (!rep) return undefined;
    
    return {
      id: rep.id,
      first_name: rep.first_name,
      last_name: rep.last_name,
      full_name: `${rep.first_name} ${rep.last_name}`, // computed field
    };
  }

  private mapDoctor(doctor?: SimpleDoctor) {
    if (!doctor) return undefined;
    
    return {
      id: doctor.id,
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      specialty: doctor.specialty,
      category: doctor.category,
      address: doctor.address,
    };
  }
}

// Export singleton instance
export const assignmentService = new SimpleAssignmentService();
