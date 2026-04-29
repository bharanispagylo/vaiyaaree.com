import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        
        if (auth.authorized) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
