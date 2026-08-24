import { processExchangeDispatch } from '@/services/returnService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { returnRequestId, courierName, trackingNumber, notes, adminUser } = body;

        if (!returnRequestId || !courierName || !trackingNumber) {
            return new Response(JSON.stringify({ success: false, error: 'returnRequestId, courierName, and trackingNumber are required' }), { status: 400 });
        }

        const result = await processExchangeDispatch({
            returnRequestId,
            courierName,
            trackingNumber,
            notes,
            adminUser: adminUser || 'admin'
        });

        if (!result.success) {
            return new Response(JSON.stringify(result), { status: 400 });
        }

        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        console.error('[API /api/returns/exchange-ship Error]:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}
