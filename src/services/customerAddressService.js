import pool from '@/lib/mysql';

let tableInitialized = false;

/**
 * Ensure customer_addresses table exists in MySQL.
 */
export async function ensureCustomerAddressesTable() {
    if (tableInitialized) return;
    try {
        const createSql = `
            CREATE TABLE IF NOT EXISTS customer_addresses (
                id VARCHAR(191) PRIMARY KEY,
                customer_id VARCHAR(191) NOT NULL,
                title VARCHAR(100) DEFAULT NULL,
                address_type ENUM('shipping', 'billing') DEFAULT 'shipping',
                name VARCHAR(255) DEFAULT NULL,
                full_name VARCHAR(255) DEFAULT NULL,
                phone VARCHAR(50) DEFAULT NULL,
                country_code VARCHAR(10) DEFAULT '+91',
                whatsapp VARCHAR(50) DEFAULT NULL,
                whatsapp_country_code VARCHAR(10) DEFAULT '+91',
                email VARCHAR(255) DEFAULT NULL,
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
        await pool.query(createSql);

        // Self-heal any missing columns on existing tables
        try {
            const [cols] = await pool.query('DESCRIBE customer_addresses');
            const fields = cols.map(c => c.Field);
            if (!fields.includes('address_type')) await pool.query("ALTER TABLE customer_addresses ADD COLUMN address_type ENUM('shipping', 'billing') DEFAULT 'shipping'");
            if (!fields.includes('title')) await pool.query("ALTER TABLE customer_addresses ADD COLUMN title VARCHAR(100) DEFAULT NULL");
            if (!fields.includes('full_name')) await pool.query("ALTER TABLE customer_addresses ADD COLUMN full_name VARCHAR(255) DEFAULT NULL");
            if (!fields.includes('whatsapp')) await pool.query("ALTER TABLE customer_addresses ADD COLUMN whatsapp VARCHAR(50) DEFAULT NULL");
            if (!fields.includes('whatsapp_country_code')) await pool.query("ALTER TABLE customer_addresses ADD COLUMN whatsapp_country_code VARCHAR(10) DEFAULT '+91'");
            if (!fields.includes('email')) await pool.query("ALTER TABLE customer_addresses ADD COLUMN email VARCHAR(255) DEFAULT NULL");
            if (!fields.includes('country_code')) await pool.query("ALTER TABLE customer_addresses ADD COLUMN country_code VARCHAR(10) DEFAULT '+91'");
            if (!fields.includes('country')) await pool.query("ALTER TABLE customer_addresses ADD COLUMN country VARCHAR(100) DEFAULT 'India'");
        } catch (e) {}

        tableInitialized = true;
    } catch (err) {
        console.error('[CUSTOMER-ADDRESS-SERVICE] Error initializing customer_addresses table:', err);
    }
}

/**
 * Save or update a customer address in customer_addresses table.
 */
export async function saveCustomerAddress(addressData) {
    await ensureCustomerAddressesTable();
    try {
        const {
            id: rawId,
            customerId,
            customer_id = customerId,
            title = 'Shipping Address',
            address_type = 'shipping',
            name = '',
            full_name = name,
            phone = '',
            country_code = '+91',
            whatsapp = '',
            whatsapp_country_code = '+91',
            email = '',
            address = '',
            address_line = address,
            city = '',
            state = '',
            pincode = '',
            country = 'India',
            is_default = 0
        } = addressData;

        if (!customer_id) return null;

        const id = rawId || `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const addrText = address_line || address || '';
        const personName = full_name || name || '';

        const sql = `
            INSERT INTO customer_addresses
            (id, customer_id, title, address_type, name, full_name, phone, country_code, whatsapp, whatsapp_country_code, email, address, address_line, city, state, pincode, country, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            address_type = VALUES(address_type),
            name = VALUES(name),
            full_name = VALUES(full_name),
            phone = VALUES(phone),
            country_code = VALUES(country_code),
            whatsapp = VALUES(whatsapp),
            whatsapp_country_code = VALUES(whatsapp_country_code),
            email = VALUES(email),
            address = VALUES(address),
            address_line = VALUES(address_line),
            city = VALUES(city),
            state = VALUES(state),
            pincode = VALUES(pincode),
            country = VALUES(country),
            is_default = VALUES(is_default),
            updated_at = NOW()
        `;

        await pool.query(sql, [
            id, customer_id, title, address_type, personName, personName, phone, country_code, whatsapp || null, whatsapp_country_code || '+91', email || null, addrText, addrText, city, state, pincode, country, is_default ? 1 : 0
        ]);

        return { 
            id, 
            customer_id, 
            title, 
            address_type, 
            name: personName, 
            full_name: personName, 
            phone, 
            country_code, 
            whatsapp, 
            whatsapp_country_code, 
            email, 
            address: addrText, 
            address_line: addrText, 
            city, 
            state, 
            pincode, 
            country, 
            is_default: Boolean(is_default) 
        };
    } catch (err) {
        console.error('[CUSTOMER-ADDRESS-SERVICE] Error saving address:', err);
        return null;
    }
}

/**
 * Fetch addresses for a customer ID from customer_addresses table.
 */
export async function fetchCustomerAddresses(customerId) {
    await ensureCustomerAddressesTable();
    try {
        if (!customerId) return [];
        const [rows] = await pool.query(
            `SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC`,
            [customerId]
        );
        return rows || [];
    } catch (err) {
        console.error('[CUSTOMER-ADDRESS-SERVICE] Error fetching addresses:', err);
        return [];
    }
}
