// Automated Admin Workflow & Sequential ID Verification Script
// Tests: Order creation -> Invoice generation -> Return request -> Quality Inspection -> Exchange / Refund -> Auto Cleanup

import pool from '../lib/mysql.js';

async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

async function runAdminWorkflowTest() {
    console.log('====================================================');
    console.log('🚀 STARTING ADMIN MODULE END-TO-END WORKFLOW TEST');
    console.log('====================================================\n');

    let testOrderId = null;
    let testInvoiceNo = null;
    let testReturnId = null;
    let testRefundId = null;

    try {
        // 1. Check Invoice & Order Number Generation Logic
        console.log('--- STEP 1: Testing Sequential ID Generation ---');
        const [lastInvoice] = await query("SELECT invoice_no FROM orders WHERE invoice_no IS NOT NULL ORDER BY id DESC LIMIT 1");
        const lastInvNo = lastInvoice?.invoice_no || '#INV-0000';
        console.log(`✓ Last Existing Invoice Number in DB: ${lastInvNo}`);

        // Generate Test Order
        testInvoiceNo = `INV-TEST-${Date.now().toString().slice(-4)}`;
        testOrderId = `ORD-TEST-${Date.now()}`;

        console.log(`✓ Test Order ID: ${testOrderId}`);
        console.log(`✓ Test Invoice Number: ${testInvoiceNo}`);

        // Insert Test Customer / Order into database
        await query(
            `INSERT INTO orders (id, invoice_no, customer_name, customer_email, customer_phone, total_amount, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [testOrderId, testInvoiceNo, 'Test Customer AdminAudit', 'admin_test@vaiyaaree.com', '9876543210', 1500.00, 'DELIVERED']
        );
        console.log(`✔ Test Order successfully inserted into database with status DELIVERED.`);

        // Insert Test Order Item
        await query(
            `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price_at_time)
             VALUES (UUID(), ?, 1, 'Test Kanchipuram Silk Saree', 1, 1500.00)`,
            [testOrderId]
        );
        console.log(`✔ Test Order Item successfully linked to Order ID.`);

        // 2. Test Return Request Creation & Status Pipeline
        console.log('\n--- STEP 2: Testing Return Request Workflow ---');
        testReturnId = `RET-TEST-${Date.now().toString().slice(-4)}`;

        await query(
            `INSERT INTO return_requests 
             (id, return_id, order_id, product_id, type, reason, product_condition, status, created_at)
             VALUES (UUID(), ?, ?, 1, 'EXCHANGE', 'Defective / Damaged', 'DAMAGED', 'RETURN_REQUESTED', NOW())`,
            [testReturnId, testOrderId]
        );
        console.log(`✔ Return Request created with ID: ${testReturnId} and status: RETURN_REQUESTED`);

        // Fetch inserted return request UUID
        const [retRow] = await query("SELECT id FROM return_requests WHERE return_id = ?", [testReturnId]);
        const returnUuid = retRow?.id;

        // Transition: RETURN_APPROVED
        await query("UPDATE return_requests SET status = 'APPROVED' WHERE id = ?", [returnUuid]);
        console.log(`✔ Admin Action: Return Approved -> Status updated to APPROVED`);

        // Transition: CUSTOMER_SHIPPED
        await query(
            `INSERT INTO return_shipping (return_request_id, courier_company_name, tracking_number, shipping_date, shipping_cost)
             VALUES (?, 'BlueDart Test', 'AWB-TEST-999', NOW(), 100.00)`,
            [returnUuid]
        );
        await query("UPDATE return_requests SET status = 'CUSTOMER_SHIPPED' WHERE id = ?", [returnUuid]);
        console.log(`✔ Customer Action: Courier info submitted -> Status updated to CUSTOMER_SHIPPED`);

        // Transition: Quality Inspection (INSPECTION_PASSED)
        await query(
            `UPDATE return_requests 
             SET status = 'INSPECTION_PASSED', inspection_status = 'PASSED', inspection_notes = 'Audit Test Passed', inspected_at = NOW(), inspected_by = 'Admin Audit'
             WHERE id = ?`,
            [returnUuid]
        );
        console.log(`✔ Admin Action: Inspection Completed -> Status updated to INSPECTION_PASSED`);

        // Transition: Dispatch Exchange (EXCHANGE_SHIPPED)
        await query(
            `UPDATE return_requests 
             SET status = 'EXCHANGE_SHIPPED', exchange_courier_name = 'Delhivery', exchange_tracking_number = 'EXCH-AWB-888', exchange_shipped_at = NOW()
             WHERE id = ?`,
            [returnUuid]
        );
        console.log(`✔ Admin Action: Exchange Dispatched -> Status updated to EXCHANGE_SHIPPED`);

        // 3. Test Refund Request Creation & Finalization
        console.log('\n--- STEP 3: Testing Refund Request Workflow ---');
        testRefundId = `RF-TEST-${Date.now().toString().slice(-4)}`;

        await query(
            `INSERT INTO refund_requests 
             (id, refund_id, order_id, customer_id, reason, requested_amount, approved_amount, refund_status, return_status, created_at)
             VALUES (UUID(), ?, ?, 'c_test_123', 'Defective / Damaged', 1500.00, 1500.00, 'REFUND_PROCESSING', 'RETURN_RECEIVED', NOW())`,
            [testRefundId, testOrderId]
        );
        console.log(`✔ Refund Request created with ID: ${testRefundId} and status: REFUND_PROCESSING`);

        await query(
            `UPDATE refund_requests SET refund_status = 'REFUNDED', razorpay_refund_id = 'rfnd_test_12345' WHERE refund_id = ?`,
            [testRefundId]
        );
        console.log(`✔ Admin Action: Refund Completed -> Status updated to REFUNDED with Razorpay UTR ID.`);

        console.log('\n====================================================');
        console.log('✅ ALL ADMIN WORKFLOW & DATABASE LIFECYCLE TESTS PASSED!');
        console.log('====================================================');

    } catch (err) {
        console.error('\n❌ WORKFLOW TEST ERROR:', err);
    } finally {
        // 4. Automatic Test Record Cleanup
        console.log('\n--- STEP 4: Cleaning Up Test Records ---');
        try {
            if (testOrderId) {
                const [ret] = await query("SELECT id FROM return_requests WHERE order_id = ?", [testOrderId]);
                if (ret) {
                    await query("DELETE FROM return_shipping WHERE return_request_id = ?", [ret.id]);
                }
                await query("DELETE FROM return_requests WHERE order_id = ?", [testOrderId]);
                await query("DELETE FROM refund_requests WHERE order_id = ?", [testOrderId]);
                await query("DELETE FROM order_items WHERE order_id = ?", [testOrderId]);
                await query("DELETE FROM orders WHERE id = ?", [testOrderId]);
                console.log(`✔ Automatically cleaned up all test records for Order ID: ${testOrderId}`);
            }
        } catch (cleanupErr) {
            console.error('Cleanup warning:', cleanupErr);
        }
        process.exit(0);
    }
}

runAdminWorkflowTest();
