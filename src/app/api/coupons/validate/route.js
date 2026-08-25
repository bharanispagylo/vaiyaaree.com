import { NextResponse } from 'next/server';
import { validateCouponCode, calculateDiscounts } from '@/services/discountService';

export async function POST(request) {
    try {
        const body = await request.json();
        const { couponCode, subtotal, cartItems, customer } = body;

        const validation = await validateCouponCode(couponCode, { subtotal, customer });
        if (!validation.valid) {
            return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
        }

        // Run full discount calculation with this coupon code to get the exact discount amount
        const calculation = await calculateDiscounts({
            cartItems: cartItems || [],
            subtotal,
            couponCode,
            customer
        });

        return NextResponse.json({
            success: true,
            message: validation.message,
            couponCode: couponCode.trim().toUpperCase(),
            rule: validation.rule,
            couponDiscount: calculation.couponDiscount,
            totalDiscount: calculation.totalDiscount,
            calculation
        }, { status: 200 });

    } catch (err) {
        console.error('[API /api/coupons/validate Error]:', err);
        return NextResponse.json({ success: false, message: err.message || 'Failed to validate coupon' }, { status: 500 });
    }
}
