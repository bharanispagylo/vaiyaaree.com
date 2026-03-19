-- Add Alert Threshold to Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 0;

-- Optional: Add a column to track total added vs total sold for analysis
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_added INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sold INTEGER DEFAULT 0;

-- Ensure total_added is initialized with current stock for existing products
UPDATE products SET total_added = stock WHERE total_added = 0;
-- Add cart_data column to customers table for persistent cart across sessions
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cart_data JSONB DEFAULT '[]';
-- Create CMS Pages Table
CREATE TABLE IF NOT EXISTS public.cms_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for slug
CREATE INDEX IF NOT EXISTS cms_pages_slug_idx ON public.cms_pages (slug);

-- Enable Row Level Security (optional, usually admin only in this context)
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Simple policy for everyone to read published pages
CREATE POLICY "Public read published pages" ON public.cms_pages
    FOR SELECT USING (is_published = TRUE);

-- Admin policy for all operations
-- Based on the project's logic, usually anon key is used with RLS turned off or very permissive policies.
-- Let's create a policy that allows everything for simplicity if it's an internal tool.
CREATE POLICY "Full access to cms_pages" ON public.cms_pages
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cms_pages_updated_at
    BEFORE UPDATE ON public.cms_pages
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
-- Add product_catalog_image_id column to products table
ALTER TABLE products ADD COLUMN product_catalog_image_id TEXT;

-- Create index for faster queries
CREATE INDEX idx_products_catalog_image_id ON products(product_catalog_image_id);
-- Run this in the Supabase SQL Editor to add the product_code column
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code text UNIQUE;
-- ════════════════════════════════════════════════════════════════
-- ADD PRODUCT GROUP COLUMN FOR PRODUCT TAGGING / GROUPING
-- ════════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times.

-- Add product_group column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_group text;

-- Create index for fast group lookups
CREATE INDEX IF NOT EXISTS idx_products_group ON products(product_group);

-- Create index for fast category lookups  
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ════════════════════════════════════════════════════════════════
-- DONE!
-- ════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- PRODUCT STOCK HISTORY TRACKING
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  change_type text NOT NULL, -- 'ADD', 'SALE', 'ADJUSTMENT', 'DELETE'
  quantity_change integer NOT NULL,
  new_stock integer NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id);
-- ════════════════════════════════════════════════════════════════
-- ROLE-BASED AUTHENTICATION SCHEMA
-- ════════════════════════════════════════════════════════════════

-- 1. Create enum for user roles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- 2. Update Customers table to include role
ALTER TABLE customers ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- 3. Update existing customers to have 'user' role if they don't have one
UPDATE customers SET role = 'user' WHERE role IS NULL;

-- 4. Function to promote a customer to admin (by phone number)
-- Usage: SELECT promote_to_admin('91XXXXXXXXXX');
CREATE OR REPLACE FUNCTION promote_to_admin(phone_num TEXT) 
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET role = 'admin' WHERE phone = phone_num;
END;
$$ LANGUAGE plpgsql;

