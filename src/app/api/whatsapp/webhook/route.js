import { processIncomingMessage } from '@/services/whatsappService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'vaiyaaree_secret';
    const legacyToken = 'aiswarya_secret';

    if (mode === 'subscribe' && (token === verifyToken || token === legacyToken)) {
        console.log(' WEBHOOK VERIFIED SUCCESSFULLY!');
        return new Response(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    if (challenge && (!token || token === verifyToken)) {
        return new Response(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    console.error(' WEBHOOK VERIFICATION FAILED: Token mismatch or invalid mode');
    return new Response('Forbidden', { status: 403 });
}

export async function POST(request) {
    console.log('>>> WHATSAPP WEBHOOK HIT! <<<');
    console.log('Timestamp:', new Date().toISOString());
    
    try {
        const body = await request.json();
        console.log('=== WEBHOOK PAYLOAD START ===');
        console.log('Full payload:', JSON.stringify(body, null, 2));
        console.log('=== WEBHOOK PAYLOAD END ===');

        // Separate handling for WhatsApp message status updates (sent, delivered, read)
        const value = body?.entry?.[0]?.changes?.[0]?.value;
        const statuses = value?.statuses;
        const messages = value?.messages;

        if (statuses && statuses.length > 0) {
            console.log(`[WA-STATUS] Status update received for ${statuses.length} message(s). Status: ${statuses[0]?.status}`);
            return new Response('OK', { status: 200 });
        }

        if (messages && messages.length > 0) {
            const msg = messages[0];
            const msgText = msg.text?.body || msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || msg.button?.text || msg.type;
            console.log('MESSAGE RECEIVED:', msgText);
            console.log('MESSAGE TYPE:', msg.type);
            console.log('MESSAGE FROM:', msg.from);
            
            try {
                await processIncomingMessage(body);
                console.log(' processIncomingMessage completed successfully');
            } catch (processError) {
                console.error(' processIncomingMessage failed:', processError);
                console.error('Stack trace:', processError.stack);
            }
        } else {
            console.log(' No messages found in webhook payload');
        }

        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error(' WEBHOOK ERROR:', err);
        console.error('Stack trace:', err.stack);
        return new Response('OK', { status: 200 });
    }
}
