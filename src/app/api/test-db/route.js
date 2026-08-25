import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const [rows] = await pool.query('SELECT 1 AS connected');
        return NextResponse.json({
            success: true,
            database: rows,
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || '3306',
            user: process.env.DB_USER || 'root',
            dbname: process.env.DB_NAME || 'vaiyaaree_db'
        });
    } catch (error) {
        console.error('[MYSQL TEST-DB ERROR]', {
            code: error.code,
            message: error.message,
            errno: error.errno,
            syscall: error.syscall,
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || '3306',
            database: process.env.DB_NAME || 'vaiyaaree_db'
        });
        return NextResponse.json(
            {
                success: false,
                error: error.code || 'DB_ERROR',
                message: error.message,
                host: process.env.DB_HOST || '127.0.0.1',
                port: process.env.DB_PORT || '3306'
            },
            { status: 500 }
        );
    }
}
