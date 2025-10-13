// Assignment Service Layer
// Composes simple data access calls into complex business objects
// This layer handles "joins" in memory instead of complex database queries

import type {
  DataAccessProvider,
  AssignmentWithRelations,
  SimpleAssignment,
  SimpleRepresentative,
  SimpleDoctor,
  SimpleProduct,
  SimpleBrand,
} from '../data-access/interfaces';

export class AssignmentService {
  constructor(private dataAccess: DataAccessProvider) {}

  /**
   * Get all assignments with their related data
   * Replaces complex nested Supabase queries with simple, composable calls
   */
  async getAssignmentsWithRelations(): Promise<AssignmentWithRelations[]> {
    // Step 1: Get all assignments (simple query)
    const assignments = await this.dataAccess.assignments.findAll();
    
    if (assignments.length === 0) return [];

    // Step 2: Get all unique related IDs
    const repIds = [...new Set(assignments.map(a => a.rep_id))];
    const doctorIds = [...new Set(assignments.map(a => a.doctor_id))];
    const assignmentIds = assignments.map(a => a.id);

    // Step 3: Fetch related data in parallel (simple queries)
    const [representatives, doctors, assignmentProducts] = await Promise.all([
      this.getRepresentativesByIds(repIds),
      this.getDoctorsByIds(doctorIds),
      this.getProductsByAssignments(assignmentIds),
    ]);

    // Step 4: Create lookup maps for efficient joining
    const repMap = new Map(representatives.map(r => [r.id, r]));
    const doctorMap = new Map(doctors.map(d => [d.id, d]));
    const productsByAssignment = this.groupProductsByAssignment(assignmentProducts);

    // Step 5: Compose the final result
    return assignments.map(assignment => ({
      assignment,
      representative: repMap.get(assignment.rep_id),
      doctor: doctorMap.get(assignment.doctor_id),
      products: productsByAssignment.get(assignment.id) || [],
    }));
  }

  /**
   * Get assignments for a specific representative with relations
   */
  async getAssignmentsForRepresentative(repId: string): Promise<AssignmentWithRelations[]> {
    // Step 1: Get assignments for the rep
    const assignments = await this.dataAccess.assignments.findByRepresentative(repId);
    
    if (assignments.length === 0) return [];

    // Step 2: Get the representative
    const representative = await this.dataAccess.representatives.findById(repId);

    // Step 3: Get related doctors and products
    const doctorIds = [...new Set(assignments.map(a => a.doctor_id))];
    const assignmentIds = assignments.map(a => a.id);

    const [doctors, assignmentProducts] = await Promise.all([
      this.getDoctorsByIds(doctorIds),
      this.getProductsByAssignments(assignmentIds),
    ]);

    // Step 4: Create lookup maps and compose
    const doctorMap = new Map(doctors.map(d => [d.id, d]));
    const productsByAssignment = this.groupProductsByAssignment(assignmentProducts);

    return assignments.map(assignment => ({
      assignment,
      representative,
      doctor: doctorMap.get(assignment.doctor_id),
      products: productsByAssignment.get(assignment.id) || [],
    }));
  }

  /**
   * Get weekly assignments for a date range
   */
  async getWeeklyAssignments(startDate: string, endDate: string): Promise<AssignmentWithRelations[]> {
    // Simple date range query
    const assignments = await this.dataAccess.assignments.findByDateRange(startDate, endDate);
    
    if (assignments.length === 0) return [];

    // Compose with relations
    return this.enrichAssignmentsWithRelations(assignments);
  }

  /**
   * Get recurring assignment series (parent assignments only)
   */
  async getRecurringAssignmentSeries(): Promise<AssignmentWithRelations[]> {
    // Simple recurring series query
    const assignments = await this.dataAccess.assignments.findRecurringSeries();
    
    if (assignments.length === 0) return [];

    // Compose with relations
    return this.enrichAssignmentsWithRelations(assignments);
  }

