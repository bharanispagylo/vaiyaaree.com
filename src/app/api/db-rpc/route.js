import { NextResponse } from 'next/server';
import { executeMysqlRpc } from '@/lib/mysqlQueryEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
    try {
        const text = await request.text();
        if (!text || text.trim() === '') {
            return NextResponse.json({ data: null, error: { message: 'Empty body' } }, { status: 400 });
        }
        const { fn, params } = JSON.parse(text);
        if (!fn) {
            return NextResponse.json({ data: null, error: { message: 'RPC function name is required' } }, { status: 400 });
        }
        const result = await executeMysqlRpc(fn, params || {});
        return NextResponse.json(result);
    } catch (error) {
        console.error('[API /api/db-rpc Error]:', error);
        return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
    }
}
