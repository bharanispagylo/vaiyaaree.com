import { NextResponse } from 'next/server';
import { notifyOrderSuccess } from '@/services/whatsappService';
import { mysqlClient } from '@/lib/mysqlClient';

export async function POST(req) {
    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
        }

        // Check Store Communication & Auth Channel Gateway
        try {
            const { data: channelSetting } = await mysqlClient
                .from('app_settings')
                .select('value')
                .eq('key', 'communication_channel')
                .maybeSingle();

            const activeChannel = channelSetting?.value || 'whatsapp';
            if (activeChannel === 'email') {
                console.log(`[API] Order notify skipped for #${orderId} because communication channel is set to email`);
                return NextResponse.json({ success: true, skipped: true, channel: 'email' });
            }
        } catch (chanErr) {
            console.warn('[API] Failed to check communication_channel in orders/notify:', chanErr);
        }

        console.log(`[API] Triggering direct notification for order confirmation: #${orderId}`);
        await notifyOrderSuccess(orderId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Order notify error:', error);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
}
