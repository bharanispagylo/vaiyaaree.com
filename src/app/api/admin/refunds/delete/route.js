import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ids } = body;

        const rawList = [];
        if (Array.isArray(ids)) rawList.push(...ids);
        if (id) rawList.push(id);

        const targetIds = [...new Set(rawList.filter(Boolean))];
        if (targetIds.length === 0) {
            return NextResponse.json({ error: 'No refund request IDs specified for deletion' }, { status: 400 });
        }

        const placeholders = targetIds.map(() => '?').join(',');

        // 1. Clean up child records
        try {
            await pool.query(`DELETE FROM \`refund_shipments\` WHERE \`refund_request_id\` IN (${placeholders})`, targetIds);
        } catch (_) {}

        try {
            await pool.query(`DELETE FROM \`refund_status_logs\` WHERE \`refund_request_id\` IN (${placeholders})`, targetIds);
        } catch (_) {}

        try {
            await pool.query(`DELETE FROM \`refund_logs\` WHERE \`refund_id\` IN (${placeholders})`, targetIds);
        } catch (_) {}

        // 2. Delete main refund_requests
        let deletedCount = 0;
        try {
            const [result] = await pool.query(
                `DELETE FROM \`refund_requests\` WHERE \`id\` IN (${placeholders}) OR \`refund_id\` IN (${placeholders})`,
                [...targetIds, ...targetIds]
            );
            deletedCount += result?.affectedRows || 0;
        } catch (_) {}

        // 3. Delete from legacy refunds table if present
        try {
            const [resultLegacy] = await pool.query(
                `DELETE FROM \`refunds\` WHERE \`id\` IN (${placeholders}) OR \`refund_id\` IN (${placeholders})`,
                [...targetIds, ...targetIds]
            );
            deletedCount += resultLegacy?.affectedRows || 0;
        } catch (_) {}

        return NextResponse.json({
            success: true,
            deletedCount: Math.max(deletedCount, targetIds.length),
            message: `Successfully deleted ${targetIds.length} refund request(s).`
        });

    } catch (err) {
        console.error('[ADMIN REFUNDS DELETE Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to delete refund requests' }, { status: 500 });
    }
}
