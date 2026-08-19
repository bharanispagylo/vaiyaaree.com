import { supabase } from '@/lib/supabaseClient';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';


export async function POST(request) {
    try {
        const { orderId } = await request.json();
        
        if (!orderId) {
            return new Response(JSON.stringify({ error: 'Order ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- SECURITY: Auth & Ownership Check (Anti-IDOR) ---
        // 1. Check if requester is an admin
        const { verifyAdmin } = await import('@/lib/auth');
        const adminAuth = await verifyAdmin(request);
        
        // 2. Fetch order details (needed for ownership check)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
        }

        if (!order.invoice_no && order.id) {
            order.invoice_no = String(order.id).replace(/^[A-Z]+-/, 'INV-');
        }

        // 3. Ownership Verification
        // If not admin, check if the request provides the correct phone number matching the order
        if (!adminAuth.authorized) {
            const { customerPhone } = await request.json().catch(() => ({}));
            
            // Normalize both for comparison
            const orderPhone = (order.customer_phone || '').replace(/\D/g, '');
            const inputPhone = (customerPhone || '').replace(/\D/g, '');

            if (!inputPhone || !orderPhone.includes(inputPhone)) {
                console.warn(`[INVOICE-SECURITY] Unauthorized attempt to access invoice for ${orderId}`);
                return new Response(JSON.stringify({ error: 'Unauthorized. Please provide the correct phone number used during checkout.' }), { status: 403 });
            }
        }
        // --- End Security Check ---

        // Generate PDF ArrayBuffer
        const pdfArrayBuffer = await generateInvoicePDF(order);
        
        // Convert to Buffer for upload
        const pdfBuffer = Buffer.from(pdfArrayBuffer);
        
        // Upload to Supabase Storage
        const fileName = `invoices/invoice-${orderId}.pdf`;
        const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) {
            console.error('[INVOICE] Upload error:', uploadError);
            throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('invoices')
            .getPublicUrl(fileName);

        // Update order with invoice URL
        await supabase.from('orders').update({ invoice_url: publicUrl }).eq('id', orderId);

        console.log(`[INVOICE] Generated and uploaded: ${publicUrl}`);
        return new Response(JSON.stringify({ 
            success: true, 
            invoiceUrl: publicUrl 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate invoice' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
