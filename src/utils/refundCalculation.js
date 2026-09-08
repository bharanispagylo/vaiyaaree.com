/**
 * Calculates itemized eligible refund for selected items from an order.
 * Follows exact formula:
 * Gross Price = Unit Price × Quantity
 * Discount adjustment = apportioned discount applied to the product (if order discount exists)
 * Taxable Subtotal = Gross Price - Discount
 * SGST = SGST percentage of taxable subtotal
 * CGST = CGST percentage of taxable subtotal (or IGST if interstate)
 * Eligible Refund = Taxable Subtotal + SGST + CGST
 * Total Eligible Refund = Sum of eligible refunds of all selected products
 */
export function calculateOrderItemsRefund(order, selectedItemIds = []) {
    if (!order || !selectedItemIds.length) {
        return { price: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, eligibleAmount: 0, items: [], isIGST: false };
    }

    const orderItems = (order.orderItems || order.order_items || []).filter(item => 
        selectedItemIds.includes(String(item.id)) || selectedItemIds.includes(String(item.product_id))
    );

    if (!orderItems.length) {
        return { price: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, eligibleAmount: 0, items: [], isIGST: false };
    }

    const orderSubtotal = Number(order.subtotal || 0);
    const orderTotalDiscount = Number(order.total_discount || order.totalDiscount || 0);
    const orderTaxable = Math.max(1, orderSubtotal - orderTotalDiscount);

    // Tax type resolution: tax_type field → stored amounts (canonical logic)
    const taxType = order.tax_type || '';
    const hasOrderCGST = Number(order.cgst_amount || order.cgst || 0) > 0;
    const hasOrderSGST = Number(order.sgst_amount || order.sgst || 0) > 0;
    const hasOrderIGST = Number(order.igst_amount || order.igst || 0) > 0;

    let cgstRate = 0.025;
    let sgstRate = 0.025;
    let igstRate = 0;

    // Determine if IGST applies using tax_type as primary, then stored amounts
    const orderIsIGST = taxType === 'IGST' || taxType === 'IGST_INTERNATIONAL'
        ? true
        : taxType === 'CGST_SGST'
            ? false
            : (hasOrderIGST && !hasOrderCGST && !hasOrderSGST);

    if (orderIsIGST) {
        igstRate = Number(order.igst_amount || order.igst || 0) / orderTaxable;
        cgstRate = 0;
        sgstRate = 0;
    } else if (hasOrderCGST || hasOrderSGST) {
        cgstRate = hasOrderCGST ? Number(order.cgst_amount || order.cgst) / orderTaxable : 0.025;
        sgstRate = hasOrderSGST ? Number(order.sgst_amount || order.sgst) / orderTaxable : 0.025;
        igstRate = 0;
    }

    const breakdownItems = orderItems.map(item => {
        const qty = Number(item.quantity || 1);
        const unitPrice = Number(item.price_at_time || item.price || 0);
        const grossPrice = unitPrice * qty;

        let itemDiscount = 0;
        if (item.paid_price_per_unit != null && Number(item.paid_price_per_unit) > 0) {
            const paidUnit = Number(item.paid_price_per_unit);
            itemDiscount = Math.max(0, Math.round((unitPrice - paidUnit) * qty * 100) / 100);
        } else if (orderTotalDiscount > 0 && orderSubtotal > 0) {
            itemDiscount = Math.round(((grossPrice / orderSubtotal) * orderTotalDiscount) * 100) / 100;
        }

        const taxable = Math.max(0, grossPrice - itemDiscount);
        const cgst = Math.round(taxable * cgstRate);
        const sgst = Math.round(taxable * sgstRate);
        const igst = Math.round(taxable * igstRate);
        const eligibleAmount = Math.round(taxable + cgst + sgst + igst);

        return {
            order_item_id: item.id,
            product_id: item.product_id,
            product_name: item.product_name || 'Product Item',
            image_url: item.products?.image_url || item.image_url || null,
            unit_price: unitPrice,
            quantity: qty,
            gross_price: grossPrice,
            discount_adjustment: itemDiscount,
            taxable_amount: taxable,
            cgst,
            sgst,
            igst,
            eligible_amount: eligibleAmount
        };
    });

    const totalPrice = breakdownItems.reduce((sum, it) => sum + it.gross_price, 0);
    const totalDiscount = breakdownItems.reduce((sum, it) => sum + it.discount_adjustment, 0);
    const totalCgst = breakdownItems.reduce((sum, it) => sum + it.cgst, 0);
    const totalSgst = breakdownItems.reduce((sum, it) => sum + it.sgst, 0);
    const totalIgst = breakdownItems.reduce((sum, it) => sum + it.igst, 0);
    const totalEligible = breakdownItems.reduce((sum, it) => sum + it.eligible_amount, 0);
    const maxOrderCap = Number(order.total_amount || order.totalAmount || totalEligible);
    const cappedEligible = Math.min(totalEligible, maxOrderCap);

    return {
        price: totalPrice,
        discount: totalDiscount,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        eligibleAmount: cappedEligible,
        isIGST: orderIsIGST,
        cgstRatePercent: Math.round(cgstRate * 1000) / 10,
        sgstRatePercent: Math.round(sgstRate * 1000) / 10,
        igstRatePercent: Math.round(igstRate * 1000) / 10,
        items: breakdownItems
    };
}
