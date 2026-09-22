import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { isRuleActiveByDate } from '@/services/discountService';

export async function GET() {
    try {
        // 1. Fetch discount rules ordered by priority
        const { data: rules, error: rulesError } = await mysqlClient
            .from('discount_rules')
            .select('*')
            .order('priority', { ascending: false });

        if (rulesError) throw rulesError;

        if (!rules || rules.length === 0) {
            return NextResponse.json({ success: true, rules: [] }, { status: 200 });
        }

        // Filter active rules with tolerant check (1, true, '1')
        const activeRules = rules.filter(r => r.is_active === 1 || r.is_active === true || r.is_active === '1');

        // Filter valid by date using standardized isRuleActiveByDate
        const validRules = activeRules.filter(r => {
            const check = isRuleActiveByDate(r.start_date, r.end_date);
            return check.active;
        });

        if (validRules.length === 0) {
            return NextResponse.json({ success: true, rules: [] }, { status: 200 });
        }

        const ruleIds = validRules.map(r => r.id);

        // Fetch categories & products mappings concurrently
        const [categoriesRes, productsRes] = await Promise.all([
            mysqlClient.from('discount_rule_categories').select('*').in('discount_rule_id', ruleIds),
            mysqlClient.from('discount_rule_products').select('*').in('discount_rule_id', ruleIds)
        ]);

        const catMap = {};
        (categoriesRes.data || []).forEach(c => {
            if (!catMap[c.discount_rule_id]) catMap[c.discount_rule_id] = [];
            catMap[c.discount_rule_id].push(c.category);
        });

        const prodMap = {};
        (productsRes.data || []).forEach(p => {
            if (!prodMap[p.discount_rule_id]) prodMap[p.discount_rule_id] = [];
            prodMap[p.discount_rule_id].push(p.product_id);
        });

        const enrichedRules = validRules.map(r => {
            const basis = (r.target_type === 'SPECIFIC_PRODUCTS' || r.target_type === 'SPECIFIC_CATEGORIES')
                ? 'PRODUCT'
                : (r.calculation_basis ? String(r.calculation_basis).toUpperCase() : 'PRODUCT');

            const prodType = r.product_discount_type || (basis === 'PRODUCT' ? (r.discount_type || 'PERCENTAGE') : 'PERCENTAGE');
            const prodVal = Number(r.product_discount_value) > 0
                ? parseFloat(r.product_discount_value)
                : (basis === 'PRODUCT' && Number(r.discount_value) > 0 ? parseFloat(r.discount_value) : parseFloat(r.product_discount_value ?? r.discount_value ?? 0));

            const cartType = r.cart_discount_type || (basis === 'CART' ? (r.discount_type || 'PERCENTAGE') : 'PERCENTAGE');
            const cartVal = Number(r.cart_discount_value) > 0
                ? parseFloat(r.cart_discount_value)
                : (basis === 'CART' && Number(r.discount_value) > 0 ? parseFloat(r.discount_value) : parseFloat(r.cart_discount_value ?? r.discount_value ?? 0));

            return {
                ...r,
                calculation_basis: basis,
                product_discount_type: prodType,
                product_discount_value: prodVal,
                cart_discount_type: cartType,
                cart_discount_value: cartVal,
                discount_type: basis === 'CART' ? cartType : prodType,
                discount_value: basis === 'CART' ? cartVal : prodVal,
                categories: (catMap[r.id] || []).map(c => String(c).trim()).filter(Boolean),
                product_ids: (prodMap[r.id] || []).map(p => String(p).trim()).filter(Boolean)
            };
        });

        return NextResponse.json({
            success: true,
            rules: enrichedRules
        }, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (err) {
        console.error('[API /api/discounts/active Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch active discounts' }, { status: 500 });
    }
}
