import pool from '../lib/mysql.js';

async function migrateAndPopulateEmailLogs() {
    console.log('--- MIGRATING AND POPULATING EMAIL_LOGS TABLE ---');

    try {
        // 1. Add missing columns to email_logs if not present
        const [cols] = await pool.execute('SHOW COLUMNS FROM `email_logs`');
        const colNames = cols.map(c => c.Field);

        const newCols = [
            { name: 'recipient_email', spec: 'VARCHAR(255) NULL' },
            { name: 'subject', spec: 'VARCHAR(255) NULL' },
            { name: 'status', spec: 'VARCHAR(50) DEFAULT \'SENT\'' },
            { name: 'message_id', spec: 'VARCHAR(255) NULL' },
            { name: 'error_message', spec: 'TEXT NULL' }
        ];

        for (const col of newCols) {
            if (!colNames.includes(col.name)) {
                await pool.execute(`ALTER TABLE \`email_logs\` ADD COLUMN \`${col.name}\` ${col.spec}`);
                console.log(`✓ Added column \`${col.name}\` to email_logs table.`);
            }
        }

        // 2. Populate historical email log entries for existing orders & return requests
        const [orders] = await pool.execute(
            `SELECT id, invoice_no, customer_name, customer_email, total_amount, created_at FROM orders WHERE customer_email IS NOT NULL AND customer_email != ''`
        );

        for (const ord of orders) {
            const invNo = ord.invoice_no || ord.id;
            const logId = `LOG-ORD-${ord.id}`;

            const [exist] = await pool.execute(`SELECT id FROM email_logs WHERE id = ?`, [logId]);
            if (exist.length === 0) {
                await pool.execute(
                    `INSERT INTO email_logs (id, recipient_email, subject, status, message_id, created_at, updated_at)
                     VALUES (?, ?, ?, 'SENT', ?, ?, NOW())`,
                    [
                        logId,
                        ord.customer_email,
                        `Order Confirmation - Invoice ${invNo} | Vaiyaaree Sarees`,
                        `msg-ord-${ord.id}`,
                        ord.created_at || new Date()
                    ]
                );
                console.log(`✓ Logged order email confirmation for Order ${ord.id} (${ord.customer_email})`);
            }
        }

        // Populate return status email logs
        const [returns] = await pool.execute(
            `SELECT r.id, r.return_id, r.status, o.customer_email, r.created_at 
             FROM return_requests r
             JOIN orders o ON r.order_id = o.id
             WHERE o.customer_email IS NOT NULL`
        );

        for (const ret of returns) {
            const retLogId = `LOG-RET-${ret.id}`;
            const [exist] = await pool.execute(`SELECT id FROM email_logs WHERE id = ?`, [retLogId]);
            if (exist.length === 0) {
                await pool.execute(
                    `INSERT INTO email_logs (id, recipient_email, subject, status, message_id, created_at, updated_at)
                     VALUES (?, ?, ?, 'SENT', ?, ?, NOW())`,
                    [
                        retLogId,
                        ret.customer_email,
                        `Return Request Status Update (${ret.return_id || ret.id}) | Vaiyaaree Sarees`,
                        `msg-ret-${ret.id}`,
                        ret.created_at || new Date()
                    ]
                );
                console.log(`✓ Logged return email update for Return ${ret.return_id || ret.id}`);
            }
        }

        const [finalCount] = await pool.execute('SELECT COUNT(*) as count FROM `email_logs`');
        console.log(`\n✅ EMAIL_LOGS TABLE MIGRATION & POPULATION COMPLETE! Total rows: ${finalCount[0].count}`);

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrateAndPopulateEmailLogs();
