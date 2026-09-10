import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { phone, email, identifier, code, country_code } = body;

        const rawTarget = (email || phone || identifier || '').trim();
        const rawCode = String(code || '').trim();

        if (!rawTarget || !rawCode) {
            return NextResponse.json({ error: 'Verification target and OTP code are required.' }, { status: 400 });
        }

        const isEmailTarget = rawTarget.includes('@');

        // ─────────────────────────────────────────────────────────────────────────────
        // FLOW A: EMAIL OTP VERIFICATION
        // ─────────────────────────────────────────────────────────────────────────────
        if (isEmailTarget) {
            const cleanEmail = rawTarget.toLowerCase();

            // 1. Check if Code exists in otps table and not expired
            const { data: otpList, error: dbError } = await mysqlClient
                .from('otps')
                .select('*')
                .eq('phone', cleanEmail)
                .eq('code', rawCode)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1);

            const otpData = Array.isArray(otpList) ? otpList[0] : otpList;
            if (dbError || !otpData) {
                return NextResponse.json({ error: 'Invalid or expired OTP code. Please try again.' }, { status: 401 });
            }

            // 2. Clear used OTP
            await mysqlClient.from('otps').delete().eq('phone', cleanEmail);

            // 3. Find or Create Customer with this email
            const { data: existingCustomers } = await mysqlClient
                .from('customers')
                .select('*')
                .eq('email', cleanEmail)
                .limit(1);

            let customerRecord = Array.isArray(existingCustomers) && existingCustomers.length > 0 ? existingCustomers[0] : null;

            if (customerRecord) {
                if (Boolean(customerRecord.is_locked)) {
                    return NextResponse.json({ 
                        error: 'Your account has been locked by administration. Please contact customer support.',
                        is_locked: true
                    }, { status: 403 });
                }

                await mysqlClient
                    .from('customers')
                    .update({
                        is_verified: true,
                        last_login: new Date().toISOString()
                    })
                    .eq('id', customerRecord.id);
            } else {
                // Insert new customer account with verified email
                const { data: newCustomer, error: insertError } = await mysqlClient
                    .from('customers')
                    .insert({
                        email: cleanEmail,
                        name: cleanEmail.split('@')[0],
                        is_verified: true,
                        role: 'user',
                        last_login: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error('[AUTH-EMAIL] Customer insert error:', insertError);
                }

                customerRecord = newCustomer || {
                    id: `cust_${Date.now()}`,
                    email: cleanEmail,
                    name: cleanEmail.split('@')[0],
                    role: 'user'
                };
            }

            const customerProfile = {
                id: customerRecord.id,
                name: customerRecord.name || '',
                email: cleanEmail,
                phone: customerRecord.phone || '',
                country_code: customerRecord.country_code || '+91',
                address: customerRecord.address || '',
                city: customerRecord.city || '',
                state: customerRecord.state || 'Tamil Nadu',
                pincode: customerRecord.pincode || '',
                role: customerRecord.role || 'user',
                login_at: Date.now()
            };

            const response = NextResponse.json({
                success: true,
                message: 'Logged in successfully via Email',
                user: customerProfile,
                customer: customerProfile,
                channel: 'email'
            });

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7,
                path: '/'
            };
            response.cookies.set('user_session', cleanEmail, cookieOptions);
            return response;
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // FLOW B: PHONE / WHATSAPP OTP VERIFICATION
        // ─────────────────────────────────────────────────────────────────────────────
        const rawDigits = String(rawTarget).replace(/\D/g, '');
        const selectedCountryCode = (country_code || '+91').trim();
        const formattedCountryCode = selectedCountryCode.startsWith('+') ? selectedCountryCode : `+${selectedCountryCode}`;
        
        const clean10 = (selectedCountryCode === '+91' || selectedCountryCode === '91') ? rawDigits.slice(-10) : rawDigits;
        const fullPhoneWith91 = `91${clean10}`;
        const phoneVariations = [...new Set([clean10, fullPhoneWith91, `+91${clean10}`, rawDigits].filter(Boolean))];

        console.log(`[AUTH] Verifying WhatsApp OTP for variations:`, phoneVariations, `with code:`, rawCode);

        // 1. Check if Code exists in otps table and not expired
        const { data: otpList, error: dbError } = await mysqlClient
            .from('otps')
            .select('*')
            .in('phone', phoneVariations)
            .eq('code', rawCode)
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1);

        const otpData = Array.isArray(otpList) ? otpList[0] : otpList;

        if (dbError || !otpData) {
            return NextResponse.json({ error: 'Invalid or expired OTP code. Please try again.' }, { status: 401 });
        }

        // 2. Clear used OTP from DB
        await mysqlClient.from('otps').delete().in('phone', phoneVariations);

        // 3. Find existing customer in Customers table (checking all phone variations)
        const { data: existingCustomers } = await mysqlClient
            .from('customers')
            .select('*')
            .in('phone', phoneVariations)
            .order('created_at', { ascending: true });

        let customerRecord = null;

        if (Array.isArray(existingCustomers) && existingCustomers.length > 0) {
            customerRecord = existingCustomers.find(c => Boolean(c.name || c.email || c.address)) || existingCustomers[0];

            if (Boolean(customerRecord?.is_locked)) {
                return NextResponse.json({ 
                    error: 'Your account has been locked by administration. Please contact customer support.',
                    is_locked: true
                }, { status: 403 });
            }

            await mysqlClient
                .from('customers')
                .update({
                    phone: clean10,
                    country_code: customerRecord.country_code || formattedCountryCode,
                    is_verified: true,
                    last_login: new Date().toISOString()
                })
                .eq('id', customerRecord.id);

            if (existingCustomers.length > 1) {
                const alternateIds = existingCustomers.filter(c => c.id !== customerRecord.id).map(c => c.id);
                if (alternateIds.length > 0) {
                    for (const altId of alternateIds) {
                        try {
                            await mysqlClient.from('orders').update({ customer_id: customerRecord.id }).eq('customer_id', altId);
                        } catch (mergeErr) {
                            console.warn('[AUTH] Customer order consolidation notice:', mergeErr);
                        }
                    }
                }
            }
        } else {
            // 4. Insert new customer account
            const { data: newCustomer, error: insertError } = await mysqlClient
                .from('customers')
                .insert({
                    phone: clean10,
                    country_code: formattedCountryCode,
                    is_verified: true,
                    role: 'user',
                    last_login: new Date().toISOString()
                })
                .select()
                .single();

            if (insertError) {
                console.error('[AUTH] Customer insert error:', insertError);
            }
            customerRecord = newCustomer || {
                id: `cust_${clean10}`,
                phone: clean10,
                country_code: formattedCountryCode,
                role: 'user'
            };
        }

        const isAdmin = customerRecord?.role === 'admin' || customerRecord?.role === 'Super Admin';

        const customerProfile = {
            id: customerRecord.id,
            name: customerRecord.name || '',
            email: customerRecord.email || '',
            phone: clean10,
            country_code: customerRecord.country_code || formattedCountryCode,
            address: customerRecord.address || '',
            city: customerRecord.city || '',
            state: customerRecord.state || 'Tamil Nadu',
            pincode: customerRecord.pincode || '',
            role: customerRecord.role || 'user',
            login_at: Date.now()
        };

        const response = NextResponse.json({
            success: true,
            message: 'Logged in successfully via WhatsApp',
            user: customerProfile,
            customer: customerProfile,
            channel: 'whatsapp'
        });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        };

        if (isAdmin) {
            response.cookies.set('admin_session', 'authenticated', cookieOptions);
        } else {
            response.cookies.set('user_session', clean10, cookieOptions);
        }

        return response;

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
