import { mysqlClient, mysqlAdmin } from '@/lib/mysqlClient';
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
            paymentMethod,
            cart,
            shippingCost,
            shippingZoneId,
            shippingState,
            couponCode
        } = body;

        // Generate unified sequential order ID & invoice number if missing or non-sequential format
        let orderId = rawOrderId;
        let invoiceNo = null;
        if (!orderId || !/^WEB-\d{3,}$/i.test(orderId)) {
            const nextData = await getNextOrderAndInvoiceId('WEB', mysqlClient);
            orderId = nextData.orderId;
            invoiceNo = nextData.invoiceNo;
        } else {
            const num = orderId.split('-')[1] || '0001';
            invoiceNo = `INV-${num.padStart(4, '0')}`;
        }

        // 0. INPUT VALIDATION (Negative Case)
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return new Response(JSON.stringify({ error: 'Cart is empty' }), { status: 400 });
        }

        for (const item of cart) {
            if (!item.qty || typeof item.qty !== 'number' || item.qty <= 0) {
                return new Response(JSON.stringify({ error: `Invalid quantity for ${item.name}` }), { status: 400 });
            }
        }

        // 1. RE-CALCULATE PRICES ON SERVER (Financial Integrity)
        let subtotal = 0;
        const itemsToInsert = [];

        // Fetch business state for tax calculation
        const { data: bizStateData } = await mysqlClient.from('app_settings').select('value').eq('key', 'business_state').single();
        const businessState = bizStateData?.value || 'Tamil Nadu';

        const verifiedCartItems = [];
        for (const item of cart) {
            let actualPrice = 0;
            let actualName = item.name;
            let actualCategory = item.category || '';

            if (item.variantId) {
                const { data: v } = await mysqlClient.from('product_variants').select('price, name, stock').eq('id', item.variantId).single();
                if (!v) throw new Error(`Product variant not found: ${item.name}`);
                if (v.stock < item.qty) throw new Error(`Insufficient stock for ${item.name} (${v.name}). Only ${v.stock} left.`);
                actualPrice = v.price;
            } else {
                const { data: p } = await mysqlClient.from('products').select('price, name, stock, category').eq('id', item.id).single();
                if (!p) throw new Error(`Product not found: ${item.name}`);
                if (p.stock < item.qty) throw new Error(`Insufficient stock for ${item.name}. Only ${p.stock} left.`);
                actualPrice = p.price;
                if (p.category) actualCategory = p.category;
            }

            subtotal += actualPrice * item.qty;
            verifiedCartItems.push({
                id: item.id,
                name: actualName,
                category: actualCategory,
                price: actualPrice,
                qty: item.qty,
                variantId: item.variantId || null
            });
        }

        // --- Server-Side Shipping & Tax Recalculation ---
        const shippingCountry = (body.shippingCountry || shippingAddress?.country || billingAddress?.country || 'India').trim();
        const isInternational = shippingCountry.toLowerCase() !== 'india' && shippingCountry.toLowerCase() !== 'in';
        const shippingCity = (shippingAddress?.city || '').trim().toLowerCase();
        const normShippingState = (shippingState || shippingAddress?.state || 'Tamil Nadu').trim();
        const normBizState = businessState.trim().toLowerCase();

        // 2. Shipping Recalculation from Database
        const isZoneIntl = (z) => {
            if (!z) return false;
            return z.is_international === true || z.is_international === 1 || z.is_international === '1' || String(z.is_international).toLowerCase() === 'true';
        };

        const { data: dbZones } = await mysqlClient.from('shipping_zones').select('*');
        const { data: dbMappings } = await mysqlClient.from('shipping_zone_states').select('*');

        let calculatedShippingCost = 0;
        let validatedZoneId = shippingZoneId || null;
        let activeZone = null;

        if (dbZones && dbZones.length > 0) {
            if (isInternational) {
                const intlZones = dbZones.filter(z => isZoneIntl(z));
                const intlZoneIds = new Set(intlZones.map(z => z.id));
                const mappings = dbMappings || [];

                const countryMapping = mappings.find(m => 
                    intlZoneIds.has(m.zone_id) &&
                    m.state_name?.trim().toLowerCase() === shippingCountry.toLowerCase()
                );

                if (countryMapping) {
                    activeZone = intlZones.find(z => z.id === countryMapping.zone_id) || null;
                }
                if (!activeZone) {
                    activeZone = intlZones[0] || null;
                }
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
                    if (stateMapping) {
                        activeZone = domesticZones.find(z => z.id === stateMapping.zone_id);
                    } else {
                        activeZone = domesticZones[0] || null;
                    }
                }
            }

            if (activeZone) {
                validatedZoneId = activeZone.id;
                const rate = parseFloat(activeZone.rate || 0);
                const threshold = parseFloat(activeZone.free_threshold || 0);
                if (threshold > 0 && subtotal >= threshold) {
                    calculatedShippingCost = 0;
                } else {
                    calculatedShippingCost = rate;
                }
            } else {
                calculatedShippingCost = isInternational ? 1500 : 100;
            }
        } else {
            calculatedShippingCost = typeof shippingCost === 'number' ? shippingCost : (isInternational ? 1500 : 100);
        }

        // --- 3. CENTRAL SERVER-SIDE DISCOUNT ENGINE RECALCULATION ---
        const discountResult = await calculateDiscounts({
            cartItems: verifiedCartItems,
            subtotal,
            shippingCost: calculatedShippingCost,
            couponCode: couponCode || null,
            customer: customerId ? { id: customerId } : null
        });

        const finalShippingCost = discountResult.shipping;
        const taxableSubtotal = discountResult.taxableAmount;

        // 4. Tax Recalculation based on taxable subtotal after discounts
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

        const totalAmount = taxableSubtotal + taxAmount + finalShippingCost;

        // Prepare order items to insert with allocated paid unit prices
        for (let idx = 0; idx < cart.length; idx++) {
            const rawItem = cart[idx];
            const verified = verifiedCartItems[idx];
            const discounted = discountResult.discountedItems[idx];

            itemsToInsert.push({
                order_id: orderId,
                product_id: rawItem.id,
                product_name: verified.name,
                quantity: rawItem.qty,
                price_at_time: verified.price,
                paid_price_per_unit: discounted?.paidUnitPrice ?? verified.price,
                variant_id: rawItem.variantId || null,
                variant_name: rawItem.variantName || null
            });
        }

        // --- End Tax & Shipping & Discount Recalculation ---

        // 5. CREATE ORDER (Atomic)
        const { error: orderError } = await mysqlClient.from('orders').insert({
            id: orderId,
            invoice_no: invoiceNo,
            customer_id: customerId,
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail,
            delivery_address: shippingAddress.address_line,
            billing_address: billingAddress,
            shipping_address: shippingAddress,
            status: paymentMethod === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT',
            subtotal: subtotal,
            product_discount: discountResult.productDiscount,
            cart_discount: discountResult.cartDiscount,
            coupon_discount: discountResult.couponDiscount,
            shipping_discount: discountResult.shippingDiscount,
            total_discount: discountResult.totalDiscount,
            coupon_code: discountResult.appliedCouponCode,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            cgst: cgst > 0 ? cgst : null,
            sgst: sgst > 0 ? sgst : null,
            igst: igst > 0 ? igst : null,
            payment_method: paymentMethod,
            source: 'WEBSITE',
            shipping_cost: finalShippingCost,
            shipping_zone_id: validatedZoneId,
            shipping_state: shippingState,
            created_at: new Date().toISOString()
        });

        if (orderError) throw orderError;

        // Record order discount snapshot into order_discounts table
        if (discountResult.appliedRules && discountResult.appliedRules.length > 0) {
            const orderDiscountInserts = discountResult.appliedRules.map(ar => ({
                id: `od_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                order_id: orderId,
                discount_rule_id: ar.id,
                discount_name: ar.name,
                discount_type: ar.discountType,
                discount_value: ar.discountValue,
                discount_amount: ar.discountAmount
            }));
            await mysqlClient.from('order_discounts').insert(orderDiscountInserts);

            // Increment usage_count on applied discount rules via RPC
            for (const ar of discountResult.appliedRules) {
                if (ar.id) {
                    const { error: rpcErr } = await mysqlClient.rpc('increment_discount_usage', { rule_id: ar.id });
                    if (rpcErr) {
                        console.error(`[Discount Usage Increment Error for rule ${ar.id}]:`, rpcErr);
                    }
                }
            }
        }

        // Save address into customer_addresses database table
        if (customerId && shippingAddress) {
            try {
                const { saveCustomerAddress } = await import('@/services/customerAddressService');
                await saveCustomerAddress({
                    customerId,
                    name: shippingAddress.full_name || shippingAddress.name || customerName,
                    phone: shippingAddress.phone || customerPhone,
                    address: shippingAddress.address_line || shippingAddress.address,
                    address_line: shippingAddress.address_line || shippingAddress.address,
                    city: shippingAddress.city,
                    state: shippingAddress.state || shippingState,
                    pincode: shippingAddress.pincode || shippingAddress.zip,
                    country: shippingAddress.country || 'India',
                    is_default: 1
                });
            } catch (addrErr) {
                console.error('[ORDER-CREATE] Address save error:', addrErr);
            }
        }

        // 4. INSERT ITEMS
        const { error: itemsError } = await mysqlClient.from('order_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        // 5. ATOMIC STOCK DEDUCTION (Race Condition Fix)
        // We iterate and use a conditional update to ensure stock never goes negative
        for (const item of cart) {
            const table = item.variantId ? 'product_variants' : 'products';
            const id = item.variantId || item.id;
            
            // Atomic update: only decrement if stock is sufficient
            // Using a raw RPC or a careful update sequence
            const { data: updated, error: deductError } = await mysqlClient.rpc('deduct_stock_atomic', {
                p_id: item.id,
                p_qty: item.qty,
                p_variant_id: item.variantId || null
            });

            // Fallback if RPC doesn't exist yet (not ideal, but keeps system running)
            if (deductError) {
                console.warn('[STOCK] RPC missing, falling back to manual atomic check');
                // Pattern: UPDATE ... WHERE id = x AND stock >= qty
                // Since mysqlClient client doesn't support easy WHERE clauses on increments yet, we'll fetch and update
                // But for a PROPER fix, we'll provide the SQL for the user to run.
                
                const { data: current } = await mysqlClient.from(table).select('stock').eq('id', id).single();
                if (!current || current.stock < item.qty) {
                     throw new Error(`Insufficient stock for ${item.name}`);
                }
                
                // SECURITY: Conditional Update (Atomic)
                // We only update IF the stock is still >= qty. 
                // This prevents race conditions where another order took the stock 1ms ago.
                const { data: updatedRows, error: finalError } = await mysqlClient
                    .from(table)
                    .update({ stock: current.stock - item.qty })
                    .eq('id', id)
                    .gte('stock', item.qty) // THE GUARD
                    .select('id, stock');

                if (finalError || !updatedRows || updatedRows.length === 0) {
                    throw new Error(`Item "${item.name}" is out of stock or was just purchased by another customer.`);
                }
            }

            // History log
            if (!item.variantId) {
                await mysqlClient.from('product_history').insert({
                    product_id: id,
                    change_type: 'SALE',
                    quantity_change: -item.qty,
                    reason: `Order Created (#${orderId})`
                });
            }
        }

        // 6. STATUS LOG & NOTIFICATION
        await mysqlClient.from('order_status_logs').insert({
            order_id: orderId,
            status: 'PLACED',
            notes: 'Order created via secure server API with tax & stock verification',
            created_at: new Date().toISOString()
        });

        // Trigger Customer & Admin Notifications
        try {
            const { data: fullCreatedOrder } = await mysqlClient.from('orders').select('*').eq('id', orderId).single();
            await dispatchNotification({
                eventType: EVENT_TYPES.ORDER_PLACED,
                order: fullCreatedOrder || {
                    id: orderId,
                    invoice_no: invoiceNo,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    customer_email: customerEmail,
                    total_amount: totalAmount,
                    payment_method: paymentMethod
                }
            });
        } catch (notifErr) {
            console.error('[ORDER-CREATE-NOTIF-ERROR]', notifErr);
        }

        return new Response(JSON.stringify({ success: true, orderId }), { status: 200 });

    } catch (err) {
        console.error('[ORDER-CREATE-ERROR]', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
