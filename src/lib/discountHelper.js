/**
 * Utility helper to format detailed discount rule percentage, name, and amount
 * for display across Admin Web Invoices, PDF Invoices, Email Notifications, and WhatsApp Messages.
 */
export function getDiscountDetails(order) {
    if (!order) return [];

    const totalDiscount = parseFloat(
        order.total_discount ||
        order.discount_amount ||
        order.cart_discount ||
        order.product_discount ||
        order.coupon_discount ||
        0
    );

    if (totalDiscount <= 0) return [];

    // Calculate base subtotal if missing
    const items = order.order_items || order.items || [];
    const subtotal = parseFloat(order.subtotal || 0) || items.reduce((sum, item) => {
        const p = parseFloat(item.price_at_time || item.price || 0);
        const q = parseInt(item.quantity || item.qty || 1, 10);
        return sum + (p * q);
    }, 0);

    const discountsList = order.order_discounts || order.discounts || [];

    if (Array.isArray(discountsList) && discountsList.length > 0) {
        return discountsList.map(d => {
            const name = d.discount_name || d.name || order.coupon_code || 'Discount';
            const val = parseFloat(d.discount_value || 0);
            const type = (d.discount_type || 'PERCENTAGE').toUpperCase();
            const amt = parseFloat(d.discount_amount || d.amount || 0) || totalDiscount;

            let pctStr = '';
            if (type === 'PERCENTAGE' && val > 0) {
                pctStr = `${val}%`;
            } else if (subtotal > 0 && amt > 0) {
                const calcPct = Math.round((amt / subtotal) * 100);
                pctStr = calcPct > 0 ? `${calcPct}%` : '';
            }

            let label = 'Discount';
            if (name && pctStr) {
                label = `Discount (${name} - ${pctStr}):`;
            } else if (name) {
                label = `Discount (${name}):`;
            } else if (pctStr) {
                label = `Discount (${pctStr}):`;
            } else {
                label = 'Discount:';
            }

            return {
                name,
                type,
                value: val,
                percentage: pctStr,
                label,
                amount: amt
            };
        });
    }

    // Fallback: calculate percentage from totalDiscount vs subtotal
    let pctStr = '';
    if (subtotal > 0 && totalDiscount > 0) {
        const calcPct = Math.round((totalDiscount / subtotal) * 100);
        if (calcPct > 0) {
            pctStr = `${calcPct}%`;
        }
    }

    const couponCode = order.coupon_code || order.couponCode;
    let label = 'Discount';
    if (couponCode && pctStr) {
        label = `Discount (${couponCode} - ${pctStr}):`;
    } else if (couponCode) {
        label = `Discount (${couponCode}):`;
    } else if (pctStr) {
        label = `Discount (${pctStr}):`;
    } else {
        label = 'Discount:';
    }

    return [{
        name: couponCode || 'Discount',
        percentage: pctStr,
        label,
        amount: totalDiscount
    }];
}
