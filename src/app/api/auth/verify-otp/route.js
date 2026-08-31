import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export async function POST(req) {
    try {
        const { phone, code } = await req.json();

        if (!phone || !code) {
            return NextResponse.json({ error: 'Phone and Code are required' }, { status: 400 });
        }

        let cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        console.log(`[AUTH] Verifying OTP for ${cleanPhone} with code ${code}`);

        // 1. Check if Code exists and not expired
        const { data: otpData, error: dbError } = await mysqlClient
            .from('otps')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('code', code)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (dbError || !otpData) {
            return NextResponse.json({ error: 'Invalid or expired code. Please try again.' }, { status: 401 });
        }

        // 2. Clear used OTP
        await mysqlClient.from('otps').delete().eq('phone', cleanPhone);

        // 3. Create/Update user in Customers table (persistent account)
        const { data: customer, error: custError } = await mysqlClient
            .from('customers')
            .upsert({
                phone: cleanPhone,
                is_verified: true,
                last_login: new Date().toISOString()
            }, { onConflict: 'phone' })
            .select()
            .single();

        if (custError) {
            console.error('Customer Creation Error:', custError);
            // Optionally insert if upsert fails
            const { error: insertError } = await mysqlClient
                .from('customers')
                .insert({
                    phone: cleanPhone,
                    is_verified: true,
                    last_login: new Date().toISOString()
                });
            if (insertError) console.error('Customer insert failed:', insertError);
        }

        const isAdmin = customer?.role === 'admin';

        // 4. Set Session Cookie
        const response = NextResponse.json({
            success: true,
            message: 'Logged in successfully',
            user: {
                phone: cleanPhone,
                role: isAdmin ? 'admin' : 'user'
            }
        });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        };

        if (isAdmin) {
            response.cookies.set('admin_session', 'authenticated', cookieOptions);
        } else {
            response.cookies.set('user_session', cleanPhone, cookieOptions);
        }

        return response;

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
