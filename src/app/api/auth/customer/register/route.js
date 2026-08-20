import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { hashPassword } from '@/lib/hash';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, phone, password } = body;

        // 1. Validation Checks
        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Please enter your Full Name.' }, { status: 400 });
        }
        if (!email || !email.trim() || !email.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid Email Address.' }, { status: 400 });
        }
        const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
            return NextResponse.json({ error: 'Please enter a valid 10-digit Mobile Number.' }, { status: 400 });
        }
        if (!password || password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const fullPhone = `91${cleanPhone}`;

        // 2. Check for Duplicate Email
        const { data: existingEmail } = await supabase
            .from('customers')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (existingEmail) {
            return NextResponse.json({ error: 'An account with this email address already exists. Please log in.' }, { status: 400 });
        }

        // 3. Check for Duplicate Phone
        const { data: existingPhone } = await supabase
            .from('customers')
            .select('id')
            .or(`phone.eq.${cleanPhone},phone.eq.${fullPhone}`)
            .maybeSingle();

        if (existingPhone) {
            return NextResponse.json({ error: 'An account with this mobile number already exists. Please log in.' }, { status: 400 });
        }

        // 4. Hash Password & Store JSON Payload in admin_notes
        const hashedPassword = hashPassword(password);
        const notesPayload = JSON.stringify({ pwd: hashedPassword });

        // 5. Insert New Customer
        const { data: newCustomer, error: insertErr } = await supabase
            .from('customers')
            .insert({
                name: name.trim(),
                email: normalizedEmail,
                phone: fullPhone,
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
