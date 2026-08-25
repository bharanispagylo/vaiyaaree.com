import { NextResponse } from 'next/server';
import { executeMysqlQuery } from '@/lib/mysqlQueryEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/db
 * Core database API — receives MySQL-style query payloads from client-side
 * and executes them directly against MySQL.
 * DO NOT add WhatsApp or other webhook logic here.
 * WhatsApp webhook is at /api/whatsapp/webhook
 */
export async function POST(request) {
    try {
        const text = await request.text();
        if (!text || text.trim() === '') {
            return NextResponse.json({ data: null, error: null });
        }
        const payload = JSON.parse(text);
        const result = await executeMysqlQuery(payload);
        return NextResponse.json(result);
    } catch (error) {
        console.error('[API /api/db Error]:', error);
        return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
    }
}
