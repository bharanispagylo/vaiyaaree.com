import { Suspense } from 'react';
import ProductDetailsClient from '@/components/ProductDetailsClient';
import { getProductSlug } from '@/lib/productUrl';
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
function cleanDescription(text, maxLength = 160) {
    if (!text) return 'Discover exclusive handcrafted sarees at Vaiyaaree. Pure silk, soft cotton, and authentic handlooms.';
    const cleaned = String(text).replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength - 3) + '...';
}

/**
 * Generate Dynamic SEO Metadata for Product Detail Page
 */
export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const rawId = resolvedParams?.id;
    const product = await getProductServer(rawId);
    const baseUrl = getBaseUrl();

    if (!product) {
        return {
            title: 'Product Details | Vaiyaaree Sarees',
            description: 'Explore handcrafted premium sarees at Vaiyaaree online boutique.'
        };
    }

    const title = `${product.name} | Buy Online | Vaiyaaree Sarees`;
    const description = cleanDescription(product.description);
    const slug = getProductSlug(product);
    const productUrl = `${baseUrl}/product/${slug}/`;

    // Extract primary image
    let imageUrl = 'https://vaiyaaree.com/images/vaiyaaree-logo.png';
    if (product.image_url) {
        const firstImg = product.image_url.split(',')[0].trim();
        imageUrl = firstImg.startsWith('http') ? firstImg : `${baseUrl}${firstImg}`;
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
}

export default async function ProductPage({ params }) {
    const resolvedParams = await params;
    const rawId = resolvedParams?.id;
    const product = await getProductServer(rawId);
    const baseUrl = getBaseUrl();

    if (!product) {
        return (
            <Suspense fallback={null}>
                <ProductDetailsClient initialProduct={null} initialVariants={[]} />
            </Suspense>
        );
    }

    const variants = (product.type === 'variant' || product.type === 'variable')
        ? await getProductVariantsServer(product.id)
        : [];

    const serializedProduct = JSON.parse(JSON.stringify(product));
    const serializedVariants = JSON.parse(JSON.stringify(variants));

    const slug = getProductSlug(product);
    const productUrl = `${baseUrl}/product/${slug}/`;

    // Extract all image URLs for Product Schema
    let allImages = [];
    if (product.image_url) {
        product.image_url.split(',').map(u => u.trim()).filter(Boolean).forEach(img => {
            allImages.push(img.startsWith('http') ? img : `${baseUrl}${img}`);
        });
    }
    if (product.gallery_image) {
        const galleryList = Array.isArray(product.gallery_image) 
            ? product.gallery_image 
            : String(product.gallery_image).split(',');
        galleryList.map(u => (u || '').trim()).filter(Boolean).forEach(img => {
            allImages.push(img.startsWith('http') ? img : `${baseUrl}${img}`);
        });
    }
    if (allImages.length === 0) {
        allImages = [`${baseUrl}/images/vaiyaaree-logo.png`];
    }
    allImages = Array.from(new Set(allImages));

    const isAvailable = Number(product.stock || 0) > 0;
    const priceNumber = Number(product.price || 0);

    // ── SCHEMA.ORG PRODUCT RICH SNIPPET ──────────────────────────────────────
    const productSchema = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        'name': product.name,
        'image': allImages,
        'description': cleanDescription(product.description, 300),
        'sku': product.sku || product.product_no || String(product.id),
        'mpn': product.product_catalog_image_id || product.sku || String(product.id),
        'brand': {
            '@type': 'Brand',
            'name': 'Vaiyaaree'
        },
        'category': product.category || 'Sarees',
        'offers': {
            '@type': 'Offer',
            'url': productUrl,
            'priceCurrency': 'INR',
            'price': priceNumber,
            'priceValidUntil': '2027-12-31',
            'itemCondition': 'https://schema.org/NewCondition',
            'availability': isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            'seller': {
                '@type': 'Organization',
                'name': 'Vaiyaaree Sarees'
            }
        },
        'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.9',
            'reviewCount': '36',
            'bestRating': '5',
            'worstRating': '1'
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
