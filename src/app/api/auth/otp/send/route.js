import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { sendText } from '@/services/whatsappService';
import { randomUUID } from 'crypto';

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

        // 0. Rate Limiting Cooldown Check (120s)
        const [lastOtpRows] = await pool.query(
            'SELECT created_at, TIMESTAMPDIFF(SECOND, created_at, NOW()) AS diff_seconds FROM otps WHERE phone = ? ORDER BY created_at DESC LIMIT 1',
            [cleanPhone]
        );

        if (lastOtpRows && lastOtpRows.length > 0) {
            const diffSeconds = lastOtpRows[0].diff_seconds;
            if (diffSeconds !== null && diffSeconds < 120) {
                return NextResponse.json({ 
                    error: `Please wait ${120 - diffSeconds} seconds before requesting a new code.` 
                }, { status: 429 });
            }
        }

        // 1. Generate 6-digit random OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const id = randomUUID();

        console.log(`[AUTH] Sending Dynamic OTP: ${otp} to ${cleanPhone}`);

        // 2. Delete previous OTPs for this phone
        await pool.query('DELETE FROM otps WHERE phone = ?', [cleanPhone]);
        
        // 3. Store OTP using MySQL server clock
        await pool.query(
            'INSERT INTO otps (id, phone, code, expires_at, created_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())',
            [id, cleanPhone, otp]
        );

        // 4. Send via WhatsApp Service
        const waMsg = ` *Your Vaiyaaree Login Code*\n\nYour verification code is: *${otp}*\n\nPlease enter this on the website to continue. Code expires in 10 minutes.`;
        const waResult = await sendText(cleanPhone, waMsg);

        if (waResult?.error) {
            console.error('[AUTH] WhatsApp Dispatch Failed:', waResult.error);
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
