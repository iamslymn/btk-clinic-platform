import type { Database } from './database';

// Database table types
export type User = Database['public']['Tables']['users']['Row'];
export type Manager = Database['public']['Tables']['managers']['Row'];
export type Representative = Database['public']['Tables']['representatives']['Row'];
export type Doctor = Database['public']['Tables']['doctors']['Row'];
export type Specialization = Database['public']['Tables']['specializations']['Row'];
export type Brand = Database['public']['Tables']['brands']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Clinic = Database['public']['Tables']['clinics']['Row'];
export type Assignment = Database['public']['Tables']['assignments']['Row'];
export type Meeting = Database['public']['Tables']['meetings']['Row'];
export type DoctorWorkplace = Database['public']['Tables']['doctor_workplaces']['Row'];
export type RepresentativeTerritory = Database['public']['Tables']['representative_territories']['Row'];
export type RepresentativeBrand = Database['public']['Tables']['representative_brands']['Row'];
export type ClinicDoctor = Database['public']['Tables']['clinic_doctors']['Row'];
export type RepresentativeClinic = Database['public']['Tables']['representative_clinics']['Row'];
export type AssignmentDoctor = Database['public']['Tables']['assignment_doctors']['Row'];
export type MeetingProduct = Database['public']['Tables']['meeting_products']['Row'];

