import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { verifyAdmin } from '@/lib/auth';

export async function GET(request) {
    try {
        const { data: rules, error: rulesErr } = await mysqlClient
            .from('discount_rules')
            .select('*')
            .order('priority', { ascending: false });

        if (rulesErr) throw rulesErr;

        const ruleIds = (rules || []).map(r => r.id);
        let products = [], categories = [], customers = [];

        if (ruleIds.length > 0) {
            const [pRes, cRes, cuRes] = await Promise.all([
                mysqlClient.from('discount_rule_products').select('*').in('discount_rule_id', ruleIds),
                mysqlClient.from('discount_rule_categories').select('*').in('discount_rule_id', ruleIds),
                mysqlClient.from('discount_rule_customers').select('*').in('discount_rule_id', ruleIds)
            ]);
            products = pRes.data || [];
            categories = cRes.data || [];
            customers = cuRes.data || [];
        }

        const enrichedRules = (rules || []).map(r => ({
            ...r,
            products: products.filter(p => p.discount_rule_id === r.id),
            categories: categories.filter(c => c.discount_rule_id === r.id),
            customers: customers.filter(c => c.discount_rule_id === r.id)
        }));

        return NextResponse.json({ success: true, rules: enrichedRules }, { status: 200 });
    } catch (err) {
        console.error('[GET /api/admin/discounts Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized: Admin privileges required' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name,
            description,
            coupon_code,
            calculation_basis,
            threshold_type,
            threshold_count,
            threshold_value,
            discount_type,
            discount_value,
            product_discount_type,
            product_discount_value,
            cart_discount_type,
            cart_discount_value,
            target_type,
            minimum_cart_amount,
            maximum_discount_amount,
            minimum_cart_products_enabled,
            minimum_cart_products,
            start_date,
            end_date,
            priority,
            is_active,
            usage_limit,
            customer_limit,
            stackable,
            product_ids,
            categories,
            customer_ids
        } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Discount Rule Title is required' }, { status: 400 });
        }

        const basis = (calculation_basis || 'PRODUCT').toUpperCase();
        const isCart = basis === 'CART';
        const finalThresholdType = isCart ? (threshold_type || (target_type === 'CART_VALUE' ? 'VALUE' : 'COUNT')).toUpperCase() : null;
        const finalThresholdCount = isCart ? (threshold_count !== null && threshold_count !== undefined ? Math.max(1, parseInt(threshold_count, 10)) : 1) : null;
        const finalThresholdValue = isCart ? (threshold_value !== null && threshold_value !== undefined ? Math.max(0, parseFloat(threshold_value)) : 0) : null;
        const finalTargetType = target_type || 'ALL_PRODUCTS';

        // Decoupled types & values
        const prodType = product_discount_type || (basis === 'PRODUCT' ? (discount_type || 'PERCENTAGE') : 'PERCENTAGE');
        const prodVal = prodType === 'FREE_SHIPPING' ? 0 : parseFloat(product_discount_value ?? (basis === 'PRODUCT' ? (discount_value ?? 10) : 10));

        const cartType = cart_discount_type || (basis === 'CART' ? (discount_type || 'PERCENTAGE') : 'PERCENTAGE');
        const cartVal = cartType === 'FREE_SHIPPING' ? 0 : parseFloat(cart_discount_value ?? (basis === 'CART' ? (discount_value ?? 10) : 10));

        // Effective discount type & value for current calculation basis (for checkout compatibility)
        const dType = basis === 'CART' ? cartType : prodType;
        const dVal = basis === 'CART' ? cartVal : prodVal;

        if (dType === 'PERCENTAGE' && (dVal <= 0 || dVal > 100)) {
            return NextResponse.json({ error: 'Percentage discount must be greater than 0 and up to 100%' }, { status: 400 });
        }
        if (dType === 'FIXED_AMOUNT' && dVal <= 0) {
            return NextResponse.json({ error: 'Fixed amount discount must be greater than 0' }, { status: 400 });
        }

        const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const cleanCoupon = coupon_code && coupon_code.trim() ? coupon_code.trim().toUpperCase() : null;

        const rulePayload = {
            id,
            name: name.trim(),
            description: description || null,
            coupon_code: cleanCoupon,
            calculation_basis: basis,
            threshold_type: finalThresholdType,
            threshold_count: finalThresholdCount,
            threshold_value: finalThresholdValue,
            discount_type: dType,
            discount_value: dVal,
            product_discount_type: prodType,
            product_discount_value: prodVal,
            cart_discount_type: cartType,
            cart_discount_value: cartVal,
            target_type: finalTargetType,
            minimum_cart_amount: parseFloat(minimum_cart_amount || 0),
            maximum_discount_amount: null,
            minimum_cart_products_enabled: minimum_cart_products_enabled ? 1 : 0,
            minimum_cart_products: minimum_cart_products ? parseInt(minimum_cart_products, 10) : 3,
            start_date: start_date || null,
            end_date: end_date || null,
            priority: parseInt(priority || 0, 10),
            is_active: is_active ? 1 : 0,
            usage_limit: null,
            customer_limit: customer_limit ? parseInt(customer_limit, 10) : 1,
            stackable: stackable ? 1 : 0
        };

        const { data: newRule, error: insertErr } = await mysqlClient
            .from('discount_rules')
            .insert([rulePayload])
            .select()
            .single();

        if (insertErr) throw insertErr;

        // Insert targets if applicable
        if (finalTargetType === 'SPECIFIC_PRODUCTS' && Array.isArray(product_ids) && product_ids.length > 0) {
            const prodInserts = product_ids.map(pid => ({
                id: `drp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                discount_rule_id: id,
                product_id: pid
            }));
            await mysqlClient.from('discount_rule_products').insert(prodInserts);
        } else if (finalTargetType === 'SPECIFIC_CATEGORIES' && Array.isArray(categories) && categories.length > 0) {
            const catInserts = categories.map(cat => ({
                id: `drc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                discount_rule_id: id,
                category: cat
            }));
            await mysqlClient.from('discount_rule_categories').insert(catInserts);
        } else if (finalTargetType === 'SPECIFIC_CUSTOMERS' && Array.isArray(customer_ids) && customer_ids.length > 0) {
            const custInserts = customer_ids.map(cid => ({
                id: `drcust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                discount_rule_id: id,
                customer_id: cid
            }));
            await mysqlClient.from('discount_rule_customers').insert(custInserts);
        }

        return NextResponse.json({ success: true, rule: newRule }, { status: 200 });
    } catch (err) {
        console.error('[POST /api/admin/discounts Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized: Admin privileges required' }, { status: 401 });
        }

        const body = await request.json();
        const { id, product_ids, categories, customer_ids, ...updateFields } = body;

        if (!id) {
            return NextResponse.json({ error: 'Rule ID is required for update' }, { status: 400 });
        }

        if (updateFields.coupon_code !== undefined) {
            updateFields.coupon_code = updateFields.coupon_code && updateFields.coupon_code.trim() ? updateFields.coupon_code.trim().toUpperCase() : null;
        }

        const basis = (updateFields.calculation_basis || 'PRODUCT').toUpperCase();
        updateFields.calculation_basis = basis;

        // Process product discount fields
        if (updateFields.product_discount_type !== undefined) {
            if (updateFields.product_discount_type === 'FREE_SHIPPING') {
                updateFields.product_discount_value = 0;
            } else if (updateFields.product_discount_value !== undefined) {
                updateFields.product_discount_value = parseFloat(updateFields.product_discount_value || 0);
            }
        }

        // Process cart discount fields
        if (updateFields.cart_discount_type !== undefined) {
            if (updateFields.cart_discount_type === 'FREE_SHIPPING') {
                updateFields.cart_discount_value = 0;
            } else if (updateFields.cart_discount_value !== undefined) {
                updateFields.cart_discount_value = parseFloat(updateFields.cart_discount_value || 0);
            }
        }

        // Sync effective discount_type & discount_value for the active basis
        if (basis === 'CART') {
            updateFields.discount_type = updateFields.cart_discount_type || updateFields.discount_type || 'PERCENTAGE';
            updateFields.discount_value = updateFields.discount_type === 'FREE_SHIPPING'
                ? 0
                : parseFloat(updateFields.cart_discount_value ?? updateFields.discount_value ?? 0);
        } else {
            updateFields.discount_type = updateFields.product_discount_type || updateFields.discount_type || 'PERCENTAGE';
            updateFields.discount_value = updateFields.discount_type === 'FREE_SHIPPING'
                ? 0
                : parseFloat(updateFields.product_discount_value ?? updateFields.discount_value ?? 0);
        }

        // Validation for discount values (prevent >100% discount or invalid fixed discount)
        if (updateFields.product_discount_type === 'PERCENTAGE' && updateFields.product_discount_value !== undefined) {
            if (updateFields.product_discount_value <= 0 || updateFields.product_discount_value > 100) {
                return NextResponse.json({ error: 'Product percentage discount must be greater than 0 and up to 100%' }, { status: 400 });
            }
        }
        if (updateFields.cart_discount_type === 'PERCENTAGE' && updateFields.cart_discount_value !== undefined) {
            if (updateFields.cart_discount_value <= 0 || updateFields.cart_discount_value > 100) {
                return NextResponse.json({ error: 'Cart percentage discount must be greater than 0 and up to 100%' }, { status: 400 });
            }
        }
        if (updateFields.discount_type === 'PERCENTAGE' && (updateFields.discount_value <= 0 || updateFields.discount_value > 100)) {
            return NextResponse.json({ error: 'Percentage discount must be greater than 0 and up to 100%' }, { status: 400 });
        }
        if (updateFields.discount_type === 'FIXED_AMOUNT' && updateFields.discount_value <= 0) {
            return NextResponse.json({ error: 'Fixed amount discount must be greater than 0' }, { status: 400 });
        }

        if (basis !== 'CART') {
            updateFields.threshold_type = null;
            updateFields.threshold_count = null;
            updateFields.threshold_value = null;
        } else {
            if (updateFields.threshold_count !== undefined && updateFields.threshold_count !== null) {
                updateFields.threshold_count = parseInt(updateFields.threshold_count, 10);
            }
            if (updateFields.threshold_value !== undefined && updateFields.threshold_value !== null) {
                updateFields.threshold_value = parseFloat(updateFields.threshold_value);
            }
        }
        if (updateFields.minimum_cart_products !== undefined && updateFields.minimum_cart_products !== null) {
            updateFields.minimum_cart_products = parseInt(updateFields.minimum_cart_products, 10);
        }
        if (updateFields.minimum_cart_products_enabled !== undefined) {
            updateFields.minimum_cart_products_enabled = updateFields.minimum_cart_products_enabled ? 1 : 0;
        }

        const { data: updatedRule, error: updateErr } = await mysqlClient
            .from('discount_rules')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // Sync relationships if targets provided
        if (Array.isArray(product_ids)) {
            await mysqlClient.from('discount_rule_products').delete().eq('discount_rule_id', id);
            if (product_ids.length > 0) {
                const prodInserts = product_ids.map(pid => ({
                    id: `drp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    discount_rule_id: id,
                    product_id: pid
                }));
                await mysqlClient.from('discount_rule_products').insert(prodInserts);
            }
        }

        if (Array.isArray(categories)) {
            await mysqlClient.from('discount_rule_categories').delete().eq('discount_rule_id', id);
            if (categories.length > 0) {
                const catInserts = categories.map(cat => ({
                    id: `drc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    discount_rule_id: id,
                    category: cat
                }));
                await mysqlClient.from('discount_rule_categories').insert(catInserts);
            }
        }

        return NextResponse.json({ success: true, rule: updatedRule }, { status: 200 });

    } catch (err) {
        console.error('[PUT /api/admin/discounts Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized: Admin privileges required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
        }

        const { error } = await mysqlClient.from('discount_rules').delete().eq('id', id);
        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Discount rule deleted' }, { status: 200 });
    } catch (err) {
        console.error('[DELETE /api/admin/discounts Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
