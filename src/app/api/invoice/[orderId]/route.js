import { mysqlClient } from '@/lib/mysqlClient';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';
import { verifyAdmin } from '@/lib/auth';

export async function generateOrderPDFBuffer(order) {
    const arrayBuffer = await generateInvoicePDF(order);
    return Buffer.from(arrayBuffer);
}

export async function GET(request, context) {
    try {
        const params = context?.params;
        const resolvedParams = params && typeof params.then === 'function' ? await params : (params || {});
        let orderId = resolvedParams?.orderId;
        if (!orderId) {
            const match = new URL(request.url).pathname.match(/\/api\/invoice\/([^\/\?]+)/);
            if (match) orderId = match[1];
        }

        if (!orderId) {
            return new Response('Order ID is required', { status: 400 });
        }

        const { data: order, error: orderError } = await mysqlClient
            .from('orders')
            .select('*, order_items(*), order_discounts(*)')
            .eq('id', String(orderId).toUpperCase())
            .single();

        if (orderError || !order) {
            console.error('[INVOICE] Order not found:', orderId, orderError?.message);
            return new Response('Order not found', { status: 404 });
        }

        if (!order.invoice_no && order.id) {
            order.invoice_no = String(order.id).replace(/^[A-Z]+-/, 'INV-');
        }

        // --- SECURITY: Phone Verification or Verified Admin ---
        const url = new URL(request.url);
        const inputPhone = url.searchParams.get('phone');
        
        // Allow if it's a verified admin OR if the customer phone matches
        const adminCheck = await verifyAdmin(request);
        const isAdmin = adminCheck.authorized;
        const orderPhone = (order.customer_phone || order.billing_phone || '').replace(/\D/g, '');
        const normalizedInput = (inputPhone || '').replace(/\D/g, '');

        if (!isAdmin && (!inputPhone || (!orderPhone.includes(normalizedInput) && !normalizedInput.includes(orderPhone)))) {
            return new Response(`Unauthorized. Please provide the correct phone number associated with this order. (Received: ${inputPhone || 'none'})`, { status: 401 });
        }
        // --- End Security ---

        const pdfBuffer = await generateOrderPDFBuffer(order);

        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Invoice_${orderId}.pdf"`,
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('[INVOICE] Error generating invoice:', error);
        return new Response(`Invoice generation failed: ${error.message}`, { status: 500 });
    }
}
