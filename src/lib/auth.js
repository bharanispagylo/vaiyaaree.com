import crypto from 'crypto';

const SESSION_SECRET = process.env.ADMIN_API_SECRET || process.env.META_APP_SECRET || 'vaiyaaree_secure_admin_session_key_2026';
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Formats a raw database role into a user-friendly display string.
 * e.g., 'super_admin' -> 'Super Admin', 'manager' -> 'Manager', 'admin' -> 'Admin'
 */
export function formatAdminRole(role) {
    if (!role) return 'Admin';
    const r = String(role).trim().toLowerCase();
    if (r === 'super_admin' || r === 'super admin') return 'Super Admin';
    if (r === 'manager') return 'Manager';
    if (r === 'admin' || r === 'administrator') return 'Admin';
    return r.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Creates a signed, user-bound session token for an admin user.
 */
export function createAdminSessionToken(user) {
    if (!user || typeof user !== 'object') return null;

    const payload = {
        userId: user.id || user.userId || '',
        username: user.username || '',
        email: user.email || '',
        role: user.role || 'admin',
        full_name: user.full_name || user.fullName || user.username || 'Admin User',
        iat: Date.now(),
        exp: Date.now() + TOKEN_EXPIRY_MS
    };

    const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');
    return `adm_session_${b64Payload}.${signature}`;
}

/**
 * Parses and cryptographically verifies an admin session token.
 */
export function parseAdminSessionToken(token) {
    if (!token || typeof token !== 'string' || !token.startsWith('adm_session_')) {
        return null;
    }

    try {
        const raw = token.slice('adm_session_'.length);
        const dotIndex = raw.lastIndexOf('.');
        if (dotIndex === -1) return null;

        const b64Payload = raw.slice(0, dotIndex);
        const signature = raw.slice(dotIndex + 1);

        const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('base64url');
        if (signature !== expectedSig) {
            return null;
        }

        const jsonStr = Buffer.from(b64Payload, 'base64url').toString('utf-8');
        const data = JSON.parse(jsonStr);

        if (data.exp && Date.now() > Number(data.exp)) {
            return null; // Expired
        }

        return data;
    } catch (e) {
        return null;
    }
}

/**
 * Verifies if the request is from an authorized admin.
 * Checks for:
 * 1. An 'Authorization' header with Bearer user session token (signed)
 * 2. Dedicated master static secret (strictly for system crons / background tasks)
 */
export async function verifyAdmin(request) {
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]?.trim();
    } else {
        token = request.headers.get('x-admin-token')?.trim();
    }

    if (!token) {
        return { authorized: false, error: 'Missing or invalid authorization header' };
    }

    // 1. Validate signed admin session token
    if (token.startsWith('adm_session_')) {
        const sessionUser = parseAdminSessionToken(token);
        if (sessionUser) {
            return { authorized: true, user: sessionUser };
        }
        return { authorized: false, error: 'Session expired or invalid signature' };
    }

    // 2. Validate master static secret (used ONLY by backend system tasks/crons when ADMIN_API_SECRET is explicitly configured)
    const adminSecret = process.env.ADMIN_API_SECRET;
    if (adminSecret && token === adminSecret) {
        return { authorized: true, isMasterSecret: true };
    }

    return { authorized: false, error: 'Unauthorized: Invalid Token' };
}