-- 5. Seed initial admin if you have a phone number (Optional)
-- UPDATE customers SET role = 'admin' WHERE phone = '917558189732';
-- Increment functions for concurrent safe updates
CREATE OR REPLACE FUNCTION increment_total_sold(prod_id uuid, qty integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET total_sold = COALESCE(total_sold, 0) + qty
  WHERE id = prod_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_total_added(prod_id uuid, qty integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET total_added = COALESCE(total_added, 0) + qty
  WHERE id = prod_id;
END;
$$ LANGUAGE plpgsql;
-- ════════════════════════════════════════════════════════════════
-- SCHEDULED POSTS TABLE
-- ════════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  product_price numeric,
  caption text NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  platform text DEFAULT 'facebook',
  status text DEFAULT 'PENDING',  -- PENDING, POSTED, FAILED, CANCELLED
  fb_post_id text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
-- ════════════════════════════════════════════════════════════════
-- SHOP SETTINGS SCHEMA & DEFAULTS
-- ════════════════════════════════════════════════════════════════

insert into app_settings (key, value, description) values
('shop_name', 'Aiswarya Sarees', 'The official name of the shop used in invoices and messages'),
('shop_logo', 'https://via.placeholder.com/200?text=Aiswarya+Sarees', 'Logo URL for the shop'),
('shop_address', '123 Silk Road, Weaver City, Tamil Nadu 600001', 'Physical address shown on invoices'),
('shop_gstin', '33AABCA1234A1Z1', 'GST Number for the business'),
('bill_terms', '1. Goods once sold cannot be taken back.\n2. All disputes are subject to local jurisdiction.', 'Terms and conditions shown at the bottom of the bill'),
('bill_footer', 'Thank you for shopping with Aiswarya Sarees!', 'Greeting text at the end of the invoice')
on conflict (key) do nothing;
-- ════════════════════════════════════════════════════════════════
-- AISWARYA SAREES — ADD WEBSITE/WHATSAPP SOURCE TRACKING
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Add 'source' column to orders table to track if order came from 
--    WhatsApp Bot ('WHATSAPP') or the Shopping Website ('WEBSITE')
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'WHATSAPP';

-- 2. Add 'discount' column to products if not exists (used by shop page)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS discount numeric DEFAULT 0;

-- 3. Update existing WEB- orders to have source = 'WEBSITE'
UPDATE orders
SET source = 'WEBSITE'
WHERE id LIKE 'WEB-%';

-- 4. Ensure WhatsApp cart has image_url column
ALTER TABLE whatsapp_cart
ADD COLUMN IF NOT EXISTS image_url text;

-- Done! Now orders will show their source channel in the admin portal.
SELECT 'Migration complete!' as status;
-- ════════════════════════════════════════════════════════════════
-- MASTER AUTH & ROLE MIGRATION
-- ════════════════════════════════════════════════════════════════

-- 1. Create enum for user roles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- 2. Create Customers Table if not exists
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    role user_role DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Ensure role column exists and is of correct type
-- (In case table already existed with text role)
ALTER TABLE customers ALTER COLUMN role SET DEFAULT 'user';

-- 4. Create OTP Verification Table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Helper function to promote to admin
CREATE OR REPLACE FUNCTION promote_to_admin(phone_num TEXT) 
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET role = 'admin' WHERE phone = phone_num;
END;
$$ LANGUAGE plpgsql;

-- 6. SEED INITIAL ADMIN (Example)
-- SELECT promote_to_admin('917558189732');
-- ════════════════════════════════════════════════════════════════
-- AISWARYA SAREES — COMPLETE DATABASE SCHEMA & SETUP
-- ════════════════════════════════════════════════════════════════
-- Run this entire script in the Supabase SQL Editor.
-- It is safe to run multiple times (it uses IF NOT EXISTS).

-- 1. ENABLE EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. CREATE TABLES

-- Products Table
create table if not exists products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  stock integer default 0,
  category text, 
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Orders Table
create table if not exists orders (
  id text primary key,
  customer_name text,
  customer_phone text not null,
  total_amount numeric,
  status text default 'PENDING',
  payment_method text,
  delivery_address text,
  invoice_url text, -- For PDF invoice
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Order Items Table
create table if not exists order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id text references orders(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer default 1,
  price_at_time numeric,
  product_name text
);

-- WhatsApp Cart Table
create table if not exists whatsapp_cart (
  id uuid default uuid_generate_v4() primary key,
  phone text not null,
  product_id uuid references products(id),
  product_name text not null,
  price numeric not null,
  quantity integer default 1,
  image_url text,
  created_at timestamp with time zone default now()
);

-- Index for cart performance
create index if not exists idx_whatsapp_cart_phone on whatsapp_cart(phone);

-- 3. STORAGE SETUP (For PDF Invoices)

-- Create 'invoices' bucket if not exists
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', true)
on conflict (id) do nothing;

-- Allow public access to read invoices
create policy "Public Access Invoices"
  on storage.objects for select
  using ( bucket_id = 'invoices' );

-- Allow anonymous uploads (for the bot)
create policy "Anon Upload Invoices"
  on storage.objects for insert
  with check ( bucket_id = 'invoices' );


-- 4. FIX & DIVERSIFY PRODUCT IMAGES
-- Updates products with high-quality random images based on ID to avoid repetition.

-- Silk Sarees (Red, Green, Blue, Gold)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80' 
WHERE category ILIKE '%Silk%' AND (id::text LIKE '%0' OR id::text LIKE '%1' OR id::text LIKE '%2');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&q=80' 
WHERE category ILIKE '%Silk%' AND (id::text LIKE '%3' OR id::text LIKE '%4' OR id::text LIKE '%5');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1583391726247-0372380d3f74?w=600&q=80' 
WHERE category ILIKE '%Silk%' AND (id::text LIKE '%6' OR id::text LIKE '%7' OR id::text LIKE '%8');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1589810635657-232948472d98?w=600&q=80' 
WHERE category ILIKE '%Silk%' AND (id::text LIKE '%9' OR id::text LIKE '%a' OR id::text LIKE '%b');

-- Cotton Sarees (Simple, Elegant)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1609357602129-28f1cc48c48d?w=600&q=80' 
WHERE category ILIKE '%Cotton%' AND (id::text LIKE '%0' OR id::text LIKE '%1' OR id::text LIKE '%2' OR id::text LIKE '%3' OR id::text LIKE '%4');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1630303683072-4c6e93d7c43c?w=600&q=80' 
WHERE category ILIKE '%Cotton%' AND (id::text LIKE '%5' OR id::text LIKE '%6' OR id::text LIKE '%7' OR id::text LIKE '%8' OR id::text LIKE '%9');

-- Designer/Other (Modern, Flashy)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1596704017254-9b1b1b9e8d7a?w=600&q=80' 
WHERE category ILIKE '%Designer%' AND (id::text LIKE '%0' OR id::text LIKE '%1' OR id::text LIKE '%2' OR id::text LIKE '%3');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1550614000-4b9519e07d72?w=600&q=80' 
WHERE category ILIKE '%Designer%' AND (id::text LIKE '%4' OR id::text LIKE '%5' OR id::text LIKE '%6' OR id::text LIKE '%7');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1566236976-58bf9512316e?w=600&q=80' 
WHERE category ILIKE '%Designer%' AND (id::text LIKE '%8' OR id::text LIKE '%9' OR id::text LIKE '%a' OR id::text LIKE '%b');

-- Fallback for any remaining empty images
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612458448839-81cb704400c4?w=600&q=80' 
WHERE image_url IS NULL OR image_url = '';

-- ════════════════════════════════════════════════════════════════
-- DONE!
-- ════════════════════════════════════════════════════════════════
-- Link Orders to Customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Optional: Add source column for website orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'WEBSITE';
-- ════════════════════════════════════════════════════════════════
-- MASTER DATABASE UPDATE: TAXES, SHIPPING ZONES, AND ROLES
-- ════════════════════════════════════════════════════════════════
-- Run this script in your Supabase SQL Editor once.

-- 1. Enable UUID Extension (required for many tables)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & CORE TABLES
------------------------------------------------------------------
-- A. User Role Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

-- B. User Roles mapping/tracking (OTP)
CREATE TABLE IF NOT EXISTS otps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone);

-- C. Customers (Unified store for both regular & admin users)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  role user_role DEFAULT 'user', -- Role for RBAC
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure existing customers have a role if they don't
ALTER TABLE customers ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';
UPDATE customers SET role = 'user' WHERE role IS NULL;

-- 3. SHIPPING ZONES SYSTEM (Clean Reset for these specific tables)
------------------------------------------------------------------
-- We drop these and recreate to ensure columns like 'rate' exist and match the seed
DROP TABLE IF EXISTS shipping_zone_states CASCADE;
DROP TABLE IF EXISTS shipping_zones CASCADE;

-- Create Zones Table (UUID based)
CREATE TABLE shipping_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  rate NUMERIC DEFAULT 0,
  free_threshold NUMERIC DEFAULT 0,
  is_international BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Map States to Zones
CREATE TABLE shipping_zone_states (
  id SERIAL PRIMARY KEY,
  zone_id UUID REFERENCES shipping_zones(id) ON DELETE CASCADE,
  state_name TEXT UNIQUE NOT NULL
);

-- 4. ORDER SYSTEM ENHANCEMENTS (Additive only)
------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zone_id UUID REFERENCES shipping_zones(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- 5. SEED DATA (CORE FUNCTIONALITY)
------------------------------------------------------------------
-- Insert Shipping Zones and States (Local -> TN, South, Rest of India, Intl)
DO $$ 
DECLARE
  local_id UUID;
  south_id UUID;
  north_id UUID;
  intl_id UUID;
BEGIN
  -- Insert zones and capture IDs
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('Local (Tamil Nadu)', 50, 2000) RETURNING id INTO local_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('South India', 80, 3000) RETURNING id INTO south_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('Rest of India', 120, 5000) RETURNING id INTO north_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold, is_international) 
  VALUES ('International', 1500, 0, TRUE) RETURNING id INTO intl_id;

  -- Map States (Tamil Nadu -> Local)
  INSERT INTO shipping_zone_states (zone_id, state_name) VALUES (local_id, 'Tamil Nadu');
  
  -- South India
  INSERT INTO shipping_zone_states (zone_id, state_name) 
  SELECT south_id, s FROM unnest(ARRAY['Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Puducherry']) s;

  -- Rest of India
  INSERT INTO shipping_zone_states (zone_id, state_name) 
  SELECT north_id, s FROM unnest(ARRAY['Maharashtra', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Haryana', 'Punjab', 'Bihar', 'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Chandigarh', 'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Arunachal Pradesh', 'Mizoram', 'Sikkim', 'Jammu and Kashmir', 'Ladakh']) s;
END $$;

-- 6. HELPER FUNCTIONS
------------------------------------------------------------------
CREATE OR REPLACE FUNCTION promote_to_admin(phone_num TEXT) 
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET role = 'admin' WHERE phone = phone_num;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- MASTER SCHEMA REPAIRED & UPDATED!
-- ════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- UPDATES FOR ZONE-BASED SHIPPING (UUID COMPATIBLE)
-- ════════════════════════════════════════════════════════════════
-- This script uses UUIDs to remain compatible with the project standard.

-- 1. Enable extension for UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if they were created with wrong types
DROP TABLE IF EXISTS shipping_zone_states;
DROP TABLE IF EXISTS shipping_zones;

-- 3. Create table for Shipping Zones
CREATE TABLE shipping_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  rate NUMERIC DEFAULT 0,
  free_threshold NUMERIC DEFAULT 0,
  is_international BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create table for mapping states to zones
CREATE TABLE shipping_zone_states (
  id SERIAL PRIMARY KEY,
  zone_id UUID REFERENCES shipping_zones(id) ON DELETE CASCADE,
  state_name TEXT UNIQUE NOT NULL
);

-- 5. Update Orders table (Drop column if it was INT, then add as UUID)
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_zone_id;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_zone_id UUID REFERENCES shipping_zones(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;

-- 6. Seed initial zones (using variable names to handle UUIDs)
DO $$ 
DECLARE
  local_id UUID;
  south_id UUID;
  north_id UUID;
  intl_id UUID;
BEGIN
  -- Insert and get IDs
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('Local (Tamil Nadu)', 50, 2000) RETURNING id INTO local_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('South India', 80, 3000) RETURNING id INTO south_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold) 
  VALUES ('Rest of India', 120, 5000) RETURNING id INTO north_id;
  
  INSERT INTO shipping_zones (name, rate, free_threshold, is_international) 
  VALUES ('International', 1500, 0, TRUE) RETURNING id INTO intl_id;

  -- Map states
  INSERT INTO shipping_zone_states (zone_id, state_name) VALUES (local_id, 'Tamil Nadu');
  
  INSERT INTO shipping_zone_states (zone_id, state_name) 
  SELECT south_id, s FROM unnest(ARRAY['Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Puducherry']) s;

  INSERT INTO shipping_zone_states (zone_id, state_name) 
  SELECT north_id, s FROM unnest(ARRAY['Maharashtra', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Haryana', 'Punjab', 'Bihar', 'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Chandigarh', 'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Arunachal Pradesh', 'Mizoram', 'Sikkim', 'Jammu and Kashmir', 'Ladakh']) s;
END $$;
-- ════════════════════════════════════════════════════════════════
-- SHIPPING ZONES & RATES SCHEMA
-- ════════════════════════════════════════════════════════════════

-- 1. Create table for Shipping Zones
CREATE TABLE IF NOT EXISTS shipping_zones (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  rate NUMERIC DEFAULT 0,
  free_threshold NUMERIC DEFAULT 0,
  is_international BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create table for mapping states to zones
CREATE TABLE IF NOT EXISTS shipping_zone_states (
  id SERIAL PRIMARY KEY,
  zone_id INT REFERENCES shipping_zones(id) ON DELETE CASCADE,
  state_name TEXT UNIQUE NOT NULL
);

-- 3. Seed some default zones
INSERT INTO shipping_zones (name, rate, free_threshold) VALUES 
('Local (Tamil Nadu)', 50, 2000),
('South India', 80, 3000),
('Rest of India', 120, 5000),
('International', 1500, 0)
ON CONFLICT (name) DO NOTHING;

-- Map states to zones (approximate)
-- Tamil Nadu -> Local
INSERT INTO shipping_zone_states (zone_id, state_name) 
SELECT id, 'Tamil Nadu' FROM shipping_zones WHERE name = 'Local (Tamil Nadu)'
ON CONFLICT (state_name) DO NOTHING;

-- South India (exclude TN)
INSERT INTO shipping_zone_states (zone_id, state_name) 
SELECT id, s FROM shipping_zones, unnest(ARRAY['Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Puducherry']) s 
WHERE name = 'South India'
ON CONFLICT (state_name) DO NOTHING;

-- Rest of India
INSERT INTO shipping_zone_states (zone_id, state_name) 
SELECT id, s FROM shipping_zones, unnest(ARRAY['Maharashtra', 'Gujarat', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Madhya Pradesh', 'Haryana', 'Punjab', 'Bihar', 'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Chandigarh', 'Tripura', 'Meghalaya', 'Manipur', 'Nagaland', 'Arunachal Pradesh', 'Mizoram', 'Sikkim', 'Jammu and Kashmir', 'Ladakh']) s 
WHERE name = 'Rest of India'
ON CONFLICT (state_name) DO NOTHING;
-- Update CMS Pages Table with Advanced Features
ALTER TABLE public.cms_pages 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.cms_pages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS featured_image TEXT,
ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS menu_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft', -- draft, published, scheduled
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public', -- public, private, password
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT,
ADD COLUMN IF NOT EXISTS canonical_url TEXT,
ADD COLUMN IF NOT EXISTS custom_css TEXT,
ADD COLUMN IF NOT EXISTS custom_js TEXT,
ADD COLUMN IF NOT EXISTS publish_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Add RLS policy for parent_id if needed
-- Existing policies should cover the new columns since they are on the same table.
-- ════════════════════════════════════════════════════════════════
-- UPDATES FOR WHATSAPP OTP LOGIN AND TAXATION SYSTEM
-- ════════════════════════════════════════════════════════════════

-- 1. Create OTPS table for WhatsApp Login
CREATE TABLE IF NOT EXISTS otps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for phone number to speed up lookups
CREATE INDEX IF NOT EXISTS idx_otps_phone ON otps(phone);

-- 2. Update Orders table for Taxation and Shipping Tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- 3. Create Customers table (Optional but good for persistent accounts)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Migration to support Product Variants
-- 1. Add type to products (simple or variant)
ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'simple';

-- 2. Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "Color: Red"
  price NUMERIC,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update whatsapp_cart to support variants
ALTER TABLE whatsapp_cart ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE whatsapp_cart ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- 4. Update order_items to support variants
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;
-- ════════════════════════════════════════════════════════════════
-- WHATSAPP CONFIGURABLE SETTINGS
-- ════════════════════════════════════════════════════════════════

-- Create generic settings table for app-wide configurations
create table if not exists app_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamp with time zone default now()
);

-- Insert default WhatsApp Configurations
insert into app_settings (key, value, description) values
('wa_welcome_message', '🌸 *Welcome to Aiswarya Sarees Premium* 🌸\n\nHow may we assist you today?', 'Main greeting message sent on Hi/Menu'),
('wa_welcome_image', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85', 'Image URL for the welcome message'),
('wa_contact_message', '📞 *Contact Support*\n\nFor assistance, please call us at:\n+91 75581 89732\n\nOr email:\nsupport@aiswaryatextiles.com', 'Contact support message'),
('wa_checkout_msg', '📝 *Checkout Confirmation*\n\nPlease reply with your *Full Name and Address* in a single message to confirm delivery.\n\nExample:\nLakshmi, 12 Main St, Bangalore 560001', 'Instructions for new address input'),
('wa_catalog_header', 'PREMIUM COLLECTIONS', 'Header for the main catalog list'),
('wa_catalog_body', 'Curated just for you:', 'Body text for the main catalog list')
on conflict (key) do nothing;
