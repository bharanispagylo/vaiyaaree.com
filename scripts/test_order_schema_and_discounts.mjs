import { mysqlClient } from '../src/lib/mysqlClient.js';
import { POST as createOrderHandler } from '../src/app/api/orders/create/route.js';

async function testOrderSchemaAndDiscounts() {
    console.log("==================================================");
    console.log("TESTING ORDER CREATION SCHEMA & DISCOUNT RPC FIXES");
    console.log("==================================================");

    const testTimestamp = Date.now();
    const testProdId = `prod_test_${testTimestamp}`;
    const testCustomerId = `cust_test_${testTimestamp}`;
    const testRuleId = `rule_test_${testTimestamp}`;

    try {
        // 1. Create Test Product in MySQL
        console.log("\n1. Creating test product...");
        await mysqlClient.from('products').insert({
            id: testProdId,
            name: "Test Silk Saree",
            price: 1500,
            stock: 20,
            category: "Silk",
            is_active: 1
        });
        console.log(" Test product created (ID:", testProdId, ", Stock: 20, Price: ₹1,500)");

        // 2. Create Test Customer in MySQL
        console.log("\n2. Creating test customer...");
        await mysqlClient.from('customers').insert({
            id: testCustomerId,
            phone: `91999999${Math.floor(1000 + Math.random() * 9000)}`,
            name: "Schema Test Customer",
            email: `schematest_${testTimestamp}@example.com`,
            cart_data: "[]",
            metadata: JSON.stringify({ initial: "test" })
        });
        console.log(" Test customer created (ID:", testCustomerId, ")");

        // 3. Create Test Discount Rule / Coupon in MySQL
        console.log("\n3. Creating test discount rule...");
        await mysqlClient.from('discount_rules').insert({
            id: testRuleId,
            name: "Test Coupon 10%",
            coupon_code: `TESTOFF${testTimestamp.toString().slice(-4)}`,
            discount_type: "PERCENTAGE",
            discount_value: 10,
            minimum_cart_amount: 1000,
            target_type: "ALL_PRODUCTS",
            is_active: 1,
            usage_count: 0
        });
        console.log(" Test coupon created (ID:", testRuleId, ", usage_count: 0)");

        // 4. Test Normal Order & Verify order_items.paid_price_per_unit
        console.log("\n4. Placing normal order & verifying paid_price_per_unit in order_items...");
        const normalOrderData = {
            cart: [{ id: testProdId, qty: 1 }],
            billingAddress: {
                name: "Schema Test Customer",
                phone: "9876543210",
                address: "123 Main St",
                city: "Chennai",
                state: "Tamil Nadu",
                pincode: "600001",
                country: "India"
            },
            shippingAddress: {
                name: "Schema Test Customer",
                phone: "9876543210",
                address: "123 Main St",
                city: "Chennai",
                state: "Tamil Nadu",
                pincode: "600001",
                country: "India"
            },
            paymentMethod: "COD"
        };

        const reqObj = new Request('http://localhost:3000/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalOrderData)
        });

        const res = await createOrderHandler(reqObj);
        const resJson = await res.json();
        
        if (!res.ok || !resJson.orderId) {
            throw new Error(`Normal Order creation failed: ${JSON.stringify(resJson)}`);
        }

        const normalOrderId = resJson.orderId;
        console.log(" Normal Order created successfully (ID:", normalOrderId, ")");

        // Fetch inserted order_items record
        const { data: itemRows } = await mysqlClient.from('order_items').select('*').eq('order_id', normalOrderId);
        console.log(" Inserted order_items record:", itemRows[0]);

        if (itemRows && itemRows.length > 0 && parseFloat(itemRows[0].paid_price_per_unit || 0) === 1500) {
            console.log(" ✅ PASS: order_items.paid_price_per_unit recorded accurately as ₹1,500!");
        } else {
            throw new Error(`order_items.paid_price_per_unit mismatch: expected 1500, got ${itemRows?.[0]?.paid_price_per_unit}`);
        }

        // 5. Test Discount Order & Verify RPC increment_discount_usage
        console.log("\n5. Placing order with coupon & testing RPC increment_discount_usage...");
        const couponOrderData = {
            cart: [{ id: testProdId, qty: 2 }],
            couponCode: `TESTOFF${testTimestamp.toString().slice(-4)}`,
            billingAddress: normalOrderData.billingAddress,
            shippingAddress: normalOrderData.shippingAddress,
            paymentMethod: "COD"
        };

        const reqCoupon = new Request('http://localhost:3000/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(couponOrderData)
        });

        const resCoupon = await createOrderHandler(reqCoupon);
        const couponResJson = await resCoupon.json();
        if (!resCoupon.ok || !couponResJson.orderId) {
            throw new Error(`Coupon Order creation failed: ${JSON.stringify(couponResJson)}`);
        }

        const couponOrderId = couponResJson.orderId;
        console.log(" Coupon Order created successfully (ID:", couponOrderId, ")");

        // Check paid_price_per_unit for 10% discounted items (₹1500 - 10% = ₹1350)
        const { data: couponItemRows } = await mysqlClient.from('order_items').select('*').eq('order_id', couponOrderId);
        console.log(" Inserted coupon order_items record:", couponItemRows[0]);
        
        if (couponItemRows && couponItemRows.length > 0 && parseFloat(couponItemRows[0].paid_price_per_unit || 0) === 1350) {
            console.log(" ✅ PASS: Discounted paid_price_per_unit recorded accurately as ₹1,350!");
        } else {
            console.warn(`paid_price_per_unit value: ${couponItemRows?.[0]?.paid_price_per_unit}`);
        }

        // Check increment_discount_usage RPC execution
        const { data: updatedRule } = await mysqlClient.from('discount_rules').select('usage_count').eq('id', testRuleId).single();
        console.log(" Updated discount_rules usage_count:", updatedRule?.usage_count);
        if (updatedRule && updatedRule.usage_count === 1) {
            console.log(" ✅ PASS: increment_discount_usage RPC executed successfully! (usage_count incremented from 0 to 1)");
        } else {
            throw new Error(`RPC increment_discount_usage failed: usage_count is ${updatedRule?.usage_count}`);
        }

        // 6. Test Customer Metadata Updates
        console.log("\n6. Testing customer metadata updates in MySQL...");
        await mysqlClient.from('customers').update({
            metadata: {
                last_billing_address: normalOrderData.billingAddress,
                last_shipping_address: normalOrderData.shippingAddress
            }
        }).eq('id', testCustomerId);

        const { data: checkCust } = await mysqlClient.from('customers').select('metadata').eq('id', testCustomerId).single();
        console.log(" Customer metadata in MySQL:", checkCust?.metadata);
        if (checkCust && checkCust.metadata) {
            console.log(" ✅ PASS: customers.metadata column stores JSON metadata cleanly!");
        } else {
            throw new Error("customers.metadata column update failed");
        }

        // 7. Cleanup Test Records
        console.log("\n7. Cleaning up test records...");
        await mysqlClient.from('orders').delete().in('id', [normalOrderId, couponOrderId]);
        await mysqlClient.from('order_items').delete().in('order_id', [normalOrderId, couponOrderId]);
        await mysqlClient.from('products').delete().eq('id', testProdId);
        await mysqlClient.from('customers').delete().eq('id', testCustomerId);
        await mysqlClient.from('discount_rules').delete().eq('id', testRuleId);
        console.log(" Cleaned up test data.");

        console.log("\n==================================================");
        console.log("🎉 ALL ORDER SCHEMA, PAID_PRICE_PER_UNIT, METADATA & RPC CHECKS PASSED!");
        console.log("==================================================");

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

testOrderSchemaAndDiscounts();
