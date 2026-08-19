import { supabase as defaultSupabase } from '@/lib/supabaseClient';

/**
 * Generates the next sequential Order ID and Invoice Number across the entire application.
 * Formats: WEB-0001, ORD-0002, MAN-0003, INV-0001, INV-0002, etc.
 * 
 * @param {string} prefix - 'WEB' | 'ORD' | 'MAN'
 * @param {Object} [customClient] - Optional Supabase client instance
 * @returns {Promise<{ orderId: string, invoiceNo: string, seqNum: number }>}
 */
export async function getNextOrderAndInvoiceId(prefix = 'WEB', customClient = null) {
    const db = customClient || defaultSupabase;
    const cleanPrefix = (prefix || 'WEB').toUpperCase().trim();

    // 1. Fetch current sequence counter from app_settings
    let currentVal = 0;
    try {
        const { data: settingData } = await db
            .from('app_settings')
            .select('value')
            .eq('key', 'order_sequence_counter')
            .single();

        if (settingData && settingData.value !== undefined && settingData.value !== null) {
            const parsed = typeof settingData.value === 'string' ? JSON.parse(settingData.value) : settingData.value;
            const parsedNum = Number(parsed);
            if (!isNaN(parsedNum) && parsedNum >= 0) {
                currentVal = parsedNum;
            }
        }
    } catch (e) {
        console.warn('[ORDER-ID] Error reading order_sequence_counter setting:', e);
    }

    // 2. Query existing orders to ensure no duplicate sequence IDs
    try {
        const { data: orders } = await db
            .from('orders')
            .select('id');

        if (orders && orders.length > 0) {
            let maxExisting = 0;
            for (const o of orders) {
                if (o.id && typeof o.id === 'string') {
                    const match = o.id.match(/^[A-Z]+-(\d+)$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        // Avoid raw timestamps (> 1,000,000) from legacy tests
                        if (!isNaN(num) && num > maxExisting && num < 1000000) {
                            maxExisting = num;
                        }
                    }
                }
            }
            if (maxExisting > currentVal) {
                currentVal = maxExisting;
            }
        }
    } catch (e) {
        console.warn('[ORDER-ID] Error fetching orders for max sequence check:', e);
    }

    const nextSeq = currentVal + 1;

    // 3. Atomically update the counter in app_settings
    try {
        await db.from('app_settings').upsert({
            key: 'order_sequence_counter',
            value: JSON.stringify(nextSeq),
            updated_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('[ORDER-ID] Error saving updated order_sequence_counter setting:', e);
    }

    const formattedNum = String(nextSeq).padStart(4, '0');
    return {
        orderId: `${cleanPrefix}-${formattedNum}`,
        invoiceNo: `INV-${formattedNum}`,
        seqNum: nextSeq
    };
}

/**
 * Convenience wrapper to get just the next Order ID.
 */
export async function getNextOrderId(prefix = 'WEB', customClient = null) {
    const res = await getNextOrderAndInvoiceId(prefix, customClient);
    return res.orderId;
}
