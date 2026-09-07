import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { parseDateToUTC } from '@/lib/dateUtils';

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

        // Filter valid by date using standardized parseDateToUTC with end-of-day handling
        const validRules = rules.filter(r => {
            if (r.start_date) {
                const start = parseDateToUTC(r.start_date);
                if (start && start > now) return false;
            }
            if (r.end_date) {
                let end = parseDateToUTC(r.end_date);
                if (end) {
                    if (typeof r.end_date === 'string' && !r.end_date.includes(':')) {
                        end = new Date(end.getTime() + (23 * 3600 + 59 * 60 + 59) * 1000 + 999);
                    }
                    if (end < now) return false;
                }
            }
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
