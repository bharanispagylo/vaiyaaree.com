import { processReturnInspection } from '@/services/returnService';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { returnRequestId, passed, notes, adminUser } = body;

        if (!returnRequestId) {
            return new Response(JSON.stringify({ success: false, error: 'returnRequestId is required' }), { status: 400 });
        }

        const result = await processReturnInspection({
            returnRequestId,
            passed: Boolean(passed),
            notes,
            adminUser: adminUser || 'admin'
        });

        if (!result.success) {
            return new Response(JSON.stringify(result), { status: 400 });
        }

        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        console.error('[API /api/returns/inspect Error]:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
}
