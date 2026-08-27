import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { randomUUID } from 'crypto';

export async function POST(req) {
    try {
        const { phone, otp, role } = await req.json();

        if (!phone || !otp) return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 });

        // Clean phone
        let cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        // 1. Verify against DB (table: otps)
        const [otpRows] = await pool.query(
            'SELECT id, phone, code, expires_at, (expires_at < NOW()) AS is_expired FROM otps WHERE phone = ? AND code = ? LIMIT 1',
            [cleanPhone, String(otp).trim()]
        );

        if (!otpRows || otpRows.length === 0 || Boolean(otpRows[0].is_expired)) {
            console.warn(`[AUTH] Failed verification for ${cleanPhone}: Incorrect or expired code.`);
            // SECURITY: Artificial delay to prevent brute-force (slow down bots)
            await new Promise(resolve => setTimeout(resolve, 1500));
            return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 401 });
        }

        // 2. Clear used OTP
        await pool.query('DELETE FROM otps WHERE phone = ?', [cleanPhone]);

        // 3. Get or Create Customer
        const [custRows] = await pool.query('SELECT * FROM customers WHERE phone = ? LIMIT 1', [cleanPhone]);
        let customer = custRows?.[0] || null;

        if (!customer) {
            const newId = randomUUID();
            await pool.query(
                `INSERT INTO customers (id, phone, name, role, is_verified, last_login, created_at)
                 VALUES (?, ?, 'Valued Customer', 'user', 1, NOW(), NOW())`,
                [newId, cleanPhone]
            );
            const [createdRows] = await pool.query('SELECT * FROM customers WHERE id = ?', [newId]);
            customer = createdRows[0];
        } else {
            // Update existing customer last login
            await pool.query(
                'UPDATE customers SET is_verified = 1, last_login = NOW() WHERE id = ?',
                [customer.id]
            );
            customer.is_verified = 1;
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
