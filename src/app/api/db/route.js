import { NextResponse } from 'next/server';
import { executeMysqlQuery } from '@/lib/mysqlQueryEngine';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Tables strictly restricted to authenticated administrators
const RESTRICTED_TABLES = new Set([
    'admin_users',
    'otps',
    'audit_logs',
    'email_logs',
    'notification_logs',
    'order_backups',
    'scheduled_posts',
    'customers'
]);

// Sensitive keys in app_settings that must never be exposed to public/unauthenticated callers
const SENSITIVE_SETTING_PATTERN = /(password|secret|salt|token|otp|pin|smtp|wa_access|access_token|private)/i;

/**
 * Checks if a requested filter in app_settings targets a sensitive key.
 */
function hasSensitiveFilter(filters) {
    if (!Array.isArray(filters)) return false;
    for (const f of filters) {
        if (f && (f.col === 'key' || f.col === '`key`')) {
            if (typeof f.val === 'string' && SENSITIVE_SETTING_PATTERN.test(f.val)) {
                return true;
            }
            if (Array.isArray(f.val)) {
                if (f.val.some(v => typeof v === 'string' && SENSITIVE_SETTING_PATTERN.test(v))) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Sanitizes app_settings result rows to remove sensitive secrets for unauthenticated requests.
 */
function sanitizeAppSettingsResult(result) {
    if (!result || !result.data) return result;
    if (Array.isArray(result.data)) {
        result.data = result.data.filter(row => !row || !row.key || !SENSITIVE_SETTING_PATTERN.test(String(row.key)));
    } else if (typeof result.data === 'object') {
        if (result.data.key && SENSITIVE_SETTING_PATTERN.test(String(result.data.key))) {
            result.data = null;
        }
    }
    return result;
}

/**
 * POST /api/db
 * Core database API — executes client queries with strict authorization.
 * Authenticated admins have full query/mutation access.
 * Unauthenticated callers are strictly restricted to read-only queries on public catalog tables.
 */
export async function POST(request) {
    try {
        const text = await request.text();
        if (!text || text.trim() === '') {
            return NextResponse.json({ data: null, error: null });
        }
        const payload = JSON.parse(text);

        const auth = await verifyAdmin(request);
        const isAdmin = auth.authorized;

        // Security enforcement for unauthenticated callers
        if (!isAdmin) {
            const operation = (payload.operation || 'select').toLowerCase();
            const table = (payload.table || '').toLowerCase();

            // 1. Block all mutations (INSERT, UPDATE, DELETE, UPSERT)
            if (operation !== 'select') {
                return NextResponse.json(
                    { data: null, error: { message: 'Unauthorized: Admin authentication required for database mutations' } },
                    { status: 403 }
                );
            }

            // 2. Block restricted internal/sensitive tables
            if (RESTRICTED_TABLES.has(table)) {
                return NextResponse.json(
                    { data: null, error: { message: `Unauthorized: Access to table "${payload.table}" requires administrator credentials` } },
                    { status: 403 }
                );
            }

            // 3. Block queries specifically asking for sensitive app_settings keys
            if (table === 'app_settings' && hasSensitiveFilter(payload.filters)) {
                return NextResponse.json(
                    { data: null, error: { message: 'Unauthorized: Access to sensitive system settings requires administrator credentials' } },
                    { status: 403 }
                );
            }

            // Execute read query and sanitize if app_settings
            const result = await executeMysqlQuery(payload);
            if (table === 'app_settings') {
                sanitizeAppSettingsResult(result);
            }
            return NextResponse.json(result);
        }

        // Authenticated admin: execute full query
        const result = await executeMysqlQuery(payload);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[API /api/db Error]:', error);
        return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
    }
}
