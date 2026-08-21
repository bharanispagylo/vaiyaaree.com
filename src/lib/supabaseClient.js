import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_feSSpEm4OCNKEAB0SOgx0A_nuYPeW-v';
const fallbackServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWdycXhqc29pZG15YWZlYXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTA3OCwiZXhwIjoyMDg2OTYxMDc4fQ.IvgWY8Mu240T4NjpBPwvwHdER-mckkBqUdmMJhIEPTU';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fallbackServiceRoleKey;

if (!supabaseUrl || !supabaseKey) {
    console.warn(' Missing Supabase Environment Variables');
}

// Singleton — prevents creating a new client on every hot-reload
const globalForSupabase = globalThis;

export const supabase = globalForSupabase._supabase ??
    createClient(supabaseUrl || '', supabaseKey || '', {
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        realtime: {
            timeout: 20000,
        },
        db: {
            schema: 'public',
        },
    });

export const supabaseAdmin = globalForSupabase._supabaseAdmin ??
    createClient(supabaseUrl || '', supabaseServiceKey || '', {
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        db: {
            schema: 'public',
        },
    });

if (process.env.NODE_ENV !== 'production') {
    globalForSupabase._supabase = supabase;
    globalForSupabase._supabaseAdmin = supabaseAdmin;
}
