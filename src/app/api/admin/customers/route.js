import { NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/mysql';
import { hashPassword } from '@/lib/hash';
import { saveCustomerAddress, ensureCustomerAddressesTable } from '@/services/customerAddressService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function cleanMobileDigits(input) {
    if (!input) return '';
    return input.toString().replace(/\D/g, '');
}

let metadataChecked = false;
async function ensureCustomerMetadataColumn() {
    if (metadataChecked) return;
    try {
        const [cols] = await pool.query('DESCRIBE `customers`');
        const colNames = cols.map(c => c.Field);
        if (!colNames.includes('metadata')) {
            await pool.query('ALTER TABLE `customers` ADD COLUMN `metadata` TEXT DEFAULT NULL');
        }
        metadataChecked = true;
    } catch (e) {
        console.error('[ENSURE-METADATA-ERROR]', e);
    }
}

function parseAddressObject(raw, defaultName = '', defaultPhone = '', defaultEmail = '') {
    if (!raw) return null;
    let obj = raw;
    if (typeof raw === 'string' && raw.trim().startsWith('{')) {
        try { obj = JSON.parse(raw); } catch (e) { obj = null; }
    }
    if (typeof obj === 'object' && obj !== null) {
        return {
            name: obj.name || obj.full_name || defaultName || '',
            phone: obj.phone || obj.mobile || defaultPhone || '',
            whatsapp: obj.whatsapp || obj.billing_whatsapp || obj.billingWhatsApp || obj.phone || '',
            email: obj.email || defaultEmail || '',
            address: obj.address || obj.address_line || obj.street || '',
            city: obj.city || '',
            state: obj.state || '',
            pincode: obj.pincode || obj.postal_code || obj.zip || '',
            country: obj.country || 'India'
        };
    }
    return {
        name: defaultName || '',
        phone: defaultPhone || '',
        whatsapp: defaultPhone || '',
        email: defaultEmail || '',
        address: String(raw).trim(),
        city: '',
        state: '',
        pincode: '',
        country: 'India'
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Fetch Customers with Search, Filter & Aggregated Order Stats + Full Addresses
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req) {
    try {
        await ensureCustomerMetadataColumn();
        await ensureCustomerAddressesTable();

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
        let queryStr = 'SELECT `id`, `name`, `phone`, `country_code`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `admin_notes`, `metadata` FROM `customers`';
        if (searchConditions.length > 0) {
            queryStr += ' WHERE ' + searchConditions.join(' AND ');
        }
        queryStr += ' ORDER BY `created_at` DESC';

        const [customerRows] = await pool.query(queryStr, searchParamsList);

        // Collect all phones to query orders
        const phoneList = [];
        customerRows.forEach(c => {
            const raw = cleanMobileDigits(c.phone);
            if (raw) {
                phoneList.push(raw);
                phoneList.push(raw.slice(-10));
                phoneList.push(`91${raw.slice(-10)}`);
                phoneList.push(`+91${raw.slice(-10)}`);
                if (c.country_code) {
                    phoneList.push(`${c.country_code}${raw}`);
                    phoneList.push(`${c.country_code.replace('+', '')}${raw}`);
                }
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

        // Build customer aggregated data map (keyed by canonical 10-digit phone or customer id)
        const customerMap = {};
        customerRows.forEach(cust => {
            const rawDigits = cleanMobileDigits(cust.phone);
            const clean10 = (cust.country_code === '+91' || cust.country_code === '91' || (!cust.country_code && rawDigits.length >= 10))
                ? rawDigits.slice(-10)
                : rawDigits;
            const countryCode = cust.country_code ? (cust.country_code.startsWith('+') ? cust.country_code : `+${cust.country_code}`) : '+91';
            const mapKey = clean10 || cust.id;

            let parsedMetadata = {};
            if (cust.metadata) {
                try {
                    parsedMetadata = typeof cust.metadata === 'string' ? JSON.parse(cust.metadata) : cust.metadata;
                } catch (e) {
                    parsedMetadata = {};
                }
            }

            const initialBilling = parsedMetadata.last_billing_address || {
                name: cust.name || '',
                phone: clean10 || cust.phone || '',
                whatsapp: parsedMetadata.billing_whatsapp || clean10 || cust.phone || '',
                email: cust.email || '',
                address: cust.address || '',
                city: cust.city || '',
                state: cust.state || '',
                pincode: cust.pincode || '',
                country: 'India'
            };

            const initialShipping = parsedMetadata.last_shipping_address || {
                name: cust.name || '',
                phone: clean10 || cust.phone || '',
                email: cust.email || '',
                address: cust.address || '',
                city: cust.city || '',
                state: cust.state || '',
                pincode: cust.pincode || '',
                country: 'India'
            };

            if (!customerMap[mapKey]) {
                customerMap[mapKey] = {
                    id: cust.id,
                    name: cust.name || 'Customer',
                    phone: clean10 || cust.phone || '',
                    country_code: countryCode,
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
                    billing: initialBilling,
                    shipping: initialShipping,
                    same_as_billing: parsedMetadata.same_as_billing !== undefined ? parsedMetadata.same_as_billing : true,
                    orders: []
                };
            } else {
                const existing = customerMap[mapKey];
                if (cust.id && (!existing.id || existing.id.startsWith('cust_'))) existing.id = cust.id;
                if (cust.name && cust.name !== 'Customer' && (existing.name === 'Customer' || !existing.name || cust.name.length > existing.name.length)) {
                    existing.name = cust.name;
                }
                if (cust.email && !existing.email) existing.email = cust.email;
                if (cust.address && !existing.address) existing.address = cust.address;
                if (cust.city && !existing.city) existing.city = cust.city;
                if (cust.state && !existing.state) existing.state = cust.state;
                if (cust.pincode && !existing.pincode) existing.pincode = cust.pincode;
                if (cust.phone && clean10) existing.phone = clean10;
                if (cust.admin_notes && (cust.admin_notes.includes('pwd') || cust.admin_notes.includes('password'))) {
                    existing.hasPassword = true;
                }
                if (cust.created_at && (!existing.created_at || new Date(cust.created_at) < new Date(existing.created_at))) {
                    existing.created_at = cust.created_at;
                }
            }
        });

        // Match orders to customers by phone number & extract latest billing/shipping addresses
        orderRows.forEach(order => {
            const ordDigits = cleanMobileDigits(order.customer_phone);
            if (!ordDigits) return;

            const targetCustomer = Object.values(customerMap).find(c => {
                const cDigits = cleanMobileDigits(c.phone);
                return cDigits && (cDigits === ordDigits || cDigits.slice(-10) === ordDigits.slice(-10));
            });

            if (targetCustomer) {
                targetCustomer.totalOrders += 1;
                targetCustomer.totalSpent += (Number(order.total_amount) || 0);
                targetCustomer.orders.push(order);
                if (new Date(order.created_at) > new Date(targetCustomer.lastOrder)) {
                    targetCustomer.lastOrder = order.created_at;
                }
                if (order.customer_name && !['WhatsApp Customer', 'Website User'].includes(order.customer_name)) {
                    targetCustomer.name = order.customer_name;
                }
                if (order.delivery_address && !targetCustomer.lastAddress) {
                    targetCustomer.lastAddress = order.delivery_address;
                }

                // If latest order has structured billing_address, parse and attach
                if (order.billing_address) {
                    const parsedB = parseAddressObject(order.billing_address, order.customer_name, order.customer_phone, order.customer_email);
                    if (parsedB) {
                        targetCustomer.billing = {
                            name: parsedB.name || targetCustomer.billing.name || targetCustomer.name,
                            phone: parsedB.phone || targetCustomer.billing.phone || targetCustomer.phone,
                            whatsapp: parsedB.whatsapp || targetCustomer.billing.whatsapp || targetCustomer.phone,
                            email: parsedB.email || targetCustomer.billing.email || targetCustomer.email,
                            address: parsedB.address || targetCustomer.billing.address || targetCustomer.address,
                            city: parsedB.city || targetCustomer.billing.city || targetCustomer.city,
                            state: parsedB.state || targetCustomer.billing.state || targetCustomer.state,
                            pincode: parsedB.pincode || targetCustomer.billing.pincode || targetCustomer.pincode,
                            country: parsedB.country || targetCustomer.billing.country || 'India'
                        };
                    }
                }

                // If latest order has structured shipping_address or delivery_address
                if (order.shipping_address || order.delivery_address) {
                    const parsedS = parseAddressObject(order.shipping_address || order.delivery_address, order.customer_name, order.customer_phone, order.customer_email);
                    if (parsedS) {
                        targetCustomer.shipping = {
                            name: parsedS.name || targetCustomer.shipping.name || targetCustomer.name,
                            phone: parsedS.phone || targetCustomer.shipping.phone || targetCustomer.phone,
                            email: parsedS.email || targetCustomer.shipping.email || targetCustomer.email,
                            address: parsedS.address || targetCustomer.shipping.address || targetCustomer.address,
                            city: parsedS.city || targetCustomer.shipping.city || targetCustomer.city,
                            state: parsedS.state || targetCustomer.shipping.state || targetCustomer.state,
                            pincode: parsedS.pincode || targetCustomer.shipping.pincode || targetCustomer.pincode,
                            country: parsedS.country || targetCustomer.shipping.country || 'India'
                        };
                    }
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
// POST: Create New Customer with Full Billing & Shipping Addresses
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req) {
    try {
        await ensureCustomerMetadataColumn();
        await ensureCustomerAddressesTable();

        const body = await req.json();
        const { 
            name, 
            phone, 
            country_code, 
            email, 
            password,
            billing = {},
            shipping = {},
            same_as_billing = true
        } = body;

        const customerName = (billing?.name || name || '').trim();
        const rawPhone = billing?.phone || phone || '';

        if (!customerName || !rawPhone?.trim()) {
            return NextResponse.json({ error: 'Full Name and Phone Number are required.' }, { status: 400 });
        }

        const selectedCountryCode = (country_code || '+91').trim();
        const formattedCountryCode = selectedCountryCode.startsWith('+') ? selectedCountryCode : `+${selectedCountryCode}`;
        const rawDigits = cleanMobileDigits(rawPhone);
        const cleanPhone = (formattedCountryCode === '+91') ? rawDigits.slice(-10) : rawDigits;

        if (!cleanPhone || cleanPhone.length < 7 || (formattedCountryCode === '+91' && cleanPhone.length !== 10)) {
            return NextResponse.json({ error: 'Please enter a valid Mobile Number (10 digits for India).' }, { status: 400 });
        }

        const cleanEmail = (billing?.email || email || '').trim().toLowerCase();
        if (cleanEmail && !cleanEmail.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        // Check if customer already exists with this phone
        const [existing] = await pool.query(
            'SELECT `id` FROM `customers` WHERE `phone` IN (?, ?) LIMIT 1',
            [cleanPhone, `91${cleanPhone}`]
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

        // Normalize Billing Object
        const finalBilling = {
            name: customerName,
            phone: cleanPhone,
            whatsapp: (billing?.whatsapp || cleanPhone).replace(/\D/g, ''),
            email: cleanEmail || null,
            address: (billing?.address || '').trim(),
            city: (billing?.city || '').trim(),
            state: (billing?.state || 'Tamil Nadu').trim(),
            pincode: (billing?.pincode || '').trim(),
            country: (billing?.country || 'India').trim()
        };

        // Normalize Shipping Object
        const finalShipping = same_as_billing ? {
            name: finalBilling.name,
            phone: finalBilling.phone,
            email: finalBilling.email,
            address: finalBilling.address,
            city: finalBilling.city,
            state: finalBilling.state,
            pincode: finalBilling.pincode,
            country: finalBilling.country
        } : {
            name: (shipping?.name || customerName).trim(),
            phone: (shipping?.phone || cleanPhone).replace(/\D/g, ''),
            email: (shipping?.email || cleanEmail || '').trim() || null,
            address: (shipping?.address || '').trim(),
            city: (shipping?.city || '').trim(),
            state: (shipping?.state || 'Tamil Nadu').trim(),
            pincode: (shipping?.pincode || '').trim(),
            country: (shipping?.country || 'India').trim()
        };

        const metadataPayload = JSON.stringify({
            last_billing_address: finalBilling,
            last_shipping_address: finalShipping,
            same_as_billing: Boolean(same_as_billing),
            billing_whatsapp: finalBilling.whatsapp
        });

        // Insert into customers table
        await pool.query(
            `INSERT INTO \`customers\` (
                \`id\`, \`phone\`, \`country_code\`, \`name\`, \`email\`, 
                \`address\`, \`city\`, \`state\`, \`pincode\`, 
                \`role\`, \`admin_notes\`, \`metadata\`, \`is_verified\`, \`created_at\`, \`updated_at\`
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?, 1, NOW(), NOW())`,
            [
                newId, 
                cleanPhone, 
                formattedCountryCode, 
                customerName, 
                cleanEmail || null, 
                finalShipping.address || finalBilling.address || null,
                finalShipping.city || finalBilling.city || null,
                finalShipping.state || finalBilling.state || null,
                finalShipping.pincode || finalBilling.pincode || null,
                adminNotes,
                metadataPayload
            ]
        );

        // Also save to customer_addresses table
        if (finalShipping.address) {
            await saveCustomerAddress({
                customerId: newId,
                name: finalShipping.name,
                phone: finalShipping.phone,
                address: finalShipping.address,
                address_line: finalShipping.address,
                city: finalShipping.city,
                state: finalShipping.state,
                pincode: finalShipping.pincode,
                country: finalShipping.country,
                is_default: 1
            });
        }

        return NextResponse.json({
            success: true,
            id: newId,
            message: 'Customer and addresses saved successfully!'
        });

    } catch (error) {
        console.error('[ADMIN-CUSTOMERS-POST-ERROR]', error);
        return NextResponse.json({ error: 'Failed to create customer: ' + error.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT: Update Existing Customer Profile, Billing & Shipping Addresses
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(req) {
    try {
        await ensureCustomerMetadataColumn();
        await ensureCustomerAddressesTable();

        const body = await req.json();
        const { 
            id, 
            phone, 
            country_code, 
            name, 
            email, 
            billing = {}, 
            shipping = {}, 
            same_as_billing = true 
        } = body;

        if (!id && !phone) {
            return NextResponse.json({ error: 'Customer ID or Phone Number is required.' }, { status: 400 });
        }

        const customerName = (billing?.name || name || '').trim();
        if (!customerName) {
            return NextResponse.json({ error: 'Customer Name cannot be empty.' }, { status: 400 });
        }

        const cleanEmail = (billing?.email || email || '').trim().toLowerCase();
        if (cleanEmail && !cleanEmail.includes('@')) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        let formattedCountryCode = country_code ? (country_code.startsWith('+') ? country_code : `+${country_code}`) : '+91';
        let rawPhone = billing?.phone || phone;
        let cleanPhone = rawPhone ? cleanMobileDigits(rawPhone) : null;
        if (cleanPhone && formattedCountryCode === '+91') {
            cleanPhone = cleanPhone.slice(-10);
        }

        // Normalize Billing Object
        const finalBilling = {
            name: customerName,
            phone: cleanPhone || '',
            whatsapp: (billing?.whatsapp || cleanPhone || '').replace(/\D/g, ''),
            email: cleanEmail || null,
            address: (billing?.address || '').trim(),
            city: (billing?.city || '').trim(),
            state: (billing?.state || 'Tamil Nadu').trim(),
            pincode: (billing?.pincode || '').trim(),
            country: (billing?.country || 'India').trim()
        };

        // Normalize Shipping Object
        const finalShipping = same_as_billing ? {
            name: finalBilling.name,
            phone: finalBilling.phone,
            email: finalBilling.email,
            address: finalBilling.address,
            city: finalBilling.city,
            state: finalBilling.state,
            pincode: finalBilling.pincode,
            country: finalBilling.country
        } : {
            name: (shipping?.name || customerName).trim(),
            phone: (shipping?.phone || cleanPhone || '').replace(/\D/g, ''),
            email: (shipping?.email || cleanEmail || '').trim() || null,
            address: (shipping?.address || '').trim(),
            city: (shipping?.city || '').trim(),
            state: (shipping?.state || 'Tamil Nadu').trim(),
            pincode: (shipping?.pincode || '').trim(),
            country: (shipping?.country || 'India').trim()
        };

        const metadataPayload = JSON.stringify({
            last_billing_address: finalBilling,
            last_shipping_address: finalShipping,
            same_as_billing: Boolean(same_as_billing),
            billing_whatsapp: finalBilling.whatsapp
        });

        let query = 'UPDATE `customers` SET `name` = ?, `email` = ?, `address` = ?, `city` = ?, `state` = ?, `pincode` = ?, `metadata` = ?';
        const params = [
            customerName, 
            cleanEmail || null, 
            finalShipping.address || finalBilling.address || null,
            finalShipping.city || finalBilling.city || null,
            finalShipping.state || finalBilling.state || null,
            finalShipping.pincode || finalBilling.pincode || null,
            metadataPayload
        ];

        if (cleanPhone) {
            query += ', `phone` = ?, `country_code` = ?';
            params.push(cleanPhone, formattedCountryCode);
        }
        query += ', `updated_at` = NOW() WHERE ';

        if (id) {
            query += '`id` = ?';
            params.push(id);
        } else {
            query += '`phone` IN (?, ?)';
            params.push(cleanPhone, `91${cleanPhone}`);
        }

        const [result] = await pool.query(query, params);

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
        }

        // Also update / insert into customer_addresses table
        if (id && finalShipping.address) {
            await saveCustomerAddress({
                customerId: id,
                name: finalShipping.name,
                phone: finalShipping.phone,
                address: finalShipping.address,
                address_line: finalShipping.address,
                city: finalShipping.city,
                state: finalShipping.state,
                pincode: finalShipping.pincode,
                country: finalShipping.country,
                is_default: 1
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Customer billing and shipping details updated successfully!'
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

        const expandedPhones = [];
        phoneList.forEach(p => {
            const raw = cleanMobileDigits(p);
            if (raw) {
                expandedPhones.push(raw);
                expandedPhones.push(raw.slice(-10));
                expandedPhones.push(`91${raw.slice(-10)}`);
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
