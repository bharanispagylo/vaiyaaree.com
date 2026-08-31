import { NextResponse } from 'next/server';
import { executeMysqlQuery } from '@/lib/mysqlQueryEngine';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/db
 * Core database API — receives MySQL-style query payloads from client-side
 * and executes them directly against MySQL.
 * Secured with Admin verification and strict payload validation for sensitive tables.
 */
export async function POST(request) {
    try {
        const text = await request.text();
        if (!text || text.trim() === '') {
            return NextResponse.json({ data: null, error: null });
        }
        const payload = JSON.parse(text);
        const { table, operation, data } = payload;
        
        // --- 1. Security & Authorization Middleware ---
        const isMutation = ['insert', 'update', 'upsert', 'delete'].includes(operation);
        const adminProtectedTables = ['products', 'product_variants', 'categories', 'admin_users', 'cms_pages', 'discount_rules', 'scheduled_posts'];
        
        if (isMutation && adminProtectedTables.includes(table)) {
            const auth = await verifyAdmin(request);
            if (!auth.authorized) {
                return NextResponse.json(
                    { data: null, error: { message: 'Unauthorized operation. Admin access required.' } },
                    { status: 401 }
                );
            }
        }
        
        // --- 2. Data Validation Middleware ---
        if (isMutation && table === 'products' && data) {
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
                // Name validation
                if (item.name !== undefined && (item.name === null || String(item.name).trim() === '')) {
                    return NextResponse.json({ data: null, error: { message: 'Validation Error: Product name cannot be empty.' } }, { status: 400 });
                }
                
                // Price validation
                if (item.price !== undefined && item.price !== null) {
                    const p = Number(item.price);
                    if (isNaN(p) || p < 0) {
                        return NextResponse.json({ data: null, error: { message: 'Validation Error: Product selling price cannot be negative.' } }, { status: 400 });
                    }
                }
                if (item.compare_price !== undefined && item.compare_price !== null) {
                    const cp = Number(item.compare_price);
                    if (isNaN(cp) || cp < 0) {
                        return NextResponse.json({ data: null, error: { message: 'Validation Error: Product regular price (MRP) cannot be negative.' } }, { status: 400 });
                    }
                }
                
                // Stock validation
                if (item.stock !== undefined && item.stock !== null) {
                    const s = Number(item.stock);
                    if (isNaN(s) || s < 0) {
                        return NextResponse.json({ data: null, error: { message: 'Validation Error: Product stock cannot be negative.' } }, { status: 400 });
                    }
                }
            }
        }

        const result = await executeMysqlQuery(payload);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[API /api/db Error]:', error);
        return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
    }
}
