import { processReturnRequest } from '@/services/returnService';

export const dynamic = 'force-dynamic';

// Map service error codes to HTTP status codes
const ERROR_STATUS_MAP = {
    ORDER_NOT_FOUND: 404,
    ORDER_NOT_OWNED: 403,
    ORDER_NOT_DELIVERED: 400,
    RETURN_WINDOW_EXPIRED: 400,
    ITEM_NOT_FOUND: 404,
    INVALID_QUANTITY: 400,
    ITEM_ALREADY_RETURNED: 409,
    DUPLICATE_REQUEST: 409,
    NON_RETURNABLE_ITEM: 400,
    DB_INSERT_FAILED: 500,
    INTERNAL_ERROR: 500,
};

export async function POST(request) {
    try {
        const body = await request.json();

        // Delegate execution to centralized return service
        const result = await processReturnRequest({
            ...body,
            requestedQuantity: Number(body.requestedQuantity || body.quantity) || 1,
            requestedFrom: body.requestedFrom || 'WEB'
        });

        if (!result.success) {
            const httpStatus = ERROR_STATUS_MAP[result.code] || 400;
            return new Response(JSON.stringify(result), {
                status: httpStatus,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[API /api/returns/create Error]:', error);
        return new Response(
            JSON.stringify({ success: false, code: 'INTERNAL_ERROR', message: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
