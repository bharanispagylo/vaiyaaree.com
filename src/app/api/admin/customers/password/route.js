import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { hashPassword } from '@/lib/hash';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizePhone(input) {
    if (!input) return '';
    const digits = input.toString().replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length > 10) return digits.slice(-10).padStart(12, '91');
    return digits;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { id, phone, newPassword } = body;

        if (!id && !phone) {
            return NextResponse.json({ error: 'Customer ID or Phone Number is required.' }, { status: 400 });
        }

        if (!newPassword || newPassword.trim().length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
        }

        // Find customer
        let customer = null;
        if (id) {
            const [rows] = await pool.query('SELECT `id`, `name`, `phone` FROM `customers` WHERE `id` = ? LIMIT 1', [id]);
            if (rows.length > 0) customer = rows[0];
        }

        if (!customer && phone) {
            const norm = normalizePhone(phone);
            const phone10 = norm.slice(-10);
            const phone12 = `91${phone10}`;
            const [rows] = await pool.query('SELECT `id`, `name`, `phone` FROM `customers` WHERE `phone` IN (?, ?) LIMIT 1', [phone10, phone12]);
            if (rows.length > 0) customer = rows[0];
        }

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
        }

        // Hash new password
        const hashedPassword = hashPassword(newPassword.trim());
        const notesPayload = JSON.stringify({ pwd: hashedPassword });

        await pool.query(
            'UPDATE `customers` SET `admin_notes` = ?, `updated_at` = NOW() WHERE `id` = ?',
            [notesPayload, customer.id]
        );

        return NextResponse.json({
            success: true,
            message: `Password updated successfully for customer "${customer.name || customer.phone}".`
        });

    } catch (error) {
        console.error('[ADMIN-CUSTOMER-PASSWORD-ERROR]', error);
        return NextResponse.json({ error: 'Failed to update customer password: ' + error.message }, { status: 500 });
    }
}
