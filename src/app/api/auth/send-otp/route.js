import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendText } from '@/services/whatsappService';

export async function POST(req) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        // Clean phone number (strip spaces, ensure 10-12 digits)
        let cleanPhone = phone.trim().replace(/\s+/g, '').replace('+', '').replace(/\D/g, '');
        
        // Ensure 91 prefix for 10-digit Indian numbers
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }

        if (cleanPhone.length < 12) {
            return NextResponse.json({ error: 'Invalid phone number format. Please include country code.' }, { status: 400 });
        }

        // 1. Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[AUTH-DEBUG] Attempting to send OTP: ${otpCode} to ${cleanPhone}`);
        

        // 2. Set expiry (10 minutes from now)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        console.log(`[AUTH] Generating OTP ${otpCode} for ${cleanPhone}`);

        // 3. Store OTP in DB (overwrite existing for this phone)
        const { error: dbError } = await supabase
            .from('otps')
            .upsert({
                phone: cleanPhone,
                code: otpCode,
                expires_at: expiresAt
            }, { onConflict: 'phone' });

        if (dbError) {
            console.error('[AUTH] DB OTP Error:', dbError);
            return NextResponse.json({ error: 'Failed to generate verification code' }, { status: 500 });
        }

        // 4. Send OTP via WhatsApp Service (Simplified and Robust)
        const message = ` *Vaiyaaree* \n\nYour verification code is: *${otpCode}*\n\nThis code expires in 10 minutes. Please do not share it with anyone.`;

        const waResult = await sendText(cleanPhone, message);

        if (waResult?.error) {
            console.error('[AUTH] WhatsApp Send Failed:', waResult.error);
            return NextResponse.json({ error: 'Failed to send WhatsApp message. Check Vercel logs for [WA-DEBUG].' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });

    } catch (error) {
        console.error('Send OTP Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
