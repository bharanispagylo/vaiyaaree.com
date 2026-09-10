import { NextResponse } from 'next/server';
import { calculateDiscounts } from '@/services/discountService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const qty = parseInt(searchParams.get('qty') || '1', 10);
        const price = parseFloat(searchParams.get('price') || '1000');
        const couponCode = searchParams.get('coupon') || null;

        const calculation = await calculateDiscounts({
            cartItems: [{ id: 'sample', name: 'Sample Saree', price, qty }],
            couponCode
        });

        return NextResponse.json({ success: true, ...calculation }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
