import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('MySQL credentials missing!');
    process.exit(1);
async function clearOrdersAndResetSequence() {
    console.log('--- STARTING DATABASE CLEANUP FOR ORDERS & INVOICES ---');

    const tablesToClear = [
        'order_items',
        'order_status_logs',
        'order_status_history',
        'returns',
        'refunds',
        'orders',
        'invoices'
    ];

    for (const table of tablesToClear) {
        try {
            const { error } = await mysqlClient
                .from(table)
                .delete()
                .neq('created_at', '1970-01-01T00:00:00Z');

            if (error) {
                const { error: err2 } = await mysqlClient.from(table).delete().not('id', 'is', null);
                if (err2) {
                    console.log(`Table '${table}' note or failed to clear:`, err2.message);
                } else {
                    console.log(`Cleared table: ${table}`);
                }
            } else {
                console.log(`Cleared table: ${table}`);
            }
        } catch (err) {
            console.log(`Error clearing table '${table}':`, err.message);
        }
    }

    // Set order sequence counter to 0 in app_settings so next order starts at 1 (WEB-0001 / INV-0001)
    console.log('Resetting order_sequence_counter to 0 in app_settings...');
    const { error: setSeqErr } = await mysqlClient
        .from('app_settings')
        .upsert({
            key: 'order_sequence_counter',
            value: JSON.stringify(0),
            updated_at: new Date().toISOString()
        });

    if (setSeqErr) {
        console.error('Failed to set order_sequence_counter in app_settings:', setSeqErr.message);
    } else {
        console.log('Successfully set order_sequence_counter = 0 in app_settings.');
    }

    console.log('--- DATABASE CLEANUP COMPLETED SUCCESSFULLY ---');
}

clearOrdersAndResetSequence();
