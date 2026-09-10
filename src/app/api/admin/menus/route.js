import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { query } from '@/lib/mysql';
import { getMenuForAdmin, saveMenuStructure, ensureNavigationTables } from '@/services/navigationMenuService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureNavigationTables();

        const { searchParams } = new URL(request.url);
        const menuId = searchParams.get('menuId') || 'menu_primary';

        const menuData = await getMenuForAdmin(menuId);

        // Fetch categories for "Add to Menu" selection
        let categories = [];
        try {
            const [catRows] = await query("SELECT id, name, slug FROM categories WHERE status = 'active' OR status = '1' ORDER BY name ASC");
            categories = catRows || [];
        } catch (e) {
            console.warn('[ADMIN-MENUS] Could not fetch categories:', e.message);
        }

        // Fetch custom CMS pages for "Add to Menu" selection
        let cmsPages = [];
        try {
            const [cmsRows] = await query("SELECT id, title, slug FROM cms_pages WHERE status = 'published' ORDER BY title ASC");
            cmsPages = cmsRows || [];
        } catch (e) {
            console.warn('[ADMIN-MENUS] Could not fetch CMS pages:', e.message);
        }

        // Standard Storefront core pages
        const corePages = [
            { id: 'page_home', title: 'Home', url: '/' },
            { id: 'page_shop', title: 'Shop Collections', url: '/shop' },
            { id: 'page_about', title: 'Our Heritage (About Us)', url: '/about-us' },
            { id: 'page_contact', title: 'Contact Us', url: '/contact' },
            { id: 'page_cart', title: 'Shopping Cart', url: '/cart' },
            { id: 'page_orders', title: 'Track Orders', url: '/my-orders' }
        ];

        return NextResponse.json({
            success: true,
            ...menuData,
            availablePages: [...corePages, ...cmsPages.map(p => ({ id: `cms_${p.id}`, title: p.title, url: `/page/${p.slug}` }))],
            availableCategories: categories.map(c => ({ id: `cat_${c.id}`, title: c.name, url: `/shop?category=${encodeURIComponent(c.name)}`, slug: c.slug }))
        });
    } catch (err) {
        console.error('[ADMIN-MENUS GET ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Failed to fetch menu' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const auth = await verifyAdmin(request);
        if (!auth.authorized) {
            return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
        }

        await ensureNavigationTables();

        const body = await request.json();
        const { menuId = 'menu_primary', menuName = 'Primary Header Navigation', items = [] } = body;

        if (!menuId || !menuName.trim()) {
            return NextResponse.json({ error: 'Menu ID and Menu Name are required' }, { status: 400 });
        }

        const updated = await saveMenuStructure(menuId, menuName.trim(), items);

        return NextResponse.json({
            success: true,
            message: 'Navigation menu saved successfully!',
            ...updated
        });
    } catch (err) {
        console.error('[ADMIN-MENUS POST ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Failed to save menu' }, { status: 500 });
    }
}
