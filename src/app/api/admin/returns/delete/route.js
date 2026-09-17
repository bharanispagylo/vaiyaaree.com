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
            return NextResponse.json({ error: 'No return request IDs specified for deletion' }, { status: 400 });
        }

        const placeholders = targetIds.map(() => '?').join(',');

        // 1. Clean up child records
        try {
            await pool.query(`DELETE FROM \`return_images\` WHERE \`return_request_id\` IN (${placeholders})`, targetIds);
        } catch (_) {}

        try {
            await pool.query(`DELETE FROM \`return_shipping\` WHERE \`return_request_id\` IN (${placeholders}) OR \`return_id\` IN (${placeholders})`, [...targetIds, ...targetIds]);
        } catch (_) {}

        try {
            await pool.query(`DELETE FROM \`return_courier_shipments\` WHERE \`return_request_id\` IN (${placeholders})`, targetIds);
        } catch (_) {}

        try {
            await pool.query(`DELETE FROM \`return_status_logs\` WHERE \`return_request_id\` IN (${placeholders})`, targetIds);
        } catch (_) {}

        try {
            await pool.query(`DELETE FROM \`return_inspection\` WHERE \`return_request_id\` IN (${placeholders})`, targetIds);
        } catch (_) {}

        // 2. Delete main return_requests
        const [result] = await pool.query(
            `DELETE FROM \`return_requests\` WHERE \`id\` IN (${placeholders}) OR \`return_id\` IN (${placeholders})`,
            [...targetIds, ...targetIds]
        );

        return NextResponse.json({
            success: true,
            deletedCount: result?.affectedRows || targetIds.length,
            message: `Successfully deleted ${targetIds.length} return request(s).`
        });

    } catch (err) {
        console.error('[ADMIN RETURNS DELETE Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to delete return requests' }, { status: 500 });
    }
}
