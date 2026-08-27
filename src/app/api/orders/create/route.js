import crypto from 'crypto';
import pool, { withTransaction } from '@/lib/mysql';
import { getNextOrderAndInvoiceId } from '@/lib/orderIdGenerator';
import { calculateDiscounts } from '@/services/discountService';
import { dispatchNotification, EVENT_TYPES } from '@/services/notificationEngine';

export async function POST(request) {
    try {
        const body = await request.json();
        const { 
            orderId: rawOrderId, 
            customerId, 
            customerPhone, 
            customerName, 
            customerEmail,
            shippingAddress,
            billingAddress,
            paymentMethod = 'COD',
            cart,
            shippingCost,
            shippingZoneId,
            shippingState,
            shippingCountry: rawShippingCountry,
            couponCode,
            source = 'WEBSITE',
            customerNotes,
            adminNotes
        } = body;

        // 0. INPUT VALIDATION (Negative Case)
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return new Response(JSON.stringify({ error: 'Cart is empty' }), { status: 400 });
        }

        for (const item of cart) {
            if (!item.qty || typeof item.qty !== 'number' || item.qty <= 0) {
                return new Response(JSON.stringify({ error: `Invalid quantity for ${item.name || 'item'}` }), { status: 400 });
            }
        }

        // Generate unified sequential order ID & invoice number if missing
        let orderId = rawOrderId;
        let invoiceNo = null;
        const prefix = (source === 'MANUAL' ? 'MAN' : 'WEB');
        if (!orderId || !/^[A-Z]{3,4}-\d{3,}$/i.test(orderId)) {
            const nextData = await getNextOrderAndInvoiceId(prefix);
            orderId = nextData.orderId;
            invoiceNo = nextData.invoiceNo;
        } else {
            const num = orderId.split('-')[1] || '0001';
            invoiceNo = `INV-${num.padStart(4, '0')}`;
        }

        // ═════════════════════════════════════════════════════════════════════════
        // ACID TRANSACTION EXECUTION
        // Every database operation below is executed on a single MySQL connection
        // under an explicit transaction with row-level locks and atomic commits/rollbacks.
        // ═════════════════════════════════════════════════════════════════════════
        const orderResult = await withTransaction(async (conn) => {
            // 1. Fetch business state for GST calculation
            const [bizRows] = await conn.query(
                "SELECT `value` FROM `app_settings` WHERE `key` = 'business_state' LIMIT 1"
            );
            const businessState = bizRows[0]?.value || 'Tamil Nadu';

            // 2. Pessimistic Row-Level Locking & Stock Verification (SELECT ... FOR UPDATE)
            let subtotal = 0;
            const verifiedCartItems = [];

            for (const item of cart) {
                let actualPrice = 0;
                let actualName = item.name;
                let actualCategory = item.category || '';
                let actualVariantName = item.variantName || null;

                if (item.variantId) {
                    // Lock variant row for update
                    const [vRows] = await conn.query(
                        "SELECT `id`, `name`, `price`, `stock` FROM `product_variants` WHERE `id` = ? FOR UPDATE",
                        [item.variantId]
                    );

                    if (vRows.length === 0) {
                        throw new Error(`Product variant not found: ${item.name || item.variantId}`);
                    }

                    const variant = vRows[0];
                    const currentStock = parseInt(variant.stock, 10) || 0;
                    if (currentStock < item.qty) {
                        throw new Error(`Insufficient stock for "${item.name}" (${variant.name}). Only ${currentStock} left in stock.`);
                    }

                    actualPrice = parseFloat(variant.price || 0);
                    actualVariantName = variant.name;
                } else {
                    // Lock product row for update
                    const [pRows] = await conn.query(
                        "SELECT `id`, `name`, `price`, `stock`, `category` FROM `products` WHERE `id` = ? FOR UPDATE",
                        [item.id]
                    );

                    if (pRows.length === 0) {
                        throw new Error(`Product not found: ${item.name || item.id}`);
                    }

                    const product = pRows[0];
                    const currentStock = parseInt(product.stock, 10) || 0;
                    if (currentStock < item.qty) {
                        throw new Error(`Insufficient stock for "${item.name}". Only ${currentStock} left in stock.`);
                    }

                    actualPrice = parseFloat(product.price || 0);
                    if (product.name) actualName = product.name;
                    if (product.category) actualCategory = product.category;
                }

                subtotal += actualPrice * item.qty;
                verifiedCartItems.push({
                    id: item.id,
                    name: actualName,
                    category: actualCategory,
                    price: actualPrice,
                    qty: item.qty,
                    variantId: item.variantId || null,
                    variantName: actualVariantName
                });
            }

            // 3. Shipping Calculation from DB
            const effectiveCountry = (rawShippingCountry || shippingAddress?.country || billingAddress?.country || 'India').trim();
            const isInternational = effectiveCountry.toLowerCase() !== 'india' && effectiveCountry.toLowerCase() !== 'in';
            const shippingCity = (shippingAddress?.city || '').trim().toLowerCase();
            const normShippingState = (shippingState || shippingAddress?.state || 'Tamil Nadu').trim();
            const normBizState = businessState.trim().toLowerCase();

            const [dbZones] = await conn.query("SELECT * FROM `shipping_zones`");
            const [dbMappings] = await conn.query("SELECT * FROM `shipping_zone_states`");

            let calculatedShippingCost = 0;
            let validatedZoneId = shippingZoneId || null;
            let activeZone = null;

            if (dbZones && dbZones.length > 0) {
                const isZoneIntl = (z) => z.is_international === 1 || z.is_international === true || String(z.is_international).toLowerCase() === 'true';

                if (isInternational) {
                    const intlZones = dbZones.filter(z => isZoneIntl(z));
                    const intlZoneIds = new Set(intlZones.map(z => z.id));
                    const mappings = dbMappings || [];

                    const countryMapping = mappings.find(m => 
                        intlZoneIds.has(m.zone_id) &&
                        m.state_name?.trim().toLowerCase() === effectiveCountry.toLowerCase()
                    );

                    activeZone = countryMapping ? (intlZones.find(z => z.id === countryMapping.zone_id) || intlZones[0]) : (intlZones[0] || null);
                } else {
                    const domesticZones = dbZones.filter(z => !isZoneIntl(z));
                    const domesticZoneIds = new Set(domesticZones.map(z => z.id));
                    const mappings = dbMappings || [];

                    const districtMapping = mappings.find(m => 
                        domesticZoneIds.has(m.zone_id) &&
                        m.state_name === normShippingState && 
                        m.district_name?.toLowerCase() === shippingCity
                    );

                    if (districtMapping) {
                        activeZone = domesticZones.find(z => z.id === districtMapping.zone_id);
                    } else {
                        const stateMapping = mappings.find(m => domesticZoneIds.has(m.zone_id) && m.state_name === normShippingState && !m.district_name);
                        activeZone = stateMapping ? domesticZones.find(z => z.id === stateMapping.zone_id) : (domesticZones[0] || null);
                    }
                }

                if (activeZone) {
                    validatedZoneId = activeZone.id;
                    const rate = parseFloat(activeZone.rate || 0);
                    const threshold = parseFloat(activeZone.free_threshold || 0);
                    calculatedShippingCost = (threshold > 0 && subtotal >= threshold) ? 0 : rate;
                } else {
                    calculatedShippingCost = isInternational ? 1500 : 100;
                }
            } else {
                calculatedShippingCost = typeof shippingCost === 'number' ? shippingCost : (isInternational ? 1500 : 100);
            }

            // 4. Server-Side Discount Calculation
            const discountResult = await calculateDiscounts({
                cartItems: verifiedCartItems,
                subtotal,
                shippingCost: calculatedShippingCost,
                couponCode: couponCode || null,
                customer: customerId ? { id: customerId } : null
            });

            const finalShippingCost = discountResult.shipping;
            const taxableSubtotal = discountResult.taxableAmount;

            // 5. Tax Recalculation (CGST/SGST vs IGST)
            let cgst = 0, sgst = 0, igst = 0;
            if (isInternational) {
                igst = Math.round(taxableSubtotal * 0.05);
            } else if (normShippingState.toLowerCase() === normBizState) {
                cgst = Math.round(taxableSubtotal * 0.025);
                sgst = Math.round(taxableSubtotal * 0.025);
            } else {
                igst = Math.round(taxableSubtotal * 0.05);
            }
            const taxAmount = cgst + sgst + igst;
            const totalAmount = Math.round(taxableSubtotal + taxAmount + finalShippingCost);

            // 6. Atomic Inventory Deduction & History Logging
            for (let idx = 0; idx < verifiedCartItems.length; idx++) {
                const item = verifiedCartItems[idx];
                const histId = crypto.randomUUID ? crypto.randomUUID() : `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                if (item.variantId) {
                    // Decrement variant stock with strict atomic check
                    const [vUpdate] = await conn.query(
                        "UPDATE `product_variants` SET `stock` = `stock` - ? WHERE `id` = ? AND `stock` >= ?",
                        [item.qty, item.variantId, item.qty]
                    );

                    if (vUpdate.affectedRows === 0) {
                        throw new Error(`Inventory conflict: Variant "${item.name} (${item.variantName})" stock changed or insufficient.`);
                    }

                    // Decrement parent product stock & increment total_sold
                    await conn.query(
                        "UPDATE `products` SET `stock` = GREATEST(0, `stock` - ?), `total_sold` = COALESCE(`total_sold`, 0) + ? WHERE `id` = ?",
                        [item.qty, item.qty, item.id]
                    );

                    // Fetch resulting stock for audit trail
                    const [vAfter] = await conn.query(
                        "SELECT `stock` FROM `product_variants` WHERE `id` = ?",
                        [item.variantId]
                    );
                    const newStock = vAfter[0]?.stock ?? 0;

                    // Log stock change in product_history
                    await conn.query(
                        `INSERT INTO \`product_history\` 
                         (\`id\`, \`product_id\`, \`variant_id\`, \`change_type\`, \`quantity_change\`, \`new_stock\`, \`reason\`, \`created_at\`)
                         VALUES (?, ?, ?, 'SALE', ?, ?, ?, NOW())`,
                        [histId, item.id, item.variantId, -item.qty, newStock, `Order Placed (#${orderId})`]
                    );
                } else {
                    // Decrement product stock directly with strict atomic check
                    const [pUpdate] = await conn.query(
                        "UPDATE `products` SET `stock` = `stock` - ?, `total_sold` = COALESCE(`total_sold`, 0) + ? WHERE `id` = ? AND `stock` >= ?",
                        [item.qty, item.qty, item.id, item.qty]
                    );

                    if (pUpdate.affectedRows === 0) {
                        throw new Error(`Inventory conflict: Product "${item.name}" stock changed or insufficient.`);
                    }

                    // Fetch resulting stock for audit trail
                    const [pAfter] = await conn.query(
                        "SELECT `stock` FROM `products` WHERE `id` = ?",
                        [item.id]
                    );
                    const newStock = pAfter[0]?.stock ?? 0;

                    // Log stock change in product_history
                    await conn.query(
                        `INSERT INTO \`product_history\` 
                         (\`id\`, \`product_id\`, \`variant_id\`, \`change_type\`, \`quantity_change\`, \`new_stock\`, \`reason\`, \`created_at\`)
                         VALUES (?, ?, NULL, 'SALE', ?, ?, ?, NOW())`,
                        [histId, item.id, -item.qty, newStock, `Order Placed (#${orderId})`]
                    );
                }
            }

            // 7. Insert Order Record
            const deliveryAddressText = shippingAddress?.address_line || shippingAddress?.address || (typeof shippingAddress === 'string' ? shippingAddress : null);
            const billingAddressStr = billingAddress ? JSON.stringify(billingAddress) : null;
            const shippingAddressStr = shippingAddress ? JSON.stringify(shippingAddress) : null;
            const initialStatus = paymentMethod === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT';

            await conn.query(
                `INSERT INTO \`orders\` (
                    \`id\`, \`invoice_no\`, \`customer_id\`, \`customer_phone\`, \`customer_name\`, \`customer_email\`,
                    \`delivery_address\`, \`billing_address\`, \`shipping_address\`, \`status\`, \`subtotal\`,
                    \`product_discount\`, \`cart_discount\`, \`coupon_discount\`, \`shipping_discount\`, \`total_discount\`,
                    \`coupon_code\`, \`total_amount\`, \`tax_amount\`, \`cgst\`, \`sgst\`, \`igst\`,
                    \`cgst_amount\`, \`sgst_amount\`, \`igst_amount\`,
                    \`payment_method\`, \`source\`, \`shipping_cost\`, \`shipping_zone_id\`, \`shipping_state\`,
                    \`customer_notes\`, \`admin_notes\`, \`created_at\`, \`updated_at\`
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, NOW(), NOW()
                )`,
                [
                    orderId,
                    invoiceNo,
                    customerId || null,
                    customerPhone || null,
                    customerName || null,
                    customerEmail || null,
                    deliveryAddressText,
                    billingAddressStr,
                    shippingAddressStr,
                    initialStatus,
                    Math.round(subtotal),
                    discountResult.productDiscount,
                    discountResult.cartDiscount,
                    discountResult.couponDiscount,
                    discountResult.shippingDiscount,
                    discountResult.totalDiscount,
                    discountResult.appliedCouponCode || null,
                    totalAmount,
                    taxAmount,
                    cgst,
                    sgst,
                    igst > 0 ? String(igst) : null,
                    cgst,
                    sgst,
                    igst,
                    paymentMethod,
                    source,
                    finalShippingCost,
                    validatedZoneId,
                    normShippingState,
                    customerNotes || null,
                    adminNotes || null
                ]
            );

            // 8. Insert Order Items
            for (let idx = 0; idx < verifiedCartItems.length; idx++) {
                const verified = verifiedCartItems[idx];
                const discounted = discountResult.discountedItems[idx];
                const itemId = crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                await conn.query(
                    `INSERT INTO \`order_items\` (
                        \`id\`, \`order_id\`, \`product_id\`, \`quantity\`, \`price_at_time\`, \`price\`,
                        \`paid_price_per_unit\`, \`product_name\`, \`variant_id\`, \`variant_name\`, \`created_at\`
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        itemId,
                        orderId,
                        verified.id,
                        verified.qty,
                        Math.round(verified.price),
                        verified.price,
                        discounted?.paidUnitPrice ?? verified.price,
                        verified.name,
                        verified.variantId || null,
                        verified.variantName || null
                    ]
                );
            }

            // 9. Record Applied Discounts and Increment Usage Count
            if (discountResult.appliedRules && discountResult.appliedRules.length > 0) {
                for (const ar of discountResult.appliedRules) {
                    const odId = `od_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                    await conn.query(
                        `INSERT INTO \`order_discounts\` (
                            \`id\`, \`order_id\`, \`discount_rule_id\`, \`discount_name\`, \`discount_type\`,
                            \`discount_value\`, \`discount_amount\`, \`created_at\`
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            odId,
                            orderId,
                            ar.id || null,
                            ar.name || 'Promotion',
                            ar.discountType || 'PERCENTAGE',
                            ar.discountValue || 0,
                            ar.discountAmount || 0
                        ]
                    );

                    if (ar.id) {
                        await conn.query(
                            "UPDATE `discount_rules` SET `usage_count` = COALESCE(`usage_count`, 0) + 1 WHERE `id` = ?",
                            [ar.id]
                        );
                    }
                }
            }

            // 10. Persist Customer Address in Address Book
            if (customerId && shippingAddress) {
                const addrId = `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                const addrName = shippingAddress.name || shippingAddress.full_name || customerName || '';
                const addrPhone = shippingAddress.phone || customerPhone || '';
                const addrLine = shippingAddress.address_line || shippingAddress.address || '';
                const addrCity = shippingAddress.city || '';
                const addrState = shippingAddress.state || normShippingState;
                const addrPincode = shippingAddress.pincode || shippingAddress.zip || '';
                const addrCountry = shippingAddress.country || 'India';

                await conn.query(
                    `INSERT INTO \`customer_addresses\` (
                        \`id\`, \`customer_id\`, \`name\`, \`phone\`, \`address\`, \`address_line\`,
                        \`city\`, \`state\`, \`pincode\`, \`country\`, \`is_default\`, \`created_at\`, \`updated_at\`
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                        \`name\` = VALUES(\`name\`),
                        \`phone\` = VALUES(\`phone\`),
                        \`address\` = VALUES(\`address\`),
                        \`address_line\` = VALUES(\`address_line\`),
                        \`city\` = VALUES(\`city\`),
                        \`state\` = VALUES(\`state\`),
                        \`pincode\` = VALUES(\`pincode\`),
                        \`country\` = VALUES(\`country\`),
                        \`updated_at\` = NOW()`,
                    [
                        addrId, customerId, addrName, addrPhone, addrLine, addrLine,
                        addrCity, addrState, addrPincode, addrCountry
                    ]
                );
            }

            // 11. Insert Initial Status Log
            const logId = crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            await conn.query(
                `INSERT INTO \`order_status_logs\` (\`id\`, \`order_id\`, \`status\`, \`notes\`, \`created_at\`)
                 VALUES (?, ?, ?, 'Order created via secure server API with ACID transaction guarantee', NOW())`,
                [logId, orderId, initialStatus]
            );

            return {
                orderId,
                invoiceNo,
                totalAmount,
                subtotal,
                taxAmount,
                cgst,
                sgst,
                igst,
                shippingCost: finalShippingCost,
                initialStatus,
                customerName,
                customerPhone,
                customerEmail,
                paymentMethod
            };
        });

        // ═════════════════════════════════════════════════════════════════════════
        // POST-COMMIT ACTIONS
        // These asynchronous side-effects run ONLY AFTER the database transaction
        // has successfully committed, preventing spurious emails/messages on failure.
        // ═════════════════════════════════════════════════════════════════════════
        try {
            await dispatchNotification({
                eventType: EVENT_TYPES.ORDER_PLACED,
                order: {
                    id: orderResult.orderId,
                    invoice_no: orderResult.invoiceNo,
                    customer_name: orderResult.customerName,
                    customer_phone: orderResult.customerPhone,
                    customer_email: orderResult.customerEmail,
                    total_amount: orderResult.totalAmount,
                    payment_method: orderResult.paymentMethod,
                    status: orderResult.initialStatus
                }
            });
        } catch (notifErr) {
            console.error('[ORDER-CREATE-NOTIF-ERROR] Notification dispatch failed:', notifErr);
        }

        return new Response(JSON.stringify({ 
            success: true, 
            orderId: orderResult.orderId,
            invoiceNo: orderResult.invoiceNo,
            totalAmount: orderResult.totalAmount
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (err) {
        console.error('[ORDER-CREATE-ERROR] Transaction rolled back:', err);
        return new Response(JSON.stringify({ 
            error: err.message || 'Failed to place order. Transaction was rolled back.' 
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
}
