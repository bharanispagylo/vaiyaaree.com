import { mysqlClient } from '@/lib/mysqlClient';

export const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
export const STATUS_OPTIONS = ['PLACED', 'AWAITING_PAYMENT', 'PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'];
export const SOURCE_FILTERS = ['ALL', 'WEBSITE', 'WHATSAPP', 'MANUAL'];
export const ORDERS_PER_PAGE = 10;

/**
 * Format invoice number with clean, single # prefix (never ##)
 */
export const formatOrderInvoice = (o) => {
    if (!o) return '#INV-0001';
    const raw = o.invoice_no || (o.id ? String(o.id).replace(/^[A-Z]+-/, 'INV-') : 'INV-0001');
    const clean = String(raw).replace(/^#+/, '');
    return `#${clean}`;
};

import { toIST, formatOrderDate, parseDateToUTC } from '@/lib/dateUtils';
export { toIST, formatOrderDate, parseDateToUTC };

/**
 * CSS class name reference for status badge
 */
export const getStatusReference = (status) => {
    switch (status) {
        case 'PLACED': return 'badge-placed';
        case 'PENDING': return 'badge-placed';
        case 'AWAITING_PAYMENT': return 'badge-placed';
        case 'PAID': return 'badge-paid';
        case 'PACKING': return 'badge-placed';
        case 'SHIPPED': return 'badge-shipped';
        case 'DELIVERED': return 'badge-delivered';
        case 'CANCELLED': return 'badge-cancelled';
        default: return 'badge';
    }
};

/**
 * Parses courier name, tracking number, and tracking URL from an order record
 */
export function parseCourierDetails(order) {
    if (!order) return { name: '', trackingNumber: '', trackingUrl: '' };

    let name = '';
    let trackingNumber = order.tracking_number || order.tracking_id || order.awb_number || '';
    let trackingUrl = order.tracking_url || '';

    const rawCourier = order.courier_name || order.courier_partner || order.courier || order.carrier || order.shipping_courier;

    if (typeof rawCourier === 'string') {
        if (rawCourier.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(rawCourier);
                name = parsed.name || parsed.courier_name || parsed.courier || parsed.carrier || parsed.title || parsed.query || '';
                if (!trackingNumber && (parsed.tracking_number || parsed.tracking_id || parsed.awb)) {
                    trackingNumber = parsed.tracking_number || parsed.tracking_id || parsed.awb;
                }
                if (!trackingUrl && (parsed.tracking_url || parsed.url)) {
                    trackingUrl = parsed.tracking_url || parsed.url;
                }
            } catch (e) {
                name = rawCourier;
            }
        } else {
            name = rawCourier;
        }
    } else if (typeof rawCourier === 'object' && rawCourier !== null) {
        name = rawCourier.name || rawCourier.courier_name || rawCourier.courier || rawCourier.carrier || rawCourier.title || '';
        if (!trackingNumber && (rawCourier.tracking_number || rawCourier.tracking_id || rawCourier.awb)) {
            trackingNumber = rawCourier.tracking_number || rawCourier.tracking_id || rawCourier.awb;
        }
        if (!trackingUrl && (rawCourier.tracking_url || rawCourier.url)) {
            trackingUrl = rawCourier.tracking_url || rawCourier.url;
        }
    }

    if (trackingUrl && trackingNumber && trackingUrl.includes('{')) {
        trackingUrl = trackingUrl.replace(/\{[^}]+\}/g, trackingNumber);
    }

    return {
        name: String(name || '').trim(),
        trackingNumber: String(trackingNumber || '').trim(),
        trackingUrl: String(trackingUrl || '').trim()
    };
}

/**
 * Builds PostgREST search OR conditions matching order IDs, customer names, emails, and phones
 */
