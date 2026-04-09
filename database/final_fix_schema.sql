-- 1. Add admin_notes to customers table for session state management
ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Add requested_from to return_requests if not already there
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS requested_from TEXT DEFAULT 'website';

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_customers_admin_notes ON customers(admin_notes) WHERE admin_notes IS NOT NULL;
