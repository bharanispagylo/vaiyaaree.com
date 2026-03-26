import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const text = await req.text();
        console.log('Raw body:', text);

        if (!text) {
            return NextResponse.json({ error: 'Empty body' }, { status: 400 });
        }

        let body;
        try {
            body = JSON.parse(text);
        } catch (e) {
            console.error('Manual JSON parse error:', e);
            return NextResponse.json({ error: 'Invalid JSON: ' + e.message, received: text }, { status: 400 });
        }

        const { username, password } = body;
        const VALID_USERNAME = 'castprintz';
        const VALID_PASSWORD = 'saree2024';

        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            return NextResponse.json({ success: true, role: 'admin' });
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Fatal Login error:', error);
        return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
    }
}
