-- ════════════════════════════════════════════════════════════════
-- COMPREHENSIVE E-COMMERCE MODULES UPGRADE
-- Order Addresses, Tax Class, Refunds, Returns, Email Tracking
-- ════════════════════════════════════════════════════════════════

-- 1. ORDERS TABLE - Add Billing/Shipping Addresses & Order Notes
-- ════════════════════════════════════════════════════════════════
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_address JSONB,
ADD COLUMN IF NOT EXISTS shipping_address JSONB,
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_status TEXT, -- 'NONE', 'PENDING', 'PARTIAL', 'FULL', 'REJECTED'
ADD COLUMN IF NOT EXISTS return_status TEXT, -- 'NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'
ADD COLUMN IF NOT EXISTS return_reason TEXT,
ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS transaction_id TEXT, -- Payment gateway transaction ID
ADD COLUMN IF NOT EXISTS cancel_reason TEXT, -- Reason for cancellation
ADD COLUMN IF NOT EXISTS payment_gateway TEXT; -- 'razorpay', 'stripe', 'cod'

-- 2. ORDER STATUS HISTORY TABLE (Detailed Timeline)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  status_from TEXT,
  status_to TEXT NOT NULL,
  changed_by TEXT, -- 'system', 'admin', 'customer'
  notes TEXT,
  metadata JSONB, -- Store additional data like tracking info
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

-- 3. PRODUCTS TABLE - Add Tax Class
-- ════════════════════════════════════════════════════════════════
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tax_class TEXT DEFAULT 'GST_5', -- 'GST_0', 'GST_5', 'GST_12', 'GST_18', 'GST_28'
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS dimensions JSONB; -- {length, width, height} in cm

-- 4. CUSTOMER ADDRESSES TABLE (Address Book)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'both', -- 'billing', 'shipping', 'both'
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- 5. EMAIL LOG TABLE (Track all sent emails)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'order_confirmation', 'shipped', 'delivered', 'refund', 'return'
  recipient_email TEXT,
  subject TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- 6. REFUNDS TABLE
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS refunds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT,
  refund_method TEXT DEFAULT 'original', -- 'original', 'bank_transfer', 'store_credit'
  bank_account_details JSONB, -- For bank transfer refunds
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'rejected'
  transaction_id TEXT,
  processed_by UUID REFERENCES customers(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);

-- 7. RETURNS TABLE
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS returns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  items JSONB NOT NULL, -- Array of {order_item_id, product_id, quantity, reason}
  reason TEXT NOT NULL,
  condition TEXT, -- 'unopened', 'opened_unused', 'damaged', 'wrong_item'
  images TEXT[], -- URLs of return images
  status TEXT DEFAULT 'requested', -- 'requested', 'approved', 'rejected', 'received', 'inspected', 'refunded', 'rejected'
  return_shipping_label TEXT,
  tracking_number TEXT,
  inspected_by UUID REFERENCES customers(id),
  inspection_notes TEXT,
  approved_amount NUMERIC,
  deduction_amount NUMERIC DEFAULT 0,
  deduction_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);

-- 8. COUPONS TABLE (For discounts)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'percentage', 'fixed_amount', 'free_shipping'
  value NUMERIC NOT NULL, -- Percentage or fixed amount
  min_order_amount NUMERIC DEFAULT 0,
  max_discount_amount NUMERIC,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  applies_to TEXT DEFAULT 'all', -- 'all', 'categories', 'products'
  applicable_ids UUID[], -- Product or category IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. ORDER COUPONS TABLE (Track applied coupons)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  coupon_id UUID REFERENCES coupons(id),
  coupon_code TEXT NOT NULL,
  discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TAX RATES TABLE (Centralized tax management)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL, -- 'GST 5%', 'GST 12%', etc.
  rate NUMERIC NOT NULL, -- 5, 12, 18, 28
  type TEXT DEFAULT 'gst', -- 'gst', 'vat', 'custom'
  country TEXT DEFAULT 'India' NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  applies_to TEXT DEFAULT 'all', -- 'all', 'categories', 'products'
  applicable_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default GST rates
INSERT INTO tax_rates (name, rate, type, country) VALUES
('GST 0%', 0, 'gst', 'India'),
('GST 5%', 5, 'gst', 'India'),
('GST 12%', 12, 'gst', 'India'),
('GST 18%', 18, 'gst', 'India'),
('GST 28%', 28, 'gst', 'India')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- TRIGGER: Update customer_addresses updated_at
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_addresses_updated_at ON customer_addresses;
CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════
-- FUNCTION: Log order status changes automatically
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (
      order_id, status_from, status_to, changed_by, notes
    ) VALUES (
      NEW.id, OLD.status, NEW.status, 'system', 
      COALESCE(NEW.admin_notes, 'Status updated')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_order_status_change ON orders;
CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ════════════════════════════════════════════════════════════════
-- DONE!
-- ════════════════════════════════════════════════════════════════
SELECT 'E-commerce modules migration complete!' as status;
