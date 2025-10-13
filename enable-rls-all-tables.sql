-- Enable Row Level Security (RLS) on All Tables
-- Run this in Supabase SQL Editor to re-enable RLS after testing

-- Core tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- Assignment and visit tables
ALTER TABLE public.rep_doctor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_doctor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY;

-- Junction tables
ALTER TABLE public.representative_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representative_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_workplaces ENABLE ROW LEVEL SECURITY;

-- Notifications and route tracking
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_route_points ENABLE ROW LEVEL SECURITY;

-- Ensure Super Admin has full access to all tables
-- (These policies allow super_admin to bypass all restrictions)

-- Super Admin full access to users
DROP POLICY IF EXISTS "Super admins full access to users" ON public.users;
CREATE POLICY "Super admins full access to users" ON public.users
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to managers
DROP POLICY IF EXISTS "Super admins full access to managers" ON public.managers;
CREATE POLICY "Super admins full access to managers" ON public.managers
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to representatives
DROP POLICY IF EXISTS "Super admins full access to representatives" ON public.representatives;
CREATE POLICY "Super admins full access to representatives" ON public.representatives
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to doctors
DROP POLICY IF EXISTS "Super admins full access to doctors" ON public.doctors;
CREATE POLICY "Super admins full access to doctors" ON public.doctors
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to brands
DROP POLICY IF EXISTS "Super admins full access to brands" ON public.brands;
CREATE POLICY "Super admins full access to brands" ON public.brands
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to products
DROP POLICY IF EXISTS "Super admins full access to products" ON public.products;
CREATE POLICY "Super admins full access to products" ON public.products
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to specializations
DROP POLICY IF EXISTS "Super admins full access to specializations" ON public.specializations;
CREATE POLICY "Super admins full access to specializations" ON public.specializations
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to clinics
DROP POLICY IF EXISTS "Super admins full access to clinics" ON public.clinics;
CREATE POLICY "Super admins full access to clinics" ON public.clinics
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to assignments
DROP POLICY IF EXISTS "Super admins full access to assignments" ON public.rep_doctor_assignments;
CREATE POLICY "Super admins full access to assignments" ON public.rep_doctor_assignments
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to rep_doctor_products
DROP POLICY IF EXISTS "Super admins full access to rep_doctor_products" ON public.rep_doctor_products;
CREATE POLICY "Super admins full access to rep_doctor_products" ON public.rep_doctor_products
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to visit_goals
DROP POLICY IF EXISTS "Super admins full access to visit_goals" ON public.visit_goals;
CREATE POLICY "Super admins full access to visit_goals" ON public.visit_goals
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to visit_logs
DROP POLICY IF EXISTS "Super admins full access to visit_logs" ON public.visit_logs;
CREATE POLICY "Super admins full access to visit_logs" ON public.visit_logs
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to junction tables
DROP POLICY IF EXISTS "Super admins full access to representative_clinics" ON public.representative_clinics;
CREATE POLICY "Super admins full access to representative_clinics" ON public.representative_clinics
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Super admins full access to representative_brands" ON public.representative_brands;
CREATE POLICY "Super admins full access to representative_brands" ON public.representative_brands
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Super admins full access to clinic_doctors" ON public.clinic_doctors;
CREATE POLICY "Super admins full access to clinic_doctors" ON public.clinic_doctors
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Super admins full access to doctor_workplaces" ON public.doctor_workplaces;
CREATE POLICY "Super admins full access to doctor_workplaces" ON public.doctor_workplaces
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to notifications
DROP POLICY IF EXISTS "Super admins full access to notifications" ON public.notifications;
CREATE POLICY "Super admins full access to notifications" ON public.notifications
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Super Admin full access to meeting_route_points
DROP POLICY IF EXISTS "Super admins full access to meeting_route_points" ON public.meeting_route_points;
CREATE POLICY "Super admins full access to meeting_route_points" ON public.meeting_route_points
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'));

-- Manager policies (scoped access for managers)

-- Managers can view their representatives
DROP POLICY IF EXISTS "Managers can view their representatives" ON public.representatives;
CREATE POLICY "Managers can view their representatives" ON public.representatives
FOR SELECT
USING (
  manager_id IN (SELECT id FROM public.managers WHERE user_id = auth.uid())
);

-- Managers can create/update/delete their representatives
DROP POLICY IF EXISTS "Managers can manage their representatives" ON public.representatives;
CREATE POLICY "Managers can manage their representatives" ON public.representatives
FOR INSERT
WITH CHECK (
  manager_id IN (SELECT id FROM public.managers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can update their representatives" ON public.representatives;
CREATE POLICY "Managers can update their representatives" ON public.representatives
FOR UPDATE
USING (
  manager_id IN (SELECT id FROM public.managers WHERE user_id = auth.uid())
)
WITH CHECK (
  manager_id IN (SELECT id FROM public.managers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete their representatives" ON public.representatives;
CREATE POLICY "Managers can delete their representatives" ON public.representatives
FOR DELETE
USING (
  manager_id IN (SELECT id FROM public.managers WHERE user_id = auth.uid())
);

-- Managers can view all doctors (global view for assignment purposes)
DROP POLICY IF EXISTS "Managers can view doctors" ON public.doctors;
CREATE POLICY "Managers can view doctors" ON public.doctors
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'manager')
);

-- Managers can view all brands (global view for assignment purposes)
DROP POLICY IF EXISTS "Managers can view brands" ON public.brands;
CREATE POLICY "Managers can view brands" ON public.brands
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'manager')
);

