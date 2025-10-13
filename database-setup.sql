-- BTK Medical Platform Database Schema
-- Run this script in your Supabase SQL editor

-- Enable Row Level Security by default
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- Create enums
CREATE TYPE user_role AS ENUM ('super_admin', 'manager', 'rep');
CREATE TYPE doctor_category AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE visit_status AS ENUM ('completed', 'missed', 'postponed');
CREATE TYPE visit_day AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- Specializations table
CREATE TABLE specializations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Managers table
CREATE TABLE managers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Representatives table
CREATE TABLE representatives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctors table
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
    address TEXT NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands table
CREATE TABLE brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(manager_id, name)
);

-- Products table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(brand_id, name)
);

-- Representative-Doctor assignments table
CREATE TABLE rep_doctor_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rep_id UUID REFERENCES representatives(id) ON DELETE CASCADE NOT NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
    visit_days TEXT[] NOT NULL, -- Array of day names
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rep_id, doctor_id)
);

-- Rep-Doctor-Products junction table
CREATE TABLE rep_doctor_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES rep_doctor_assignments(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, product_id)
);

-- Visit goals table
CREATE TABLE visit_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES rep_doctor_assignments(id) ON DELETE CASCADE UNIQUE NOT NULL,
    visits_per_week INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visit logs table
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

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_representatives_manager_id ON representatives(manager_id);
CREATE INDEX idx_doctors_manager_id ON doctors(manager_id);
CREATE INDEX idx_doctors_category ON doctors(category);
CREATE INDEX idx_brands_manager_id ON brands(manager_id);
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_rep_doctor_assignments_rep_id ON rep_doctor_assignments(rep_id);
CREATE INDEX idx_rep_doctor_assignments_doctor_id ON rep_doctor_assignments(doctor_id);
CREATE INDEX idx_visit_logs_rep_id ON visit_logs(rep_id);
CREATE INDEX idx_visit_logs_doctor_id ON visit_logs(doctor_id);
CREATE INDEX idx_visit_logs_scheduled_date ON visit_logs(scheduled_date);
CREATE INDEX idx_visit_logs_status ON visit_logs(status);

-- Enable Row Level Security on all tables
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

-- RLS Policies

-- Users table policies
CREATE POLICY "Users can view their own record" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can create users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Managers can create representatives" ON users
    FOR INSERT WITH CHECK (
        NEW.role = 'rep' AND
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'manager'
        )
    );

-- Specializations table policies
CREATE POLICY "Anyone can view specializations" ON specializations
    FOR SELECT USING (true);

