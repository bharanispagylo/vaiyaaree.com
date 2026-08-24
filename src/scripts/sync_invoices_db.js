import pool from '../lib/mysql.js';

async function syncInvoicesTable() {
    console.log('--- SYNCING INVOICES TABLE IN MYSQL ---');
    try {
        // Fetch all orders with invoice numbers
        const [orders] = await pool.execute(
            `SELECT id, invoice_no, customer_name, customer_phone, customer_email, total_amount, status, created_at, billing_address, shipping_address
             FROM orders WHERE invoice_no IS NOT NULL OR id IS NOT NULL`
        );

        console.log(`Found ${orders.length} orders to sync into invoices table.`);

        for (const ord of orders) {
            const invNo = ord.invoice_no || (ord.id ? String(ord.id).replace(/^[A-Z]+-/, 'INV-') : `INV-${ord.id}`);
            const invId = `INV-REC-${ord.id}`;

            // Check if invoice already exists
            const [existing] = await pool.execute(
                `SELECT id FROM invoices WHERE order_id = ? OR invoice_no = ?`,
                [ord.id, invNo]
            );

            if (existing.length === 0) {
                await pool.execute(
                    `INSERT INTO invoices 
                     (id, order_id, invoice_no, customer_name, customer_phone, customer_email, total_amount, subtotal, tax_amount, discount_amount, shipping_amount, billing_address, shipping_address, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        invId,
                        ord.id,
                        invNo,
                        ord.customer_name || 'Customer',
                        ord.customer_phone || '',
                        ord.customer_email || '',
                        String(ord.total_amount || 0),
                        String(ord.total_amount || 0),
                        '0',
                        '0',
                        '0',
                        typeof ord.billing_address === 'object' ? JSON.stringify(ord.billing_address) : (ord.billing_address || ''),
                        typeof ord.shipping_address === 'object' ? JSON.stringify(ord.shipping_address) : (ord.shipping_address || ''),
                        ord.created_at || new Date()
                    ]
                );
                console.log(`✓ Inserted Invoice ${invNo} for Order ${ord.id} into invoices table.`);
            } else {
                await pool.execute(
                    `UPDATE invoices 
                     SET customer_name = ?, customer_phone = ?, customer_email = ?, total_amount = ?, updated_at = NOW()
                     WHERE order_id = ? OR invoice_no = ?`,
                    [
                        ord.customer_name || 'Customer',
                        ord.customer_phone || '',
                        ord.customer_email || '',
                        String(ord.total_amount || 0),
                        ord.id,
                        invNo
                    ]
                );
                console.log(`✓ Updated Invoice ${invNo} for Order ${ord.id}.`);
            }
        }

        const [invCount] = await pool.execute(`SELECT COUNT(*) as count FROM invoices`);
        console.log(`\n✅ INVOICES TABLE SYNC COMPLETE! Total rows in invoices table: ${invCount[0].count}`);

    } catch (err) {
        console.error('❌ Sync failed:', err);
    } finally {
        process.exit(0);
    }
}

syncInvoicesTable();