// Legacy types for backward compatibility
export type RepDoctorAssignment = Assignment;
export type RepDoctorProduct = MeetingProduct;
export type VisitGoal = Assignment;
export type VisitLog = Meeting;

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type ManagerInsert = Database['public']['Tables']['managers']['Insert'];
export type RepresentativeInsert = Database['public']['Tables']['representatives']['Insert'];
export type DoctorInsert = Database['public']['Tables']['doctors']['Insert'];
export type BrandInsert = Database['public']['Tables']['brands']['Insert'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type RepDoctorAssignmentInsert = Database['public']['Tables']['rep_doctor_assignments']['Insert'];
export type VisitLogInsert = Database['public']['Tables']['visit_logs']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type DoctorUpdate = Database['public']['Tables']['doctors']['Update'];
export type BrandUpdate = Database['public']['Tables']['brands']['Update'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

// Enums
export type UserRole = Database['public']['Enums']['user_role'];
export type DoctorCategory = Database['public']['Enums']['doctor_category'];
export type DoctorSpecialization = Database['public']['Enums']['doctor_specialization'];
export type DoctorGender = Database['public']['Enums']['doctor_gender'];
export type MeetingStatus = Database['public']['Enums']['meeting_status'];
export type BakuDistrict = Database['public']['Enums']['baku_district'];
export type VisitStatus = Database['public']['Enums']['visit_status'];
export type VisitDay = Database['public']['Enums']['visit_day'];

// App-level Visit Status enum for UI logic (includes planned/active states)
export enum AppVisitStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'in_progress',
  COMPLETED = 'completed',
  POSTPONED = 'postponed',
  MISSED = 'missed',
  PLANNED = 'planned'
}

// Utility to map DB visit_status to AppVisitStatus
export const toAppVisitStatus = (dbStatus?: VisitStatus | string | null): AppVisitStatus => {
  switch (dbStatus) {
    case 'completed':
      return AppVisitStatus.COMPLETED;
    case 'postponed':
      return AppVisitStatus.POSTPONED;
    case 'missed':
      return AppVisitStatus.MISSED;
    case 'in_progress':
      return AppVisitStatus.ACTIVE;
    case 'planned':
      return AppVisitStatus.PLANNED;
    default:
      return AppVisitStatus.UPCOMING;
  }
};

// Extended types with relationships
export interface UserWithProfile extends User {
  manager?: Manager;
  representative?: Representative;
}

export interface DoctorWithAssignments extends Doctor {
  assignments?: (RepDoctorAssignment & {
    representative?: Representative;
    products?: (RepDoctorProduct & {
      product?: Product & {
        brand?: Brand;
      };
    })[];
  })[];
}

export interface RepresentativeWithDetails extends Representative {
  user?: User;
  manager?: Manager;
  assignments?: (RepDoctorAssignment & {
    doctor?: Doctor;
    products?: (RepDoctorProduct & {
      product?: Product & {
        brand?: Brand;
      };
    })[];
  })[];
}

export interface VisitLogWithDetails extends VisitLog {
  doctor?: Doctor;
  representative?: Representative;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface CreateManagerForm {
  email: string;
  password: string;
  full_name: string;
}

export interface CreateRepresentativeForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  manager_id: string;
  clinic_ids: string[];
  brand_ids: string[];
}

export interface CreateDoctorForm {
  first_name?: string;
  last_name?: string;
  specialization_id?: string; // UUID of the specialization
  total_category?: DoctorCategory;
  planeta_category?: DoctorCategory;
  gender?: DoctorGender;
  phone?: string;
  // email removed - not required anymore
  workplaces?: {
    clinic_name?: string;
    address?: string;
    phone?: string;
  }[];
  clinic_ids?: string[];
  address?: string;
}

export interface CreateBrandForm {
  name: string;
}

export interface CreateProductForm {
  brand_id: string;
  name: string;
  description: string;
  priority_specializations: DoctorSpecialization[];
  pdf_file?: File;
  annotations?: string;
}

export interface AssignmentForm {
  representative_id: string;
  clinic_id: string;
  assigned_date: string;
  doctor_ids: string[];
  notes?: string;
}

export interface CreateClinicForm {
  name: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface MeetingForm {
  assignment_id: string;
  doctor_id: string;
  notes?: string;
}

export interface MeetingProductForm {
  product_id: string;
  discussed: boolean;
  notes?: string;
}

export interface CreateClinicForm {
  name: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface CreateBrandForm {
  name: string;
}

// Dashboard statistics
export interface DashboardStats {
  totalVisits: number;
  completedVisits: number;
  missedVisits: number;
  postponedVisits: number;
  completionRate: number;
}

export interface ManagerDashboardStats extends DashboardStats {
  totalRepresentatives: number;
  totalDoctors: number;
  totalBrands: number;
  activeAssignments: number;
}

export interface RepresentativeDashboardStats extends DashboardStats {
  todayVisits: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

// Visit schedule types
export interface ScheduledVisit {
  assignment: RepDoctorAssignment;
  doctor: Doctor;
  products: (Product & { brand: Brand })[];
  visitLog?: VisitLog;
}

export interface DailySchedule {
  date: string;
  visits: ScheduledVisit[];
}

// Report types
export interface WeeklyReport {
  week: string;
  representative: Representative;
  totalVisits: number;
  completedVisits: number;
  completionRate: number;
  doctorsVisited: number;
}

export interface MonthlyReport {
  month: string;
  representative: Representative;
  totalVisits: number;
  completedVisits: number;
  completionRate: number;
  doctorsVisited: number;
  averageVisitsPerWeek: number;
}

// Extended types for new features
export interface DoctorWithWorkplaces extends Doctor {
  workplaces: DoctorWorkplace[];
}

export interface DoctorWithSpecialization extends Doctor {
  specialization: Specialization;
}

export interface DoctorWithWorkplacesAndSpecialization extends Doctor {
  workplaces: DoctorWorkplace[];
  specialization: Specialization;
  clinics?: (ClinicDoctor & { clinic: Clinic })[];
}

export interface RepresentativeWithDetails extends Representative {
  user?: User;
  manager?: Manager;
  territories: RepresentativeTerritory[]; // deprecated, kept for compatibility
  clinics?: { id: string; clinic: Clinic }[];
  brands: (RepresentativeBrand & { brand: Brand })[];
  assignments?: (Assignment & {
    clinic: Clinic;
    doctors: (AssignmentDoctor & { doctor: Doctor })[];
  })[];
}

export interface ManagerWithDetails extends Manager {
  user?: User;
  representatives?: Representative[];
}

export interface AssignmentWithDetails extends Assignment {
  representative: Representative;
  clinic: Clinic;
  doctors: (AssignmentDoctor & { doctor: Doctor })[];
  meetings?: Meeting[];
}

export interface MeetingWithDetails extends Meeting {
  assignment: Assignment;
  doctor: Doctor;
  representative: Representative;
  products: (MeetingProduct & { product: Product & { brand: Brand } })[];
}

export interface ProductWithDetails extends Product {
  brand: Brand;
  priority_specializations: DoctorSpecialization[];
}

export interface ClinicWithDoctors extends Clinic {
  doctors: (ClinicDoctor & { doctor: Doctor & { specialization: Specialization } })[];
}

// Representative dashboard types
export interface RepresentativeDashboardData {
  todayAssignments: AssignmentWithDetails[];
  activeMeetings: MeetingWithDetails[];
  availableProducts: ProductWithDetails[];
  stats: {
    todayMeetings: number;
    completedMeetings: number;
    weeklyMeetings: number;
    monthlyMeetings: number;
  };
}