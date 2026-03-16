import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendText } from '@/services/whatsappService';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


export async function POST(req) {
    try {
        const { phone } = await req.json();

        if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 });

        // Clean phone number (strip non-digits, ensure 91 prefix)
        let cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        if (cleanPhone.length < 12) {
            return NextResponse.json({ error: 'Invalid phone number format. Please include country code.' }, { status: 400 });
        }

        // 1. Generate 6-digit random OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        console.log(`[AUTH] Sending Dynamic OTP: ${otp} to ${cleanPhone}`);

        // 3. Store OTP in database (table: otps)
        // First delete any previous OTP for this phone to avoid duplicates
        await supabase.from('otps').delete().eq('phone', cleanPhone);
        
        const { error: dbError } = await supabase
            .from('otps')
            .insert({
                phone: cleanPhone,
                code: otp,
                expires_at: expiresAt
            });

        if (dbError) {
            console.error('[AUTH] DB OTP Save Error:', dbError.message);
            return NextResponse.json({ 
                error: 'Failed to generate verification code', 
                debug: dbError.message 
            }, { status: 500 });
        }

        // 3. Send via WhatsApp Service
        const waMsg = `💮 *Your Caste Print Login Code*\n\nYour verification code is: *${otp}*\n\nPlease enter this on the website to continue. Code expires in 10 minutes.`;
        const waResult = await sendText(cleanPhone, waMsg);

        if (waResult?.error) {
            console.error('[AUTH] WhatsApp Dispatch Failed:', waResult.error);
            // Return the specific error for debugging
            return NextResponse.json({ 
                error: `WhatsApp Error: ${waResult.error}`,
                details: waResult.full
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'OTP sent successfully to your WhatsApp' 
        });

    } catch (error) {
        console.error('OTP Send Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

