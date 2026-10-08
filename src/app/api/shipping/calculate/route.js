import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { subtotal: rawSubtotal, cart } = body || {};

        let subtotal = typeof rawSubtotal === 'number' ? rawSubtotal : 0;
        if (cart && Array.isArray(cart) && cart.length > 0) {
            subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price || 0) * (parseInt(item.qty || 1, 10))), 0);
        }

        return NextResponse.json({
            success: true,
            shippingGroup: 'Free Shipping',
            shippingType: 'DOMESTIC',
            shippingRate: 0,
            freeThreshold: 0,
            shippingCost: 0,
            subtotal,
            isInternational: false
        }, { status: 200 });

    } catch (err) {
        console.error('[API /api/shipping/calculate Error]:', err);
        return NextResponse.json({
            success: true,
            shippingGroup: 'Free Shipping',
            shippingType: 'DOMESTIC',
            shippingRate: 0,
            freeThreshold: 0,
            shippingCost: 0,
            subtotal: 0,
            isInternational: false
        }, { status: 200 });
    }
}
