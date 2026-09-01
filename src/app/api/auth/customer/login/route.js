import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { verifyPassword, hashPassword } from '@/lib/hash';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
    try {
        const body = await req.json();
        const { identifier, country_code, password } = body;

        // Rate limiting: max 5 customer login attempts per 1-minute window
        const rateLimitError = enforceRateLimit(req, 'customer_login', identifier || 'guest', 5, 60000);
        if (rateLimitError) return rateLimitError;

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

        // Check if customer account is locked by admin
        if (Boolean(customer.is_locked)) {
            return NextResponse.json({ 
                error: 'Your account has been locked by administration. Please contact customer support for assistance.',
                is_locked: true 
            }, { status: 403 });
        }

        // Read stored password hash from admin_notes JSON or password field
        let storedHash = '';
        let parsedNotes = {};
        if (customer.admin_notes) {
            try {
                parsedNotes = typeof customer.admin_notes === 'string' ? JSON.parse(customer.admin_notes) : customer.admin_notes;
                storedHash = parsedNotes?.pwd || parsedNotes?.password || '';
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

        // Lazy migration: upgrade legacy SHA-256 or plaintext password to PBKDF2
        if (!storedHash.startsWith('pbkdf2:')) {
            const newPbkdf2Hash = hashPassword(password);
            const updatedNotes = JSON.stringify({
                ...(typeof parsedNotes === 'object' && parsedNotes !== null ? parsedNotes : {}),
                pwd: newPbkdf2Hash
            });
            await mysqlClient.from('customers').update({ 
                admin_notes: updatedNotes,
                updated_at: new Date().toISOString()
            }).eq('id', customer.id);
            console.log(`[AUTH] Migrated customer ${customer.email || customer.phone} to PBKDF2 password hash.`);
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
