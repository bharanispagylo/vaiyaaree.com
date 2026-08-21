import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

// Using MySQL supabaseAdmin client from @/lib/supabaseClient

/**
 * Verifies if the request is from an authorized admin.
 * Checks for:
 * 1. An 'Authorization' header with a Bearer token (JWT/Simple Secret)
 * 2. A session cookie (if implemented)
 */
export async function verifyAdmin(request) {
    // For now, we will use a simple token check stored in localStorage on the client
    // and passed in the headers. In a full implementation, this should be a JWT.
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.split(' ')[1];
    
    // We expect the token to be the secret key.
    
    // Simple verification:
    const adminToken = process.env.ADMIN_API_SECRET || 'fallback_secret_change_me';
    if (token === adminToken) {
        return { authorized: true };
    }

    return { authorized: false, error: 'Unauthorized: Invalid Token' };
}
