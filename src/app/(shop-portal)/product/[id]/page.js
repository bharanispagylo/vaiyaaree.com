import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import ProductDetailsClient from '@/components/ProductDetailsClient';
import { getProductSlug, extractProductGalleryImages, normalizeImageUrl } from '@/lib/productUrl';
import { getProductServer, getProductVariantsServer } from '@/lib/productServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBaseUrl() {
    let url = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
    if (!url || url.includes('trycloudflare.com') || url.includes('loca.lt') || url.includes('ngrok')) {
        url = process.env.NODE_ENV === 'production' ? 'https://vaiyaaree.com' : 'http://localhost:3000';
    }
    return url.replace(/\/$/, '');
}

/**
 * Clean plain text for meta description
 */
function cleanDescription(text, fallbackText = '', maxLength = 160) {
    if (!text || !String(text).trim()) {
        return fallbackText || 'Discover exclusive handcrafted sarees at Vaiyaaree. Pure silk, soft cotton, and authentic handlooms.';
    }
    const cleaned = String(text).replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength - 3) + '...';
}

const METADATA_NOT_FOUND = {
    title: 'Product Not Found | Vaiyaaree Sarees',
    description: 'The requested product is currently unavailable or does not exist.',
    robots: { index: false, follow: false }
};

/**
 * Generate Dynamic SEO Metadata for Product Detail Page
 */
export async function generateMetadata({ params }) {
    try {
    const resolvedParams = await params;
    const rawId = resolvedParams?.id;
    let product = null;
    try {
        product = await getProductServer(rawId);
    } catch (productErr) {
        console.error('[generateMetadata] getProductServer error:', productErr?.message);
        return METADATA_NOT_FOUND;
    }
    const baseUrl = getBaseUrl();

    if (!product || product.is_active === 0 || product.is_active === false || String(product.is_active) === '0' || !product.is_active) {
        return {
            title: 'Product Not Found | Vaiyaaree Sarees',
            description: 'The requested product is currently unavailable or does not exist.',
            robots: {
                index: false,
                follow: false
            }
        };
    }

    const title = `${product.name} | Buy Online | Vaiyaaree Sarees`;
    const dynamicFallback = `Buy ${product.name} online at Vaiyaaree. Handcrafted ${product.category || 'saree'} with premium quality and authentic craftsmanship.`;
    const description = cleanDescription(product.description, dynamicFallback);
    const slug = getProductSlug(product);
    const productUrl = `${baseUrl}/product/${slug}/`;

    // Extract primary image using robust gallery extractor
    const galleryImages = extractProductGalleryImages(product);
    let imageUrl = galleryImages[0] || `${baseUrl}/images/vaiyaaree-logo.png`;
    if (!imageUrl.startsWith('http')) {
        imageUrl = `${baseUrl}${imageUrl}`;
    }

    return {
        title,
        description,
        keywords: [
            product.name,
            product.category,
            product.fabric || 'silk saree',
            product.saree_type || 'handloom saree',
            'buy saree online',
            'vaiyaaree sarees'
        ].filter(Boolean),
        alternates: {
            canonical: productUrl
        },
        openGraph: {
            title: `${product.name} - Vaiyaaree Sarees`,
            description,
            url: productUrl,
            siteName: 'Vaiyaaree Sarees',
            images: [
                {
                    url: imageUrl,
                    width: 1000,
                    height: 1250,
                    alt: product.name
                }
            ],
            locale: 'en_IN',
            type: 'website'
        },
        twitter: {
            card: 'summary_large_image',
            title: `${product.name} | Vaiyaaree`,
            description,
            images: [imageUrl]
        }
    };
    } catch (outerErr) {
        console.error('[generateMetadata] Unexpected error:', outerErr?.message);
        return METADATA_NOT_FOUND;
    }
}

export default async function ProductPage({ params }) {
    const resolvedParams = await params;
    const rawId = resolvedParams?.id;
    let product = null;
    try {
        product = await getProductServer(rawId);
    } catch (e) {
        console.error('[ProductPage] getProductServer error:', e?.message);
        notFound();
    }
    const baseUrl = getBaseUrl();

    if (!product || product.is_active === 0 || product.is_active === false || String(product.is_active) === '0' || !product.is_active) {
        notFound();
    }

    const variants = (product.type === 'variant' || product.type === 'variable')
        ? await getProductVariantsServer(product.id)
        : [];

    const serializedProduct = JSON.parse(JSON.stringify(product));
    const serializedVariants = JSON.parse(JSON.stringify(variants));

    const slug = getProductSlug(product);
    const productUrl = `${baseUrl}/product/${slug}/`;

    // Extract all image URLs for Product Schema using robust gallery extractor
    const rawGallery = extractProductGalleryImages(product);
    const allImages = rawGallery.map(img => img.startsWith('http') ? img : `${baseUrl}${img}`);

    const isVariable = (product.type === 'variant' || product.type === 'variable') && variants.length > 0;
    const variantPrices = isVariable ? variants.map(v => Number(v.price || 0)).filter(p => p > 0) : [];
    const minPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : Number(product.price || 0);
    const maxPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : Number(product.price || 0);
    const isAvailable = isVariable ? variants.some(v => Number(v.stock || 0) > 0) : Number(product.stock || 0) > 0;

    const nextYearDate = new Date();
    nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
    const validUntilStr = nextYearDate.toISOString().split('T')[0];

    // ── SCHEMA.ORG PRODUCT RICH SNIPPET ──────────────────────────────────────
    const productSchema = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        'name': product.name,
        'image': allImages,
        'description': cleanDescription(product.description, `Buy ${product.name} online at Vaiyaaree. Handcrafted ${product.category || 'saree'} with premium quality and authentic craftsmanship.`, 300),
        'sku': product.sku || product.product_no || String(product.id),
        'mpn': product.product_catalog_image_id || product.sku || String(product.id),
        'brand': {
            '@type': 'Brand',
            'name': 'Vaiyaaree'
        },
        'category': product.category || 'Sarees',
        'offers': isVariable && minPrice !== maxPrice ? {
            '@type': 'AggregateOffer',
            'url': productUrl,
            'priceCurrency': 'INR',
            'lowPrice': minPrice,
            'highPrice': maxPrice,
            'offerCount': variants.length,
            'availability': isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            'seller': {
                '@type': 'Organization',
                'name': 'Vaiyaaree Sarees'
            }
        } : {
            '@type': 'Offer',
            'url': productUrl,
            'priceCurrency': 'INR',
            'price': minPrice,
            'priceValidUntil': validUntilStr,
            'itemCondition': 'https://schema.org/NewCondition',
            'availability': isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            'seller': {
                '@type': 'Organization',
                'name': 'Vaiyaaree Sarees'
            }
        }
    };

    // ── SCHEMA.ORG BREADCRUMBLIST ────────────────────────────────────────────
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
                'name': 'Shop',
                'item': `${baseUrl}/shop`
            },
            ...(product.category ? [{
                '@type': 'ListItem',
                'position': 3,
                'name': product.category,
                'item': `${baseUrl}/shop?category=${encodeURIComponent(product.category)}`
            }] : []),
            {
                '@type': 'ListItem',
                'position': product.category ? 4 : 3,
                'name': product.name,
                'item': productUrl
            }
        ]
    };

    return (
        <>
            {/* JSON-LD Schema Scripts */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />

            <Suspense fallback={null}>
                <ProductDetailsClient
                    initialProduct={serializedProduct}
                    initialVariants={serializedVariants}
                />
            </Suspense>
        </>
    );
}
