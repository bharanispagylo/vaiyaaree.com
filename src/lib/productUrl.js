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
        const identifier = rawParam.substring(lastHyphenIdx + 1);
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
