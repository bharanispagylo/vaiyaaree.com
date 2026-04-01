import { sendText } from '@/services/whatsappService';

export async function POST(request) {
    try {
        const { to, otp, orderId } = await request.json();
        
        if (!to || !otp || !orderId) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Send OTP via WhatsApp
        const message = `🔐 *OTP Verification - Cast Printz*\n\n` +
            `Your OTP for cancelling order #${orderId} is:\n\n` +
            `*${otp}*\n\n` +
            `This OTP will expire in 10 minutes.\n\n` +
            `If you didn't request this, please ignore this message.`;

        await sendText(to, message);

        return new Response(JSON.stringify({ success: true, message: 'OTP sent successfully' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        return new Response(JSON.stringify({ error: 'Failed to send OTP' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
