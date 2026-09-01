import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const { phone, code, country_code } = await req.json();

        if (!phone || !code) {
            return NextResponse.json({ error: 'Phone and Code are required' }, { status: 400 });
        }

        const rawDigits = String(phone || '').trim().replace(/\D/g, '');
        const selectedCountryCode = (country_code || '+91').trim();
        const formattedCountryCode = selectedCountryCode.startsWith('+') ? selectedCountryCode : `+${selectedCountryCode}`;
        
        // Canonical 10-digit phone for India (+91), or full digits for international
        const clean10 = (selectedCountryCode === '+91' || selectedCountryCode === '91') ? rawDigits.slice(-10) : rawDigits;
        const fullPhoneWith91 = `91${clean10}`;
        const phoneVariations = [...new Set([clean10, fullPhoneWith91, `+91${clean10}`, rawDigits].filter(Boolean))];

        console.log(`[AUTH] Verifying WhatsApp OTP for variations:`, phoneVariations, `with code:`, code);

        // 1. Check if Code exists in otps table and not expired
        const { data: otpList, error: dbError } = await mysqlClient
            .from('otps')
            .select('*')
            .in('phone', phoneVariations)
            .eq('code', String(code).trim())
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
            // Pick customer with most complete profile data (has name/email/address), or oldest
            customerRecord = existingCustomers.find(c => Boolean(c.name || c.email || c.address)) || existingCustomers[0];

            if (Boolean(customerRecord?.is_locked)) {
                return NextResponse.json({ 
                    error: 'Your account has been locked by administration. Please contact customer support.',
                    is_locked: true
                }, { status: 403 });
            }

            // Normalize their phone to clean 10-digit number & update last login
            await mysqlClient
                .from('customers')
                .update({
                    phone: clean10,
                    country_code: customerRecord.country_code || formattedCountryCode,
                    is_verified: true,
                    last_login: new Date().toISOString()
                })
                .eq('id', customerRecord.id);

            // Clean up any empty duplicate customer records created with '91...'
            if (existingCustomers.length > 1) {
                const duplicateIds = existingCustomers.filter(c => c.id !== customerRecord.id).map(c => c.id);
                if (duplicateIds.length > 0) {
                    for (const dupId of duplicateIds) {
                        try {
                            // Re-assign any orders from duplicate to main customer
                            await mysqlClient.from('orders').update({ customer_id: customerRecord.id }).eq('customer_id', dupId);
                            // Delete duplicate customer record
                            await mysqlClient.from('customers').delete().eq('id', dupId);
                        } catch (mergeErr) {
                            console.warn('[AUTH] Customer merge notice:', mergeErr);
                        }
                    }
                }
            }
        } else {
            // 4. If no customer exists at all, insert new persistent customer account
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

        // Full Customer Profile Payload for client pre-fill
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

        // 5. Set Session Cookie
        const response = NextResponse.json({
            success: true,
            message: 'Logged in successfully',
            user: customerProfile
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
            response.cookies.set('user_session', clean10, cookieOptions);
        }

        return response;

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
