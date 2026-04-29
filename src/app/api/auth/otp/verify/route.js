import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


export async function POST(req) {
    try {
        const { phone, otp, role } = await req.json();

        if (!phone || !otp) return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });

        // Clean phone
        let cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        // 1. Verify against DB (table: otps)
        const { data: otpData, error: dbError } = await supabase
            .from('otps')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('code', otp)
            .gte('expires_at', new Date().toISOString())
            .single();

        if (dbError || !otpData) {
            console.warn(`[AUTH] Failed verification for ${cleanPhone}: Incorrect or expired code.`);
            // SECURITY: Artificial delay to prevent brute-force (slow down bots)
            await new Promise(resolve => setTimeout(resolve, 2000));
            return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 401 });
        }

        // 2. Clear used OTP
        await supabase.from('otps').delete().eq('phone', cleanPhone);

        // 3. Get or Create Customer
        let { data: customer } = await supabase.from('customers').select('*').eq('phone', cleanPhone).single();

        if (!customer) {
            const { data: newCustomer, error: insertError } = await supabase.from('customers').insert({
                phone: cleanPhone,
                name: 'Valued Customer',
                role: 'user',
                is_verified: true,
                last_login: new Date().toISOString()
            }).select().single();

            if (insertError) {
                console.error('[AUTH] Customer creation error:', insertError);
                return NextResponse.json({ error: 'Failed to create customer account' }, { status: 500 });
            }
            customer = newCustomer;
        } else {
            // Update existing customer
            await supabase.from('customers').update({ 
                is_verified: true,
                last_login: new Date().toISOString()
            }).eq('id', customer.id);
        }

        // Final role check
        if (role === 'admin' && customer.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            customer: customer,
            redirect: customer.role === 'admin' ? '/admin/dashboard' : '/shop'
        });

    } catch (error) {
        console.error('Verify Error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}

