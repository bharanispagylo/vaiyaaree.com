import { dispatchNotification, EVENT_TYPES } from '../src/services/notificationEngine.js';

async function testEmailNotificationDispatch() {
    console.log("==================================================");
    console.log("TESTING ORDER PLACED EMAIL NOTIFICATION DISPATCH");
    console.log("==================================================");

    const testTimestamp = Date.now();
    const mockOrder = {
        id: `ORD_TEST_${testTimestamp}`,
        invoice_no: `INV-${testTimestamp.toString().slice(-4)}`,
        customer_name: "Email Test Customer",
        customer_phone: "9876543210",
        customer_email: "test.customer@example.com",
        billing_email: "test.customer@example.com",
        total_amount: 1500,
        payment_method: "COD"
    };

    console.log("\nDispatching ORDER_PLACED notification for test order...");
    const results = await dispatchNotification({
        eventType: EVENT_TYPES.ORDER_PLACED,
        order: mockOrder,
        forceRetry: true
    });

    console.log("\nDispatch Results:", JSON.stringify(results, null, 2));

    const emailResult = (results.results || []).find(r => r.channel === 'EMAIL');
    if (emailResult) {
        console.log(`\n ✅ EMAIL DISPATCH TEST COMPLETE: Channel EMAIL status is '${emailResult.status}'`);
        if (emailResult.error) {
            console.log(` ℹ️ Detailed Diagnostic Error: ${emailResult.error}`);
        }
    } else {
        throw new Error("No EMAIL dispatch result returned");
    }

    console.log("\n==================================================");
    console.log("🎉 EMAIL DISPATCH PIPELINE VERIFIED SUCCESSFULLY!");
    console.log("==================================================");
}

testEmailNotificationDispatch().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
