import { createClient } from '@supabase/supabase-js';

// Service role client bypasses RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Core business logic for submitting a return/exchange request.
 * Can be called from API routes or directly from server-side services.
 */
export async function processReturnRequest({ orderId, items, productId, customerId, type, reason, requestedFrom }) {
    console.log(`[RETURN-SERVICE] Processing ${type} for Order ${orderId} (Source: ${requestedFrom})`);
    
    try {
        // 1. Fetch existing requests for idempotency check
        const { data: existingRequests, error: checkError } = await supabaseAdmin
            .from('return_requests')
            .select('id, product_id')
            .eq('order_id', orderId);

        if (checkError) {
            console.error('[RETURN-SERVICE] Error checking existing requests:', checkError);
        }

        // 2. Prepare requests to insert
        let requestsToInsert = [];

        if (items && Array.isArray(items) && items.length > 0) {
            // Bulk items
            for (const item of items) {
                const prodId = item.product_id;
                const isDuplicate = existingRequests?.some(r => r.product_id === prodId);
                if (!isDuplicate) {
                    requestsToInsert.push({
                        order_id: orderId,
                        product_id: prodId || null,
                        customer_id: customerId || null,
                        request_type: type,
                        reason: reason,
                        status: 'PENDING',
                        requested_from: requestedFrom || 'unknown'
                    });
                }
            }
        } else {
            // Single item or general request
            const prodId = productId || null;
            const isDuplicate = existingRequests?.some(r => r.product_id === prodId || (prodId === null && r.product_id === null));
            
            if (!isDuplicate) {
                requestsToInsert.push({
                    order_id: orderId,
                    product_id: prodId,
                    customer_id: customerId || null,
                    request_type: type,
                    reason: reason,
                    status: 'PENDING',
                    requested_from: requestedFrom || 'website'
                });
            }
        }

        if (requestsToInsert.length === 0) {
            console.log('[RETURN-SERVICE] All items already have requests.');
            return { success: true, alreadyExists: true, message: 'Requests already exist' };
        }

        // 3. Insert into DB
        console.log(`[RETURN-SERVICE] Inserting ${requestsToInsert.length} request(s)...`);
        
        let { data, error: insertError } = await supabaseAdmin
            .from('return_requests')
            .insert(requestsToInsert)
            .select();

        // FALLBACK: If requested_from column doesn't exist yet
        if (insertError && insertError.message && insertError.message.includes('requested_from')) {
            console.warn('[RETURN-SERVICE] Fallback: retrying without requested_from column');
            const cleanedRequests = requestsToInsert.map(({ requested_from, ...rest }) => rest);
            const retry = await supabaseAdmin
                .from('return_requests')
                .insert(cleanedRequests)
                .select();
            data = retry.data;
            insertError = retry.error;
        }

        if (insertError) {
            console.error('[RETURN-SERVICE] DB Insert Error:', insertError);
            return { success: false, error: insertError.message };
        }

        console.log(`[RETURN-SERVICE] Success! Stored ${data?.length} records.`);
        return { success: true, count: data?.length, data };

    } catch (error) {
        console.error('[RETURN-SERVICE] Critical Exception:', error);
        return { success: false, error: error.message };
    }
}
