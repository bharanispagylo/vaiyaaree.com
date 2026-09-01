import { NextResponse } from 'next/server';

/**
 * Rate Limiter for Authentication & Sensitive Endpoints
 * Prevents brute-force credential attacks, spam registration, and OTP flooding.
 */

// In-memory bucket store mapping key -> { count, expiresAt }
const rateLimitStore = new Map();

// Periodic cleanup every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of rateLimitStore.entries()) {
            if (record.expiresAt <= now) {
                rateLimitStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);

    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }
}

/**
 * Extracts Client IP address from request headers.
 */
export function getClientIp(req) {
    if (!req || !req.headers) return '127.0.0.1';

    const headers = req.headers;
    if (typeof headers.get === 'function') {
        const xForwardedFor = headers.get('x-forwarded-for');
        if (xForwardedFor) {
            return xForwardedFor.split(',')[0].trim();
        }
        const xRealIp = headers.get('x-real-ip');
        if (xRealIp) return xRealIp.trim();
        const cfConnectingIp = headers.get('cf-connecting-ip');
        if (cfConnectingIp) return cfConnectingIp.trim();
    }

    return '127.0.0.1';
}

/**
 * Check and record a rate limit attempt.
 * @param {string} prefix - Scope identifier (e.g. 'admin_login', 'customer_login', 'customer_register', 'reset_password')
 * @param {string} identifier - Unique client key (IP + email/phone/username)
 * @param {number} maxAttempts - Allowed attempts within window (default: 5)
 * @param {number} windowMs - Window duration in milliseconds (default: 60000 = 1 min)
 * @returns {{ success: boolean, remaining: number, resetInSeconds: number }}
 */
export function checkRateLimit(prefix, identifier, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    const key = `${prefix}:${identifier || 'guest'}`;

    let record = rateLimitStore.get(key);

    if (!record || record.expiresAt <= now) {
        record = { count: 1, expiresAt: now + windowMs };
        rateLimitStore.set(key, record);
        return {
            success: true,
            remaining: maxAttempts - 1,
            resetInSeconds: Math.ceil(windowMs / 1000)
        };
    }

    record.count += 1;

    if (record.count > maxAttempts) {
        const resetInSeconds = Math.ceil((record.expiresAt - now) / 1000);
        return {
            success: false,
            remaining: 0,
            resetInSeconds: Math.max(1, resetInSeconds)
        };
    }

    return {
        success: true,
        remaining: maxAttempts - record.count,
        resetInSeconds: Math.ceil((record.expiresAt - now) / 1000)
    };
}

/**
 * Convenience middleware function for API routes.
 * Returns a 429 response if rate limited, or null if allowed.
 */
export function enforceRateLimit(req, prefix, identifierExtra = '', maxAttempts = 5, windowMs = 60000) {
    const clientIp = getClientIp(req);
    const identifier = `${clientIp}:${identifierExtra}`;
    const result = checkRateLimit(prefix, identifier, maxAttempts, windowMs);

    if (!result.success) {
        return NextResponse.json(
            { 
                error: `Too many attempts. Please try again in ${result.resetInSeconds} seconds.`,
                retryAfter: result.resetInSeconds
            }, 
            { 
                status: 429,
                headers: {
                    'Retry-After': String(result.resetInSeconds)
                }
            }
        );
    }

    return null;
}
