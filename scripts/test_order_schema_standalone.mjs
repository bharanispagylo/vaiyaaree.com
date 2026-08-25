import { mysqlClient } from '../src/lib/mysqlClient.js';

async function testOrderSchemaStandalone() {
    console.log("==================================================");
    console.log("TESTING MYSQL ORDER SCHEMA, PAID_PRICE & DISCOUNTS");
    console.log("==================================================");

    const testTimestamp = Date.now();
    const testOrderId = `ORD_TEST_${testTimestamp}`;
    const testProdId = `prod_test_${testTimestamp}`;
    const testCustomerId = `cust_test_${testTimestamp}`;
    const testRuleId = `rule_test_${testTimestamp}`;

    try {
        // 1. Verify order_items paid_price_per_unit insertion
        console.log("\n1. Testing order_items insertion with paid_price_per_unit...");
        const { error: itemErr } = await mysqlClient.from('order_items').insert({
            id: `item_${testTimestamp}`,
            order_id: testOrderId,
            product_id: testProdId,
            product_name: "Test Silk Saree",
            quantity: 2,
            price_at_time: 1500,
            price: 1500,
            paid_price_per_unit: 1350
        });

        if (itemErr) throw itemErr;
        console.log(" order_items inserted successfully!");

        const { data: itemData } = await mysqlClient.from('order_items').select('*').eq('id', `item_${testTimestamp}`).single();
        console.log(" Retrieved order_items row:", itemData);
        if (itemData && parseFloat(itemData.paid_price_per_unit) === 1350) {
            console.log(" ✅ PASS: paid_price_per_unit stored accurately as ₹1,350!");
        } else {
            throw new Error(`paid_price_per_unit mismatch: ${itemData?.paid_price_per_unit}`);
        }

        // 2. Verify customers metadata column update
        console.log("\n2. Testing customers metadata column JSON update...");
        await mysqlClient.from('customers').insert({
            id: testCustomerId,
            phone: `91999999${Math.floor(1000 + Math.random() * 9000)}`,
            name: "Schema Test Customer",
            metadata: JSON.stringify({ last_order: testOrderId, preferred_shipping: "Standard" })
        });

        const { data: custData } = await mysqlClient.from('customers').select('metadata').eq('id', testCustomerId).single();
        console.log(" Retrieved customer metadata:", custData?.metadata);
        if (custData && custData.metadata) {
            console.log(" ✅ PASS: customers.metadata JSON column works perfectly!");
        } else {
            throw new Error("customers.metadata check failed");
        }

        // 3. Verify RPC increment_discount_usage
        console.log("\n3. Testing increment_discount_usage RPC function...");
        await mysqlClient.from('discount_rules').insert({
            id: testRuleId,
            name: "Test RPC Coupon",
            coupon_code: `RPC${testTimestamp.toString().slice(-4)}`,
            discount_type: "PERCENTAGE",
            discount_value: 10,
            usage_count: 0
        });

        const { data: rpcRes, error: rpcErr } = await mysqlClient.rpc('increment_discount_usage', { rule_id: testRuleId });
        if (rpcErr) throw rpcErr;
        console.log(" RPC response:", rpcRes);

        const { data: ruleData } = await mysqlClient.from('discount_rules').select('usage_count').eq('id', testRuleId).single();
        console.log(" Updated usage_count in discount_rules:", ruleData?.usage_count);
        if (ruleData && ruleData.usage_count === 1) {
            console.log(" ✅ PASS: increment_discount_usage RPC incremented usage_count from 0 to 1!");
        } else {
            throw new Error(`RPC increment_discount_usage failed: usage_count is ${ruleData?.usage_count}`);
        }

        // 4. Clean up test records
        console.log("\n4. Cleaning up test records...");
        await mysqlClient.from('order_items').delete().eq('id', `item_${testTimestamp}`);
        await mysqlClient.from('customers').delete().eq('id', testCustomerId);
        await mysqlClient.from('discount_rules').delete().eq('id', testRuleId);
        console.log(" Test records cleaned up successfully.");

        console.log("\n==================================================");
        console.log("🎉 ALL MYSQL SCHEMA, PAID_PRICE, METADATA & RPC CHECKS PASSED 100%!");
        console.log("==================================================");

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

testOrderSchemaStandalone();
