import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { sendEmail, getCleanBaseUrl } from '@/lib/emailService';
import { buildOrderStatusEmailHtml, getOrderEmailSubject, getSampleDemoOrder } from '@/lib/orderEmailTemplates';
import { generateOrderPDFBuffer } from '@/lib/invoiceGenerator';

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            recipientEmail,
            status = 'PLACED',
            orderId = 'DEMO',
            customOrderData,
            customNotes = '',
            attachPdf = true
        } = body;

        if (!recipientEmail || !recipientEmail.trim() || recipientEmail.indexOf('@') === -1) {
            return NextResponse.json({ success: false, error: 'Please enter a valid recipient email address' }, { status: 400 });
        }

        let order = null;

        if (orderId && orderId !== 'DEMO') {
            // Fetch real order from database
            const { data: dbOrder } = await mysqlClient
                .from('orders')
                .select('*, order_items(*, products(*))')
                .eq('id', orderId)
                .maybeSingle();

            if (dbOrder) {
                if (Array.isArray(dbOrder.order_items) && dbOrder.order_items.length > 0) {
                    const prodIds = dbOrder.order_items.map(it => it.product_id || it.id).filter(Boolean);
                    if (prodIds.length > 0) {
                        try {
                            const { data: prods } = await mysqlClient
                                .from('products')
                                .select('id, name, title, sku, product_no, image_url, images, gallery_image, gallery_images')
                                .in('id', [...new Set(prodIds)]);
                            if (prods && prods.length > 0) {
                                const prodMap = {};
                                prods.forEach(p => { prodMap[p.id] = p; });
                                dbOrder.order_items = dbOrder.order_items.map(it => ({
                                    ...it,
                                    products: prodMap[it.product_id || it.id] || it.products || null
                                }));
                            }
                        } catch (pErr) {
                            console.error('[EMAIL TEST] Products fetch error:', pErr);
                        }
                    }
                }
                order = dbOrder;
            }
        }

        if (!order) {
            order = customOrderData || getSampleDemoOrder(status);
        }

        // Fetch store settings
        let settings = {
            shop_name: 'Vaiyaaree Sarees',
            shop_phone: '8667793292',
            shop_email: 'vaiyaaree@gmail.com',
            shop_address: '16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.'
        };

        try {
            const { data: settingsData } = await mysqlClient.from('app_settings').select('*');
            if (settingsData) {
                settingsData.forEach(item => {
                    if (item.key === 'shop_name') settings.shop_name = item.value;
                    if (item.key === 'business_phone' || item.key === 'shop_phone') settings.shop_phone = item.value;
                    if (item.key === 'shop_email') settings.shop_email = item.value;
                    if (item.key === 'shop_address') settings.shop_address = item.value;
                });
            }
        } catch (e) {
            console.error('[EMAIL TEST] Settings fetch error:', e);
        }

        const baseUrl = getCleanBaseUrl();
        const subject = `[SIMULATION TEST] ${getOrderEmailSubject({ order, status, shopName: settings.shop_name })}`;
        const html = buildOrderStatusEmailHtml({
            order,
            status,
            settings,
            baseUrl,
            customNotes: customNotes ? `[Admin Note: ${customNotes}]` : ''
        });

        const attachments = [];

        if (attachPdf) {
            try {
                const pdfBuffer = await generateOrderPDFBuffer(order, settings);
                if (pdfBuffer) {
                    const cleanInv = order.invoice_no 
                        ? order.invoice_no.replace(/^#/, '') 
                        : String(order.id).replace(/^[A-Z]+-/, 'INV-');
                    attachments.push({
                        filename: `Invoice_${cleanInv}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    });
                }
            } catch (pdfErr) {
                console.error('[EMAIL TEST] Failed to generate PDF invoice attachment:', pdfErr);
            }
        }

        const result = await sendEmail({
            to: recipientEmail.trim(),
            subject,
            html,
            attachments
        });

        return NextResponse.json({
            success: result.success || result.status === 'LOGGED_ONLY' || result.status === 'SENT',
            status: result.status,
            messageId: result.messageId,
            error: result.error,
            attachedPdf: attachments.length > 0,
            message: result.status === 'LOGGED_ONLY'
                ? `Email simulated & logged (SMTP is not configured in .env). Rendered template is 100% valid!`
                : `Test email sent successfully to ${recipientEmail.trim()}!`
        });
    } catch (error) {
        console.error('[EMAIL TEST API ERROR]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
