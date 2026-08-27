import { NextResponse } from 'next/server';
import crypto from 'crypto';
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

// ─────────────────────────────────────────────────────────────────────────────
// GET: Fetch Customers with Search, Filter & Aggregated Order Stats
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const search = (searchParams.get('search') || '').trim();
        const filter = (searchParams.get('filter') || 'ALL').toUpperCase(); // ALL, ORDERED, UNORDERED

        const offset = (page - 1) * limit;

        // Base where clauses for search
        const searchConditions = [];
        const searchParamsList = [];

        if (search) {
            searchConditions.push('(`name` LIKE ? OR `phone` LIKE ? OR `email` LIKE ?)');
            const wildcard = `%${search}%`;
            searchParamsList.push(wildcard, wildcard, wildcard);
        }

        // Fetch all registered customers matching search
        let queryStr = 'SELECT `id`, `name`, `phone`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `admin_notes` FROM `customers`';
        if (searchConditions.length > 0) {
            queryStr += ' WHERE ' + searchConditions.join(' AND ');
        }
        queryStr += ' ORDER BY `created_at` DESC';

        const [customerRows] = await pool.query(queryStr, searchParamsList);

        // Collect all normalized phones to query orders
        const phoneList = [];
        customerRows.forEach(c => {
            const norm = normalizePhone(c.phone);
            if (norm) {
                phoneList.push(norm);
                const digits10 = norm.slice(-10);
                phoneList.push(digits10);
                phoneList.push(`+${norm}`);
            }
        });
        const uniquePhones = [...new Set(phoneList.filter(Boolean))];

        let orderRows = [];
        if (uniquePhones.length > 0) {
            const placeholders = uniquePhones.map(() => '?').join(',');
            const [orders] = await pool.query(
                `SELECT * FROM \`orders\` WHERE \`status\` != 'DRAFT' AND \`customer_phone\` IN (${placeholders}) ORDER BY \`created_at\` DESC`,
                uniquePhones
            );
            orderRows = orders;
        }

        // Build customer aggregated data map
        const customerMap = {};
        customerRows.forEach(cust => {
            const normPhone = normalizePhone(cust.phone) || cust.phone || cust.id;
            customerMap[normPhone] = {
                id: cust.id,
                name: cust.name || 'Customer',
                phone: cust.phone || '',
                email: cust.email || '',
                address: cust.address || '',
                city: cust.city || '',
                state: cust.state || '',
                pincode: cust.pincode || '',
                hasPassword: Boolean(cust.admin_notes && (cust.admin_notes.includes('pwd') || cust.admin_notes.includes('password'))),
                totalOrders: 0,
                totalSpent: 0,
                created_at: cust.created_at,
                lastOrder: cust.created_at,
                lastAddress: cust.address || '',
                orders: []
            };
        });

        // Aggregate orders per customer
        orderRows.forEach(order => {
            const normPhone = normalizePhone(order.customer_phone);
            if (normPhone && customerMap[normPhone]) {
                customerMap[normPhone].totalOrders += 1;
                customerMap[normPhone].totalSpent += (Number(order.total_amount) || 0);
                customerMap[normPhone].orders.push(order);
                if (new Date(order.created_at) > new Date(customerMap[normPhone].lastOrder)) {
                    customerMap[normPhone].lastOrder = order.created_at;
                }
                if (order.customer_name && !['WhatsApp Customer', 'Website User'].includes(order.customer_name)) {
                    customerMap[normPhone].name = order.customer_name;
                }
                if (order.delivery_address && !customerMap[normPhone].lastAddress) {
                    customerMap[normPhone].lastAddress = order.delivery_address;
                }
            }
        });

        let allAggregated = Object.values(customerMap);

        // Apply Status Filter
        if (filter === 'ORDERED') {
            allAggregated = allAggregated.filter(c => c.totalOrders > 0);
        } else if (filter === 'UNORDERED') {
            allAggregated = allAggregated.filter(c => c.totalOrders === 0);
        }

        // Sort by total spent descending
        allAggregated.sort((a, b) => b.totalSpent - a.totalSpent);

        const totalCount = allAggregated.length;
        const paginatedList = allAggregated.slice(offset, offset + limit);

        // Calculate general statistics
        const [totalCountRow] = await pool.query('SELECT COUNT(*) as total FROM `customers`');
        const totalCustomers = totalCountRow[0]?.total || 0;
        const orderedCount = Object.values(customerMap).filter(c => c.totalOrders > 0).length;
        const unorderedCount = Math.max(0, totalCustomers - orderedCount);
        const repeatCount = Object.values(customerMap).filter(c => c.totalOrders > 1).length;
        const totalRevenue = Object.values(customerMap).reduce((sum, c) => sum + c.totalSpent, 0);
        const averageSpend = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

        return NextResponse.json({
            success: true,
            customers: paginatedList,
            totalCount,
            page,
            limit,
            stats: {
                totalCustomers,
                averageSpend,
                repeatCustomers: repeatCount,
                orderedCustomers: orderedCount,
                unorderedCustomers: unorderedCount
            }
        });

    } catch (error) {
        console.error('[ADMIN-CUSTOMERS-GET-ERROR]', error);
        return NextResponse.json({ error: 'Failed to fetch customers: ' + error.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Create New Customer with Optional Email and Initial Password
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        const body = await req.json();
        const { name, phone, email, address, password } = body;

        if (!name?.trim() || !phone?.trim()) {
            return NextResponse.json({ error: 'Full Name and Phone Number are required.' }, { status: 400 });
        }

        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone || normalizedPhone.length < 10) {
            return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number.' }, { status: 400 });
        }

        const cleanEmail = (email || '').trim().toLowerCase();
        if (cleanEmail && !cleanEmail.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        // Check if customer already exists with this phone
        const phone10 = normalizedPhone.slice(-10);
        const phone12 = `91${phone10}`;
        const [existing] = await pool.query(
            'SELECT `id` FROM `customers` WHERE `phone` IN (?, ?) LIMIT 1',
            [phone10, phone12]
        );

        if (existing.length > 0) {
            return NextResponse.json({ error: 'A customer with this phone number already exists.' }, { status: 409 });
        }

        const newId = crypto.randomUUID ? crypto.randomUUID() : `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        let adminNotes = null;
        if (password && password.trim().length >= 6) {
            const hashed = hashPassword(password.trim());
            adminNotes = JSON.stringify({ pwd: hashed });
        }

        await pool.query(
            `INSERT INTO \`customers\` (\`id\`, \`phone\`, \`name\`, \`email\`, \`address\`, \`role\`, \`admin_notes\`, \`is_verified\`, \`created_at\`, \`updated_at\`)
             VALUES (?, ?, ?, ?, ?, 'user', ?, 1, NOW(), NOW())`,
            [newId, phone12, name.trim(), cleanEmail || null, (address || '').trim() || null, adminNotes]
        );

        // Also add address record if address provided
        if (address && address.trim()) {
            const addrId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await pool.query(
                `INSERT INTO \`customer_addresses\` (\`id\`, \`customer_id\`, \`name\`, \`phone\`, \`address\`, \`is_default\`, \`created_at\`)
                 VALUES (?, ?, ?, ?, ?, '1', NOW())`,
                [addrId, newId, name.trim(), phone12, address.trim()]
            );
        }

        return NextResponse.json({
            success: true,
            id: newId,
            message: 'Customer added successfully!'
        });

    } catch (error) {
        console.error('[ADMIN-CUSTOMERS-POST-ERROR]', error);
        return NextResponse.json({ error: 'Failed to create customer: ' + error.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT: Update Existing Customer Profile (Name, Email, Address)
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, phone, name, email, address } = body;

        if (!id && !phone) {
            return NextResponse.json({ error: 'Customer ID or Phone Number is required.' }, { status: 400 });
        }

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Customer Name cannot be empty.' }, { status: 400 });
        }

        const cleanEmail = (email || '').trim().toLowerCase();
        if (cleanEmail && !cleanEmail.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        let query = 'UPDATE `customers` SET `name` = ?, `email` = ?, `address` = ?, `updated_at` = NOW() WHERE ';
        const params = [name.trim(), cleanEmail || null, (address || '').trim() || null];

        if (id) {
            query += '`id` = ?';
            params.push(id);
        } else {
            const norm = normalizePhone(phone);
            const phone10 = norm.slice(-10);
            const phone12 = `91${phone10}`;
            query += '`phone` IN (?, ?)';
            params.push(phone10, phone12);
        }

        const [result] = await pool.query(query, params);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Customer profile updated successfully!'
        });

    } catch (error) {
        console.error('[ADMIN-CUSTOMERS-PUT-ERROR]', error);
        return NextResponse.json({ error: 'Failed to update customer: ' + error.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE: Delete Single or Multi-Selected Customers
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(req) {
    try {
        const body = await req.json();
        const { ids, phones } = body;

        const idList = Array.isArray(ids) ? ids.filter(Boolean) : (ids ? [ids] : []);
        const phoneList = Array.isArray(phones) ? phones.filter(Boolean) : (phones ? [phones] : []);

        if (idList.length === 0 && phoneList.length === 0) {
            return NextResponse.json({ error: 'Please specify customer IDs or phone numbers to delete.' }, { status: 400 });
        }

        // Expand phone list to include 10 and 12-digit variants
        const expandedPhones = [];
        phoneList.forEach(p => {
            const norm = normalizePhone(p);
            if (norm) {
                expandedPhones.push(norm.slice(-10));
                expandedPhones.push(`91${norm.slice(-10)}`);
            }
        });

        // 1. Find all customer IDs to be deleted for cascading
        let matchedCustomerIds = [...idList];
        if (expandedPhones.length > 0) {
            const placeholders = expandedPhones.map(() => '?').join(',');
            const [rows] = await pool.query(
                `SELECT \`id\` FROM \`customers\` WHERE \`phone\` IN (${placeholders})`,
                expandedPhones
            );
            rows.forEach(r => matchedCustomerIds.push(r.id));
        }
        matchedCustomerIds = [...new Set(matchedCustomerIds.filter(Boolean))];

        if (matchedCustomerIds.length === 0 && expandedPhones.length === 0) {
            return NextResponse.json({ error: 'No matching customers found to delete.' }, { status: 404 });
        }

        // 2. Cascade delete customer addresses
        if (matchedCustomerIds.length > 0) {
            const placeholders = matchedCustomerIds.map(() => '?').join(',');
            await pool.query(`DELETE FROM \`customer_addresses\` WHERE \`customer_id\` IN (${placeholders})`, matchedCustomerIds);
        }

        // 3. Clear customer OTPs
        if (expandedPhones.length > 0) {
            const placeholders = expandedPhones.map(() => '?').join(',');
            await pool.query(`DELETE FROM \`otps\` WHERE \`phone\` IN (${placeholders})`, expandedPhones);
        }

        // 4. Delete from customers table
        let deleteQuery = 'DELETE FROM `customers` WHERE ';
        const deleteParams = [];
        const orClauses = [];

        if (matchedCustomerIds.length > 0) {
            orClauses.push(`\`id\` IN (${matchedCustomerIds.map(() => '?').join(',')})`);
            deleteParams.push(...matchedCustomerIds);
        }
        if (expandedPhones.length > 0) {
            orClauses.push(`\`phone\` IN (${expandedPhones.map(() => '?').join(',')})`);
            deleteParams.push(...expandedPhones);
        }

        deleteQuery += orClauses.join(' OR ');
        const [delResult] = await pool.query(deleteQuery, deleteParams);

        return NextResponse.json({
            success: true,
            deletedCount: delResult.affectedRows,
            message: `${delResult.affectedRows} customer(s) deleted successfully.`
        });

    } catch (error) {
        console.error('[ADMIN-CUSTOMERS-DELETE-ERROR]', error);
        return NextResponse.json({ error: 'Failed to delete customer(s): ' + error.message }, { status: 500 });
    }
}
