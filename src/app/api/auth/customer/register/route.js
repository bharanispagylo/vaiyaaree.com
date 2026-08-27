import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { hashPassword } from '@/lib/hash';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, phone, country_code, password } = body;

        // 1. Validation Checks
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Please enter your Full Name.' }, { status: 400 });
        }
        if (!email || !email.trim() || !email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid Email Address.' }, { status: 400 });
        }

        const selectedCountryCode = (country_code || '+91').trim();
        const rawDigits = (phone || '').replace(/\D/g, '');
        // For +91 (India), check 10 digits; for international numbers allow 7-15 digits
        const cleanPhone = (selectedCountryCode === '+91' || selectedCountryCode === '91')
            ? rawDigits.slice(-10)
            : rawDigits;

        if (!cleanPhone || cleanPhone.length < 7 || (selectedCountryCode === '+91' && cleanPhone.length !== 10)) {
            return NextResponse.json({ error: 'Please enter a valid Mobile Number.' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const fullPhoneWith91 = `91${cleanPhone}`;

        // 2. Check for Duplicate Email
        const { data: existingEmail } = await mysqlClient
            .from('customers')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (existingEmail) {
            return NextResponse.json({ error: 'An account with this email address already exists. Please log in.' }, { status: 400 });
        }

        // 3. Check for Duplicate Phone (check both pure phone and 91+phone for backward compatibility)
        const { data: existingPhone } = await mysqlClient
            .from('customers')
            .select('id')
            .or(`phone.eq.${cleanPhone},phone.eq.${fullPhoneWith91}`)
            .maybeSingle();

        if (existingPhone) {
            return NextResponse.json({ error: 'An account with this mobile number already exists. Please log in.' }, { status: 400 });
        }

        // 4. Hash Password & Store JSON Payload in admin_notes
        const hashedPassword = hashPassword(password);
        const notesPayload = JSON.stringify({ pwd: hashedPassword });

        // 5. Insert New Customer (storing only clean mobile in phone, and country_code in country_code)
        const formattedCountryCode = selectedCountryCode.startsWith('+') ? selectedCountryCode : `+${selectedCountryCode}`;
        const { data: newCustomer, error: insertErr } = await mysqlClient
            .from('customers')
            .insert({
                name: name.trim(),
                email: normalizedEmail,
                phone: cleanPhone,
                country_code: formattedCountryCode,
                role: 'user',
                is_verified: true,
                admin_notes: notesPayload
            })
            .select()
            .single();

        if (insertErr || !newCustomer) {
            console.error('[CUSTOMER-REGISTER] Insert error:', insertErr);
            return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
        }

        const customerSession = {
            id: newCustomer.id,
            name: newCustomer.name,
            email: newCustomer.email,
            phone: newCustomer.phone,
            country_code: newCustomer.country_code || formattedCountryCode,
            role: newCustomer.role || 'user',
            login_at: Date.now()
        };

        return NextResponse.json({
            success: true,
            message: 'Account created successfully!',
            customer: customerSession
        });

    } catch (error) {
        console.error('[CUSTOMER-REGISTER] Fatal error:', error);
        return NextResponse.json({ error: 'Server error. Please try again later.' }, { status: 500 });
    }
}
