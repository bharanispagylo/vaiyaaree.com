import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export async function GET() {
    try {
        const now = new Date();

        // 1. Fetch active automatic rules (coupon_code is null or empty, or general rules)
        const { data: rules, error: rulesError } = await mysqlClient
            .from('discount_rules')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (rulesError) throw rulesError;

        if (!rules || rules.length === 0) {
            return NextResponse.json({ success: true, rules: [] }, { status: 200 });
        }

        // Filter valid by date
        const validRules = rules.filter(r => {
            if (r.start_date && new Date(r.start_date) > now) return false;
            if (r.end_date && new Date(r.end_date) < now) return false;
            return true;
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