export function buildOrderSearchOrCondition(rawTerm) {
    if (!rawTerm || typeof rawTerm !== 'string') return null;
    const trimmed = rawTerm.trim();
    if (!trimmed) return null;

    // Remove leading hash '#' e.g. "#WEB-848593" -> "WEB-848593"
    const strippedHash = trimmed.replace(/^#+/, '').trim();
    // Remove PostgREST reserved syntax chars: commas, parentheses
    const cleanTerm = strippedHash.replace(/[,()]/g, '');
    if (!cleanTerm) return null;

    const digitsOnly = cleanTerm.replace(/\D/g, '');
    const conditions = new Set();

    // 1. Match order ID directly (case-insensitive substring)
    conditions.add(`id.ilike.%${cleanTerm}%`);
    if (strippedHash !== trimmed) {
        const cleanRaw = trimmed.replace(/[,()]/g, '');
        if (cleanRaw) conditions.add(`id.ilike.%${cleanRaw}%`);
    }

    // 2. Match Customer Name
    conditions.add(`customer_name.ilike.%${cleanTerm}%`);

    // 3. Match Email addresses
    conditions.add(`customer_email.ilike.%${cleanTerm}%`);
    conditions.add(`billing_email.ilike.%${cleanTerm}%`);
    conditions.add(`shipping_email.ilike.%${cleanTerm}%`);

    // 4. Direct phone string matching
    conditions.add(`customer_phone.ilike.%${cleanTerm}%`);
    conditions.add(`billing_phone.ilike.%${cleanTerm}%`);
    conditions.add(`shipping_phone.ilike.%${cleanTerm}%`);

    // 5. Digit-based matching for IDs & Phone Numbers
    if (digitsOnly.length > 0) {
        conditions.add(`id.ilike.%${digitsOnly}%`);

        if (digitsOnly.length >= 3) {
            conditions.add(`customer_phone.ilike.%${digitsOnly}%`);
            conditions.add(`billing_phone.ilike.%${digitsOnly}%`);
            conditions.add(`shipping_phone.ilike.%${digitsOnly}%`);

            if (digitsOnly.length === 10) {
                conditions.add(`customer_phone.ilike.%91${digitsOnly}%`);
                conditions.add(`billing_phone.ilike.%91${digitsOnly}%`);
                conditions.add(`shipping_phone.ilike.%91${digitsOnly}%`);
            } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
                const tenDigits = digitsOnly.substring(2);
                conditions.add(`customer_phone.ilike.%${tenDigits}%`);
                conditions.add(`billing_phone.ilike.%${tenDigits}%`);
                conditions.add(`shipping_phone.ilike.%${tenDigits}%`);
            }
        }
    }

    // 6. Split words for customer name search if search term contains spaces
    const words = cleanTerm.split(/\s+/).filter(w => w.length >= 2);
    if (words.length > 1) {
        words.forEach(w => {
            const cleanWord = w.replace(/[,()]/g, '');
            if (cleanWord) {
                conditions.add(`customer_name.ilike.%${cleanWord}%`);
            }
        });
    }

    return Array.from(conditions).join(',');
}

/**
 * Standardize Indian and International phone numbers for clean UI display
 */
export const formatDisplayPhoneNumber = (phone) => {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        const part1 = cleaned.substring(2, 7);
        const part2 = cleaned.substring(7);
        return `+91 ${part1} ${part2}`;
    } else if (cleaned.length === 10) {
        const part1 = cleaned.substring(0, 5);
        const part2 = cleaned.substring(5);
        return `+91 ${part1} ${part2}`;
    } else if (cleaned.startsWith('91') && cleaned.length > 10) {
        return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
    } else if (cleaned.length > 5) {
        const part1 = cleaned.substring(0, 5);
        const part2 = cleaned.substring(5);
        return `${part1} ${part2}`;
    }
    return phone;
};

/**
 * Parses raw address string or JSON into structured address object
 */
export const parseStructuredAddress = (rawAddr, defaultName = '', defaultPhone = '') => {
    if (!rawAddr) return { name: defaultName, phone: defaultPhone, address_line: '', city: '', pincode: '', state: 'Tamil Nadu' };
    
    let obj = rawAddr;
    if (typeof rawAddr === 'string' && rawAddr.trim().startsWith('{')) {
        try { obj = JSON.parse(rawAddr); } catch(e) {}
    }
    
    if (typeof obj === 'object' && obj !== null) {
        return {
            name: obj.name || defaultName,
            phone: obj.phone || obj.mobile || defaultPhone,
            address_line: obj.address || obj.address_line || '',
            city: obj.city || '',
            pincode: obj.pincode || obj.postal_code || '',
            state: obj.state || 'Tamil Nadu'
        };
    }

    const str = String(rawAddr).trim();
    const parts = str.split(',').map(s => s.trim()).filter(Boolean);
    
    let name = defaultName;
    let phone = defaultPhone;
    let city = '';
    let state = 'Tamil Nadu';
    let pincode = '';
    let address_line = str;

    if (parts.length >= 2) {
        if (parts[0] && isNaN(parts[0])) name = parts[0];
        if (parts[1] && (parts[1].length >= 10 || !isNaN(parts[1]))) phone = parts[1];

        const lastPart = parts[parts.length - 1];
        if (lastPart && /^\d{6}$/.test(lastPart)) {
            pincode = lastPart;
        }

        const knownStates = ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat'];
        const stateIdx = parts.findIndex(p => knownStates.includes(p));
        if (stateIdx !== -1) {
            state = parts[stateIdx];
        }

        if (stateIdx > 0) {
            city = parts[stateIdx - 1];
        } else if (parts.length >= 4) {
            city = parts[parts.length - (pincode ? 2 : 1)] || '';
        }

        const midParts = parts.filter(p => p !== name && p !== phone && p !== pincode && p !== state && p !== city);
        if (midParts.length > 0) {
            address_line = midParts.join(', ');
        }
    }

    return { name, phone, address_line, city, pincode, state };
};

