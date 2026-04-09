import { processIncomingMessage } from '@/services/whatsappService';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('hub.challenge');
    return new Response(challenge || 'VERIFIED', { status: 200 });
}

export async function POST(request) {
    console.log('>>> WHATSAPP WEBHOOK HIT! <<<');
    console.log('Timestamp:', new Date().toISOString());
    
    try {
        const body = await request.json();
        console.log('=== WEBHOOK PAYLOAD START ===');
        console.log('Full payload:', JSON.stringify(body, null, 2));
        console.log('=== WEBHOOK PAYLOAD END ===');

        // Simplified check
        const value = body?.entry?.[0]?.changes?.[0]?.value;
        const messages = value?.messages;
        
        console.log('Extracted value:', value);
        console.log('Extracted messages:', messages);

        if (messages && messages.length > 0) {
            console.log('MESSAGE RECEIVED:', messages[0].text?.body);
            console.log('MESSAGE TYPE:', messages[0].type);
            console.log('MESSAGE FROM:', messages[0].from);
            
            try {
                await processIncomingMessage(body);
                console.log('✅ processIncomingMessage completed successfully');
            } catch (processError) {
                console.error('❌ processIncomingMessage failed:', processError);
                console.error('Stack trace:', processError.stack);
            }
        } else {
            console.log('⚠️ No messages found in webhook payload');
        }

        return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('❌ WEBHOOK ERROR:', err);
        console.error('Stack trace:', err.stack);
        return new Response('OK', { status: 200 });
    }
}
