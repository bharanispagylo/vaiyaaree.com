import { createClient } from '@supabase/supabase-js';
import { getNextOrderAndInvoiceId } from '@/lib/orderIdGenerator';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
