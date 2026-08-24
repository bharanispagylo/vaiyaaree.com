import pool from '../lib/mysql.js';

async function fixReturnIds() {
    console.log('--- FIXING AND SEQUENCING RETURN IDS IN MYSQL ---');

    try {
        // Fetch all return requests ordered chronologically
        const [returns] = await pool.execute(
            `SELECT id, return_id, order_id, created_at FROM return_requests ORDER BY created_at ASC`
        );

        console.log(`Found ${returns.length} return requests to re-index sequentially starting at RET-0001.\n`);

        let currentNo = 1;
        for (const ret of returns) {
            const newReturnId = `RET-${String(currentNo).padStart(4, '0')}`;

            await pool.execute(
                `UPDATE return_requests SET return_id = ?, updated_at = NOW() WHERE id = ?`,
                [newReturnId, ret.id]
            );

            console.log(`✓ Updated Return ID: ${ret.id.slice(0, 8)} | Old ID: '${ret.return_id}' -> New Sequential ID: '${newReturnId}'`);
            currentNo++;
        }

        console.log('\n--- VERIFYING UPDATED RETURN REQUESTS IN MYSQL ---');
        const [updatedRows] = await pool.execute(
            `SELECT id, return_id, order_id, type, reason, status, created_at FROM return_requests ORDER BY created_at ASC`
        );
        console.table(updatedRows.map(r => ({
            id: r.id.slice(0, 8),
            return_id: r.return_id,
            order_id: r.order_id,
            status: r.status,
            created_at: r.created_at
        })));

        console.log('\n✅ ALL RETURN IDS SUCCESSFULLY UPDATED TO SEQUENTIAL FORMAT (RET-0001, RET-0002...)!');

    } catch (err) {
        console.error('❌ Return ID fix failed:', err);
    } finally {
        process.exit(0);
    }
}

fixReturnIds();