  /**
   * Create a new assignment with products
   */
  async createAssignment(assignmentData: {
    rep_id: string;
    doctor_id: string;
    visit_days: string[];
    start_time: string;
    end_time: string;
    product_ids: string[];
    assignment_date?: string;
    notes?: string;
  }): Promise<AssignmentWithRelations> {
    // Step 1: Create the assignment
    const assignment = await this.dataAccess.assignments.create({
      rep_id: assignmentData.rep_id,
      doctor_id: assignmentData.doctor_id,
      visit_days: assignmentData.visit_days,
      start_time: assignmentData.start_time,
      end_time: assignmentData.end_time,
      assignment_date: assignmentData.assignment_date || new Date().toISOString().split('T')[0],
      notes: assignmentData.notes,
    });

    // Step 2: Create product associations
    if (assignmentData.product_ids.length > 0) {
      const productPromises = assignmentData.product_ids.map(productId => 
        this.dataAccess.products.create?.({
          assignment_id: assignment.id,
          product_id: productId,
        })
      );
      await Promise.all(productPromises.filter(Boolean));
    }

    // Step 3: Return with relations
    const [enrichedAssignments] = await this.enrichAssignmentsWithRelations([assignment]);
    return enrichedAssignments;
  }

  /**
   * Delete assignment and its relations
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    // Delete in order: products first, then assignment
    await this.dataAccess.products.deleteByAssignment?.(assignmentId);
    await this.dataAccess.assignments.delete(assignmentId);
  }

  /**
   * Delete recurring assignment series
   */
  async deleteRecurringAssignmentSeries(parentId: string): Promise<void> {
    // This handles both parent and children in the data access layer
    await this.dataAccess.assignments.deleteRecurringSeries(parentId);
  }

  // Private helper methods

  private async enrichAssignmentsWithRelations(assignments: SimpleAssignment[]): Promise<AssignmentWithRelations[]> {
    if (assignments.length === 0) return [];

    const repIds = [...new Set(assignments.map(a => a.rep_id))];
    const doctorIds = [...new Set(assignments.map(a => a.doctor_id))];
    const assignmentIds = assignments.map(a => a.id);

    const [representatives, doctors, assignmentProducts] = await Promise.all([
      this.getRepresentativesByIds(repIds),
      this.getDoctorsByIds(doctorIds),
      this.getProductsByAssignments(assignmentIds),
    ]);

    const repMap = new Map(representatives.map(r => [r.id, r]));
    const doctorMap = new Map(doctors.map(d => [d.id, d]));
    const productsByAssignment = this.groupProductsByAssignment(assignmentProducts);

    return assignments.map(assignment => ({
      assignment,
      representative: repMap.get(assignment.rep_id),
      doctor: doctorMap.get(assignment.doctor_id),
      products: productsByAssignment.get(assignment.id) || [],
    }));
  }

  private async getRepresentativesByIds(ids: string[]): Promise<SimpleRepresentative[]> {
    if (ids.length === 0) return [];
    
    // For now, get all and filter. In future backends, use findByIds
    const allReps = await this.dataAccess.representatives.findAll();
    return allReps.filter(rep => ids.includes(rep.id));
  }

  private async getDoctorsByIds(ids: string[]): Promise<SimpleDoctor[]> {
    return this.dataAccess.doctors.findByIds(ids);
  }

  private async getProductsByAssignments(assignmentIds: string[]): Promise<Map<string, (SimpleProduct & { brand?: SimpleBrand })[]>> {
    if (assignmentIds.length === 0) return new Map();

    // This is a more complex operation that we'll simplify
    // For now, return empty map - this would be implemented based on your junction table structure
    return new Map();
  }

  private groupProductsByAssignment(
    assignmentProducts: any[]
  ): Map<string, (SimpleProduct & { brand?: SimpleBrand })[]> {
    // Group products by assignment ID
    const grouped = new Map();
    
    for (const item of assignmentProducts) {
      if (!grouped.has(item.assignment_id)) {
        grouped.set(item.assignment_id, []);
      }
      grouped.get(item.assignment_id).push(item);
    }
    
    return grouped;
  }
}

// Create and export a service instance
import { supabaseDataAccess } from '../data-access/supabase-provider';
export const assignmentService = new AssignmentService(supabaseDataAccess);
