import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ status: 'ok' });
}

