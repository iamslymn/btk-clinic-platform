// Data Access Layer Interfaces
// These interfaces define the contract for data fetching, making backend migration easier

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// Core entity types (simplified)
export interface SimpleAssignment extends BaseEntity {
  rep_id: string;
  doctor_id: string;
  visit_days: string[];
  start_time: string;
  end_time: string;
  // Note: assignment_date, notes, recurring_type, recurring_parent_id
  // are not available in current database schema
}

export interface SimpleRepresentative extends BaseEntity {
  first_name: string;
  last_name: string;
  user_id: string;
  manager_id: string;
}

export interface SimpleDoctor extends BaseEntity {
  first_name: string;
  last_name: string;
  specialty: string;
  category: string;
  address: string;
  phone?: string;
  email?: string;
  specialization_id?: string;
  location_lat?: number;
  location_lng?: number;
}

export interface SimpleProduct extends BaseEntity {
  name: string;
  description?: string;
  brand_id: string;
  pdf_url?: string;
  priority_specializations?: string[];
}

export interface SimpleBrand extends BaseEntity {
  name: string;
}

export interface SimpleAssignmentProduct extends BaseEntity {
  assignment_id: string;
  product_id: string;
}

// Composed types for UI
export interface AssignmentWithRelations {
  assignment: SimpleAssignment;
  representative?: SimpleRepresentative;
  doctor?: SimpleDoctor;
  products?: (SimpleProduct & { brand?: SimpleBrand })[];
}

// Data Access Interface - this is what we'll implement for different backends
export interface DataAccessProvider {
  // Core entity fetchers
  assignments: AssignmentRepository;
  representatives: RepresentativeRepository;
  doctors: DoctorRepository;
  products: ProductRepository;
  brands: BrandRepository;
}

export interface AssignmentRepository {
  findAll(): Promise<SimpleAssignment[]>;
  findById(id: string): Promise<SimpleAssignment | null>;
  findByRepresentative(repId: string): Promise<SimpleAssignment[]>;
  findByDateRange(startDate: string, endDate: string): Promise<SimpleAssignment[]>;
  findByRepAndDoctor(repId: string, doctorId: string): Promise<SimpleAssignment | null>;
  findRecurringSeries(): Promise<SimpleAssignment[]>;
  create(data: Omit<SimpleAssignment, 'id' | 'created_at'>): Promise<SimpleAssignment>;
  update(id: string, data: Partial<SimpleAssignment>): Promise<SimpleAssignment>;
  delete(id: string): Promise<void>;
  deleteRecurringSeries(parentId: string): Promise<void>;
}

export interface RepresentativeRepository {
  findAll(): Promise<SimpleRepresentative[]>;
  findById(id: string): Promise<SimpleRepresentative | null>;
  findByManager(managerId: string): Promise<SimpleRepresentative[]>;
}

export interface DoctorRepository {
  findAll(): Promise<SimpleDoctor[]>;
  findById(id: string): Promise<SimpleDoctor | null>;
  findByIds(ids: string[]): Promise<SimpleDoctor[]>;
}

export interface ProductRepository {
  findAll(): Promise<SimpleProduct[]>;
  findById(id: string): Promise<SimpleProduct | null>;
  findByIds(ids: string[]): Promise<SimpleProduct[]>;
  findByAssignment(assignmentId: string): Promise<SimpleProduct[]>;
}

export interface BrandRepository {
  findAll(): Promise<SimpleBrand[]>;
  findById(id: string): Promise<SimpleBrand | null>;
  findByIds(ids: string[]): Promise<SimpleBrand[]>;
}

export interface AssignmentProductRepository {
  findByAssignment(assignmentId: string): Promise<SimpleAssignmentProduct[]>;
  findByAssignments(assignmentIds: string[]): Promise<SimpleAssignmentProduct[]>;
  create(data: Omit<SimpleAssignmentProduct, 'id' | 'created_at'>): Promise<SimpleAssignmentProduct>;
  deleteByAssignment(assignmentId: string): Promise<void>;
}
