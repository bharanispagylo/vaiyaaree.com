import { NextResponse } from 'next/server';
import { validateCouponCode, calculateDiscounts } from '@/services/discountService';

export async function POST(request) {
    try {
        const body = await request.json();
        const { couponCode, subtotal, cartItems, customer } = body;
        const items = cartItems || [];

        const validation = await validateCouponCode(couponCode, { subtotal, cartItems: items, customer });
        if (!validation.valid) {
            return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
        }

        // Run full discount calculation with this coupon code to get the exact discount amount
        const calculation = await calculateDiscounts({
            cartItems: items,
            subtotal,
            couponCode,
            customer
        });

        // Ensure that the coupon actually produced a discount or benefits
        const couponDiscount = calculation.couponDiscount || 0;
        const shippingDiscount = calculation.shippingDiscount || 0;
        const totalDiscount = calculation.totalDiscount || 0;

        if (couponDiscount <= 0 && shippingDiscount <= 0 && totalDiscount <= 0) {
            return NextResponse.json({
                success: false,
                message: 'Coupon conditions were not met for the selected items in your cart.'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: validation.message,
            couponCode: couponCode.trim().toUpperCase(),
            rule: validation.rule,
            couponDiscount: couponDiscount,
            totalDiscount: totalDiscount,
            calculation
        }, { status: 200 });

    } catch (err) {
        console.error('[API /api/coupons/validate Error]:', err);
        return NextResponse.json({ success: false, message: err.message || 'Failed to validate coupon' }, { status: 500 });
    }
}

