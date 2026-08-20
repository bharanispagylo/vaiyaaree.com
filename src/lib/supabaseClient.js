import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
            persistSession: false, // Admin portal — no user auth needed
            autoRefreshToken: false,
        },
        realtime: {
            timeout: 20000,
        },
        db: {
            schema: 'public',
        },
    });

if (process.env.NODE_ENV !== 'production') {
    globalForSupabase._supabase = supabase;
}
