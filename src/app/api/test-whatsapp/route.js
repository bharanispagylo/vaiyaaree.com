import { processIncomingMessage } from '@/services/whatsappService';

export async function POST(request) {
    try {
        const { message, from } = await request.json();
        
        // Simulate a WhatsApp webhook payload
        const simulatedPayload = {
            entry: [{
                changes: [{
                    value: {
                        messages: [{
                            from: from || "919876543210",
                            id: "test_msg_" + Date.now(),
                            timestamp: Math.floor(Date.now() / 1000),
                            text: {
                                body: message
                            },
                            type: "text"
                        }],
                        contacts: [{
                            profile: {
                                name: "Test Customer"
                            }
                        }]
                    }
                }]
            }]
        };

        console.log('🧪 Testing WhatsApp flow with message:', message);
        
        // Process the simulated message
        await processIncomingMessage(simulatedPayload);
        
        return Response.json({ 
            success: true, 
            message: "Test message processed successfully",
            payload: simulatedPayload
        });

    } catch (error) {
        console.error('Test WhatsApp error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
}

export async function GET() {
    return Response.json({ 
        message: "Send a POST request with { message: 'your message', from: 'phone number' } to test WhatsApp flow"
    });
}
