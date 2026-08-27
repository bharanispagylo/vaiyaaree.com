import pool, { withTransaction } from '../src/lib/mysql.js';
import crypto from 'crypto';

async function runAcidTransactionTests() {
    console.log("══════════════════════════════════════════════════════════════");
    console.log("🚀 STARTING ACID TRANSACTION TEST SUITE FOR VAIYAAREE");
    console.log("══════════════════════════════════════════════════════════════\n");

    const ts = Date.now();
    const prodAId = `test_prod_A_${ts}`;
    const prodBId = `test_prod_B_${ts}`;
    const prodCId = `test_prod_C_${ts}`;
    const custId = `test_cust_${ts}`;
    const custPhone = `9198765${ts.toString().slice(-5)}`;

    try {
        // Setup: Create test products in database
        console.log("📦 Setup: Creating test products...");
        await pool.query(
            `INSERT INTO \`products\` (\`id\`, \`name\`, \`price\`, \`stock\`, \`category\`, \`is_active\`, \`created_at\`)
             VALUES 
             (?, 'Test Kanjivaram Silk Saree A', 2000, 10, 'Silk Saree', 1, NOW()),
             (?, 'Test Handloom Cotton Saree B', 1000, 5, 'Cotton Saree', 1, NOW()),
             (?, 'Test Limited Edition Saree C', 3000, 1, 'Silk Saree', 1, NOW())`,
            [prodAId, prodBId, prodCId]
        );
        console.log(" Test products created (Prod A stock: 10, Prod B stock: 5, Prod C stock: 1).\n");

        // ─────────────────────────────────────────────────────────────
        // TEST 1: ATOMICITY & DURABILITY (Successful Purchase)
        // ─────────────────────────────────────────────────────────────
        console.log("─────────────────────────────────────────────────────────────");
        console.log("TEST 1: Atomicity & Durability on Multi-Item Order");
        console.log("─────────────────────────────────────────────────────────────");

        const order1Id = `WEB-TEST-${ts.toString().slice(-4)}1`;
        const test1Payload = {
            orderId: order1Id,
            customerId: custId,
            customerPhone: custPhone,
            customerName: "ACID Test Customer",
            customerEmail: "acid.test@vaiyaaree.com",
            paymentMethod: "COD",
            shippingAddress: {
                name: "ACID Test Customer",
                phone: custPhone,
                address_line: "100 Weavers Street, Madurai",
                city: "Madurai",
                state: "Tamil Nadu",
                pincode: "625001",
                country: "India"
            },
            billingAddress: {
                name: "ACID Test Customer",
                phone: custPhone,
                address: "100 Weavers Street, Madurai",
                city: "Madurai",
                state: "Tamil Nadu",
                pincode: "625001",
                country: "India"
            },
            shippingState: "Tamil Nadu",
            cart: [
                { id: prodAId, name: "Test Kanjivaram Silk Saree A", qty: 2, price: 2000 },
                { id: prodBId, name: "Test Handloom Cotton Saree B", qty: 1, price: 1000 }
            ]
        };

        const res1 = await fetch('http://localhost:3000/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test1Payload)
        });

        const data1 = await res1.json();
        if (!res1.ok || !data1.success) {
            throw new Error(`Test 1 Failed: ${data1.error || 'Unknown error'}`);
        }
        console.log(` Order #${data1.orderId} created successfully via /api/orders/create.`);

        // Verify Database State for Test 1
        const [oRows] = await pool.query("SELECT * FROM `orders` WHERE `id` = ?", [data1.orderId]);
        const [iRows] = await pool.query("SELECT * FROM `order_items` WHERE `order_id` = ?", [data1.orderId]);
        const [pARows] = await pool.query("SELECT `stock`, `total_sold` FROM `products` WHERE `id` = ?", [prodAId]);
        const [pBRows] = await pool.query("SELECT `stock`, `total_sold` FROM `products` WHERE `id` = ?", [prodBId]);
        const [hRows] = await pool.query("SELECT * FROM `product_history` WHERE `product_id` IN (?, ?) AND `reason` LIKE ?", [prodAId, prodBId, `%${data1.orderId}%`]);
        const [lRows] = await pool.query("SELECT * FROM `order_status_logs` WHERE `order_id` = ?", [data1.orderId]);

        if (oRows.length !== 1) throw new Error("Order row missing from `orders`");
        if (iRows.length !== 2) throw new Error(`Expected 2 items in \`order_items\`, found ${iRows.length}`);
        if (pARows[0].stock !== 8) throw new Error(`Product A stock expected 8, found ${pARows[0].stock}`);
        if (pBRows[0].stock !== 4) throw new Error(`Product B stock expected 4, found ${pBRows[0].stock}`);
        if (hRows.length !== 2) throw new Error(`Expected 2 entries in \`product_history\`, found ${hRows.length}`);
        if (lRows.length !== 1) throw new Error("Status log missing from `order_status_logs`");

        console.log(" ✅ PASS: All tables (orders, order_items, products, product_history, logs) committed atomically!\n");

        // ─────────────────────────────────────────────────────────────
        // TEST 2: ATOMICITY & ROLLBACK (Partial Stock Failure)
        // ─────────────────────────────────────────────────────────────
        console.log("─────────────────────────────────────────────────────────────");
        console.log("TEST 2: Rollback on Insufficient Stock (Zero Database Residue)");
        console.log("─────────────────────────────────────────────────────────────");

        const order2Id = `WEB-TEST-${ts.toString().slice(-4)}2`;
        const test2Payload = {
            orderId: order2Id,
            customerId: custId,
            customerPhone: custPhone,
            customerName: "ACID Test Customer",
            customerEmail: "acid.test@vaiyaaree.com",
            paymentMethod: "COD",
            shippingAddress: { address_line: "100 Weavers Street", city: "Madurai", state: "Tamil Nadu", pincode: "625001" },
            cart: [
                { id: prodAId, name: "Test Kanjivaram Silk Saree A", qty: 2, price: 2000 },
                { id: prodBId, name: "Test Handloom Cotton Saree B", qty: 999, price: 1000 } // Out of stock!
            ]
        };

        const res2 = await fetch('http://localhost:3000/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test2Payload)
        });

        const data2 = await res2.json();
        if (res2.ok) {
            throw new Error("Test 2 Failed: Order with insufficient stock should have been rejected!");
        }
        console.log(` Cleanly rejected with expected error: "${data2.error}"`);

        // Verify Database Rollback (Zero Changes)
        const [o2Rows] = await pool.query("SELECT * FROM `orders` WHERE `id` = ?", [order2Id]);
        const [i2Rows] = await pool.query("SELECT * FROM `order_items` WHERE `order_id` = ?", [order2Id]);
        const [pA2Rows] = await pool.query("SELECT `stock` FROM `products` WHERE `id` = ?", [prodAId]);

        if (o2Rows.length !== 0) throw new Error("Ghost order row created in `orders`!");
        if (i2Rows.length !== 0) throw new Error("Ghost items created in `order_items`!");
        if (pA2Rows[0].stock !== 8) throw new Error(`Product A stock was modified despite rollback! Stock: ${pA2Rows[0].stock}`);

        console.log(" ✅ PASS: Transaction rolled back completely! No partial deductions, no orphan records.\n");

        // ─────────────────────────────────────────────────────────────
        // TEST 3: CONCURRENCY & ISOLATION (Simultaneous Race Condition)
        // ─────────────────────────────────────────────────────────────
        console.log("─────────────────────────────────────────────────────────────");
        console.log("TEST 3: Concurrency & Isolation (Race Condition on Last Stock)");
        console.log("─────────────────────────────────────────────────────────────");
        console.log(" Firing 2 simultaneous purchase requests for Product C (Stock = 1)...");

        const order3AId = `WEB-TEST-${ts.toString().slice(-4)}3A`;
        const order3BId = `WEB-TEST-${ts.toString().slice(-4)}3B`;

        const makePurchase = (oId, name) => fetch('http://localhost:3000/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: oId,
                customerId: custId,
                customerPhone: custPhone,
                customerName: name,
                paymentMethod: "COD",
                shippingAddress: { address_line: "100 Weavers Street", city: "Madurai", state: "Tamil Nadu", pincode: "625001" },
                cart: [{ id: prodCId, name: "Test Limited Edition Saree C", qty: 1, price: 3000 }]
            })
        });

        // Fire both simultaneously
        const [rA, rB] = await Promise.all([
            makePurchase(order3AId, "Buyer Alice"),
            makePurchase(order3BId, "Buyer Bob")
        ]);

        const resAData = await rA.json();
        const resBData = await rB.json();

        const aSuccess = rA.ok && resAData.success;
        const bSuccess = rB.ok && resBData.success;

        console.log(` Result Buyer A: ${aSuccess ? '✅ SUCCESS' : '❌ REJECTED (' + resAData.error + ')'}`);
        console.log(` Result Buyer B: ${bSuccess ? '✅ SUCCESS' : '❌ REJECTED (' + resBData.error + ')'}`);

        // Exactly one must succeed, one must fail
        if ((aSuccess && bSuccess) || (!aSuccess && !bSuccess)) {
            throw new Error(`Concurrency violation! Expected exactly 1 success. (A: ${aSuccess}, B: ${bSuccess})`);
        }

        const [pCRows] = await pool.query("SELECT `stock` FROM `products` WHERE `id` = ?", [prodCId]);
        if (pCRows[0].stock !== 0) {
            throw new Error(`Product C stock is invalid: ${pCRows[0].stock}`);
        }

        console.log(" ✅ PASS: Concurrency row-locking prevented overselling! Exactly 1 succeeded, stock = 0.\n");

        // ─────────────────────────────────────────────────────────────
        // TEST 4: ATOMIC CANCELLATION & STOCK RESTORATION
        // ─────────────────────────────────────────────────────────────
        console.log("─────────────────────────────────────────────────────────────");
        console.log("TEST 4: Atomic Order Cancellation & Stock Restoration");
        console.log("─────────────────────────────────────────────────────────────");

        // Setup OTP for cancellation
        const otpCode = "998877";
        await pool.query(
            "INSERT INTO `otps` (`id`, `phone`, `code`, `expires_at`, `created_at`) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())",
            [`otp_${ts}`, custPhone, otpCode]
        );

        const cancelRes = await fetch('http://localhost:3000/api/orders/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId: data1.orderId,
                otp: otpCode
            })
        });

        const cancelData = await cancelRes.json();
        if (!cancelRes.ok || !cancelData.success) {
            throw new Error(`Cancellation failed: ${cancelData.error}`);
        }
        console.log(` Order #${data1.orderId} cancelled successfully.`);

        // Verify Database State after cancellation
        const [oCancelRows] = await pool.query("SELECT `status` FROM `orders` WHERE `id` = ?", [data1.orderId]);
        const [pARestore] = await pool.query("SELECT `stock` FROM `products` WHERE `id` = ?", [prodAId]);
        const [pBRestore] = await pool.query("SELECT `stock` FROM `products` WHERE `id` = ?", [prodBId]);
        const [hCancelRows] = await pool.query("SELECT * FROM `product_history` WHERE `product_id` IN (?, ?) AND `reason` LIKE ? AND `change_type` = 'STOCK_IN'", [prodAId, prodBId, `%${data1.orderId}%`]);

        if (oCancelRows[0].status !== 'CANCELLED') throw new Error(`Order status is not CANCELLED: ${oCancelRows[0].status}`);
        if (pARestore[0].stock !== 10) throw new Error(`Product A stock not restored to 10! Stock: ${pARestore[0].stock}`);
        if (pBRestore[0].stock !== 5) throw new Error(`Product B stock not restored to 5! Stock: ${pBRestore[0].stock}`);
        if (hCancelRows.length !== 2) throw new Error(`Expected 2 STOCK_IN entries in \`product_history\`, found ${hCancelRows.length}`);

        console.log(" ✅ PASS: Order cancellation restored stock and logged history atomically!\n");

        console.log("══════════════════════════════════════════════════════════════");
        console.log("🎉 ALL 4 ACID TRANSACTION TESTS PASSED WITH 100% INTEGRITY!");
        console.log("══════════════════════════════════════════════════════════════\n");

    } catch (err) {
        console.error("\n❌ ACID TEST FAILED:", err);
        process.exitCode = 1;
    } finally {
        // Cleanup test data
        console.log("🧹 Cleanup: Removing test records...");
        try {
            await pool.query("DELETE FROM `orders` WHERE `id` LIKE 'WEB-TEST-%'");
            await pool.query("DELETE FROM `order_items` WHERE `product_id` IN (?, ?, ?)", [prodAId, prodBId, prodCId]);
            await pool.query("DELETE FROM `product_history` WHERE `product_id` IN (?, ?, ?)", [prodAId, prodBId, prodCId]);
            await pool.query("DELETE FROM `products` WHERE `id` IN (?, ?, ?)", [prodAId, prodBId, prodCId]);
            await pool.query("DELETE FROM `otps` WHERE `phone` = ?", [custPhone]);
            console.log(" Test records cleaned up successfully.\n");
        } catch (cleanErr) {
            console.error("Cleanup error:", cleanErr);
        }
        process.exit();
    }
}

runAcidTransactionTests();
