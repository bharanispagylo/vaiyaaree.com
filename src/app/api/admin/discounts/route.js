import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

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
        const body = await request.json();
        const {
            name,
            description,
            coupon_code,
            discount_type,
            discount_value,
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

        const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const cleanCoupon = coupon_code && coupon_code.trim() ? coupon_code.trim().toUpperCase() : null;

        const rulePayload = {
            id,
            name: name.trim(),
            description: description || null,
            coupon_code: cleanCoupon,
            discount_type: discount_type || 'PERCENTAGE',
            discount_value: parseFloat(discount_value || 0),
            target_type: target_type || 'ALL_PRODUCTS',
            minimum_cart_amount: parseFloat(minimum_cart_amount || 0),
            maximum_discount_amount: null,
            minimum_cart_products_enabled: minimum_cart_products_enabled ? 1 : 0,
            minimum_cart_products: minimum_cart_products_enabled && minimum_cart_products ? parseInt(minimum_cart_products, 10) : null,
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
        if (target_type === 'SPECIFIC_PRODUCTS' && Array.isArray(product_ids) && product_ids.length > 0) {
            const prodInserts = product_ids.map(pid => ({
                id: `drp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                discount_rule_id: id,
                product_id: pid
            }));
            await mysqlClient.from('discount_rule_products').insert(prodInserts);
        } else if (target_type === 'SPECIFIC_CATEGORIES' && Array.isArray(categories) && categories.length > 0) {
            const catInserts = categories.map(cat => ({
                id: `drc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                discount_rule_id: id,
                category: cat
            }));
            await mysqlClient.from('discount_rule_categories').insert(catInserts);
        } else if (target_type === 'SPECIFIC_CUSTOMERS' && Array.isArray(customer_ids) && customer_ids.length > 0) {
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
        const body = await request.json();
        const { id, product_ids, categories, customer_ids, ...updateFields } = body;

        if (!id) {
            return NextResponse.json({ error: 'Rule ID is required for update' }, { status: 400 });
        }

        if (updateFields.coupon_code !== undefined) {
            updateFields.coupon_code = updateFields.coupon_code && updateFields.coupon_code.trim() ? updateFields.coupon_code.trim().toUpperCase() : null;
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
