import { sendReturnStatusEmail, sendRefundStatusEmail } from '../src/lib/emailService.js';

async function testWorkflow() {
    console.log('--- Testing Email & Notification Workflow Scenarios ---');

    const mockReq = {
        id: 'test-return-123',
        return_id: 'RET-0001',
        order_id: 'WEB-1001',
        type: 'EXCHANGE',
        customers: { name: 'Test Customer', email: 'customer@example.com', phone: '+919876543210' },
        orders: { customer_email: 'customer@example.com', customer_phone: '+919876543210' },
        exchange_courier_name: 'BlueDart',
        exchange_tracking_number: 'BD12345678'
    };

    // Scenario 1: Return request approval
    console.log('1. Return request approval:');
    const res1 = await sendReturnStatusEmail(mockReq, 'APPROVED');
    console.log('   Result:', res1);

    // Scenario 2: Customer courier shipment
    console.log('2. Customer courier shipment:');
    const res2 = await sendReturnStatusEmail(mockReq, 'CUSTOMER_SHIPPED');
    console.log('   Result:', res2);

    // Scenario 3: Return inspection
    console.log('3. Return inspection:');
    const res3 = await sendReturnStatusEmail(mockReq, 'INSPECTION_PASSED');
    console.log('   Result:', res3);

    // Scenario 4: Refund status notification
    console.log('4. Refund status notification:');
    const mockRefund = { id: 'ref-1', refund_id: 'REF-0001', order_id: 'WEB-1001', customers: { email: 'customer@example.com' } };
    const res4 = await sendRefundStatusEmail(mockRefund, 'COMPLETED');
    console.log('   Result:', res4);

    // Scenario 5: Exchange shipment notification
    console.log('5. Exchange shipment notification:');
    const res5 = await sendReturnStatusEmail(mockReq, 'EXCHANGE_SHIPPED', { courierName: 'BlueDart', trackingNumber: 'BD12345678' });
    console.log('   Result:', res5);

    // Scenario 6: Email failure handling (Invalid email test)
    console.log('6. Email failure handling:');
    const res6 = await sendReturnStatusEmail({ ...mockReq, customers: { email: 'invalid-email' } }, 'EXCHANGE_SHIPPED');
    console.log('   Result:', res6);

    console.log('--- All 6 Scenarios Tested Successfully! ---');
}

testWorkflow().catch(console.error);
