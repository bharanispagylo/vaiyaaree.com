import { NextResponse } from 'next/server';
import { mysqlAdmin } from '@/lib/mysqlClient';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await mysqlAdmin
            .from('courier_companies')
            .select('id, name, code, tracking_url_template, is_active')
            .eq('is_active', 1)
            .order('name', { ascending: true });

        if (error) {
            console.error('[GET /api/returns/couriers] DB error:', error);
            // Fallback default list if database fails
            const fallback = [
                { id: 1, name: 'India Post', code: 'POST' },
                { id: 2, name: 'DTDC', code: 'DTDC' },
                { id: 3, name: 'Delhivery', code: 'DELHIVERY' },
                { id: 4, name: 'Blue Dart', code: 'BLUEDART' },
                { id: 5, name: 'Professional Couriers', code: 'TPC' },
                { id: 6, name: 'Ecom Express', code: 'ECOM' },
                { id: 7, name: 'Ekart', code: 'EKART' },
                { id: 8, name: 'Other', code: 'OTHER' },
            ];
            return NextResponse.json(fallback);
        }

        return NextResponse.json(data || []);
    } catch (err) {
        console.error('[GET /api/returns/couriers]', err);
        return NextResponse.json({ error: 'Failed to fetch couriers' }, { status: 500 });
    }
}
