import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { getNextOrderAndInvoiceId } from '@/lib/orderIdGenerator';

// Using MySQL supabase client from @/lib/supabaseClient

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const prefix = searchParams.get('prefix') || 'MAN';

        const { orderId, invoiceNo, seqNum } = await getNextOrderAndInvoiceId(prefix, supabase);
        return Response.json({ success: true, orderId, invoiceNo, seqNum });
    } catch (error) {
        console.error('[API] Failed to generate next order ID:', error);
        return Response.json({ error: 'Failed to generate order ID' }, { status: 500 });
    }
}
