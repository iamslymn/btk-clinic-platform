export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'super_admin' | 'manager' | 'rep'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'super_admin' | 'manager' | 'rep'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'super_admin' | 'manager' | 'rep'
          created_at?: string
          updated_at?: string
        }
      }
      managers: {
        Row: {
          id: string
          user_id: string
          full_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      representatives: {
        Row: {
          id: string
          user_id: string
          manager_id: string
          first_name: string
          last_name: string
          full_name: string
          auth_user_id?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          manager_id: string
          first_name: string
          last_name: string
          full_name: string
          auth_user_id?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          manager_id?: string
          first_name?: string
          last_name?: string
          full_name?: string
          auth_user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      doctors: {
        Row: {
          id: string
          first_name: string
          last_name: string
          specialization_id: string
          total_category: string
          planeta_category: string
          gender: string
          phone: string
          email: string
          address: string | null
          specialty: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          specialization_id: string
          total_category: string
          planeta_category: string
          gender: string
          phone: string
          email: string
          address?: string | null
          specialty?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          specialization_id?: string
          total_category?: string
          planeta_category?: string
          gender?: string
          phone?: string
          email?: string
          address?: string | null
          specialty?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      specializations: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          brand_id: string
          name: string
          description: string | null
          pdf_url: string | null
          priority_specializations: string[]
          annotations: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          description?: string | null
          pdf_url?: string | null
          priority_specializations?: string[]
          annotations?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          description?: string | null
          pdf_url?: string | null
          priority_specializations?: string[]
          annotations?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rep_doctor_assignments: {
        Row: {
          id: string
          rep_id: string
          doctor_id: string
          visit_days: string[]
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rep_id: string
          doctor_id: string
          visit_days: string[]
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rep_id?: string
          doctor_id?: string
          visit_days?: string[]
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      rep_doctor_products: {
        Row: {
          id: string
          assignment_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          product_id?: string
          created_at?: string
        }
      }
      visit_goals: {
        Row: {
          id: string
          assignment_id: string
          visits_per_week: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          visits_per_week: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          visits_per_week?: number
          created_at?: string
          updated_at?: string
        }
      }
      visit_logs: {
        Row: {
          id: string
          rep_id: string
          doctor_id: string
          scheduled_date: string
          start_time: string | null
          end_time: string | null
          status: 'completed' | 'missed' | 'postponed'
          postpone_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rep_id: string
          doctor_id: string
          scheduled_date: string
          start_time?: string | null
          end_time?: string | null
          status: 'completed' | 'missed' | 'postponed'
          postpone_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rep_id?: string
          doctor_id?: string
          scheduled_date?: string
          start_time?: string | null
          end_time?: string | null
          status?: 'completed' | 'missed' | 'postponed'
          postpone_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clinics: {
        Row: {
          id: string
          name: string
          address: string
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      representative_clinics: {
        Row: {
          id: string
          representative_id: string
          clinic_id: string
          created_at: string
        }
        Insert: {
          id?: string
          representative_id: string
          clinic_id: string
          created_at?: string
        }
        Update: {
          id?: string
          representative_id?: string
          clinic_id?: string
          created_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          representative_id: string
          clinic_id: string
          assigned_date: string
          visit_days: string[]
          start_time: string
          end_time: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          representative_id: string
          clinic_id: string
          assigned_date: string
          visit_days: string[]
          start_time: string
          end_time: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          representative_id?: string
          clinic_id?: string
          assigned_date?: string
          visit_days?: string[]
          start_time?: string
          end_time?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meetings: {
        Row: {
          id: string
          assignment_id: string
          doctor_id: string
          start_time: string | null
          end_time: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          doctor_id: string
          start_time?: string | null
          end_time?: string | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          doctor_id?: string
          start_time?: string | null
          end_time?: string | null
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      doctor_workplaces: {
        Row: {
          id: string
          doctor_id: string
          clinic_name: string
          address: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          doctor_id: string
          clinic_name: string
          address: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          clinic_name?: string
          address?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      representative_territories: {
        Row: {
          id: string
          representative_id: string
          district: string
          created_at: string
        }
        Insert: {
          id?: string
          representative_id: string
          district: string
          created_at?: string
        }
        Update: {
          id?: string
          representative_id?: string
          district?: string
          created_at?: string
        }
      }
      representative_brands: {
        Row: {
          id: string
          representative_id: string
          brand_id: string
          created_at: string
        }
        Insert: {
          id?: string
          representative_id: string
          brand_id: string
          created_at?: string
        }
        Update: {
          id?: string
          representative_id?: string
          brand_id?: string
          created_at?: string
        }
      }
      clinic_doctors: {
        Row: {
          id: string
          clinic_id: string
          doctor_id: string
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          doctor_id: string
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          doctor_id?: string
          created_at?: string
        }
      }
      assignment_doctors: {
        Row: {
          id: string
          assignment_id: string
          doctor_id: string
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          doctor_id: string
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          doctor_id?: string
          created_at?: string
        }
      }
      meeting_products: {
        Row: {
          id: string
          meeting_id: string
          product_id: string
          discussed: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          meeting_id: string
          product_id: string
          discussed: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          meeting_id?: string
          product_id?: string
          discussed?: boolean
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'super_admin' | 'manager' | 'rep'
      doctor_category: 'A' | 'B' | 'C' | 'D'
      visit_status: 'completed' | 'missed' | 'postponed'
      visit_day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
      doctor_specialization: 'Cardiology' | 'Dermatology' | 'Endocrinology' | 'Gastroenterology' | 'General Practice' | 'Gynecology' | 'Neurology' | 'Oncology' | 'Orthopedics' | 'Pediatrics' | 'Psychiatry' | 'Pulmonology' | 'Radiology' | 'Urology'
      doctor_gender: 'Male' | 'Female' | 'Other'
      meeting_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      baku_district: 'Binagadi' | 'Garadagh' | 'Khatai' | 'Khazar' | 'Narimanov' | 'Nasimi' | 'Nizami' | 'Pirallahi' | 'Sabail' | 'Sabunchu' | 'Surakhani' | 'Yasamal'
    }
  }
}