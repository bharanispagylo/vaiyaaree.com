import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        // Revalidate core public storefront paths
        const pathsToRevalidate = [
            '/',
            '/shop',
            '/about-us',
            '/contact',
            '/profile',
            '/privacy-policy',
            '/return-policy',
            '/shipping-policy',
            '/terms-and-conditions',
            '/refund-cancellation-policy'
        ];

        for (const p of pathsToRevalidate) {
            try {
                revalidatePath(p, 'page');
                revalidatePath(p, 'layout');
            } catch (err) {
                console.warn(`[CACHE FLUSH] Warning revalidating ${p}:`, err.message);
            }
        }

        return NextResponse.json({
            success: true,
            flushedAt: new Date().toISOString(),
            revalidatedPaths: pathsToRevalidate,
            message: 'Storefront cache flushed successfully. Changes are now live immediately for all visitors.'
        });

    } catch (err) {
        console.error('[CACHE FLUSH ERROR]:', err);
        return NextResponse.json({ error: 'Failed to flush cache: ' + err.message }, { status: 500 });
    }
}