/**
 * Prepares an order for full address and customer line editing
 */
export const prepareOrderForEditing = (order) => {
    if (!order) return null;
    const ship = parseStructuredAddress(order.shipping_address || order.delivery_address, order.customer_name, order.customer_phone);
    const bill = parseStructuredAddress(order.billing_address || order.delivery_address, order.customer_name, order.customer_phone);
    
    return {
        ...order,
        shipping_name: order.shipping_name || ship.name,
        shipping_phone: order.shipping_phone || ship.phone,
        shipping_address_line: order.shipping_address_line || ship.address_line,
        shipping_city: order.shipping_city || ship.city,
        shipping_pincode: order.shipping_pincode || ship.pincode,
        shipping_state: order.shipping_state || ship.state,

        billing_name: order.billing_name || bill.name,
        billing_phone: order.billing_phone || bill.phone,
        billing_address_line: order.billing_address_line || bill.address_line,
        billing_city: order.billing_city || bill.city,
        billing_pincode: order.billing_pincode || bill.pincode,
        billing_state: order.billing_state || bill.state,
    };
};

/**
 * Matches an item with product catalog
 */
export const resolveItemProduct = (item, catalogProducts = []) => {
    if (!item) return null;
    if (item.products && (item.products.image_url || item.products.sku)) return item.products;

    const pId = String(item.product_id || '').trim();
    const pName = String(item.product_name || '').trim().toLowerCase();

    if (!catalogProducts || catalogProducts.length === 0) return item.products || null;

    if (pId) {
        const matchById = catalogProducts.find(p => 
            String(p.id) === pId || 
            String(p.sku || '').trim() === pId || 
            String(p.product_no || '').trim() === pId ||
            String(p.product_catalog_image_id || '').trim().toUpperCase() === pId.toUpperCase()
        );
        if (matchById) return matchById;
    }

    if (pName) {
        const matchByName = catalogProducts.find(p => String(p.name || '').trim().toLowerCase() === pName);
        if (matchByName) return matchByName;
    }

    if (pName) {
        const matchBySub = catalogProducts.find(p => {
            const dbName = String(p.name || '').trim().toLowerCase();
            return dbName.length > 3 && (dbName.includes(pName) || pName.includes(dbName));
        });
        if (matchBySub) return matchBySub;
    }

    return item.products || null;
};

/**
 * Resolves full thumbnail image URL for an order line item
 */
export const getItemImageUrl = (item, allProducts = []) => {
    if (!item) return null;
    const resolvedProduct = item.products || resolveItemProduct(item, allProducts);
    const raw = 
        item.variant?.image_url || 
        resolvedProduct?.image_url || 
        item.products?.image_url ||
        item.product?.image_url || 
        item.image_url || 
        item.product_image || 
        item.product_image_url ||
        item.image;

    if (!raw) return null;
    const first = String(raw).split(',')[0].trim();
    if (!first) return null;
    if (first.startsWith('http://') || first.startsWith('https://') || first.startsWith('/') || first.startsWith('data:')) return first;
    if (first.startsWith('images/')) return `/${first}`;
    return `/images/${first}`;
};

/**
 * Enriches order items with product and variant details
 */
export const enrichOrderItems = async (rawItems, allProducts = [], setAllProducts = null) => {
    let items = rawItems || [];
    if (items.length === 0) return [];

    let catalog = allProducts;
    if (!catalog || catalog.length === 0) {
        const { data: dbProds } = await mysqlClient.from('products').select('*');
        catalog = dbProds || [];
        if (setAllProducts) setAllProducts(catalog);
    }

    const productIds = items.map(i => i.product_id).filter(Boolean);
    const variantIds = items.map(i => i.variant_id).filter(Boolean);

    const [prodsRes, varsRes] = await Promise.all([
        productIds.length > 0 ? mysqlClient.from('products').select('id, name, image_url, sku, category, product_no, product_group, product_catalog_image_id').in('id', productIds) : { data: [] },
        variantIds.length > 0 ? mysqlClient.from('product_variants').select('id, image_url, sku, name').in('id', variantIds) : { data: [] }
    ]);

    const prodMap = new Map((prodsRes.data || []).map(p => [String(p.id), p]));
    const varMap = new Map((varsRes.data || []).map(v => [String(v.id), v]));

    return items.map(item => {
        let prod = item.product_id ? prodMap.get(String(item.product_id)) || null : null;
        let vnt = item.variant_id ? varMap.get(String(item.variant_id)) || null : null;

        if (!prod || (!prod.image_url && catalog.length > 0)) {
            const resolved = resolveItemProduct(item, catalog);
            if (resolved) prod = { ...(prod || {}), ...resolved };
        }

        return {
            ...item,
            products: prod,
            variant: vnt
        };
    });
};
