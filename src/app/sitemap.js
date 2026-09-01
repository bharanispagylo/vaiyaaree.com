import pool from '@/lib/mysql';
import { getProductSlug } from '@/lib/productUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate at most once every hour, or on demand

function getBaseUrl() {
    let url = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!url || url.includes('trycloudflare.com') || url.includes('loca.lt') || url.includes('ngrok')) {
        url = process.env.NODE_ENV === 'production' ? 'https://vaiyaaree.com' : 'http://localhost:3000';
    }
    return url.replace(/\/$/, '');
}

export default async function sitemap() {
    const baseUrl = getBaseUrl();
    const now = new Date();

    // 1. Static & Core Pages
    const staticRoutes = [
        {
            url: `${baseUrl}/`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0
        },
        {
            url: `${baseUrl}/shop`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.95
        },
        {
            url: `${baseUrl}/about-us`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8
        },
        {
            url: `${baseUrl}/contact`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.7
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5
        },
        {
            url: `${baseUrl}/return-policy`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5
        },
        {
            url: `${baseUrl}/shipping-policy`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5
        },
        {
            url: `${baseUrl}/terms-and-conditions`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5
        },
        {
            url: `${baseUrl}/refund-cancellation-policy`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5
        }
    ];

    let productRoutes = [];
    let categoryRoutes = [];

    try {
        // 2. Fetch Active Products (Dynamic URL updates on create/edit)
        const [products] = await pool.query(
            'SELECT `id`, `name`, `slug`, `sku`, `product_no`, `created_at`, `updated_at` FROM `products` WHERE `is_active` = 1 ORDER BY `updated_at` DESC'
        );

        if (Array.isArray(products)) {
            productRoutes = products.map((p) => {
                const slug = getProductSlug(p);
                const lastMod = p.updated_at ? new Date(p.updated_at) : (p.created_at ? new Date(p.created_at) : now);
                return {
                    url: `${baseUrl}/product/${slug}/`,
                    lastModified: isNaN(lastMod.getTime()) ? now : lastMod,
                    changeFrequency: 'daily',
                    priority: 0.85
                };
            });
        }
    } catch (err) {
        console.error('[SITEMAP] Error fetching products:', err.message);
    }

    try {
        // 3. Fetch Active Categories
        const [categories] = await pool.query(
            'SELECT `id`, `name`, `slug`, `updated_at`, `created_at` FROM `categories` WHERE `status` = "active" ORDER BY `name` ASC'
        );

        if (Array.isArray(categories)) {
            categoryRoutes = categories.map((c) => {
                const lastMod = c.updated_at ? new Date(c.updated_at) : (c.created_at ? new Date(c.created_at) : now);
                return {
                    url: `${baseUrl}/shop?category=${encodeURIComponent(c.name)}`,
                    lastModified: isNaN(lastMod.getTime()) ? now : lastMod,
                    changeFrequency: 'weekly',
                    priority: 0.8
                };
            });
        }
    } catch (err) {
        console.error('[SITEMAP] Error fetching categories:', err.message);
    }

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
