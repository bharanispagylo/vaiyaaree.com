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

        const enrichedRules = validRules.map(r => ({
            ...r,
            categories: catMap[r.id] || [],
            product_ids: prodMap[r.id] || []
        }));

        return NextResponse.json({
            success: true,
            rules: enrichedRules
        }, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
            }
        });
    } catch (err) {
        console.error('[API /api/discounts/active Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch active discounts' }, { status: 500 });
    }
}
