/**
 * Utility for SEO friendly Product Slugs and URLs
 * Example: "Blended south cotton saree with readymade blouse", product_no 1015
 * Output slug: "blended-south-cotton-saree-with-readymade-blouse-1015" (or custom slug if set)
 * Output URL: "/product/blended-south-cotton-saree-with-readymade-blouse-1015/"
 */

export function slugify(text) {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getProductSlug(product) {
    if (!product) return 'product';
    if (product.slug && String(product.slug).trim()) {
        return slugify(product.slug);
    }
    const name = slugify(product.name || 'product');
    const identifier = product.product_no || product.sku || product.id || '';
    return identifier ? `${name}-${identifier}` : name;
}

export function getProductUrl(product) {
    if (!product) return '/shop';
    const slug = getProductSlug(product);
    return `/product/${slug}/`;
}

/**
 * Matches URL route param against products list
 * Supports:
 * - Custom slug from DB: "my-custom-saree-slug"
 * - SEO slug: "blended-south-cotton-saree-with-readymade-blouse-1015" or "blended-south-cotton-saree-with-readymade-blouse-94"
 * - Numeric Product No/SKU: "1015" or "1000"
 * - UUID: "05134b15-bc05-4d11-82b2-a7b9ee2c695b"
 */
export function findProductBySlugOrId(param, productsList = []) {
    if (!param) return null;
    const rawParam = decodeURIComponent(String(param)).trim().replace(/\/$/, '').toLowerCase();

    // 0. Direct match on custom slug column
    let found = productsList.find(p => p.slug && slugify(p.slug) === rawParam);
    if (found) return found;

    // 1. Direct UUID or exact ID match
    found = productsList.find(p => String(p.id).toLowerCase() === rawParam);
    if (found) return found;

    // 2. Direct SKU or product_no match
    found = productsList.find(p => String(p.product_no).toLowerCase() === rawParam || String(p.sku).toLowerCase() === rawParam);
    if (found) return found;

    // 3. Match exact getProductSlug(p)
    found = productsList.find(p => getProductSlug(p).toLowerCase() === rawParam);
    if (found) return found;

    // 4. Extract trailing identifier after last hyphen
    const lastHyphenIdx = rawParam.lastIndexOf('-');
    if (lastHyphenIdx !== -1) {
        found = productsList.find(p =>
            String(p.id).toLowerCase() === identifier ||
            String(p.product_no).toLowerCase() === identifier ||
            String(p.sku).toLowerCase() === identifier
        );
        if (found) return found;
    }

    // 5. Prefix match on slug name
    const namePart = rawParam.replace(/-[^-]+$/, '');
    found = productsList.find(p => getProductSlug(p).toLowerCase().startsWith(namePart));
    return found || null;
}

/**
 * Normalizes an image URL to the canonical with-watermark format:
 * - Strips extra JSON quotes/brackets
 * - Rewrites /without-watermark/ to /with-watermark/
 * - Normalizes paths like "uploads/media/..." to "/uploads/media/..."
 */
export function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let clean = url.trim().replace(/^[\[\]"']+|[\[\]"']+$/g, '').trim();
    if (!clean) return '';

    // If it's a full http(s) URL pointing to localhost/current domain, extract path
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
        try {
            const parsed = new URL(clean);
            if (parsed.hostname.includes('vaiyaaree') || parsed.hostname.includes('localhost') || parsed.hostname.includes('127.0.0.1')) {
                clean = parsed.pathname;
            } else {
                return clean; // Remote CDN / external link
            }
        } catch (_) {}
    }

    // Ensure leading slash for relative URLs
    if (!clean.startsWith('/')) {
        clean = `/${clean}`;
    }

    // Rewrite without-watermark to with-watermark for storefront display
    if (clean.includes('/without-watermark/')) {
        clean = clean.replace('/without-watermark/', '/with-watermark/');
    }

    // Ensure full /uploads/media/ prefix if shorthand like /with-watermark/...
    if (clean.startsWith('/with-watermark/')) {
        clean = `/uploads/media${clean}`;
    } else if (clean.startsWith('/without-watermark/')) {
        clean = `/uploads/media${clean}`;
    }

    return clean;
}

/**
 * Extracts and normalizes all gallery and product images into a clean array:
 * Handles:
 * - JSON array strings: '["/uploads/media/with-watermark/img1.jpg", "/uploads/..."]'
 * - Comma-separated strings: "/uploads/img1.jpg, /uploads/img2.jpg"
 * - JavaScript arrays: ['/uploads/...', '/uploads/...']
 * - product.image_url, product.gallery_image, product.gallery_images, product.images
 */
export function extractProductGalleryImages(product, selectedVariant = null) {
    if (!product) return [];

    const rawList = [];

    // 1. Variant image first if selected
    if (selectedVariant?.image_url) {
        rawList.push(selectedVariant.image_url);
    }

    // 2. Main product image
    if (product.image_url) {
        rawList.push(product.image_url);
    }

    // 3. Gallery image(s) from product.gallery_image
    if (product.gallery_image) {
        rawList.push(product.gallery_image);
    }

    // 4. Gallery image(s) from product.gallery_images
    if (product.gallery_images) {
        rawList.push(product.gallery_images);
    }

    // 5. Images array from product.images
    if (product.images) {
        rawList.push(product.images);
    }

    // Helper to recursively parse inputs
    const parsedUrls = [];
    const parseItem = (item) => {
        if (!item) return;
        if (Array.isArray(item)) {
            item.forEach(sub => parseItem(sub));
            return;
        }
        if (typeof item === 'string') {
            const trimmed = item.trim();
            if (!trimmed) return;
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(sub => parseItem(sub));
                        return;
                    }
                } catch (_) {}
            }
            trimmed.split(',').forEach(part => {
                const normalized = normalizeImageUrl(part);
                if (normalized) parsedUrls.push(normalized);
            });
        }
    };

    rawList.forEach(item => parseItem(item));

    const uniqueUrls = Array.from(new Set(parsedUrls));
    const fallbackImg = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';

    return uniqueUrls.length > 0 ? uniqueUrls : [fallbackImg];
}


