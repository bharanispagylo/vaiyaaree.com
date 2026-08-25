import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';
import { getNextOrderAndInvoiceId } from '@/lib/orderIdGenerator';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const prefix = searchParams.get('prefix') || 'MAN';

        const { orderId, invoiceNo, seqNum } = await getNextOrderAndInvoiceId(prefix, mysqlClient);
        return Response.json({ success: true, orderId, invoiceNo, seqNum });
    } catch (error) {
        console.error('[API] Failed to generate next order ID:', error);
        return Response.json({ error: 'Failed to generate order ID' }, { status: 500 });
    }
}
