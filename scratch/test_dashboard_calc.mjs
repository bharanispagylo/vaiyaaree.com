import { mysqlClient } from '../src/lib/mysqlClient.js';

async function testDashboardCalculations() {
    console.log('--- Testing Dashboard Calculations & Data Pipeline ---');

    const [ordersRes, productsRes, itemsRes] = await Promise.all([
        mysqlClient.from('orders')
            .select('id, invoice_no, total_amount, subtotal, shipping_cost, refund_amount, status, created_at, source, customer_name, customer_phone')
            .neq('status', 'DRAFT')
            .order('created_at', { ascending: false }),
        mysqlClient.from('products')
            .select('id, name, stock, image_url, price, alert_threshold')
            .order('stock', { ascending: true }),
        mysqlClient.from('order_items')
            .select('product_name, quantity, price_at_time, order_id')
            .limit(2000)
    ]);

    const orders = ordersRes.data || [];
    const products = productsRes.data || [];
    const items = itemsRes.data || [];

    console.log(`Fetched: ${orders.length} orders, ${products.length} products, ${items.length} order items`);

    const isOrderInDateRange = (dateStr, filter, startStr, endStr) => {
        if (filter === 'ALL') return true;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;

        const now = new Date();
        if (filter === 'TODAY') {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return d >= startOfToday && d <= endOfToday;
        }
        if (filter === '7D') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return d >= sevenDaysAgo && d <= now;
        }
        if (filter === 'THIS_MONTH') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            return d >= startOfMonth && d <= now;
        }
        if (filter === 'CUSTOM') {
            if (startStr) {
                const start = new Date(startStr + 'T00:00:00');
                if (d < start) return false;
            }
            if (endStr) {
                const end = new Date(endStr + 'T23:59:59.999');
                if (d > end) return false;
            }
            return true;
        }
        return true;
    };

    const filters = ['ALL', 'TODAY', '7D', 'THIS_MONTH'];
    for (const f of filters) {
        const filtered = orders.filter(o => isOrderInDateRange(o.created_at, f));
        let gross = 0;
        let refund = 0;
        let shipping = 0;
        let net = 0;
        const activeIds = new Set();

        filtered.forEach(o => {
            const status = String(o.status || '').toUpperCase();
            const total = Number(o.total_amount) || 0;
            const ref = Number(o.refund_amount) || 0;
            const ship = Number(o.shipping_cost) || 0;

            if (status !== 'CANCELLED' && status !== 'REFUNDED' && status !== 'DRAFT') {
                activeIds.add(o.id);
                gross += total;
                refund += ref;
                shipping += ship;
                net += Math.max(0, total - ref - ship);
            }
        });

        // Top selling
        const productSales = {};
        items.forEach(item => {
            if (!activeIds.has(item.order_id)) return;
            const k = item.product_name;
            if (!k) return;
            if (!productSales[k]) productSales[k] = { name: k, sold: 0, rev: 0 };
            productSales[k].sold += Number(item.quantity) || 1;
            productSales[k].rev += (Number(item.price_at_time) || 0) * (Number(item.quantity) || 1);
        });

        const top = Object.values(productSales).sort((a, b) => b.sold - a.sold).slice(0, 3);

        console.log(`[Filter: ${f}] Orders: ${filtered.length}, Gross: ₹${gross}, Refunds: ₹${refund}, Shipping: ₹${shipping}, Net (totalRevenue): ₹${net}, Top Selling Items: ${top.length}`);
    }

    console.log('--- Test Completed Successfully ---');
    process.exit(0);
}

testDashboardCalculations().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
