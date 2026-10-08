/**
 * Utility helper to format detailed discount rule name/coupon and amount
 * for display across Admin Web Invoices, PDF Invoices, Email Notifications, and WhatsApp Messages.
 * 
 * NOTE: Strictly adds discount info (Coupon code or Title). Does NOT calculate
 * or append percentage during Invoice PDF or Email generation.
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
    const orderCoupon = (order.coupon_code || order.couponCode || order.discount_title || order.discount_name || '').trim();

    if (Array.isArray(discountsList) && discountsList.length > 0) {
        return discountsList.map(d => {
            let name = (d.discount_name || d.name || '').trim();
            if ((!name || name.toLowerCase() === 'promotion' || name.toLowerCase() === 'discount') && orderCoupon) {
                name = orderCoupon;
            }
            if (!name) {
                name = orderCoupon || 'Discount';
            }

            const val = parseFloat(d.discount_value || 0);
            const type = (d.discount_type || 'PERCENTAGE').toUpperCase();
            const amt = parseFloat(d.discount_amount || d.amount || 0) || totalDiscount;

            // Only add discount info (Coupon code or Title). No percentage calculation.
            let label = 'Discount:';
            if (name && name.toLowerCase() !== 'discount') {
                label = `Discount (${name}):`;
            }

            return {
                name,
                type,
                value: val,
                percentage: '',
                label,
                amount: amt
            };
        });
    }

    // Fallback when discounts list is not available: use coupon code or title, no percentage calculation
    let label = 'Discount:';
    if (orderCoupon && orderCoupon.toLowerCase() !== 'discount') {
        label = `Discount (${orderCoupon}):`;
    }

    return [{
        name: orderCoupon || 'Discount',
        percentage: '',
        label,
        amount: totalDiscount
    }];
}
