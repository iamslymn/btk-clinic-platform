-- Add Specializations Table Migration
-- Run this script to add the missing specializations table to your existing database

-- Create specializations table
CREATE TABLE IF NOT EXISTS specializations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;

-- Add specialization_id column to doctors table if it doesn't exist
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specialization_id UUID REFERENCES specializations(id) ON DELETE SET NULL;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS total_category doctor_category;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS planeta_category doctor_category;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS email TEXT;

-- Create RLS policies
DROP POLICY IF EXISTS "Anyone can view specializations" ON specializations;
CREATE POLICY "Anyone can view specializations" ON specializations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admin can manage specializations" ON specializations;
CREATE POLICY "Super admin can manage specializations" ON specializations FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Insert sample specializations
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
('emergency_medicine', 'Təcili tibbi yardım', 'Təcili hallar')
ON CONFLICT (name) DO NOTHING;

SELECT '✅ Specializations table migration completed!' as status;