CREATE POLICY "Super admins can manage specializations" ON specializations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Managers table policies
CREATE POLICY "Managers can view their own record" ON managers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all managers" ON managers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can manage managers" ON managers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Representatives table policies
CREATE POLICY "Representatives can view their own record" ON representatives
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view their representatives" ON representatives
    FOR SELECT USING (
        manager_id IN (
            SELECT id FROM managers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage their representatives" ON representatives
    FOR ALL USING (
        manager_id IN (
            SELECT id FROM managers WHERE user_id = auth.uid()
        )
    );

-- Doctors table policies
CREATE POLICY "Managers can manage their doctors" ON doctors
    FOR ALL USING (
        manager_id IN (
            SELECT id FROM managers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Representatives can view assigned doctors" ON doctors
    FOR SELECT USING (
        id IN (
            SELECT doctor_id FROM rep_doctor_assignments rda
            JOIN representatives r ON r.id = rda.rep_id
            WHERE r.user_id = auth.uid()
        )
    );

-- Brands table policies
CREATE POLICY "Managers can manage their brands" ON brands
    FOR ALL USING (
        manager_id IN (
            SELECT id FROM managers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Representatives can view manager's brands" ON brands
    FOR SELECT USING (
        manager_id IN (
            SELECT r.manager_id FROM representatives r
            WHERE r.user_id = auth.uid()
        )
    );

-- Products table policies
CREATE POLICY "Managers can manage products for their brands" ON products
    FOR ALL USING (
        brand_id IN (
            SELECT id FROM brands b
            JOIN managers m ON m.id = b.manager_id
            WHERE m.user_id = auth.uid()
        )
    );

CREATE POLICY "Representatives can view products" ON products
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN representatives r ON r.manager_id = b.manager_id
            WHERE r.user_id = auth.uid()
        )
    );

-- Rep-Doctor assignments policies
CREATE POLICY "Managers can manage assignments for their reps" ON rep_doctor_assignments
    FOR ALL USING (
        rep_id IN (
            SELECT r.id FROM representatives r
            JOIN managers m ON m.id = r.manager_id
            WHERE m.user_id = auth.uid()
        )
    );

CREATE POLICY "Representatives can view their assignments" ON rep_doctor_assignments
    FOR SELECT USING (
        rep_id IN (
            SELECT id FROM representatives WHERE user_id = auth.uid()
        )
    );

-- Rep-Doctor-Products policies
CREATE POLICY "Managers can manage rep-doctor products" ON rep_doctor_products
    FOR ALL USING (
        assignment_id IN (
            SELECT rda.id FROM rep_doctor_assignments rda
            JOIN representatives r ON r.id = rda.rep_id
            JOIN managers m ON m.id = r.manager_id
            WHERE m.user_id = auth.uid()
        )
    );

CREATE POLICY "Representatives can view their assigned products" ON rep_doctor_products
    FOR SELECT USING (
        assignment_id IN (
            SELECT rda.id FROM rep_doctor_assignments rda
            JOIN representatives r ON r.id = rda.rep_id
            WHERE r.user_id = auth.uid()
        )
    );

-- Visit goals policies
CREATE POLICY "Managers can manage visit goals" ON visit_goals
    FOR ALL USING (
        assignment_id IN (
            SELECT rda.id FROM rep_doctor_assignments rda
            JOIN representatives r ON r.id = rda.rep_id
            JOIN managers m ON m.id = r.manager_id
            WHERE m.user_id = auth.uid()
        )
    );

CREATE POLICY "Representatives can view their visit goals" ON visit_goals
    FOR SELECT USING (
        assignment_id IN (
            SELECT rda.id FROM rep_doctor_assignments rda
            JOIN representatives r ON r.id = rda.rep_id
            WHERE r.user_id = auth.uid()
        )
    );

-- Visit logs policies
CREATE POLICY "Representatives can manage their own visit logs" ON visit_logs
    FOR ALL USING (
        rep_id IN (
            SELECT id FROM representatives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Managers can view their reps' visit logs" ON visit_logs
    FOR SELECT USING (
        rep_id IN (
            SELECT r.id FROM representatives r
            JOIN managers m ON m.id = r.manager_id
            WHERE m.user_id = auth.uid()
        )
    );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_managers_updated_at BEFORE UPDATE ON managers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_representatives_updated_at BEFORE UPDATE ON representatives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rep_doctor_assignments_updated_at BEFORE UPDATE ON rep_doctor_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visit_goals_updated_at BEFORE UPDATE ON visit_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visit_logs_updated_at BEFORE UPDATE ON visit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reporting helper: aggregate meeting stats per representative
CREATE OR REPLACE FUNCTION get_rep_meeting_stats(
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL,
    p_rep_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL
)
RETURNS TABLE (
    representative_id UUID,
    representative_name TEXT,
    brand_name TEXT,
    total_count INTEGER,
    completed_count INTEGER,
    postponed_count INTEGER,
    missed_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vl.rep_id,
    r.full_name,
    b.name AS brand_name,
    CAST(COUNT(*) AS INTEGER) AS total_count,
    CAST(COUNT(*) FILTER (WHERE vl.status = 'completed') AS INTEGER) AS completed_count,
    CAST(COUNT(*) FILTER (WHERE vl.status = 'postponed') AS INTEGER) AS postponed_count,
    CAST(COUNT(*) FILTER (WHERE vl.status = 'missed') AS INTEGER) AS missed_count
  FROM visit_logs vl
  JOIN representatives r ON r.id = vl.rep_id
  LEFT JOIN rep_doctor_assignments rda ON rda.rep_id = vl.rep_id AND vl.doctor_id = rda.doctor_id
  LEFT JOIN rep_doctor_products rdp ON rdp.assignment_id = rda.id
  LEFT JOIN products p ON p.id = rdp.product_id
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE (p_from_date IS NULL OR vl.scheduled_date >= p_from_date)
    AND (p_to_date IS NULL OR vl.scheduled_date <= p_to_date)
    AND (p_rep_id IS NULL OR vl.rep_id = p_rep_id)
    AND (p_brand_id IS NULL OR b.id = p_brand_id)
  GROUP BY vl.rep_id, r.full_name, b.name
  ORDER BY r.full_name, b.name;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data (optional - for testing)
-- You can run this after setting up your Supabase project

/*
-- Sample Specializations
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

-- Sample Super Admin (you'll need to create this user in Supabase Auth first)
INSERT INTO users (id, email, role) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@btk.com', 'super_admin');

-- Sample Manager
INSERT INTO users (id, email, role) VALUES 
('00000000-0000-0000-0000-000000000002', 'manager@btk.com', 'manager');

INSERT INTO managers (user_id, full_name) VALUES 
('00000000-0000-0000-0000-000000000002', 'John Manager');

-- Sample Representative
INSERT INTO users (id, email, role) VALUES 
('00000000-0000-0000-0000-000000000003', 'rep@btk.com', 'rep');

INSERT INTO representatives (user_id, manager_id, full_name) VALUES 
('00000000-0000-0000-0000-000000000003', 
 (SELECT id FROM managers WHERE user_id = '00000000-0000-0000-0000-000000000002'), 
 'Jane Representative');
*/