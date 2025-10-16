-- Safe migration script for visit_discussed_products
-- Drops and recreates table and policies to ensure clean state

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can view all discussed products" ON visit_discussed_products;
DROP POLICY IF EXISTS "Managers can view their representatives discussed products" ON visit_discussed_products;
DROP POLICY IF EXISTS "Representatives can view their own discussed products" ON visit_discussed_products;
DROP POLICY IF EXISTS "Representatives can add discussed products to their visits" ON visit_discussed_products;
DROP POLICY IF EXISTS "Representatives can remove discussed products from their visits" ON visit_discussed_products;

-- Drop view if exists
DROP VIEW IF EXISTS visit_discussed_products_detailed;

-- Drop table if exists (will cascade delete all data)
DROP TABLE IF EXISTS visit_discussed_products;

-- Create visit_discussed_products table
CREATE TABLE visit_discussed_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visit_id UUID NOT NULL REFERENCES visit_logs(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure same product isn't added twice to same visit
    UNIQUE(visit_id, product_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_visit_discussed_products_visit_id ON visit_discussed_products(visit_id);
CREATE INDEX idx_visit_discussed_products_product_id ON visit_discussed_products(product_id);

-- Enable RLS
ALTER TABLE visit_discussed_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visit_discussed_products

-- Policy 1: Super admins can see all discussed products
CREATE POLICY "Super admins can view all discussed products"
ON visit_discussed_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role::text = 'super_admin'
  )
);

-- Policy 2: Managers can see discussed products for their representatives' visits
CREATE POLICY "Managers can view their representatives discussed products"
ON visit_discussed_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.managers m ON m.user_id = u.id
    JOIN public.visit_logs vl ON vl.id = visit_discussed_products.visit_id
    JOIN public.representatives r ON r.id = vl.rep_id
    WHERE u.id = auth.uid()
    AND u.role::text = 'manager'
    AND r.manager_id = m.id
  )
);

-- Policy 3: Representatives can view their own discussed products
CREATE POLICY "Representatives can view their own discussed products"
ON visit_discussed_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.representatives r ON r.auth_user_id = u.id OR r.user_id = u.id
    JOIN public.visit_logs vl ON vl.id = visit_discussed_products.visit_id
    WHERE u.id = auth.uid()
    AND u.role::text = 'rep'
    AND vl.rep_id = r.id
  )
);

-- Policy 4: Representatives can insert discussed products for their own visits
CREATE POLICY "Representatives can add discussed products to their visits"
ON visit_discussed_products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.representatives r ON r.auth_user_id = u.id OR r.user_id = u.id
    JOIN public.visit_logs vl ON vl.id = visit_discussed_products.visit_id
    WHERE u.id = auth.uid()
    AND u.role::text = 'rep'
    AND vl.rep_id = r.id
  )
);

-- Policy 5: Representatives can delete discussed products from their own visits
CREATE POLICY "Representatives can remove discussed products from their visits"
ON visit_discussed_products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.representatives r ON r.auth_user_id = u.id OR r.user_id = u.id
    JOIN public.visit_logs vl ON vl.id = visit_discussed_products.visit_id
    WHERE u.id = auth.uid()
    AND u.role::text = 'rep'
    AND vl.rep_id = r.id
  )
);

-- Create a view for easier querying of discussed products with full details
CREATE OR REPLACE VIEW visit_discussed_products_detailed AS
SELECT 
    vdp.id,
    vdp.visit_id,
    vdp.product_id,
    vdp.created_at,
    p.name AS product_name,
    p.description AS product_description,
    b.name AS brand_name,
    vl.scheduled_date,
    vl.status AS visit_status,
    r.full_name AS representative_name,
    d.first_name || ' ' || d.last_name AS doctor_name
FROM visit_discussed_products vdp
JOIN products p ON p.id = vdp.product_id
JOIN brands b ON b.id = p.brand_id
JOIN visit_logs vl ON vl.id = vdp.visit_id
JOIN representatives r ON r.id = vl.rep_id
JOIN doctors d ON d.id = vl.doctor_id;

-- Grant access to the view
GRANT SELECT ON visit_discussed_products_detailed TO authenticated;

COMMENT ON TABLE visit_discussed_products IS 'Stores products (drugs) discussed during doctor visits';
COMMENT ON COLUMN visit_discussed_products.visit_id IS 'Reference to the visit where products were discussed';
COMMENT ON COLUMN visit_discussed_products.product_id IS 'Reference to the product that was discussed';

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ visit_discussed_products table created successfully with RLS policies';
END $$;

