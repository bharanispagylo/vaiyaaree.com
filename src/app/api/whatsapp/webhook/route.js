
// @/app/api/whatsapp/webhook/route.js
/*
  BACKEND API ROUTE: WHATSAPP WEBHOOK
  Receives all webhook events from Meta (WhatsApp).
  Supports Verification (GET) and Event Handling (POST).
*/

import { processIncomingMessage } from '@/services/whatsappService';

// 1. VERIFICATION (Required by Meta)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('hub.mode');
        const token = searchParams.get('hub.verify_token');
        const challenge = searchParams.get('hub.challenge');

        console.log('--- Webhook Verification Request ---');
        console.log(`Mode: ${mode}`);
        console.log(`Token: ${token}`);
        console.log(`Challenge: ${challenge}`);

        // Verify token matches your config
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'castprintz_secret';

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ Webhook Verified Successfully!');
            return new Response(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        console.warn('❌ Webhook Verification Failed: Token mismatch or wrong mode.');
        return new Response('Forbidden', { status: 403 });

    } catch (error) {
        console.error('SERVER ERROR during verification:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

// 2. MESSAGE HANDLING
export async function POST(request) {
    console.log('[WA-WEBHOOK] Webhook hit received.');
    try {
        const body = await request.json();
        console.log('[WA-WEBHOOK] Payload Received:', JSON.stringify(body, null, 2));

        if (!process.env.WHATSAPP_ACCESS_TOKEN) {
            console.error('[WA-WEBHOOK] CRITICAL: WHATSAPP_ACCESS_TOKEN is missing in environment!');
        }

        // Check if this is a WhatsApp message
        if (body.object === 'whatsapp_business_account') {
            const value = body.entry?.[0]?.changes?.[0]?.value;
            const messages = value?.messages;

            // 1. If it's a status update (sent, delivered, read), just acknowledge and exit
            if (value?.statuses) {
                return new Response('STATUS_ACKNOWLEDGED', { status: 200 });
            }

            // 2. If it's a message, process it
            if (messages && messages.length > 0) {
                // We MUST await here on Vercel to ensure the bot has time to reply
                await processIncomingMessage(body);
                return new Response('MESSAGE_PROCESSED', { status: 200 });
            }
            
            return new Response('EVENT_ACKNOWLEDGED', { status: 200 });
        } else {
            return new Response('Not Found', { status: 404 });
        }

    } catch (error) {
        console.error('Webhook Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
