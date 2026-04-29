import { createClient } from '@supabase/supabase-js';
import { sendText } from '@/services/whatsappService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
    try {
        const { to, orderId } = await request.json();
        
        if (!to || !orderId) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Clean phone number
        let cleanPhone = to.trim().replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        // 2. Cooldown check (60s)
        const { data: lastOtp } = await supabase
            .from('otps')
            .select('created_at')
            .eq('phone', cleanPhone)
            .maybeSingle();

        if (lastOtp) {
            const lastSent = new Date(lastOtp.created_at).getTime();
            const diff = (Date.now() - lastSent) / 1000;
            if (diff < 60) {
                return new Response(JSON.stringify({ error: `Please wait ${Math.ceil(60 - diff)}s before resending.` }), { status: 429 });
            }
        }

        // 3. Generate OTP on server
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // 4. Store in DB
        await supabase.from('otps').delete().eq('phone', cleanPhone);
        await supabase.from('otps').insert({
            phone: cleanPhone,
            code: otp,
            expires_at: expiresAt
        });

        // 5. Send via WhatsApp
        const message = `🔐 *Order Cancellation - Cast Printz*\n\n` +
            `Your verification code for order #${orderId} is:\n\n` +
            `*${otp}*\n\n` +
            `This code is valid for 10 minutes.`;

        await sendText(cleanPhone, message);

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