-- Managers can view all products (global view for assignment purposes)
DROP POLICY IF EXISTS "Managers can view products" ON public.products;
CREATE POLICY "Managers can view products" ON public.products
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'manager')
);

-- Managers can manage assignments for their representatives
DROP POLICY IF EXISTS "Managers can manage assignments" ON public.rep_doctor_assignments;
CREATE POLICY "Managers can manage assignments" ON public.rep_doctor_assignments
FOR ALL
USING (
  rep_id IN (
    SELECT r.id FROM public.representatives r
    JOIN public.managers m ON m.id = r.manager_id
    WHERE m.user_id = auth.uid()
  )
)
WITH CHECK (
  rep_id IN (
    SELECT r.id FROM public.representatives r
    JOIN public.managers m ON m.id = r.manager_id
    WHERE m.user_id = auth.uid()
  )
);

-- Managers can view visit logs for their representatives
DROP POLICY IF EXISTS "Managers can view visit logs" ON public.visit_logs;
CREATE POLICY "Managers can view visit logs" ON public.visit_logs
FOR SELECT
USING (
  rep_id IN (
    SELECT r.id FROM public.representatives r
    JOIN public.managers m ON m.id = r.manager_id
    WHERE m.user_id = auth.uid()
  )
);

-- Representative policies

-- Representatives can view their own record
DROP POLICY IF EXISTS "Representatives can view own record" ON public.representatives;
CREATE POLICY "Representatives can view own record" ON public.representatives
FOR SELECT
USING (user_id = auth.uid());

-- Representatives can view their assignments
DROP POLICY IF EXISTS "Representatives can view assignments" ON public.rep_doctor_assignments;
CREATE POLICY "Representatives can view assignments" ON public.rep_doctor_assignments
FOR SELECT
USING (
  rep_id IN (SELECT id FROM public.representatives WHERE user_id = auth.uid())
);

-- Representatives can view assigned doctors
DROP POLICY IF EXISTS "Representatives can view doctors" ON public.doctors;
CREATE POLICY "Representatives can view doctors" ON public.doctors
FOR SELECT
USING (
  id IN (
    SELECT doctor_id FROM public.rep_doctor_assignments rda
    JOIN public.representatives r ON r.id = rda.rep_id
    WHERE r.user_id = auth.uid()
  )
);

-- Representatives can view assigned products
DROP POLICY IF EXISTS "Representatives can view products" ON public.rep_doctor_products;
CREATE POLICY "Representatives can view products" ON public.rep_doctor_products
FOR SELECT
USING (
  assignment_id IN (
    SELECT rda.id FROM public.rep_doctor_assignments rda
    JOIN public.representatives r ON r.id = rda.rep_id
    WHERE r.user_id = auth.uid()
  )
);

-- Representatives can manage their own visit logs
DROP POLICY IF EXISTS "Representatives can manage visit logs" ON public.visit_logs;
CREATE POLICY "Representatives can manage visit logs" ON public.visit_logs
FOR ALL
USING (
  rep_id IN (SELECT id FROM public.representatives WHERE user_id = auth.uid())
)
WITH CHECK (
  rep_id IN (SELECT id FROM public.representatives WHERE user_id = auth.uid())
);

-- Representatives can view their assigned brands
DROP POLICY IF EXISTS "Representatives can view assigned brands" ON public.representative_brands;
CREATE POLICY "Representatives can view assigned brands" ON public.representative_brands
FOR SELECT
USING (
  representative_id IN (SELECT id FROM public.representatives WHERE user_id = auth.uid())
);

-- Representatives can view their assigned clinics
DROP POLICY IF EXISTS "Representatives can view assigned clinics" ON public.representative_clinics;
CREATE POLICY "Representatives can view assigned clinics" ON public.representative_clinics
FOR SELECT
USING (
  representative_id IN (SELECT id FROM public.representatives WHERE user_id = auth.uid())
);

-- Public read access for non-sensitive tables
DROP POLICY IF EXISTS "Anyone can view specializations" ON public.specializations;
CREATE POLICY "Anyone can view specializations" ON public.specializations
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view clinics" ON public.clinics;
CREATE POLICY "Anyone can view clinics" ON public.clinics
FOR SELECT
USING (true);

-- Notifications policies (role-based and user-specific)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT
USING (
  recipient_user_id = auth.uid() OR 
  recipient_role::text = (SELECT role::text FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read" ON public.notifications
FOR UPDATE
USING (
  recipient_user_id = auth.uid() OR 
  recipient_role::text = (SELECT role::text FROM public.users WHERE id = auth.uid())
)
WITH CHECK (
  recipient_user_id = auth.uid() OR 
  recipient_role::text = (SELECT role::text FROM public.users WHERE id = auth.uid())
);

-- Meeting route points (representatives can insert their own)
DROP POLICY IF EXISTS "Representatives can manage route points" ON public.meeting_route_points;
CREATE POLICY "Representatives can manage route points" ON public.meeting_route_points
FOR ALL
USING (
  rep_id IN (SELECT id FROM public.representatives WHERE user_id = auth.uid())
)
WITH CHECK (
  rep_id IN (SELECT id FROM public.representatives WHERE user_id = auth.uid())
);

-- Verify RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'managers', 'representatives', 'doctors', 'brands', 'products',
    'specializations', 'clinics', 'rep_doctor_assignments', 'rep_doctor_products',
    'visit_goals', 'visit_logs', 'representative_clinics', 'representative_brands',
    'clinic_doctors', 'doctor_workplaces', 'notifications', 'meeting_route_points'
  )
ORDER BY tablename;

