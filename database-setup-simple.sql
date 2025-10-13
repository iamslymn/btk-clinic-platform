-- BTK Medical Platform Database Schema (Simplified Version)
-- Run this in your Supabase SQL Editor if the main file has issues

-- Create enums first
CREATE TYPE user_role AS ENUM ('super_admin', 'manager', 'rep');
CREATE TYPE doctor_category AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE visit_status AS ENUM ('completed', 'missed', 'postponed');

-- Specializations table
CREATE TABLE specializations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tables without triggers first
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE managers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE representatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE doctors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    specialization_id UUID REFERENCES specializations(id) ON DELETE SET NULL,
    category doctor_category NOT NULL,
    total_category doctor_category,
    planeta_category doctor_category,
    gender TEXT CHECK (gender IN ('male', 'female')),
    phone TEXT,
    email TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(manager_id, name)
);

CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, name)
);

CREATE TABLE rep_doctor_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rep_id UUID REFERENCES representatives(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
    visit_days TEXT[] NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rep_id, doctor_id)
);

CREATE TABLE rep_doctor_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES rep_doctor_assignments(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, product_id)
);

CREATE TABLE visit_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES rep_doctor_assignments(id) ON DELETE CASCADE UNIQUE NOT NULL,
    visits_per_week INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE visit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rep_id UUID REFERENCES representatives(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status visit_status NOT NULL DEFAULT 'missed',
    postpone_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rep_doctor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rep_doctor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you can add more specific ones later)
-- Allow users to read their own data
CREATE POLICY "Enable read access for own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Enable read access for managers" ON managers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Enable read access for representatives" ON representatives FOR SELECT USING (user_id = auth.uid());

-- Specializations policies
CREATE POLICY "Anyone can view specializations" ON specializations FOR SELECT USING (true);
CREATE POLICY "Super admin can manage specializations" ON specializations FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Super admin can manage users
CREATE POLICY "Super admin can manage users" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Managers can manage their data
CREATE POLICY "Managers can manage their data" ON managers FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Managers can manage representatives" ON representatives FOR ALL USING (
    manager_id IN (SELECT id FROM managers WHERE user_id = auth.uid())
);
CREATE POLICY "Managers can manage doctors" ON doctors FOR ALL USING (
    manager_id IN (SELECT id FROM managers WHERE user_id = auth.uid())
);

-- Representatives can read their assignments
CREATE POLICY "Reps can read assignments" ON rep_doctor_assignments FOR SELECT USING (
    rep_id IN (SELECT id FROM representatives WHERE user_id = auth.uid())
);
CREATE POLICY "Reps can manage visit logs" ON visit_logs FOR ALL USING (
    rep_id IN (SELECT id FROM representatives WHERE user_id = auth.uid())
);

-- Sample specializations data
INSERT INTO specializations (name, display_name, description) VALUES
('cardiology', 'Kardiologiya', 'Ürək və qan-damar sistemi xəstəlikləri'),
('dermatology', 'Dermatologiya', 'Dəri xəstəlikləri'),
('endocrinology', 'Endokrinologiya', 'Hormon və metabolizm xəstəlikləri'),
('gastroenterology', 'Qastroenterologiya', 'Həzm sistemi xəstəlikləri'),
('gynecology', 'Ginekologiya', 'Qadın reproduktiv sistemi xəstəlikləri'),
('neurology', 'Nevrologiya', 'Sinir sistemi xəstəlikləri'),
('oncology', 'Onkologiya', 'Xərçəng xəstəlikləri'),
('ophthalmology', 'Oftalmologiya', 'Göz xəstəlikləri'),
('orthopedics', 'Ortopediya', 'Sümük və oynaq xəstəlikləri'),
('pediatrics', 'Pediatriya', 'Uşaq xəstəlikləri'),
('psychiatry', 'Psixiatriya', 'Psixi xəstəlikləri'),
('pulmonology', 'Pulmonologiya', 'Tənəffüs sistemi xəstəlikləri'),
('radiology', 'Radiologiya', 'Şüa diaqnostikası'),
('surgery', 'Cərrahiyyə', 'Cərrahi müdaxilələr'),
('urology', 'Urologiya', 'Sidik sistemi xəstəlikləri'),
('dentistry', 'Stomatologiya', 'Diş və ağız xəstəlikləri'),
('family_medicine', 'Ailə həkimi', 'Ümumi tibb'),
('emergency_medicine', 'Təcili tibbi yardım', 'Təcili hallar');