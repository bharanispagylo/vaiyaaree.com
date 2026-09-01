import { Suspense } from 'react';
import ShopPageClient from '@/components/ShopPageClient';
import pool from '@/lib/mysql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBaseUrl() {
    let url = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!url || url.includes('trycloudflare.com') || url.includes('loca.lt') || url.includes('ngrok')) {
        url = process.env.NODE_ENV === 'production' ? 'https://vaiyaaree.com' : 'http://localhost:3000';
    }
    return url.replace(/\/$/, '');
}

export const metadata = {
    title: 'Shop Exclusive Sarees Online | Pure Silk, Cotton & Designer | Vaiyaaree',
    description: 'Explore Vaiyaaree’s complete collection of premium sarees. Discover authentic handlooms, pure silk, Kanjivaram, Banarasi, organza, and soft cotton sarees with COD and fast pan-India delivery.',
    keywords: [
        'buy saree online', 'silk sarees shop', 'pure silk sarees online',
        'cotton saree collection', 'designer sarees online', 'kanjivaram silk',
        'banarasi silk saree', 'festive sarees', 'wedding sarees', 'vaiyaaree shop'
    ],
    alternates: {
        canonical: 'https://vaiyaaree.com/shop'
    },
    openGraph: {
        title: 'Shop Exclusive Sarees Online | Pure Silk, Cotton & Designer | Vaiyaaree',
        description: 'Explore Vaiyaaree’s complete collection of premium sarees. Handcrafted authentic handlooms, pure silk, and designer sarees.',
        url: 'https://vaiyaaree.com/shop',
        siteName: 'Vaiyaaree Sarees',
        images: [
            {
                url: 'https://vaiyaaree.com/images/vaiyaaree-logo.png',
                width: 1200,
                height: 630,
                alt: 'Vaiyaaree Sarees Online Shop'
            }
        ],
        locale: 'en_IN',
        type: 'website'
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Shop Exclusive Sarees Online | Vaiyaaree',
        description: 'Explore Vaiyaaree’s complete collection of premium sarees with authentic craftsmanship.',
        images: ['https://vaiyaaree.com/images/vaiyaaree-logo.png']
    }
};

export default async function ShopPage() {
    const baseUrl = getBaseUrl();

    let categoriesList = [];
    let initialProducts = [];

    try {
        const [catRows] = await pool.query('SELECT `id`, `name`, `slug` FROM `categories` WHERE `status` = "active" ORDER BY `name` ASC');
        if (catRows) categoriesList = catRows;

        const [prodRows] = await pool.query(
            'SELECT * FROM `products` WHERE `is_active` = 1 ORDER BY `created_at` DESC, `id` DESC'
        );
        const [variantRows] = await pool.query(
            'SELECT * FROM `product_variants` ORDER BY `created_at` ASC'
        );

        const variantsMap = {};
        (variantRows || []).forEach(v => {
            const pid = v.product_id;
            if (!variantsMap[pid]) variantsMap[pid] = [];
            variantsMap[pid].push(v);
        });

        initialProducts = (prodRows || []).map(p => {
            const isVar = (p.type === 'variant' || p.type === 'variable');
            return {
                ...p,
                type: p.type || 'simple',
                variants: isVar ? (variantsMap[p.id] || p.variants || []) : []
            };
        });
    } catch (e) {
        console.error('[ShopPage SSR Error]:', e);
    }

    // ── SCHEMA.ORG STRUCTURED DATA ───────────────────────────────────────────
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {
                '@type': 'ListItem',
                'position': 1,
                'name': 'Home',
                'item': `${baseUrl}/`
            },
            {
                '@type': 'ListItem',
                'position': 2,
                'name': 'Shop All Sarees',
                'item': `${baseUrl}/shop`
            }
        ]
    };

    const collectionPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        'name': 'Shop Premium Sarees & Collections - Vaiyaaree',
        'description': 'Browse and buy handcrafted pure silk, soft cotton, Banarasi, and designer sarees.',
        'url': `${baseUrl}/shop`,
        'mainEntity': {
            '@type': 'ItemList',
            'itemListElement': initialProducts.slice(0, 12).map((p, idx) => ({
                '@type': 'ListItem',
                'position': idx + 1,
                'url': `${baseUrl}/product/${p.slug || p.id}/`,
                'name': p.name
            }))
        }
    };

    // Serialize to plain JSON objects for Client Component hydration
    const safeInitialProducts = JSON.parse(JSON.stringify(initialProducts));
    const safeInitialCategories = JSON.parse(JSON.stringify(categoriesList));

    return (
        <>
            {/* JSON-LD Schema Scripts */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
            />

            <Suspense fallback={null}>
                <ShopPageClient 
                    initialProducts={safeInitialProducts} 
                    initialCategories={safeInitialCategories} 
                />
            </Suspense>
        </>
    );
}
