import { NextResponse } from 'next/server';
import { calculateDiscounts } from '@/services/discountService';

export async function POST(request) {
    try {
        const body = await request.json();
        const { cart, cartItems, subtotal, shippingCost, couponCode, customer } = body;
        const items = cartItems || cart || [];

        const calculation = await calculateDiscounts({
            cartItems: items,
            subtotal,
            shippingCost,
            couponCode,
            customer
        });

        return NextResponse.json({ success: true, ...calculation }, { status: 200 });
    } catch (err) {
        console.error('[API /api/discounts/calculate Error]:', err);
        return NextResponse.json({ error: err.message || 'Failed to calculate discounts' }, { status: 500 });
    }
}
