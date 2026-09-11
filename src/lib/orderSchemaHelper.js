import pool from '@/lib/mysql.js';

let ordersSchemaChecked = false;

export async function ensureOrdersPaymentSchema(connection = pool) {
    if (ordersSchemaChecked) return;
    try {
        const client = connection || pool;
        
        // 1. razorpay_order_id
        const [orderIdCol] = await client.query("SHOW COLUMNS FROM `orders` LIKE 'razorpay_order_id'");
        if (!orderIdCol || orderIdCol.length === 0) {
            await client.query("ALTER TABLE `orders` ADD COLUMN `razorpay_order_id` VARCHAR(100) NULL AFTER `razorpay_payment_id`");
        }

        // 2. razorpay_signature
        const [sigCol] = await client.query("SHOW COLUMNS FROM `orders` LIKE 'razorpay_signature'");
        if (!sigCol || sigCol.length === 0) {
            await client.query("ALTER TABLE `orders` ADD COLUMN `razorpay_signature` VARCHAR(255) NULL AFTER `razorpay_order_id`");
        }

        // 3. paid_at
        const [paidAtCol] = await client.query("SHOW COLUMNS FROM `orders` LIKE 'paid_at'");
        if (!paidAtCol || paidAtCol.length === 0) {
            await client.query("ALTER TABLE `orders` ADD COLUMN `paid_at` DATETIME NULL AFTER `razorpay_signature`");
        }

        // 4. cod_advance_required
        const [advReqCol] = await client.query("SHOW COLUMNS FROM `orders` LIKE 'cod_advance_required'");
        if (!advReqCol || advReqCol.length === 0) {
            await client.query("ALTER TABLE `orders` ADD COLUMN `cod_advance_required` DECIMAL(10,2) DEFAULT 0 AFTER `total_amount`");
        }

        // 5. advance_paid
        const [advPaidCol] = await client.query("SHOW COLUMNS FROM `orders` LIKE 'advance_paid'");
        if (!advPaidCol || advPaidCol.length === 0) {
            await client.query("ALTER TABLE `orders` ADD COLUMN `advance_paid` DECIMAL(10,2) DEFAULT 0 AFTER `cod_advance_required`");
        }

        // 6. balance_amount
        const [balCol] = await client.query("SHOW COLUMNS FROM `orders` LIKE 'balance_amount'");
        if (!balCol || balCol.length === 0) {
            await client.query("ALTER TABLE `orders` ADD COLUMN `balance_amount` DECIMAL(10,2) DEFAULT 0 AFTER `advance_paid`");
        }

        ordersSchemaChecked = true;
    } catch (e) {
        // Safe to ignore if columns already exist or race conditions
        console.warn('[ORDER-SCHEMA] Warning verifying orders schema:', e.message);
    }
}
