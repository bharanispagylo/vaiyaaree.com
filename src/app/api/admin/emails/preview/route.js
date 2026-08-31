import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { buildOrderStatusEmailHtml, getOrderEmailSubject, getSampleDemoOrder } from '@/lib/orderEmailTemplates';
import { getCleanBaseUrl } from '@/lib/emailService';

export async function POST(req) {
    try {
        const body = await req.json();
        const { status = 'PLACED', orderId, customOrderData, customNotes = '' } = body;

        let order = null;

        if (orderId && orderId !== 'DEMO') {
            // Fetch real order from database
            const { data: dbOrder } = await mysqlClient
                .from('orders')
                .select('*, order_items(*, products(*))')
                .eq('id', orderId)
                .maybeSingle();

            if (dbOrder) {
                order = dbOrder;
            }
        }

        if (!order) {
            order = customOrderData || getSampleDemoOrder(status);
        }

        // Fetch store settings for email branding
        let settings = {
            shop_name: 'Vaiyaaree Sarees',
            shop_phone: '8667793292',
            shop_email: 'vaiyaaree@gmail.com',
            shop_address: 'Salem Main Road, Komarapalayam, Namakkal, Tamil Nadu, 638183'
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
            console.error('[EMAIL PREVIEW] Settings fetch error:', e);
        }

        const baseUrl = getCleanBaseUrl();
        const subject = getOrderEmailSubject({ order, status, shopName: settings.shop_name });
        const html = buildOrderStatusEmailHtml({
            order,
            status,
            settings,
            baseUrl,
            customNotes
        });

        return NextResponse.json({
            success: true,
            status,
            subject,
            html,
            orderSummary: {
                id: order.id,
                invoice_no: order.invoice_no,
                customer_name: order.customer_name || 'Valued Customer',
                total_amount: order.total_amount,
                items_count: order.order_items?.length || 0
            }
        });
    } catch (error) {
        console.error('[EMAIL PREVIEW API ERROR]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
