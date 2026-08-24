import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) process.env[k] = envConfig[k];
}

async function main() {
    console.log('Connecting to MySQL database:', process.env.DB_NAME || 'vaiyaaree_db');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vaiyaaree_db',
    });

    console.log('Connected to MySQL successfully!');

    // 1. Ensure customer_addresses table exists with full columns
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS customer_addresses (
            id VARCHAR(191) PRIMARY KEY,
            customer_id VARCHAR(191) NOT NULL,
            name VARCHAR(255) DEFAULT NULL,
            phone VARCHAR(50) DEFAULT NULL,
            address TEXT DEFAULT NULL,
            address_line TEXT DEFAULT NULL,
            city VARCHAR(100) DEFAULT NULL,
            state VARCHAR(100) DEFAULT NULL,
            pincode VARCHAR(20) DEFAULT NULL,
            country VARCHAR(100) DEFAULT 'India',
            is_default TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_customer_id (customer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await connection.query(createTableSql);
    console.log('✓ Verified table `customer_addresses` in database.');

    const addressRows = [];
    const seenMap = new Set();

    // 2. Fetch customer records from customers table
    try {
        const [customers] = await connection.query(`SELECT id, name, phone, address, city, state, pincode, created_at FROM customers`);
        console.log(`Found ${customers.length} customers in \`customers\` table.`);
        for (const cust of customers) {
            if (cust.address || cust.city || cust.state || cust.pincode) {
                const key = `${cust.id}-${cust.address || ''}-${cust.pincode || ''}`;
                if (!seenMap.has(key)) {
                    seenMap.add(key);
                    const addrText = cust.address || '';
                    addressRows.push([
                        `addr-cust-${cust.id.slice(0, 8)}-${Date.now() % 10000}`,
                        cust.id,
                        cust.name || 'Valued Customer',
                        cust.phone || '',
                        addrText,
                        addrText,
                        cust.city || '',
                        cust.state || '',
                        cust.pincode || '',
                        'India',
                        1, // is_default
                        cust.created_at ? new Date(cust.created_at) : new Date()
                    ]);
                }
            }
        }
    } catch (err) {
        console.log('Customer fetch note:', err.message);
    }

    // 3. Fetch orders records from orders table
    try {
        const [orders] = await connection.query(`SELECT id, customer_id, customer_name, customer_phone, delivery_address, shipping_address, shipping_state, created_at FROM orders`);
        console.log(`Found ${orders.length} orders in \`orders\` table.`);
        for (const ord of orders) {
            let addrObj = null;
            if (ord.shipping_address) {
                if (typeof ord.shipping_address === 'string') {
                    try { addrObj = JSON.parse(ord.shipping_address); } catch (e) { addrObj = { address_line: ord.shipping_address }; }
                } else {
                    addrObj = ord.shipping_address;
                }
            }

            const custId = ord.customer_id || `cust-ord-${ord.customer_phone || ord.id}`;
            const name = addrObj?.full_name || addrObj?.name || ord.customer_name || 'Valued Customer';
            const phone = addrObj?.phone || ord.customer_phone || '';
            const line = addrObj?.address_line || addrObj?.address || ord.delivery_address || '';
            const city = addrObj?.city || '';
            const state = addrObj?.state || ord.shipping_state || '';
            const pincode = addrObj?.pincode || addrObj?.zip || '';

            if (line || city || state || pincode) {
                const key = `${custId}-${line}-${pincode}`;
                if (!seenMap.has(key)) {
                    seenMap.add(key);
                    addressRows.push([
                        `addr-ord-${ord.id}-${Math.floor(Math.random()*1000)}`,
                        custId,
                        name,
                        phone,
                        line,
                        line,
                        city,
                        state,
                        pincode,
                        'India',
                        addressRows.length === 0 ? 1 : 0,
                        ord.created_at ? new Date(ord.created_at) : new Date()
                    ]);
                }
            }
        }
    } catch (err) {
        console.log('Order fetch note:', err.message);
    }

    console.log(`Prepared ${addressRows.length} address entries for \`customer_addresses\` table.`);

    const insertSql = `
        INSERT INTO customer_addresses
        (id, customer_id, name, phone, address, address_line, city, state, pincode, country, is_default, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        phone = VALUES(phone),
        address = VALUES(address),
        address_line = VALUES(address_line),
        city = VALUES(city),
        state = VALUES(state),
        pincode = VALUES(pincode),
        updated_at = NOW()
    `;

    let inserted = 0;
    for (const row of addressRows) {
        await connection.query(insertSql, row);
        inserted++;
    }

    console.log(`✓ Populated ${inserted} customer address records into \`customer_addresses\` database table!`);

    await connection.end();
    console.log('Done!');
}

main().catch(err => {
    console.error('Script Error:', err);
    process.exit(1);
});
