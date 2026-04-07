-- ════════════════════════════════════════════════════════════════
-- ADMIN USERS TABLE SCHEMA
-- ════════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin', -- 'super_admin', 'admin', 'manager'
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by username
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- Row Level Security (Admin only)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Simple policy for full access (assuming we use service_role for backend and anon for testing)
CREATE POLICY "Full access to admin_users" ON admin_users
    FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
