import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { username, password } = body;
        
        const VALID_USERNAME = process.env.ADMIN_USERNAME || 'aiswarya';
        const VALID_PASSWORD = process.env.ADMIN_PASSWORD || 'saree2024';

        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            return NextResponse.json({ success: true, role: 'admin' });
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Fatal Login error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
