import { NextResponse } from 'next/server';
import { getMenuByLocation, ensureNavigationTables } from '@/services/navigationMenuService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
    try {
        await ensureNavigationTables();

        const { searchParams } = new URL(request.url);
        const location = searchParams.get('location') || 'primary';

        const menuData = await getMenuByLocation(location);

        if (!menuData) {
            // Fallback default structure
            return NextResponse.json({
                success: true,
                menu: { id: 'default', name: 'Default Navigation', location },
                items: [
                    { id: 'item_home', title: 'Home', url: '/', target: '_self', children: [] },
                    { id: 'item_shop', title: 'Shop Collections', url: '/shop', target: '_self', children: [] },
                    { id: 'item_heritage', title: 'Our Heritage', url: '/about-us', target: '_self', children: [] },
                    { id: 'item_contact', title: 'Contact', url: '/contact', target: '_self', children: [] }
                ]
            });
        }

        return NextResponse.json({
            success: true,
            menu: {
                id: menuData.id,
                name: menuData.name,
                location: menuData.location
            },
            items: menuData.items || []
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });
    } catch (err) {
        console.error('[PUBLIC-MENU GET ERROR]:', err);
        return NextResponse.json({
            success: true,
            fallback: true,
            items: [
                { id: 'item_home', title: 'Home', url: '/', target: '_self', children: [] },
                { id: 'item_shop', title: 'Shop Collections', url: '/shop', target: '_self', children: [] },
                { id: 'item_heritage', title: 'Our Heritage', url: '/about-us', target: '_self', children: [] },
                { id: 'item_contact', title: 'Contact', url: '/contact', target: '_self', children: [] }
            ]
        });
    }
}
