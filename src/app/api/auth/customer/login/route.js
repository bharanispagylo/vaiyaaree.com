import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { verifyPassword } from '@/lib/hash';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { identifier, country_code, password } = body;

        if (!identifier || !identifier.trim()) {
            return NextResponse.json({ error: 'Please enter your Mobile Number or Email address.' }, { status: 400 });
        }
        if (!password || !password.trim()) {
            return NextResponse.json({ error: 'Please enter your Password.' }, { status: 400 });
        }

        const cleanInput = identifier.trim();
        const isEmail = cleanInput.includes('@');
        
        let query = mysqlClient.from('customers').select('*');

        if (isEmail) {
            query = query.eq('email', cleanInput.toLowerCase());
        } else {
            const rawDigits = cleanInput.replace(/\D/g, '');
            if (!rawDigits || rawDigits.length < 7) {
                return NextResponse.json({ error: 'Please enter a valid Mobile Number or Email address.' }, { status: 400 });
            }
            const phone10 = rawDigits.slice(-10);
            const phone12 = `91${phone10}`;
            query = query.or(`phone.eq.${phone10},phone.eq.${phone12},phone.eq.${rawDigits}`);
        }

        const { data: customers, error: fetchErr } = await query;

        if (fetchErr || !customers || customers.length === 0) {
            return NextResponse.json({ error: 'Account not found. Please check your Mobile Number / Email or Create an Account.' }, { status: 401 });
        }

        const customer = customers[0];

        // Read stored password hash from admin_notes JSON or password field
        let storedHash = '';
        if (customer.admin_notes) {
            try {
                const parsed = typeof customer.admin_notes === 'string' ? JSON.parse(customer.admin_notes) : customer.admin_notes;
                storedHash = parsed?.pwd || parsed?.password || '';
            } catch (e) {
                storedHash = customer.admin_notes;
            }
        }

        if (!storedHash) {
            return NextResponse.json({ error: 'No password set for this account. Please use "Forgot Password?" to set your password.' }, { status: 401 });
        }

        const isValid = verifyPassword(password, storedHash);

        if (!isValid) {
            return NextResponse.json({ error: 'Incorrect Password. Please check your password or reset it using "Forgot Password?".' }, { status: 401 });
        }

        // Update last_login
        await mysqlClient.from('customers').update({ last_login: new Date().toISOString() }).eq('id', customer.id);

        const customerSession = {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            country_code: customer.country_code || '+91',
            address: customer.address,
            city: customer.city,
            state: customer.state,
            pincode: customer.pincode,
            role: customer.role || 'user',
            login_at: Date.now()
        };

        return NextResponse.json({
            success: true,
            customer: customerSession
        });

    } catch (error) {
        console.error('[CUSTOMER-LOGIN] Fatal error:', error);
        return NextResponse.json({ error: 'Server error. Please try again later.' }, { status: 500 });
    }
}
