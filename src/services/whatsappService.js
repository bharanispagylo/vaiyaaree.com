//  Cast Printz — WHATSAPP BUSINESS BOT (Premium Edition)

import { createClient } from '@supabase/supabase-js';
import { processReturnRequest } from './returnService';
import { generateOrderPDFBuffer } from '@/app/api/invoice/[orderId]/route';

// ─── 1. CONFIGURATION & CLIENTS ───────────────────────────────────────────────

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Admin client for bypass RLS on customers and orders
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const WHATSAPP_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();

// --- UTILS ---
const truncate = (str, limit) => (str && str.length > limit) ? str.substring(0, limit - 3) + "..." : str;

// Normalize phone number to E.164 format (with country code)

async function updateCustomerAdminNotes(toOrId, notes) {
    let query;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(toOrId);

    if (isUuid) {
        console.log(`[WA-UPDATE] Updating notes by ID: ${toOrId}`);
        query = supabaseAdmin.from('customers').update({ admin_notes: notes }).eq('id', toOrId);
    } else {
        const normalizedPhone = normalizePhoneNumber(toOrId);
        const phoneVariations = [normalizedPhone];
        if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
            phoneVariations.push(normalizedPhone.substring(2));
        }
        console.log(`[WA-UPDATE] Updating notes by Phone variations:`, phoneVariations);
        query = supabaseAdmin.from('customers').update({ admin_notes: notes }).in('phone', phoneVariations);
    }

    const { data, error } = await query.select();

    if (error) {
        console.error(`[WA-UPDATE-ERROR] Failed to update notes:`, error);
    } else if (data && data.length > 0) {
        console.log(`[WA-UPDATE-SUCCESS] Notes set to: "${notes}" for ${data.length} record(s)`);
    } else {
        console.warn(`[WA-UPDATE-WARNING] No records found to update for: ${toOrId}`);
    }

    return { data, error };
}

function normalizePhoneNumber(phone) {
    if (!phone) return phone;

    // Remove any non-digit characters (+ , - , space)
    let digits = phone.replace(/\D/g, '');

    // Remove leading zeros
    while (digits.startsWith('0')) {
        digits = digits.substring(1);
    }

    // If it starts with 91 and has 12 digits, it's correct for India
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits;
    }

    // If it has 10 digits and starts with [6-9], add 91
    if (digits.length === 10 && /^[6789]/.test(digits)) {
        return '91' + digits;
    }

    return digits;
}

// --- DEBUG LOGGER ---
const debugLog = (msg, obj = null) => {
    const timestamp = new Date().toISOString();
    if (obj) console.log(`[WA-DEBUG][${timestamp}] ${msg}`, JSON.stringify(obj, null, 2));
    else console.log(`[WA-DEBUG][${timestamp}] ${msg}`);
};

// ─── PREMIUM IMAGE ASSETS ─────────────────────────────────────────────────────

// Updated with distinct Saree visuals
// Updated with 15 Distinct Saree Colors/Styles
const PREMIUM_IMAGES = [
    'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85', // Red
    'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600&q=85', // Blue
    'https://images.unsplash.com/photo-1601055903647-87ac54bf14e0?w=600&q=85', // Pink
    'https://images.unsplash.com/photo-1621644820935-46b7a0808e04?w=600&q=85', // Green
    'https://images.unsplash.com/photo-1619623249764-a0c50c18435d?w=600&q=85', // Orange
    'https://images.unsplash.com/photo-1617325247661-675ab4b64ae4?w=600&q=85', // Silver
    'https://images.unsplash.com/photo-1596472481622-c4349f7b1129?w=600&q=85', // Purple
    'https://images.unsplash.com/photo-1628169222442-83b6f272c72b?w=600&q=85', // Gold
    'https://images.unsplash.com/photo-1518049362260-00ad8452bc21?w=600&q=85', // Teal
    'https://images.unsplash.com/photo-1509319117193-518da0485f73?w=600&q=85', // Maroon
    'https://images.unsplash.com/photo-1632205561578-1a52c3c97692?w=600&q=85', // Pattern
    'https://images.unsplash.com/photo-1582234033100-880026e6e22f?w=600&q=85', // Light Pink
    'https://images.unsplash.com/photo-1629814234057-07447693d56f?w=600&q=85', // Dark Blue
    'https://images.unsplash.com/photo-1574620021303-346d0a1b023e?w=600&q=85', // Yellow
    'https://images.unsplash.com/photo-1500917293049-61da1dc08358?w=600&q=85', // Black
];

// ─── TAX & SHIPPING RULES ──────────────────────────────────────────────────
const HOME_STATE = 'Tamil Nadu';
const GST_RATE = 0.05; // 5% for Sarees
const FLAT_SHIPPING = 100;

const INDIAN_STATES = [
    "Tamil Nadu", "Karnataka", "Kerala", "Andhra Pradesh", "Telangana",
    "Maharashtra", "Gujarat", "Delhi", "West Bengal", "Uttar Pradesh",
    "Rajasthan", "Madhya Pradesh", "Bihar", "Punjab", "Haryana", "Other"
];

// ─── STREAM CONTROL ───────────────────────────────────────────────────────────
const activeStreams = new Map();

function cancelStream(to) {
    if (activeStreams.has(to)) {
        console.log(`[WA] Stopping stream for ${to}`);
        activeStreams.delete(to);
    }
}

function startStream(to) {
    const id = Date.now().toString();
    activeStreams.set(to, id);
    return id;
}

function isStreamActive(to, id) {
    return activeStreams.get(to) === id;
}

// In-memory config cache (5 min TTL) — avoids repeated Supabase calls for same key
const configCache = new Map();
const CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

async function getConfig(key, fallback) {
    const cached = configCache.get(key);
    if (cached && Date.now() - cached.ts < CONFIG_TTL) return cached.value;

    const { data } = await supabase.from('app_settings').select('value').eq('key', key).single();
    // Replace literal \n from database with actual newline characters
    const raw = data?.value || fallback;
    const value = raw.replace(/\\n/g, '\n');

    configCache.set(key, { value, ts: Date.now() });
    return value;
}

// Deterministic image selector based on Product ID
function getPremiumImage(product) {
    if (product.image_url && product.image_url.startsWith('http')) return product.image_url;
    let hash = 0;
    const str = product.id || product.name || 'default';
    for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    const index = Math.abs(hash) % PREMIUM_IMAGES.length;
    return PREMIUM_IMAGES[index];
}

// ─── 2. WHATSAPP API HELPERS ──────────────────────────────────────────────────

export async function sendRawMessage(to, payload) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.error('❌ [WA-ERROR] Credentials Missing! Check your environment variables.');
        return { error: 'Missing credentials' };
    }

    // Normalize phone number to E.164 format
    const normalizedTo = normalizePhoneNumber(to);
    if (normalizedTo !== to) {
        console.log(`[WA] Normalized phone: ${to} → ${normalizedTo}`);
    }

    try {
        debugLog(`Sending ${payload.type} to ${normalizedTo}`);
        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...payload, to: normalizedTo })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.error?.message || 'Unknown Meta API Error';
            const errorCode = data.error?.code || 'No Code';
            console.error(`❌ [WA-ERROR][${response.status}] ${errorMsg} (Code: ${errorCode})`);

            if (errorCode === 131030) {
                console.error('💡 TIP: This usually means the 24-hour window is closed. The customer must message the bot first.');
            }

            return { error: errorMsg, code: errorCode, full: data.error, status: response.status };
        }

        debugLog(`Message sent successfully to ${normalizedTo}`, { message_id: data.messages?.[0]?.id });
        return data;
    } catch (error) {
        console.error('❌ [WA-NETWORK-ERROR]:', error);
        return { error: 'Network failure', details: error.message };
    }
}

export async function sendText(to, text) {
    // Ensure literal \n strings become real newlines (safety net)
    const safeText = text.replace(/\\n/g, '\n');
    return sendRawMessage(to, { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: safeText, preview_url: true } });
}

export async function sendImageButtons(to, imageUrl, bodyText, buttons) {
    return sendRawMessage(to, {
        messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive",
        interactive: {
            type: "button", header: { type: "image", image: { link: imageUrl } },
            body: { text: truncate(bodyText, 1024) },
            action: { buttons: buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id, title: truncate(b.title, 20) } })) }
        }
    });
}

export async function sendButtons(to, bodyText, buttons) {
    return sendRawMessage(to, {
        messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive",
        interactive: {
            type: "button", body: { text: truncate(bodyText, 1024) },
            action: { buttons: buttons.slice(0, 3).map(b => ({ type: "reply", reply: { id: b.id, title: truncate(b.title, 20) } })) }
        }
    });
}

export async function sendList(to, headerText, bodyText, buttonLabel, sections, footerText = "Cast Printz • Premium Collection") {
    const finalSections = Array.isArray(sections) && sections[0].rows ? sections : [{ title: "Options", rows: sections }];

    // Truncate sections for WhatsApp limits
    const sanitizedSections = finalSections.slice(0, 10).map(sec => ({
        title: truncate(sec.title || "Options", 24),
        rows: sec.rows.slice(0, 10).map(row => ({
            id: row.id,
            title: truncate(row.title, 24),
            description: truncate(row.description, 72)
        }))
    }));

    return sendRawMessage(to, {
        messaging_product: "whatsapp", recipient_type: "individual", to, type: "interactive",
        interactive: {
            type: "list",
            header: headerText ? { type: "text", text: truncate(headerText, 60) } : undefined,
            body: { text: truncate(bodyText, 1024) },
            footer: footerText ? { text: truncate(footerText, 60) } : undefined,
            action: { button: truncate(buttonLabel, 20), sections: sanitizedSections }
        }
    });
}

export async function sendDocument(to, link, caption, filename) {
    return sendRawMessage(to, {
        messaging_product: "whatsapp", recipient_type: "individual", to, type: "document",
        document: { link: link, caption: caption, filename: filename }
    });
}

export async function sendPdfBuffer(to, pdfBuffer, filename, caption) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) return { error: 'Missing credentials' };

    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename);

    try {
        const uploadRes = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/media`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
            body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.id) return { error: 'Media Upload Failed' };

        const payload = {
            messaging_product: "whatsapp", recipient_type: "individual", to: normalizePhoneNumber(to), type: "document",
            document: { id: uploadData.id, filename: filename, caption: caption }
        };

        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (e) {
        return { error: 'Send PDF Failed' };
    }
}


// ─── 3. CART MANAGEMENT & STOCK ───────────────────────────────────────────────

async function getCart(phone) {
    const normalizedPhone = normalizePhoneNumber(phone);
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        phoneVariations.push(normalizedPhone.substring(2));
    }

    const { data } = await supabase
        .from('whatsapp_cart')
        .select('*')
        .in('phone', phoneVariations)
        .order('created_at', { ascending: true });
    return data || [];
}

async function addToCart(phone, product, quantity = 1, variant = null) {
    const normalizedPhone = normalizePhoneNumber(phone);
    const productId = product.id;
    const variantId = variant?.id || null;

    // Check both variations
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        phoneVariations.push(normalizedPhone.substring(2));
    }

    const query = supabase.from('whatsapp_cart')
        .select('*')
        .in('phone', phoneVariations)
        .eq('product_id', productId);

    if (variantId) query.eq('variant_id', variantId);
    else query.is('variant_id', null);

    const { data: existing } = await query.single();

    if (existing) {
        await supabase.from('whatsapp_cart').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
    } else {
        await supabase.from('whatsapp_cart').insert({
            phone: normalizedPhone,
            product_id: productId,
            product_name: product.name,
            price: variant ? variant.price : product.price,
            quantity,
            image_url: product.image_url,
            variant_id: variantId,
            variant_name: variant ? variant.name : null
        });
    }
}

async function clearCart(phone) {
    const normalizedPhone = normalizePhoneNumber(phone);
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        phoneVariations.push(normalizedPhone.substring(2));
    }
    await supabase.from('whatsapp_cart').delete().in('phone', phoneVariations);
}

// Deduct stock for all items in an order
async function deductStock(orderId) {
    // SECURITY: Fetch order source first to prevent double-deduction
    const { data: orderMeta } = await supabase.from('orders').select('source, status').eq('id', orderId).single();
    if (orderMeta?.source === 'WEBSITE') {
        console.log(`[STOCK] Skipping deduction for Order #${orderId} (Source: WEBSITE, already deducted)`);
        return;
    }

    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (items) {
        for (const item of items) {
            const id = item.variant_id || item.product_id;
            const table = item.variant_id ? 'product_variants' : 'products';

            // 1. Fetch current stock and verify availability
            const { data: current, error: fetchErr } = await supabase.from(table)
                .select('stock, name, alert_threshold')
                .eq('id', id)
                .single();

            if (fetchErr || !current) continue;

            // 2. Perform atomic-style update (Only if stock >= quantity)
            const newStock = Math.max(0, current.stock - item.quantity);
            const { error: updateErr } = await supabase.from(table)
                .update({ stock: newStock })
                .eq('id', id)
                .gte('stock', item.quantity); // Atomic safety check

            if (!updateErr) {
                // 3. Log History
                await supabase.from('product_history').insert({
                    product_id: item.product_id,
                    variant_id: item.variant_id || null,
                    change_type: 'SALE',
                    quantity_change: -item.quantity,
                    new_stock: newStock,
                    reason: `Sold in Order #${orderId}`
                });

                await supabase.rpc('increment_total_sold', { prod_id: item.product_id, qty: item.quantity });

                // 4. Low Stock Alert (with unified main/variant check)
                const alertThreshold = (table === 'product_variants')
                    ? (await supabase.from('products').select('alert_threshold').eq('id', item.product_id).single()).data?.alert_threshold
                    : current.alert_threshold;

                if (newStock <= (alertThreshold || 0)) {
                    const adminPhone = process.env.WHATSAPP_ADMIN_NUMBER || '15551678232';
                    const prodName = current.name || (item.variant_id ? 'Variant' : 'Product');
                    await sendText(adminPhone, `⚠️ *LOW STOCK ALERT*\n\nProduct: *${prodName}*\nCurrent Stock: *${newStock}*\nThreshold: *${alertThreshold || 0}*`);
                }
            }
        }
    }
}

// ─── 4. PDF INVOICE ───────────────────────────────────────────────────────────

// Invoice generation is now handled by API route
// This avoids fs import on client side

// ─── 5. FLOW FUNCTIONS ───────────────────────────────────────────────────────

// ─── PRODUCT INQUIRY via Catalog ID (printed on product image) ────────────────
// Customer reads the CAT-XXXXX code from the product image and texts it to the bot.

// Generate lookup variants to fix common OCR misreads (e.g. 1→I, 0→O)
function getCatalogIdVariants(catalogId) {
    const code = catalogId.replace(/^CAT[-\s]?/i, '').toUpperCase();
    const CONFUSABLES = {
        '1': ['I', 'L'], 'I': ['1', 'L'], 'L': ['1', 'I'],
        '0': ['O'], 'O': ['0'],
        '5': ['S'], 'S': ['5'],
        '8': ['B'], 'B': ['8'],
        '6': ['G'], 'G': ['6'],
        'Z': ['2'], '2': ['Z']
    };

    const variants = new Set();

    // Recursive function to generate all permutations of confusable characters
    function generatePermutations(currentStr, index) {
        if (index === code.length) {
            variants.add(currentStr);
            variants.add(`CAT-${currentStr}`);
            variants.add(`CAT${currentStr}`);
            return;
        }

        const char = code[index];
        const options = [char, ...(CONFUSABLES[char] || [])];

        for (const opt of options) {
            generatePermutations(currentStr + opt, index + 1);
        }
    }

    // Safety: Only recurse if the code isn't excessively long to avoid memory issues
    if (code.length <= 10) {
        generatePermutations('', 0);
    } else {
        // Fallback for long codes: just add base and basic dash variants
        variants.add(code);
        variants.add(`CAT-${code}`);
        variants.add(`CAT${code}`);
    }

    return [...variants];
}

// Helper for fuzzy string matching (Levenshtein distance)
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion, deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

export async function handleProductInquiry(to, catalogId) {
    try {
        // Try exact match first, then OCR-confusion variants (1↔I, 0↔O etc.)
        const variants = getCatalogIdVariants(catalogId);
        let product = null;
        for (const variant of variants) {
            const { data } = await supabase
                .from('products').select('*')
                .ilike('product_catalog_image_id', variant)
                .eq('is_active', true).single();
            if (data) { product = data; break; }
        }

        // FUZZY MATCHING FALLBACK
        // If exact match fails (e.g. OCR read AMBI instead of AMB6I), find the closest match
        if (!product) {
            console.log(`[WA-DEBUG] Exact match failed for ${catalogId}, attempting fuzzy match...`);
            const { data: allProducts } = await supabase
                .from('products').select('id, product_catalog_image_id')
                .eq('is_active', true);

            if (allProducts && allProducts.length > 0) {
                // Strip "CAT-" to compare just the base alphanumeric codes
                const searchCode = catalogId.replace(/[^A-Z0-9]/gi, '').replace(/^CAT/i, '').toUpperCase();
                let bestMatch = null;
                let lowestDistance = 999;

                for (const p of allProducts) {
                    if (!p.product_catalog_image_id) continue;
                    const dbCode = p.product_catalog_image_id.replace(/[^A-Z0-9]/gi, '').replace(/^CAT/i, '').toUpperCase();

                    const dist = levenshteinDistance(searchCode, dbCode);
                    if (dist < lowestDistance) {
                        lowestDistance = dist;
                        bestMatch = p;
                    }
                }

                // Allow a distance of up to 2 (e.g., missed a character, or swapped one character)
                // Minimum search code length of 3 to avoid accidentally matching tiny garbage strings
                if (bestMatch && lowestDistance <= 2 && searchCode.length >= 3) {
                    console.log(`[WA-DEBUG] Fuzzy match found! '${searchCode}' matched with DB code (Distance: ${lowestDistance})`);
                    const { data: fuzzyData } = await supabase
                        .from('products').select('*')
                        .eq('id', bestMatch.id).single();
                    if (fuzzyData) {
                        product = fuzzyData;
                    }
                }
            }
        }

        if (!product) {
            return sendText(to,
                `❌ Product code *${catalogId.toUpperCase()}* not found.\n\nSend *Hi* to browse our full collection! ✨`
            );
        }

        // --- CHECK IF ALREADY ORDERED BY THIS CUSTOMER ---
        const normalizedPhone = normalizePhoneNumber(to);
        const phoneVariations = [normalizedPhone];
        if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
            phoneVariations.push(normalizedPhone.substring(2));
        }

        const { data: pastOrders } = await supabaseAdmin
            .from('orders')
            .select('*, order_items(*)')
            .in('customer_phone', phoneVariations)
            .neq('status', 'CANCELLED');

        const matchingOrder = pastOrders?.find(o =>
            o.order_items?.some(item => item.product_id === product.id)
        );

        const imgUrl = getPremiumImage(product);

        if (matchingOrder) {
            // Already ordered -> Show past order details
            const orderDate = new Date(matchingOrder.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            const caption =
                `🛍️ *${product.name}*\n` +
                `--------------------------\n` +
                `You have already ordered this item in a past order! 💖\n\n` +
                `• *Order ID:* #${matchingOrder.id}\n` +
                `• *Order Date:* ${orderDate}\n` +
                `• *Status:* *${matchingOrder.status}*\n` +
                `• *Order Total:* ₹${matchingOrder.total_amount.toLocaleString()}\n\n` +
                `Tap below to track your order details:`;

            const buttons = [
                { id: "menu_track", title: "Track Order" },
                { id: `addcart_${product.id}`, title: "🛒 Buy Again" },
                { id: "menu_main", title: "🏠 Main Menu" }
            ];
            return await sendImageButtons(to, imgUrl, caption, buttons);
        }

        const stock = product.stock || 0;
        const alertThreshold = product.alert_threshold || 5;
        const stockStatus = stock <= 0
            ? 'Out of Stock'
            : stock <= alertThreshold
                ? `Only ${stock} left — Order soon!`
                : `In Stock`;

        const desc = product.description
            ? `\n📝 ${product.description.substring(0, 120)}${product.description.length > 120 ? '...' : ''}`
            : '';

        const caption =
            `📦 *${product.name}*\n` +
            (product.category ? `🏷️ ${product.category}\n` : '') +
            `💎 *₹${(product.price || 0).toLocaleString()}*\n` +
            `${stockStatus}${desc}`;

        const buttons = stock > 0
            ? [
                { id: `addcart_${product.id}`, title: '🛒 Add to Cart' },
                { id: 'menu_catalogue', title: '📖 Browse More' }
            ]
            : [
                { id: 'menu_catalogue', title: '📖 Browse More' },
                { id: 'menu_main', title: '🏠 Main Menu' }
            ];

        await sendImageButtons(to, imgUrl, caption, buttons);
    } catch (err) {
        console.error('[WA] handleProductInquiry error:', err);
        await sendText(to, '⚠️ Could not load product details. Please send *Hi* to browse our catalogue.');
    }
}

export async function sendMainMenu(to) {
    // Build shop URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://castprintz.vercel.app');
    const shopUrl = `${appUrl}/shop?phone=${encodeURIComponent(to)}`;

    // Fetch dynamic welcome message
    const welcomeMsg = await getConfig('wa_welcome_message', 'Explore our premium collection and manage your orders:');

    // Fetch welcome image or shop logo
    let welcomeImg = await getConfig('wa_welcome_image', null) || await getConfig('shop_logo', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1000&q=80');

    // Ensure it's absolute URL so WhatsApp can display it
    if (welcomeImg && !welcomeImg.startsWith('http')) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://castprintz.vercel.app');
        welcomeImg = (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) + (welcomeImg.startsWith('/') ? '' : '/') + welcomeImg;
    }

    // Use sendImageButtons for a richer first impression
    await sendImageButtons(to, welcomeImg, welcomeMsg, [
        { id: "menu_catalogue", title: "View Catalogue" },
        { id: "menu_track", title: "My Orders" },
        { id: "menu_contact", title: "Contact Us" }
    ]);
}




export async function sendCatalog(to) {
    const header = await getConfig('wa_catalog_header', "PREMIUM COLLECTIONS");
    const body = await getConfig('wa_catalog_body', "Curated just for you:");

    await sendList(to, header, body, "View Collections", [
        { id: "menu_catalogue", title: "Browse Categories", description: "By Saree Type" },
        { id: "ctlg_all", title: "New Arrivals", description: "Latest Collections" },
        { id: "ctlg_all_full", title: "Full Catalogue", description: "Browse Inventory" }
    ]);
}

// ─── CATALOGUE FLOW (Dynamic categories from DB) ────────────────────────────

const CATEGORY_EMOJIS = {};

function getCategoryEmoji(category) {
    return '';
}

export async function sendCatalogueCategories(to) {
    // Dynamically fetch all distinct categories from the products table
    const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

    // Count products per category
    const catMap = {};
    (allProducts || []).forEach(p => {
        if (p.category) {
            catMap[p.category] = (catMap[p.category] || 0) + 1;
        }
    });

    const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    if (categories.length === 0) {
        return sendText(to, "⚠️ Our catalogue is being updated. Please check back soon!");
    }

    // Build list rows — max 10 rows in a WhatsApp list
    const rows = [];

    // 1. Always add New Arrivals first
    rows.push({
        id: 'ctlg_all_new',
        title: 'New Arrivals',
        description: 'Latest premium sarees added'
    });

    // 2. Add categories from DB
    categories.slice(0, 8).map(([cat, count]) => {
        rows.push({
            id: `ctlg_${cat.replace(/\s+/g, '_').toLowerCase()}`,
            title: `${getCategoryEmoji(cat)} ${cat}`,
            description: `${count} saree${count > 1 ? 's' : ''} available`
        });
    });

    // 3. View All at the end
    rows.push({
        id: 'ctlg_all_full',
        title: 'View Full Collection',
        description: `Browse all ${allProducts.length} items`
    });

    await sendList(to, "📖 SAREE CATALOGUE", `Explore our premium saree collection.\n\nWe have ${allProducts.length} beautiful items ready for you! ✨\n\nSelect a category or browse all:`, "Browse Collection", rows);
}

export async function sendCatalogueByType(to, typeIdRaw, startOffset = 0) {
    // typeIdRaw is like 'ctlg_silk_saree' or 'ctlg_all' or 'ctlg_page_silk_saree_50'
    const cleanId = typeIdRaw.replace('ctlg_page_', '').replace('ctlg_', '');

    // Improved logic to correctly detect "all" types
    let typeId = 'all';
    if (cleanId.startsWith('all')) {
        typeId = 'all';
    } else {
        typeId = cleanId.split('_').filter(s => !/^\d+$/.test(s)).join('_') || 'all';
    }

    let categoryName = 'All Sarees';
    let searchFilter = null;

    if (typeId !== 'all') {
        // Convert back from snake_case to find matching category
        const searchTerm = typeId.replace(/_/g, ' ');
        categoryName = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
        searchFilter = searchTerm;
    }

    if (startOffset === 0) await sendText(to, `📖 Loading *${categoryName}* catalogue...`);

    // ─── LOG REQUEST FOR ADMIN ───
    if (typeId === 'all' && startOffset === 0) {
        console.log(`\n========== CUSTOMER VIEW ALL PRODUCTS REQUEST ==========`);
    }

    let query = supabase.from('products').select('*', { count: 'exact' }).eq('is_active', true);
    if (searchFilter) query = query.ilike('category', `%${searchFilter}%`);

    const streamId = startStream(to);
    const PAGE_LIMIT = 5; // Reduced from 60 to 5 as per user request for pagination flow

    let { data: prods, count: totalCount, error: queryError } = await query.order('created_at', { ascending: false }).range(startOffset, startOffset + PAGE_LIMIT - 1);

    if (queryError) {
        console.error(`[WA] Database Query Error:`, queryError);
        return sendText(to, "⚠️ Sorry, I encountered an error while fetching the catalogue.");
    }

    console.log(`[WA] Found ${prods?.length || 0} items for "${categoryName}" (Total in DB: ${totalCount})`);

    if (!prods || prods.length === 0) {
        if (startOffset === 0) {
            return sendButtons(to, `⚠️ No sarees found in *${categoryName}* right now.`, [
                { id: "menu_catalogue", title: "📖 Back to Catalogue" },
                { id: "menu_main", title: "🏠 Main Menu" }
            ]);
        }
        return sendText(to, "⚠️ No more items in this category.");
    }

    for (const [idx, p] of prods.entries()) {
        if (!isStreamActive(to, streamId)) {
            console.log(`[WA] Stream for ${to} was cancelled or superseded.`);
            return;
        }

        const effectiveStock = p.stock - (p.alert_threshold || 0);
        const stockStatus = effectiveStock <= 0 ? "❌ OUT OF STOCK" : effectiveStock <= 5 ? `⚠️ Only ${effectiveStock} left!` : "✅ In Stock";
        const groupTag = p.product_group ? `\n🏷️ ${p.product_group}` : '';
        const caption = `📖 *${p.name}*\n${p.description || ''}${groupTag}\n\n💎 *₹${p.price.toLocaleString()}*\n${stockStatus}`;

        // Variable Product Logic: Change button label
        const isVariable = p.type === 'variant';
        const buttons = p.stock > 0
            ? [{ id: `addcart_${p.id}`, title: isVariable ? "🎨 Select Option" : "🛒 Add to Cart" }]
            : [{ id: "menu_catalogue", title: "📖 Back to Catalogue" }];

        const imgUrl = getPremiumImage(p);

        if (typeId === 'all') {
            console.log(`[TERMINAL LOG] Product #${idx + 1}: Name: ${p.name}, Price: ${p.price}, Stock: ${p.stock}, Category: ${p.category}`);
        }

        try {
            console.log(`[WA] Sending item ${idx + 1}/${prods.length}: ${p.name} (Img: ${imgUrl.substring(0, 30)}...)`);
            const sendResult = await sendImageButtons(to, imgUrl, caption, buttons);

            if (sendResult && sendResult.error) {
                console.error(`   ❌ WA API Error for [${p.name}]:`, sendResult.error.message || sendResult.error);
                await sendText(to, caption + "\n[Image failed, but you can Add to Cart]");
            }
        } catch (err) {
            console.error(`   ❌ Exception sending [${p.name}]:`, err.message);
            await sendText(to, caption + "\n[Image failed, but you can Add to Bag]");
        }

        // Wait to guarantee WhatsApp delivers images in order
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[WA] Successfully finished sending ${prods.length} items to ${to}`);

    if (!isStreamActive(to, streamId)) return;

    const nextOffset = startOffset + prods.length;
    const hasMore = totalCount > nextOffset;

    if (hasMore) {
        await sendButtons(to, `👇 Showing ${nextOffset} of ${totalCount} sarees in *${categoryName}*.`, [
            { id: `ctlg_page_${typeId}_${nextOffset}`, title: "📜 Show Next 5" },
            { id: "menu_catalogue", title: "📖 Back to Types" }
        ]);
    } else {
        await sendButtons(to, `✅ That's all ${totalCount} saree${totalCount > 1 ? 's' : ''} in *${categoryName}*!\n\nWhat would you like to do next?`, [
            { id: "menu_catalogue", title: "📖 More Types" },
            { id: "menu_cart", title: "🛒 View Cart" }
        ]);
    }
}

const PAGE_SIZE = 50;

// Consolidated with sendCatalogueByType for consistency
export async function sendProductsByCategory(to, categoryIdRaw, startOffset = 0) {
    return await sendCatalogueByType(to, categoryIdRaw, startOffset);
}

export async function handleAddToCart(to, productIdRaw) {
    const productId = productIdRaw.replace('addcart_', '');

    // Fetch product and its variants
    const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
    const { data: variants } = await supabase.from('product_variants').select('*').eq('product_id', productId);

    const effectiveStock = (product.stock || 0) - (product.alert_threshold || 0);
    if (!product || !product.is_active || effectiveStock <= 0) return sendText(to, "⚠️ Sorry, this item is out of stock or no longer available.");

    if (variants && variants.length > 0) {
        // Show variant selection list
        const rows = variants.map(v => ({
            id: `vsel_${v.id}`,
            title: v.name,
            description: `₹${v.price.toLocaleString()} | Stock: ${v.stock}`
        }));

        return await sendList(to, "🎨 SELECT OPTION", `Please select your preferred option for *${product.name}*:`, "Select Option", rows);
    }

    // No variants, add directly
    await addToCart(to, product, 1);
    const { data: cartItem } = await supabase.from('whatsapp_cart').select('quantity').eq('phone', to).eq('product_id', productId).is('variant_id', null).single();
    const qty = cartItem ? cartItem.quantity : 1;

    await sendButtons(to, `✅ *Added to Cart*\n${product.name}\nQty in Cart: ${qty}`, [
        { id: `qty_inc_${productId}`, title: "➕ Add Another" },
        { id: `qty_dec_${productId}`, title: "➖ Reduce Qty" },
        { id: "menu_cart", title: "🛒 View Cart" }
    ]);
}

export async function handleVariantSelection(to, variantId) {
    const { data: variant } = await supabase.from('product_variants').select('*, products(*)').eq('id', variantId).single();
    if (!variant || variant.stock < 1) return sendText(to, "⚠️ Sorry, this option is out of stock.");

    const product = variant.products;
    await addToCart(to, product, 1, variant);

    const { data: cartItem } = await supabase.from('whatsapp_cart').select('quantity').eq('phone', to).eq('variant_id', variantId).single();
    const qty = cartItem ? cartItem.quantity : 1;

    await sendButtons(to, `✅ *Added to Cart*\n${product.name} (${variant.name})\nQty in Cart: ${qty}`, [
        { id: `vqty_inc_${variantId}`, title: "➕ Add Another" },
        { id: `vqty_dec_${variantId}`, title: "➖ Reduce Qty" },
        { id: "menu_cart", title: "🛒 View Cart" }
    ]);
}

export async function handleModifyQuantity(to, action, targetId, isVariant = false) {
    const query = supabase.from('whatsapp_cart').select('*').eq('phone', to);
    if (isVariant) query.eq('variant_id', targetId);
    else query.eq('product_id', targetId).is('variant_id', null);

    const { data: item } = await query.single();
    if (!item) return sendText(to, "Item not found in cart.");

    let newQty = item.quantity;
    if (action === 'inc') newQty += 1;
    if (action === 'dec') newQty -= 1;

    const itemName = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;

    if (newQty < 1) {
        await supabase.from('whatsapp_cart').delete().eq('id', item.id);
        return sendText(to, `🗑️ Removed ${itemName} from cart.`);
    } else {
        await supabase.from('whatsapp_cart').update({ quantity: newQty }).eq('id', item.id);

        const incId = isVariant ? `vqty_inc_${targetId}` : `qty_inc_${targetId}`;
        const decId = isVariant ? `vqty_dec_${targetId}` : `qty_dec_${targetId}`;

        await sendButtons(to, `✅ *Quantity Updated*\n${itemName}\nNew Qty: ${newQty}`, [
            { id: incId, title: "➕ Add Another" },
            { id: decId, title: "➖ Reduce Qty" },
            { id: "menu_cart", title: "🛒 View Cart" }
        ]);
    }
}

export async function handleViewCart(to) {
    const cart = await getCart(to);
    if (!cart || cart.length === 0) return sendButtons(to, "Your cart is empty.", [{ id: "menu_browse", title: "🛍️ Shop Now" }]);

    let msg = `🛒 *YOUR CART*\n\n`;
    let total = 0;
    cart.forEach((item, i) => {
        total += item.price * item.quantity;
        const name = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;
        msg += `${i + 1}. ${name} x${item.quantity} = ₹${(item.price * item.quantity).toLocaleString()}\n`;
    });
    msg += `\n💎 *Total: ₹${total.toLocaleString()}*`;

    await sendButtons(to, msg, [
        { id: "start_checkout", title: "✅ Place Order" },
        { id: "menu_browse", title: "🛍️ Add More" },
        { id: "edit_cart", title: "✏️ Edit Cart" }
    ]);
}

export async function handleEditCart(to) {
    const cart = await getCart(to);
    if (!cart || cart.length === 0) return handleViewCart(to);

    const sections = [{
        title: "Select Item to Edit",
        rows: cart.map(item => ({
            id: `edit_item_${item.id}`, // item.id is the row ID in whatsapp_cart
            title: (item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name).substring(0, 23),
            description: `Qty: ${item.quantity} | ₹${item.price * item.quantity}`
        }))
    }];

    await sendList(to, "✏️ EDIT CART", "Select an item to change quantity or remove:", "Select Item", sections);
}

export async function handleCartItemOptions(to, cartItemId) {
    const { data: item } = await supabase.from('whatsapp_cart').select('*').eq('id', cartItemId).single();
    if (!item) return handleViewCart(to);

    const itemName = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;
    const isVariant = !!item.variant_id;
    const targetId = isVariant ? item.variant_id : item.product_id;
    const incId = isVariant ? `vqty_inc_${targetId}` : `qty_inc_${targetId}`;
    const decId = isVariant ? `vqty_dec_${targetId}` : `qty_dec_${targetId}`;

    await sendButtons(to, `⚙️ *Edit Item*\n${itemName}\nQty: ${item.quantity}`, [
        { id: incId, title: "➕ Increase" },
        { id: decId, title: "➖ Reduce" },
        { id: `remove_item_${item.id}`, title: "❌ Remove" }
    ]);
}

export async function handleRemoveItem(to, itemId) {
    await supabase.from('whatsapp_cart').delete().eq('id', itemId);
    await sendText(to, "✅ Item removed from cart.");
    await handleViewCart(to);
}

export async function startCheckout(to) {
    const cart = await getCart(to);
    if (!cart.length) return sendText(to, "Cart empty!");

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);

    // Initial Draft
    await supabase.from('orders').insert({
        id: orderId,
        customer_phone: to,
        status: "DRAFT",
        subtotal: subtotal,
        total_amount: subtotal,
        source: 'WHATSAPP',
        created_at: new Date()
    });

    // Add Items (Support Variants)
    const orderItems = cart.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price_at_time: item.price,
        variant_id: item.variant_id,
        variant_name: item.variant_name
    }));
    await supabase.from('order_items').insert(orderItems);

    // Check Previous Orders for Billing Address Reuse
    const { data: lastOrders } = await supabase.from('orders')
        .select('customer_name, billing_address, customer_phone')
        .eq('customer_phone', to)
        .not('billing_address', 'is', null)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })
        .limit(1);

    const lastOrder = lastOrders?.[0];

    if (lastOrder && lastOrder.billing_address) {
        const billing = lastOrder.billing_address;
        await sendButtons(to,
            `📝 *Checkout - Billing Address*\n\nWe found your saved billing address:\n\n` +
            `👤 ${billing.name || lastOrder.customer_name || 'Customer'}\n` +
            `� ${billing.mobile || to}\n` +
            `📍 ${billing.address}\n\n` +
            `Use this as your billing address?`,
            [
                { id: `use_saved_billing_${orderId}`, title: "✅ Yes, Use This" },
                { id: `new_billing_${orderId}`, title: "✏️ Enter New Address" }
            ]
        );
    } else {
        await sendText(to,
            `📝 *Checkout - Billing Address*\n\n` +
            `Please reply with your *billing details* in this format:\n\n` +
            `*Name, Mobile Number, Email, Full Address*\n\n` +
            `Example:\n_Lakshmi, 9876543210, lakshmi@email.com, 12 Main St, Bangalore, 560001_`
        );
    }
}

// Handle saved billing address reuse
export async function handleSavedBilling(to, orderId) {
    const { data: lastOrders } = await supabase.from('orders')
        .select('customer_name, billing_address, customer_email')
        .eq('customer_phone', to)
        .not('billing_address', 'is', null)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })
        .limit(1);

    const lastOrder = lastOrders?.[0];
    if (lastOrder && lastOrder.billing_address) {
        await supabase.from('orders').update({
            customer_name: lastOrder.billing_address.name || lastOrder.customer_name,
            customer_email: lastOrder.customer_email || lastOrder.billing_address.email,
            billing_phone: lastOrder.billing_address.mobile || lastOrder.customer_phone || to,
            billing_email: lastOrder.customer_email || lastOrder.billing_address.email,
            billing_address: lastOrder.billing_address
        }).eq('id', orderId);

        // If no email exists, ask for it
        if (!lastOrder.customer_email && !lastOrder.billing_address.email) {
            await sendText(to,
                `📧 *Email Address Required*\n\n` +
                `We need your email address to send order confirmation and updates.\n\n` +
                `Please reply with your email address:\n\n` +
                `Example: lakshmi@email.com`
            );
            return; // Wait for email response
        }
    }

    // Ask if shipping same as billing
    return await askShippingSameAsBilling(to, orderId);
}

// Ask if shipping address is same as billing
export async function askShippingSameAsBilling(to, orderId) {
    await sendButtons(to,
        `🚚 *Shipping Address*\n\nIs your shipping address the *same* as your billing address?`,
        [
            { id: `shipping_same_${orderId}`, title: "✅ Yes, Same Address" },
            { id: `shipping_diff_${orderId}`, title: "✏️ Different Address" }
        ]
    );
}

// Handle shipping same as billing - copy billing to shipping
export async function handleShippingSame(to, orderId) {
    const { data: order } = await supabase.from('orders')
        .select('billing_address, customer_name, customer_phone, customer_email')
        .eq('id', orderId)
        .single();

    if (order && order.billing_address) {
        await supabase.from('orders').update({
            shipping_address: order.billing_address,
            shipping_phone: order.billing_address.mobile || order.customer_phone || to,
            shipping_email: order.billing_address.email || order.customer_email
        }).eq('id', orderId);
    }

    // Continue to state selection
    return await askState(to, orderId);
}

// Handle new billing address input
export async function handleNewBillingAddress(to, orderId, text) {
    const parsed = parseAddressString(text, to);

    if (parsed.error) {
        return await sendText(to, `⚠️ ${parsed.error}\n\nPlease try again with correct format:\n\nName, Mobile, Email, Address, City, Pincode`);
    }

    if (!parsed.email) {
        return await sendText(to, "⚠️ Email is missing. Please try again with correct format:\n\nName, Mobile, Email, Address, City, Pincode\n\nExample:\nLakshmi, 9876543210, lakshmi@example.com, 12 Main St, Bangalore, 560001");
    }

    const billingAddress = {
        name: parsed.name,
        mobile: parsed.mobile,
        email: parsed.email,
        address: parsed.address,
        city: parsed.city,
        pincode: parsed.pincode
    };

    await supabase.from('orders').update({
        customer_name: parsed.name,
        customer_phone: parsed.mobile,
        customer_email: parsed.email,
        billing_phone: parsed.mobile,
        billing_email: parsed.email,
        billing_address: billingAddress
    }).eq('id', orderId);

    // Ask if shipping same as billing
    return await askShippingSameAsBilling(to, orderId);
}

// Handle new shipping address input
export async function handleNewShippingAddress(to, orderId, text) {
    const parsed = parseAddressString(text, to);

    if (parsed.error) {
        return await sendText(to, `⚠️ ${parsed.error}\n\nPlease try again with correct format:\n\nName, Mobile, Email, Address, City, Pincode`);
    }

    const shippingAddress = {
        name: parsed.name,
        mobile: parsed.mobile,
        email: parsed.email,
        address: parsed.address,
        city: parsed.city,
        pincode: parsed.pincode
    };

    await supabase.from('orders').update({
        shipping_address: shippingAddress,
        shipping_phone: parsed.mobile,
        shipping_email: parsed.email
    }).eq('id', orderId);

    // Continue to state selection
    return await askState(to, orderId);
}

// Helper to parse address strings
function parseAddressString(text, defaultMobile) {
    const rawBody = text.trim();
    let name = 'Valued Customer';
    let mobile = defaultMobile;
    let email = '';
    let address = '';
    let city = '';
    let pincode = '';

    // Try splitting by comma or newline
    const parts = rawBody.split(/[,\n]/).map(p => p.trim()).filter(Boolean);

    if (parts.length >= 4) {
        // Expected: Name, Mobile, Email, Address...
        name = parts[0];
        mobile = parts[1];
        email = parts[2];

        // Sometimes email and mobile are swapped
        if (mobile.includes('@') && !email.includes('@')) {
            const temp = mobile; mobile = email; email = temp;
        }

        // Remaining parts are address, city, pincode
        const remaining = parts.slice(3);

        // Try to identify pincode (6 digits)
        const pinIdx = remaining.findIndex(p => /^\d{6}$/.test(p));
        if (pinIdx !== -1) {
            pincode = remaining[pinIdx];
            // If city is before pincode
            if (pinIdx > 0) city = remaining[pinIdx - 1];
            address = remaining.slice(0, pinIdx > 0 ? pinIdx - 1 : pinIdx).join(', ');
        } else {
            // Fallback: last part is pincode? 
            const lastPart = remaining[remaining.length - 1];
            if (/\d{5,6}/.test(lastPart)) {
                pincode = lastPart;
                if (remaining.length > 1) city = remaining[remaining.length - 2];
                address = remaining.slice(0, -2).join(', ');
            } else {
                address = remaining.join(', ');
            }
        }
    } else if (parts.length >= 2) {
        name = parts[0];
        address = parts.slice(1).join(', ');
    } else {
        address = rawBody;
    }

    // Basic Validation
    if (email && !email.includes('@')) {
        return { error: "Invalid email format." };
    }

    // Clean phone
    mobile = mobile.replace(/\D/g, '');
    if (mobile.length === 10) mobile = '91' + mobile;

    return { name, mobile, email, address, city, pincode };
}

export async function askState(to, orderId) {
    // WhatsApp lists have a max 10 row limit — too few for all 28 Indian states.
    // Instead, prompt the user to type their state name.
    await sendButtons(to,
        `📍 *Delivery State*\n\nWhich state are you in? Reply with your state name.\n\n` +
        `_e.g. Tamil Nadu, Kerala, Karnataka, Maharashtra, Delhi..._`,
        [
            { id: `state_tamil_nadu_${orderId}`, title: '📍 Tamil Nadu' },
            { id: `state_kerala_${orderId}`, title: '📍 Kerala' },
            { id: `state_other_${orderId}`, title: '📍 Other State' }
        ]
    );
}

export async function handleStateSelection(to, stateNameClean, orderId) {
    // stateNameClean is like 'tamil_nadu'
    const stateName = stateNameClean.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!order) return;

    const subtotal = order.subtotal || 0;
    const tax = subtotal * GST_RATE;
    const shipping = FLAT_SHIPPING;
    const total = subtotal + tax + shipping;

    // Calculate CGST/SGST vs IGST
    let taxDetails = {};
    if (stateName === HOME_STATE) {
        taxDetails = { cgst: tax / 2, sgst: tax / 2, igst: 0 };
    } else {
        taxDetails = { cgst: 0, sgst: 0, igst: tax };
    }

    await supabase.from('orders').update({
        customer_state: stateName,
        tax_amount: tax,
        shipping_cost: shipping,
        total_amount: total,
        ...taxDetails
    }).eq('id', orderId);

    return await askPaymentMode(to, orderId);
}

export async function askPaymentMode(to, orderId) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    const total = order?.total_amount?.toLocaleString() || '0';

    await sendButtons(to, `✅ *Address & Taxes Confirmed!*\n\n💰 *Total Billing: ₹${total}*\n(Inc. GST & Shipping)\n\nHow would you like to pay?`, [
        { id: `pay_upi_${orderId}`, title: "📲 UPI / Online" },
        { id: `pay_cod_${orderId}`, title: "💵 Cash on Delivery" }
    ]);
}
// Centralized Order Notification (Rich Message + Invoice)
export async function notifyOrderSuccess(orderId, isPaid = false) {
    try {
        console.log(`[NOTIFY] Triggering success notification for #${orderId}`);
        const { data: order, error } = await supabase
            .from('orders')
            .select(`*, order_items(*)`)
            .eq('id', orderId)
            .single();

        if (error || !order) {
            console.error(`[NOTIFY] Failed to fetch order #${orderId} for notification:`, error);
            return;
        }

        const phoneTo = order.customer_phone;
        const bPhone = order.billing_phone || (typeof order.billing_address === 'object' ? order.billing_address?.phone : null);
        const targets = [...new Set([phoneTo, bPhone].filter(Boolean).map(t => normalizePhoneNumber(String(t).trim())))];
        if (targets.length === 0) return;

        console.log(`[NOTIFY] Targets for Order #${orderId}:`, targets);

        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://mathematically-foliaged-palmer.ngrok-free.dev');
        // Ensure no trailing slash for consistency
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        const invoiceUrl = `${baseUrl}/api/invoice/${order.id}`;
        console.log(`[NOTIFY] Invoice URL: ${invoiceUrl}`);
        const total = order.total_amount?.toLocaleString() || '0';
        const itemsList = (order.order_items || [])
            .map(item => `• ${item.product_name} x${item.quantity} — ₹${(item.price_at_time * item.quantity).toLocaleString()}`)
            .join('\n');

        const statusEmoji = isPaid ? '✅' : '🎉';
        const statusText = isPaid ? 'Payment Confirmed! Thank you!' : 'Hi ' + (order.customer_name || 'Customer') + '! Your order has been placed successfully.';

        const message =
            `${statusEmoji} *Order Confirmed — Cast Printz* ${statusEmoji}\n\n` +
            `${statusText}\n\n` +
            `📦 *Order ID:* #${orderId}\n` +
            `💰 *Grand Total:* ₹${total}\n` +
            `🛍️ *Items:*\n${itemsList}\n\n` +
            `📍 *Delivery Address:*\n${order.delivery_address || 'As provided'}\n\n` +
            `🌐 *Shop Online:* ${baseUrl}\n\n` +
            `Generating your PDF bill...`;

        for (const targetPhone of targets) {
            try {
                await sendText(targetPhone, message);

                // Send product images and info
                if (order.order_items && order.order_items.length > 0) {
                    for (const item of order.order_items) {
                        try {
                            const { data: product } = await supabase
                                .from('products')
                                .select('image_url')
                                .eq('id', item.product_id)
                                .single();

                            const imgUrl = product?.image_url;
                            if (imgUrl) {
                                const caption = `🛍️ *Item:* ${item.product_name}\n` +
                                    (item.variant_name ? `🎨 *Option:* ${item.variant_name}\n` : '') +
                                    `💵 *Price:* ₹${item.price_at_time.toLocaleString()}\n` +
                                    `🔢 *Quantity:* ${item.quantity}`;

                                await sendRawMessage(targetPhone, {
                                    messaging_product: "whatsapp",
                                    recipient_type: "individual",
                                    to: targetPhone,
                                    type: "image",
                                    image: {
                                        link: imgUrl,
                                        caption: caption
                                    }
                                });
                                // Delay to guarantee ordered delivery of images
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        } catch (err) {
                            console.error('[WA-NOTIFY] Failed to send product image:', err);
                        }
                    }
                }

                try {
                    let settings = { shop_name: 'Cast Printz', shop_phone: '7558189732', shop_email: 'castprintzofficial@gmail.com', shop_address: 'Premium Saree Collections' };
                    try {
                        const { data: settingsData } = await supabase.from('app_settings').select('*');
                        if (settingsData) {
                            settingsData.forEach(item => {
                                if (item.key === 'shop_name') settings.shop_name = item.value;
                                if (item.key === 'shop_phone' || item.key === 'business_phone') settings.shop_phone = item.value;
                                if (item.key === 'shop_address') settings.shop_address = item.value;
                            });
                        }
                    } catch (e) { }

                    const pdfBuffer = await generateOrderPDFBuffer(order, settings);
                    await new Promise(r => setTimeout(r, 1000));
                    await sendPdfBuffer(targetPhone, pdfBuffer, `Invoice_${orderId}.pdf`, `Invoice - Order #${orderId}`);
                } catch (pdfErr) {
                    console.error('[NOTIFY] Failed to generate/send PDF:', pdfErr);
                }

                await new Promise(r => setTimeout(r, 1200));

                await sendButtons(targetPhone, "Thank you for shopping with *Cast Printz*!\n\nTap below to manage your order:", [
                    { id: "menu_track", title: "Track Order" },
                    { id: "menu_my_orders", title: "View Order" },
                    { id: `menu_cancel_order`, title: "Cancel Order" }
                ]);
            } catch (notifyErr) {
                console.error(`[NOTIFY] Error notifying target ${targetPhone}:`, notifyErr);
            }
        }

        console.log(`[NOTIFY] Notification sent successfully for #${orderId}`);
    } catch (err) {
        console.error(`[NOTIFY] Error in notifyOrderSuccess:`, err);
    }
}

// Finalize Order
export async function finalizeOrder(to, method, orderId) {
    if (method === 'COD') {
        await sendText(to, "order processing...");
    }

    const { data: currentOrder } = await supabase.from('orders').select('status').eq('id', orderId).single();

    // Determine target status
    let status = method === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT';

    // If it's already PAID or more advanced, don't downgrade it
    if (currentOrder && (currentOrder.status === 'PAID' || currentOrder.status === 'SHIPPED')) {
        status = currentOrder.status;
    }

    await supabase.from('orders').update({ status, payment_method: method }).eq('id', orderId);

    // Add initial PLACED log entry for COD orders
    if (method === 'COD') {
        await supabase.from('order_status_logs').insert({
            order_id: orderId,
            status: 'PLACED',
            notes: 'Order placed via WhatsApp (COD)',
            created_at: new Date().toISOString()
        });
    }

    const { data: order } = await supabase.from('orders').select(`*, order_items(*)`).eq('id', orderId).single();
    const total = order?.total_amount?.toLocaleString() || '0';

    // Send email notification if email is available
    if (order.customer_email) {
        try {
            const { sendOrderConfirmationEmail } = await import('@/lib/emailService.js');
            await sendOrderConfirmationEmail(order);
            console.log(`[EMAIL] Order confirmation sent to ${order.customer_email} for order ${orderId}`);
        } catch (emailError) {
            console.error(`[EMAIL] Failed to send order confirmation email:`, emailError);
        }
    }

    if (method === 'UPI') {
        if (status === 'PAID') {
            // Already paid on website, just send success notification
            await clearCart(to);
            await deductStock(orderId);
            await notifyOrderSuccess(orderId, true);
        } else {
            // Build UPI deep link — opens GPay / PhonePe / any UPI app with amount pre-filled
            const rawAmount = order?.total_amount || 0;
            const upiId = 'samypranesh@okicici';
            const payeeName = 'Cast Printz Sarees';
            const note = `Order+${orderId}`;
            const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${rawAmount}&cu=INR&tn=${note}`;

            await sendText(to,
                `📲 *UPI Payment — ₹${total}*\n\n` +
                `Tap the link below to pay via Google Pay, PhonePe or any UPI app:\n\n` +
                `👉 ${upiLink}\n\n` +
                `UPI ID: *${upiId}*\n` +
                `Amount: *₹${total}*\n` +
                `Order ID: *#${orderId}*`
            );

            // Ask customer to confirm AFTER payment — invoice sent only then
            await sendButtons(to, `⏳ After completing the UPI payment, tap below to confirm:`, [
                { id: `paid_confirm_${orderId}`, title: "✅ I Have Paid" }
            ]);
        }
    } else {
        // COD — deduct stock, clear cart, send notification
        await clearCart(to);
        await deductStock(orderId);
        await notifyOrderSuccess(orderId);
    }
}

// Called when UPI customer confirms payment
export async function handlePaymentConfirmed(to, orderId) {
    // SECURITY: Mark order as PENDING_VERIFICATION instead of PAID
    // This prevents fraud where users click "I Have Paid" without paying.
    await supabase.from('orders').update({ status: 'PENDING_VERIFICATION' }).eq('id', orderId);

    // Add Log entry
    await supabase.from('order_status_logs').insert({
        order_id: orderId,
        status: 'PENDING_VERIFICATION',
        notes: 'Customer clicked "I Have Paid" on WhatsApp. Awaiting admin verification of UPI payment.',
        created_at: new Date().toISOString()
    });

    // Notify Admin to check payment
    const adminPhone = process.env.WHATSAPP_ADMIN_NUMBER || '15551678232';
    await sendText(adminPhone, `🔔 *PAYMENT VERIFICATION NEEDED*\n\nOrder: *#${orderId}*\nCustomer: ${to}\nStatus: Customer claims they have paid via UPI.\n\nPlease check your bank/UPI app and update order status.`);

    await clearCart(to);
    // Note: Stock is NOT deducted yet for unverified UPI to prevent "locking" stock with fake payments.
    // Stock will be deducted when admin marks it as PAID.

    return await sendText(to, "✅ *Payment Notification Received*\n\nThank you! We are verifying your payment. Once confirmed, you will receive your official invoice and tracking details.\n\nOrder ID: *#" + orderId + "*");
}
export async function handleCancelOrder(to, customerId) {
    // Normalize phone number to handle both formats (with/without country code)
    const normalizedPhone = normalizePhoneNumber(to);
    const phoneVariations = [normalizedPhone];

    // Also try without country code if it has one
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        phoneVariations.push(normalizedPhone.substring(2)); // Without 91
    }
    // Also try with country code if it doesn't have one
    if (to.length === 10) {
        phoneVariations.push('91' + to);
    }

    // Query with OR condition for all phone variations
    let orders = [];
    for (const phone of phoneVariations) {
        const { data } = await supabase
            .from('orders')
            .select('id, status, total_amount, created_at')
            .eq('customer_phone', phone)
            .in('status', ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'])
            .order('created_at', { ascending: false })
            .limit(10);
        if (data && data.length > 0) {
            orders = data;
            break;
        }
    }

    if (!orders?.length) {
        return sendButtons(to,
            "❌ You don't have any active orders that can be cancelled.\n\nOrders that are already shipped or delivered cannot be cancelled.",
            [{ id: "menu_main", title: "🏠 Main Menu" }]
        );
    }

    let msg = "❌ *Cancel Order*\n\nYour recent orders:\n";
    orders.forEach((o, i) => {
        msg += `${i + 1}. *#${o.id}* - ₹${o.total_amount?.toLocaleString()} (${o.status})\n`;
    });
    msg += "\n📋 *Please reply with the Order ID you want to cancel*\n\n_Example: ORD-123456_";

    return sendText(to, msg);
}

export async function processCancelOrder(to, orderId) {
    const upperOrderId = orderId.toUpperCase();

    // Normalize phone number variations
    const normalizedPhone = normalizePhoneNumber(to);
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        phoneVariations.push(normalizedPhone.substring(2));
    }
    if (to.length === 10) {
        phoneVariations.push('91' + to);
    }

    // Check if order exists and belongs to user (try all phone variations)
    let order = null;
    for (const phone of phoneVariations) {
        const { data } = await supabase.from('orders')
            .select('*')
            .eq('id', upperOrderId)
            .eq('customer_phone', phone)
            .single();
        if (data) {
            order = data;
            break;
        }
    }

    if (!order) {
        return sendButtons(to,
            `❌ Order *${orderId}* not found or doesn't belong to you.\n\nPlease check the Order ID and try again.`,
            [{ id: "menu_cancel_order", title: "Try Again" }, { id: "menu_main", title: "🏠 Main Menu" }]
        );
    }

    // Check if order is already cancelled
    if (order.status === 'CANCELLED') {
        return sendButtons(to,
            `❌ Order *${orderId}* has already been cancelled.\n\nNo further action needed.`,
            [{ id: "menu_main", title: "🏠 Main Menu" }]
        );
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'];
    if (!cancellableStatuses.includes(order.status)) {
        return sendButtons(to,
            `❌ Order *${orderId}* cannot be cancelled.\n\nStatus: ${order.status}\nOrders that are already shipped or delivered cannot be cancelled.`,
            [{ id: "menu_main", title: "🏠 Main Menu" }]
        );
    }

    // Update state to wait for reason
    await updateCustomerAdminNotes(to, `WAITING_CANCEL_REASON:${upperOrderId}`);

    // Ask for reason
    return sendText(to,
        `⚠️ *Cancel Order: ${upperOrderId}*\n\n` +
        `Please reply with the *reason* for your cancellation.\n\n` +
        `_Example: "Changed my mind" or "Need to change shipping address"_`
    );
}

export async function confirmCancelOrder(to, orderId, reason = 'Cancelled by customer via WhatsApp') {
    const upperOrderId = orderId.toUpperCase();

    // First check if order is already cancelled
    const { data: existingOrder } = await supabase.from('orders')
        .select('status')
        .eq('id', upperOrderId)
        .single();

    if (existingOrder?.status === 'CANCELLED') {
        return sendButtons(to,
            `❌ Order *${upperOrderId}* has already been cancelled.\n\nNo further action needed.`,
            [{ id: "menu_main", title: "🏠 Main Menu" }]
        );
    }

    // Get order items to restore stock
    const { data: items } = await supabase.from('order_items')
        .select('*')
        .eq('order_id', upperOrderId);

    // Restore stock for each item
    if (items) {
        for (const item of items) {
            if (item.variant_id) {
                // Get current variant stock
                const { data: variant } = await supabase.from('product_variants')
                    .select('stock')
                    .eq('id', item.variant_id)
                    .single();
                if (variant) {
                    const newStock = variant.stock + item.quantity;
                    await supabase.from('product_variants')
                        .update({ stock: newStock })
                        .eq('id', item.variant_id);

                    // Add to ledger
                    await supabase.from('product_history').insert({
                        product_id: item.product_id,
                        variant_id: item.variant_id,
                        change_type: 'STOCK_IN',
                        quantity_change: item.quantity,
                        new_stock: newStock,
                        reason: `Order #${upperOrderId} Cancelled (WhatsApp)`
                    });
                }
            } else {
                // Get current product stock
                const { data: product } = await supabase.from('products')
                    .select('stock')
                    .eq('id', item.product_id)
                    .single();
                if (product) {
                    const newStock = product.stock + item.quantity;
                    await supabase.from('products')
                        .update({ stock: newStock })
                        .eq('id', item.product_id);

                    // Add to ledger
                    await supabase.from('product_history').insert({
                        product_id: item.product_id,
                        change_type: 'STOCK_IN',
                        quantity_change: item.quantity,
                        new_stock: newStock,
                        reason: `Order #${upperOrderId} Cancelled (WhatsApp)`
                    });
                }
            }
        }
    }

    // Update order status to CANCELLED
    await supabase.from('orders')
        .update({
            status: 'CANCELLED',
            admin_notes: `Order cancelled by customer via WhatsApp on ${new Date().toLocaleString()}. Reason: ${reason}`
        })
        .eq('id', upperOrderId);

    // Clear customer state
    await updateCustomerAdminNotes(to, null);

    // Only create a refund entry if money was actually collected (PAID or AWAITING_PAYMENT)
    // PLACED (COD) orders never took money, so no refund is needed
    if (['PAID', 'AWAITING_PAYMENT'].includes(existingOrder?.status)) {
        await supabase.from('refunds').insert({
            order_id: upperOrderId,
            amount: existingOrder?.total_amount || 0,
            reason: 'Order Cancelled by Customer via WhatsApp (Paid Order)',
            status: 'REQUESTED'
        });
    }

    // Add to status history (both tables for compatibility)
    await supabase.from('order_status_history').insert({
        order_id: upperOrderId,
        status_from: null,
        status_to: 'CANCELLED',
        changed_by: 'customer',
        notes: `Order cancelled. Reason: ${reason}`
    });

    // Also add to order_status_logs which is what the admin panel reads
    await supabase.from('order_status_logs').insert({
        order_id: upperOrderId,
        status: 'CANCELLED',
        notes: `Order cancelled. Reason: ${reason}`,
        created_at: new Date().toISOString()
    });

    return sendButtons(to,
        `✅ *Order Cancelled Successfully*\n\nOrder: *${upperOrderId}*\nReason: ${reason}\n\nYour order has been cancelled and stock has been restored.\n\nIf you have already paid, a refund will be processed within 5-7 business days.`,
        [
            { id: "menu_catalogue", title: "Browse Products" },
            { id: "menu_main", title: "Main Menu" }
        ]
    );
}

export async function handleRefundOrder(to) {
    const normalizedPhone = normalizePhoneNumber(to);
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91')) phoneVariations.push(normalizedPhone.substring(2));
    if (to.length === 10) phoneVariations.push('91' + to);

    let allDelivered = [];
    for (const phone of phoneVariations) {
        const { data } = await supabase.from('orders')
            .select('id, status, total_amount, created_at')
            .eq('customer_phone', phone)
            .eq('status', 'DELIVERED')
            .order('created_at', { ascending: false })
            .limit(15);
        if (data?.length) { allDelivered = data; break; }
    }

    if (!allDelivered?.length) {
        return sendButtons(to, "You don't have any delivered orders available for refund. Only delivered orders can be refunded.", [{ id: "menu_main", title: "Main Menu" }]);
    }

    // Filter for 10-day delivery deadline
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const orderIds = allDelivered.map(o => o.id);
    const { data: logs } = await supabase.from('order_status_logs')
        .select('order_id, created_at')
        .in('order_id', orderIds)
        .eq('status', 'DELIVERED');

    const orders = allDelivered.filter(o => {
        const log = logs?.find(l => l.order_id === o.id);
        const deliveryDate = log ? new Date(log.created_at) : (o.status === 'DELIVERED' ? new Date() : new Date(o.created_at));
        return deliveryDate >= tenDaysAgo;
    }).slice(0, 10);

    if (!orders?.length) {
        return sendButtons(to, "❌ You don't have any orders delivered within the last 10 days. Refund requests must be submitted within 10 days of delivery.", [{ id: "menu_main", title: "🏠 Main Menu" }]);
    }

    let msg = "Refund Request\n\nYour delivered orders:\n";
    orders.forEach((o, i) => { msg += `${i + 1}. *#${o.id}* - ₹${o.total_amount?.toLocaleString()}\n`; });
    msg += "\nPlease reply with the Order ID you want to refund\n\n_Example: ORD-123456_";
    return sendText(to, msg);
}

export async function processRefundOrder(to, orderId) {
    const upperOrderId = orderId.toUpperCase();
    const normalizedPhone = normalizePhoneNumber(to);
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        phoneVariations.push(normalizedPhone.substring(2));
    }

    // Check if order exists and belongs to user (try all phone variations)
    let order = null;
    for (const phone of phoneVariations) {
        const { data } = await supabase.from('orders')
            .select('*')
            .eq('id', upperOrderId)
            .eq('customer_phone', phone)
            .single();
        if (data) {
            order = data;
            break;
        }
    }

    if (!order || order.status !== 'DELIVERED') {
        return sendButtons(to, `Order *${orderId}* not found or is not in a refundable status (must be DELIVERED).`, [{ id: "menu_main", title: "Main Menu" }]);
    }

    // Verify 10-day deadline
    const { data: deliveryLog } = await supabase.from('order_status_logs')
        .select('created_at')
        .eq('order_id', upperOrderId)
        .eq('status', 'DELIVERED')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const deliveryDate = deliveryLog ? new Date(deliveryLog.created_at) : (order.status === 'DELIVERED' ? new Date() : new Date(order.created_at));
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    if (deliveryDate < tenDaysAgo) {
        return sendButtons(to, `❌ Order *${upperOrderId}* was delivered more than 10 days ago (on ${deliveryDate.toLocaleDateString()}). It is no longer eligible for refund.`, [{ id: "menu_main", title: "🏠 Main Menu" }]);
    }

    // Store that this user is now in "Waiting for Refund Reason" state for this order
    await updateCustomerAdminNotes(customerId || to, `WAITING_REFUND_REASON:${upperOrderId}`);

    return sendText(to, `Refund Request: *${upperOrderId}*\n\nPlease reply with the reason for your refund request.\n\nOur team will review your request once submitted.`);
}

export async function handleReturnExchangeOrder(customerId, to) {
    console.log('\n🔄 === HANDLE RETURN/EXCHANGE ORDER ===');
    console.log('ID:', customerId, 'Phone:', to);

    // Clear any previous state
    await updateCustomerAdminNotes(customerId || to, null);

    const normalizedPhone = normalizePhoneNumber(to);
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91')) phoneVariations.push(normalizedPhone.substring(2));
    if (to.length === 10) phoneVariations.push('91' + to);

    console.log('Phone variations to check:', phoneVariations);

    let allDelivered = [];
    for (const phone of phoneVariations) {
        console.log(`📋 Checking orders for phone: ${phone}`);
        const { data, error } = await supabaseAdmin.from('orders')
            .select('id, status, total_amount, created_at')
            .eq('customer_phone', phone)
            .eq('status', 'DELIVERED')
            .order('created_at', { ascending: false })
            .limit(50);

        console.log(`  - Orders found for ${phone}:`, data?.length || 0);
        console.log(`  - Error:`, error);

        if (data?.length) {
            allDelivered = data;
            console.log('✅ Found delivered orders, stopping search');
            break;
        }
    }

    console.log('Total delivered orders found:', allDelivered?.length || 0);

    if (!allDelivered?.length) {
        console.log('❌ No delivered orders found - sending error message');
        return sendButtons(to, "❌ No delivered orders found. Only delivered orders can be returned or exchanged.", [{ id: "menu_main", title: "🏠 Main Menu" }]);
    }

    // Filter for 10-day delivery deadline
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const orderIds = allDelivered.map(o => o.id);
    const [{ data: logs }, { data: existingRequests }] = await Promise.all([
        supabaseAdmin.from('order_status_logs')
            .select('order_id, created_at')
            .in('order_id', orderIds)
            .eq('status', 'DELIVERED'),
        supabaseAdmin.from('return_requests')
            .select('order_id')
            .in('order_id', orderIds)
    ]);

    const orders = allDelivered.filter(o => {
        // Skip if already has an active return/exchange request
        if (existingRequests?.some(r => r.order_id === o.id)) return false;

        const log = logs?.find(l => l.order_id === o.id);
        const deliveryDate = log ? new Date(log.created_at) : (o.status === 'DELIVERED' ? new Date() : new Date(o.created_at));
        return deliveryDate >= tenDaysAgo;
    }).slice(0, 10);

    if (!orders?.length) {
        return sendButtons(to, "❌ No orders found eligible for return or exchange (delivery window exceeded or request already submitted).", [{ id: "menu_main", title: "🏠 Main Menu" }]);
    }

    let msg = "🔄 *Return or Exchange*\n\nYour delivered orders:\n";
    orders.forEach((o, i) => { msg += `${i + 1}. *#${o.id}* - ₹${o.total_amount?.toLocaleString()}\n`; });
    msg += "\n📋 *Please reply with the Order ID* you want to return/exchange\n\n_Example: ORD-123456_";
    return sendText(to, msg);
}

export async function processReturnExchangeOrder(customerId, orderId, to) {
    const upperOrderId = orderId.toUpperCase();
    const normalizedPhone = normalizePhoneNumber(to);
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91')) phoneVariations.push(normalizedPhone.substring(2));

    let order = null;
    for (const phone of phoneVariations) {
        const { data } = await supabaseAdmin.from('orders')
            .select('*, order_items(*)')
            .eq('id', upperOrderId)
            .eq('customer_phone', phone)
            .single();
        if (data) { order = data; break; }
    }

    if (!order || order.status !== 'DELIVERED') {
        return sendButtons(to, `❌ Order *${orderId}* not found or is not DELIVERED.\n\nOnly delivered orders can be returned or exchanged.`, [{ id: "menu_main", title: "🏠 Main Menu" }]);
    }

    // Verify 10-day deadline
    const { data: deliveryLog } = await supabaseAdmin.from('order_status_logs')
        .select('created_at')
        .eq('order_id', upperOrderId)
        .eq('status', 'DELIVERED')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const deliveryDate = deliveryLog ? new Date(deliveryLog.created_at) : new Date(order.created_at);
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    if (deliveryDate < tenDaysAgo) {
        return sendButtons(to, `❌ Order *${upperOrderId}* was delivered more than 10 days ago (on ${deliveryDate.toLocaleDateString()}). It is no longer eligible for return or exchange.`, [{ id: "menu_main", title: "🏠 Main Menu" }]);
    }

    // Store state: WAITING_RETURN_TYPE:ORDER_ID
    await updateCustomerAdminNotes(customerId || to, `WAITING_RETURN_TYPE:${upperOrderId}`);

    return sendButtons(to, `Order *${upperOrderId}* selected.\n\nWhat would you like to do?`, [
        { id: `rectype_return_${upperOrderId}`, title: "🔄 Return & Refund" },
        { id: `rectype_exchange_${upperOrderId}`, title: "👕 Exchange Item" }
    ]);
}

export async function handleReturnExchangeTypeSelection(customerId, type, orderId, to) {
    // type is 'RETURN' or 'EXCHANGE'
    await updateCustomerAdminNotes(customerId || to, `WAITING_RETURN_REASON:${type}:${orderId}`);

    return sendText(to, `You selected *${type}* for Order *${orderId}*.\n\nPlease reply with the *reason* for your request and which item(s) you wish to ${type.toLowerCase()}.`);
}

export async function submitReturnExchangeRequest(to, type, orderId, reason, customerId = null) {
    console.log('\n💾 === SUBMIT RETURN/EXCHANGE REQUEST (INTERNAL) ===');
    console.log(`[RETURN] Order: ${orderId}, Type: ${type}`);

    try {
        // Fetch order items for the service (try exact match first, then uppercase)
        let { data: order, error: fetchErr } = await supabaseAdmin
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single();

        if (!order || fetchErr) {
            // Try uppercase fallback
            const retry = await supabaseAdmin
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', orderId.toUpperCase())
                .single();
            if (retry.data) {
                order = retry.data;
                fetchErr = null;
            }
        }

        if (fetchErr || !order) {
            console.error(`[RETURN] Order #${orderId} not found:`, fetchErr);
            return sendText(to, `❌ Sorry, I couldn't find Order *#${orderId}*. Please check the order ID and try again.`);
        }

        const items = (order.order_items || []).map(item => ({
            product_id: item.product_id,
            product_name: item.product_name
        }));

        // Call the service directly (NO FETCH)
        const result = await processReturnRequest({
            orderId: orderId,
            items: items,
            customerId: customerId || order.customer_id,
            type: type,
            reason: reason,
            requestedFrom: 'whatsapp'
        });

        console.log('[RETURN] Service Result:', result);

        if (!result.success) {
            console.error('[RETURN] Service Failure:', result.error);
            return sendButtons(to, `⚠️ Sorry, I encountered an error while saving your request: ${result.error || 'System error'}. Our team has been notified.`, [
                { id: "menu_main", title: "🏠 Main Menu" }
            ]);
        }

        await updateCustomerAdminNotes(to, null);

        if (result.alreadyExists) {
            return sendButtons(to, `ℹ️ A ${type.toLowerCase()} request for Order *#${orderId}* has already been submitted.\n\nOur team is working on it!`, [
                { id: "menu_main", title: "🏠 Main Menu" }
            ]);
        }

        return sendButtons(to, `✅ *Request Submitted*\n\nYour ${type.toLowerCase()} request for Order *#${orderId}* has been received successfully.\n\nOur team will review it and update you shortly. Thank you!`, [
            { id: "menu_main", title: "🏠 Main Menu" }
        ]);
    } catch (err) {
        console.error(`[RETURN] Critical Exception:`, err);
        return sendButtons(to, `❌ Oops! I had trouble processing your request.\n\nError: ${err.message || 'Internal logic error'}\n\nPlease try again later.`, [
            { id: "menu_main", title: "🏠 Main Menu" }
        ]);
    }
}





export async function confirmRefundOrder(to, orderId, reason) {
    const { data: order } = await supabase.from('orders').select('total_amount').eq('id', orderId).single();

    await supabase.from('orders').update({ status: 'REFUND_REQUESTED', refund_reason: reason, refund_status: 'PENDING' }).eq('id', orderId);

    const normalizedPhone = normalizePhoneNumber(to);
    const phoneVariations = [normalizedPhone];
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        phoneVariations.push(normalizedPhone.substring(2));
    }

    await updateCustomerAdminNotes(to, null);

    if (order) {
        await supabase.from('refunds').insert({
            order_id: orderId,
            amount: order.total_amount,
            reason: reason,
            status: 'REQUESTED'
        });
    }

    return sendButtons(to, `Refund Request Submitted\n\nOrder: *${orderId}*\nReason: ${reason}\n\nYour request has been sent to our team for review. We will notify you once it's processed.`, [{ id: "menu_main", title: "Main Menu" }]);
}

export async function handleTrackOrder(to) {
    // Normalize phone number to handle both formats (with/without country code)
    const normalizedPhone = normalizePhoneNumber(to);
    const phoneVariations = [normalizedPhone];

    // Also try without country code if it has one
    if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
        phoneVariations.push(normalizedPhone.substring(2)); // Without 91
    }
    // Also try with country code if it doesn't have one
    if (to.length === 10) {
        phoneVariations.push('91' + to);
    }

    // Query with IN condition for all phone variations to get the absolute latest order
    const { data: oList, error } = await supabase
        .from('orders')
        .select('*')
        .in('customer_phone', phoneVariations)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })
        .limit(1);

    const orders = oList || [];

    if (!orders?.length) return sendButtons(to, "No previous orders found.", [{ id: "menu_main", title: "🏠 Main Menu" }]);

    const o = orders[0];
    const sourceLabel = o.source === 'WEBSITE' ? '🌐 Website' : '📱 WhatsApp';
    const canCancel = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'].includes(o.status);

    const buttons = [
        { id: "menu_main", title: "🏠 Main Menu" }
    ];

    if (canCancel) {
        buttons.unshift({ id: "menu_cancel_order", title: "Cancel Order" });
    }

    await sendButtons(to,
        `🛒 *Latest Order Details*\n\n` +
        `Order ID: *#${o.id}*\n` +
        `Source: *${sourceLabel}*\n` +
        `Status: *${o.status}*\n` +
        `Amount: *₹${o.total_amount?.toLocaleString()}*\n` +
        `Date: *${new Date(o.created_at).toLocaleDateString()}*`,
        buttons
    );
}

export async function handleContact(to) {
    const contactMsg = await getConfig('wa_contact_message', `📞 *Contact Support*\n\nFor assistance, please call us at:\n+${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '91 75581 89732'}\n\nOr email:\ncastprintzofficial@gmail.com`);
    await sendText(to, contactMsg);
}

// ─── IMAGE OCR: Read product catalog ID from customer screenshot ──────────────
// Uses OCR.space free API. The customer screenshots the product image (which has
// a CAT-XXXXX code stamped on it) and sends it — bot reads the code via OCR.
async function analyzeImageForCatalogId(mediaId) {
    try {
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

        // Step 1: Get image download URL from WhatsApp Graph API
        const mediaRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const mediaJson = await mediaRes.json();
        const mediaUrl = mediaJson?.url;
        if (!mediaUrl) {
            console.error('[OCR] ❌ No media URL in response:', JSON.stringify(mediaJson));
            return { catalogId: null, detectedText: 'Failed to get image from WhatsApp' };
        }
        console.log('[OCR] ✅ Got media URL, downloading image...');

        // Step 2: Download image
        const imgRes = await fetch(mediaUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const base64Image = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;

        // Step 4: Call OCR.space API (Try Engine 2 first, then Engine 1 as fallback)
        const callOcr = async (engine) => {
            const ocrApiKey = process.env.OCR_SPACE_API_KEY || 'K85953559988957';
            const params = new URLSearchParams({
                base64Image, language: 'eng', isOverlayRequired: 'false',
                detectOrientation: 'true', scale: 'true', OCREngine: engine, isTable: 'false',
            });
            const res = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: { 'apikey': ocrApiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
            return res.json();
        };

        console.log('[OCR] Trying Engine 2...');
        let ocrJson = await callOcr('2');
        let detectedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';

        if (!detectedText.trim() || ocrJson.IsErroredOnProcessing) {
            console.log('[OCR] Engine 2 failed or empty, trying Engine 1...');
            ocrJson = await callOcr('1');
            detectedText = ocrJson?.ParsedResults?.[0]?.ParsedText || '';
        }

        if (ocrJson.IsErroredOnProcessing && !detectedText) {
            console.error('[OCR] ❌ OCR.space error:', ocrJson.ErrorMessage);
            return { catalogId: null, detectedText: `Service Error: ${ocrJson.ErrorMessage}` };
        }

        console.log('[OCR] Detected text:', detectedText.substring(0, 300));

        // Step 5: Flexible pattern matching
        let catalogId = null;

        // 1. STRONGEST MATCH: Process line by line to avoid gluing unrelated words (like "Reply" on a new line)
        // Remove spaces/hyphens per line and look for CAT + 4 to 8 chars.
        const lines = detectedText.split('\n');
        for (const line of lines) {
            const cleanLine = line.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const strictMatch = cleanLine.match(/CAT([A-Z0-9]{4,8})/);
            if (strictMatch) {
                catalogId = strictMatch[1];
                console.log('[OCR] ✅ Extracted code via strict CAT match:', catalogId);
                break;
            }
        }

        if (catalogId) {
            // Already found it
        } else {
            // 2. FALLBACK MATCHES: If no CAT prefix is found, try original patterns
            const patterns = [
                /([A-Z]{2,3})[-\s]([A-Z0-9]{3,5})/i,  // XX-YYYY or XXX-YYY
                /([A-Z0-9]{5})/i, // Last resort: just any 5 chars
            ];

            for (const pattern of patterns) {
                const m = detectedText.match(pattern);
                if (m) {
                    const code = (m[1] + (m[2] || '')).replace(/[-\s]/g, '').toUpperCase();
                    // Prevent extracting the brand name if it accidentally matches fallback
                    if (code.length >= 4 && !code.includes('HAA') && !code.includes('MAHAA')) {
                        catalogId = code;
                        console.log('[OCR] ✅ Extracted code via fallback:', catalogId);
                        break;
                    }
                }
            }
        }

        return { catalogId, detectedText };
    } catch (err) {
        console.error('[OCR] Exception:', err.message);
        return { catalogId: null, detectedText: `Error: ${err.message}` };
    }
}




// ─── 6. ROUTER ───────────────────────────────────────────────────────────────

// Message deduplication — WhatsApp often delivers the same webhook 2-3x
// Store processed message IDs for 5 minutes, then clean up
const processedMsgIds = new Map(); // id -> timestamp
const MSG_DEDUPE_TTL = 5 * 60 * 1000; // 5 minutes

function isDuplicate(msgId) {
    const now = Date.now();
    // Clean up old entries
    for (const [id, ts] of processedMsgIds) {
        if (now - ts > MSG_DEDUPE_TTL) processedMsgIds.delete(id);
    }
    if (processedMsgIds.has(msgId)) return true;
    processedMsgIds.set(msgId, now);
    return false;
}

export async function processIncomingMessage(body) {
    console.log('\n🔍 === PROCESSING INCOMING MESSAGE ===');
    debugLog('Processing incoming message body:', body);

    try {
        const value = body.entry?.[0]?.changes?.[0]?.value;
        const message = value?.messages?.[0];

        console.log('📨 Message extraction:');
        console.log('  - Value exists:', !!value);
        console.log('  - Message exists:', !!message);

        if (!message) {
            console.log('❌ No message found in body - exiting');
            debugLog('No message found in body');
            return;
        }

        const from = message.from;
        const msgType = message.type;
        const msgId = message.id;
        const text = message.text?.body?.toLowerCase().trim();

        console.log('📝 Message details:');
        console.log('  - From:', from);
        console.log('  - Type:', msgType);
        console.log('  - ID:', msgId);
        console.log('  - Text:', text);

        // --- DEDUPLICATION CHECK ---
        if (isDuplicate(msgId)) {
            console.log('⚠️ Duplicate message detected - ignoring');
            debugLog(`Ignoring duplicate message ID: ${msgId}`);
            return;
        }

        const profileName = value?.contacts?.[0]?.profile?.name || 'WhatsApp Customer';

        // --- 0. CUSTOMER SYNC (Always ensure customer exists via Admin Client) ---
        let customer = null;
        try {
            const normalizedPhone = normalizePhoneNumber(from);
            const phoneVariations = [normalizedPhone];
            if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
                phoneVariations.push(normalizedPhone.substring(2));
            }

            // Use supabaseAdmin to bypass RLS
            const { data: customers, error: fetchErr } = await supabaseAdmin
                .from('customers')
                .select('*')
                .in('phone', phoneVariations);

            if (fetchErr) {
                console.error('[WA-STATE] Customer fetch error:', fetchErr);
            }

            if (!customers || customers.length === 0) {
                console.log(`[WA-STATE] No customer found for ${from}, creating...`);
                const { data: newCust, error: insertErr } = await supabaseAdmin.from('customers').insert({
                    phone: normalizedPhone,
                    name: profileName,
                    role: 'user'
                }).select().single();

                if (insertErr) {
                    console.error(`[WA-STATE] Customer creation failed for ${from}:`, insertErr);
                    customer = { phone: normalizedPhone, name: profileName };
                } else {
                    customer = newCust;
                }
            } else {
                // If multiple records, find one with admin_notes, otherwise take first
                customer = customers.find(c => c.admin_notes) || customers[0];
                console.log(`[WA-STATE] Customer found. ID: ${customer.id}, Notes: "${customer.admin_notes || 'NONE'}"`);

                // Update name if it's new
                if ((!customer.name || customer.name === 'WhatsApp Customer') && profileName !== 'WhatsApp Customer') {
                    await supabaseAdmin.from('customers').update({ name: profileName }).eq('id', customer.id);
                }
            }
        } catch (supabaseErr) {
            console.error(`[WA-STATE] Critical error for ${from}:`, supabaseErr);
        }

        // -------------------------
        const messageText = message.text?.body?.toLowerCase().trim();

        // 🛑 Stop any active stream for this user immediately
        cancelStream(from);

        // 📸 IMAGE MESSAGE — Customer sent a screenshot of a product
        // Use Google Cloud Vision OCR to read the catalog ID stamped on the image
        if (msgType === 'image') {
            const mediaId = message.image?.id;
            await sendText(from, '🔍 Searching in our catalogue... Please wait a moment!');
            const ocrResult = await analyzeImageForCatalogId(mediaId);
            if (ocrResult?.catalogId) {
                console.log(`[WA] OCR found catalog ID: ${ocrResult.catalogId} from ${from}`);
                return await handleProductInquiry(from, ocrResult.catalogId);
            } else {
                const debugInfo = ocrResult?.detectedText ? `\n\n🔍 *Detected Text:* ${ocrResult.detectedText.substring(0, 100)}...` : '';
                return await sendText(from,
                    '❌ Could not read a product code from the image.\n\n' +
                    'Please make sure the image shows the product code clearly (e.g. *CAT-AB12X*).\n' +
                    'Or send *Hi* to browse our catalogue! 💮' + debugInfo
                );
            }
        }

        if (msgType === 'text') {
            // ─── STEP 1: Keywords ALWAYS take priority — checked before anything else ───
            const MENU_TRIGGERS = ['hi', 'hello', 'menu', 'start', '0'];
            const RESET_TRIGGERS = ['reset'];

            if (RESET_TRIGGERS.includes(messageText)) {
                // Reset: cancel any open draft orders and show main menu
                await supabase.from('orders').delete().eq('customer_phone', from).eq('status', 'DRAFT');
                return await sendMainMenu(from);
            }
            if (MENU_TRIGGERS.includes(messageText)) return await sendMainMenu(from);
            if (['cart', 'bag'].includes(messageText)) return await handleViewCart(from);
            if (['catalogue', 'catalog', 'browse', 'list for sarees', 'list sarees', 'show sarees'].includes(messageText)) return await sendCatalogueCategories(from);

            // ── CATALOG ID LOOKUP: customer reads CAT-XXXXX code from product image ──
            // Matches patterns like: CAT-AB12X, cat ab12x, CAT12345, or just AB12X (5-8 chars)
            // Use a more flexible regex for direct typing
            const catalogMatch = message.text.body.trim().match(/^(CAT[-\s]?)?([A-Z0-9]{4,12})$/i);
            if (catalogMatch) {
                const catalogId = catalogMatch[2].toUpperCase();
                return await handleProductInquiry(from, catalogId);
            }

            if (messageText === 'contact') return await handleContact(from);
            if (messageText === 'stop') return await sendText(from, "✅ Stopped. Send *Hi* to start again.");

            // ─── STEP 2: Handle State (Waiting for user input) FIRST ───
            if (customer?.admin_notes) {
                const notes = customer.admin_notes;

                if (notes.startsWith('WAITING_RETURN_TYPE:')) {
                    const orderId = notes.split(':')[1];
                    let type = null;
                    if (messageText.includes('return') || messageText.includes('refund')) type = 'RETURN';
                    else if (messageText.includes('exchange')) type = 'EXCHANGE';

                    if (type) return await handleReturnExchangeTypeSelection(customer.id, type, orderId, from);
                }

                if (notes.startsWith('WAITING_RETURN_REASON:') || notes.startsWith('WAITING_REFUND_REASON:')) {
                    const parts = notes.split(':');
                    if (parts.length === 3) {
                        return await submitReturnExchangeRequest(from, parts[1], parts[2], message.text.body, customer.id);
                    } else {
                        const orderId = parts[1];
                        return await confirmRefundOrder(from, orderId, message.text.body, customer.id);
                    }
                }

                if (notes.startsWith('WAITING_CANCEL_REASON:')) {
                    const parts = notes.split(':');
                    return await confirmCancelOrder(from, parts[1], message.text.body);
                }
            }

            // Text commands for menu items (typed by user)
            console.log('🔍 Checking keyword matches for text:', messageText);

            if (['track order', 'my orders', 'my order', 'orders', 'order status', 'track'].includes(messageText)) {
                console.log('✅ Track order keyword matched');
                return await handleTrackOrder(from);
            }
            if (['cancel', 'cancel order', 'cancel my order', 'cancellation', 'cancel it'].includes(messageText)) {
                console.log('✅ Cancel keyword matched');
                return await handleCancelOrder(from);
            }

            const returnKeywords = ['refund', 'return', 'exchange', 'refund order', 'return order', 'exchange order', 'returns', 'exchanges', 'retutn', 'return a product', 'exchange a product', 'i want to return', 'i want to exchange'];
            if (returnKeywords.includes(messageText)) {
                console.log('✅ Return/Exchange keyword matched - calling handleReturnExchangeOrder');
                try {
                    return await handleReturnExchangeOrder(customer.id, from);
                } catch (error) {
                    console.error('❌ handleReturnExchangeOrder failed:', error);
                    throw error;
                }
            }

            if (['view catalogue', 'view catalog', 'browse catalogue', 'browse catalog', 'show catalogue', 'show products'].includes(messageText)) return await sendCatalogueCategories(from);
            if (['view cart', 'my cart', 'show cart', 'cart'].includes(messageText)) return await handleViewCart(from);

            // Handle Order ID pattern for cancellation or refund/return
            // More flexible pattern to match various order ID formats
            const orderIdPatterns = [
                /^(ORD|WEB|ORDER)-[A-Z0-9]+$/i,  // ORD-123456, WEB-789, ORDER-ABC
                /^[A-Z]{2,6}-?\d{4,}$/i,         // CAT-1234, ABC123456
                /^\d{6,}$/i                      // Just numbers like 123456
            ];

            const trimmedMessage = message.text.body.trim();
            let matchedOrderId = null;

            for (const pattern of orderIdPatterns) {
                if (pattern.test(trimmedMessage)) {
                    matchedOrderId = trimmedMessage.toUpperCase().replace(/^ORDER-/i, 'ORD-');
                    break;
                }
            }

            if (matchedOrderId) {
                console.log(`[WA] Detected order ID: ${matchedOrderId}`);
                const { data: o } = await supabaseAdmin.from('orders').select('*').eq('id', matchedOrderId).maybeSingle();
                if (o) {
                    const sourceLabel = o.source === 'WEBSITE' ? '🌐 Website' : '📱 WhatsApp';
                    const canCancel = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'].includes(o.status);
                    const canReturn = o.status === 'DELIVERED';

                    const buttons = [{ id: "menu_main", title: "🏠 Main Menu" }];

                    if (canCancel) {
                        buttons.unshift({ id: `init_cancel_${o.id}`, title: "Cancel Order" });
                    } else if (canReturn) {
                        buttons.unshift({ id: `init_return_${o.id}`, title: "Return/Exchange" });
                    }

                    return await sendButtons(from,
                        `🛒 *Order Details*\n\n` +
                        `Order ID: *#${o.id}*\n` +
                        `Source: *${sourceLabel}*\n` +
                        `Status: *${o.status}*\n` +
                        `Amount: *₹${o.total_amount?.toLocaleString()}*\n` +
                        `Date: *${new Date(o.created_at).toLocaleDateString()}*`,
                        buttons
                    );
                }
            }

            // Handle YES confirmation for cancellation
            if (messageText === 'yes' || messageText === 'yes cancel' || messageText === 'cancel yes') {
                // Check if we have a pending cancel order in memory for this user
                // For now, we'll handle via the button flow above
                return await sendText(from, "📋 Please tap the button above or reply with your Order ID to cancel.\n\nExample: ORD-123456");
            }

            // Handle Website Checkout Redirection
            if (messageText.includes('i just placed an order #') || messageText.startsWith('finish order #') || messageText.includes('please confirm is this your order in the website')) {
                const match = messageText.match(/order #([a-z0-9-]+)/i);
                if (match) {
                    const orderId = match[1].toUpperCase();

                    const { data: order } = await supabase.from('orders').select('id, status, payment_method, total_amount, delivery_address, customer_name').eq('id', orderId).single();

                    if (order) {
                        // If it's still a draft from old flow
                        if (order.status === 'DRAFT') {
                            await supabase.from('orders').update({ customer_phone: from }).eq('id', orderId);
                            await sendText(from,
                                `📝 *Complete Your Order* (#${orderId})\n\n` +
                                `Please reply with your delivery details in this format:\n\n` +
                                `*Name, Mobile Number, Email, Full Address*\n\n` +
                                `Example:\n_Lakshmi, 9876543210, lakshmi@example.com, 12 Main St, Bangalore_`
                            );
                            return;
                        }

                        // Order placed completely on website
                        await sendText(from, `Order Confirmed! (#${orderId})\n\nThank you, ${order.customer_name || 'Customer'}!\n\nDelivery Address:\n${order.delivery_address}\n\nTotal Billing: ₹${order.total_amount.toLocaleString()}`);

                        if (order.payment_method === 'UPI' && order.status === 'AWAITING_PAYMENT') {
                            const rawAmount = order.total_amount || 0;
                            const upiId = 'samypranesh@okicici';
                            const payeeName = 'Caste Print+Sarees';
                            const upiLink = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${rawAmount}&cu=INR&tn=Order+${orderId}`;

                            await sendText(from,
                                `📲 *UPI Payment — ₹${rawAmount.toLocaleString()}*\n\n` +
                                `Tap the link below to pay via GPay, PhonePe or any UPI app:\n\n` +
                                `👉 ${upiLink}\n\n` +
                                `UPI ID: *${upiId}*`
                            );

                            await sendButtons(from, `⏳ After completing the payment, tap below to confirm:`, [
                                { id: `paid_confirm_${orderId}`, title: "✅ I Have Paid" }
                            ]);
                        } else if (order.payment_method === 'COD') {
                            await sendText(from, "💵 Cash on delivery selected, order processing...");
                            const { data: fullOrder } = await supabase.from('orders').select(`*, order_items(*)`).eq('id', orderId).single();

                            try {
                                let settings = { shop_name: 'Cast Printz', shop_phone: '7558189732', shop_email: 'castprintzofficial@gmail.com', shop_address: 'Premium Saree Collections' };
                                const { data: settingsData } = await supabase.from('app_settings').select('*');
                                if (settingsData) {
                                    settingsData.forEach(item => {
                                        if (item.key === 'shop_name') settings.shop_name = item.value;
                                        if (item.key === 'shop_phone' || item.key === 'business_phone') settings.shop_phone = item.value;
                                        if (item.key === 'shop_address') settings.shop_address = item.value;
                                    });
                                }
                                const pdfBuffer = await generateOrderPDFBuffer(fullOrder, settings);
                                await sendPdfBuffer(from, pdfBuffer, `Invoice_${orderId}.pdf`, `Invoice - Order #${orderId}`);
                            } catch (pdfErr) {
                                console.error('[NOTIFY] Failed to send COD PDF:', pdfErr);
                            }

                            // Unify with bot flow by providing the same buttons
                            await sendButtons(from, "💗 We will contact you shortly to confirm cash on delivery dispatch!\n\nTap below to manage your order:", [
                                { id: "menu_track", title: "Track Order" },
                                { id: "menu_my_orders", title: "View Order" },
                                { id: `menu_cancel_order`, title: "Cancel Order" }
                            ]);
                        }
                        return;
                    }
                }
            }

            // ─── STEP 2: Draft check — only reached for non-keyword messages ───
            // Check for DRAFT orders that need billing or shipping address
            const normalizedPhone = normalizePhoneNumber(from);
            const phoneVariations = [normalizedPhone];
            if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
                phoneVariations.push(normalizedPhone.substring(2));
            }

            const { data: draft } = await supabase
                .from('orders')
                .select('id, billing_address, shipping_address, customer_state, customer_email')
                .in('customer_phone', phoneVariations)
                .eq('status', 'DRAFT')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (draft) {
                // Check if we need billing address
                if (!draft.billing_address) {
                    console.log(`[WA] Saving billing address for draft ${draft.id}`);
                    return await handleNewBillingAddress(from, draft.id, message.text.body);
                }

                // Check if we need email (fallback if email was missing during billing)
                if (draft.billing_address && !draft.customer_email) {
                    console.log(`[WA] Saving email for draft ${draft.id}`);
                    const email = message.text.body.trim();
                    if (email.includes('@') && email.includes('.')) {
                        await supabase.from('orders').update({
                            customer_email: email,
                            billing_email: email
                        }).eq('id', draft.id);
                        return await askShippingSameAsBilling(from, draft.id);
                    } else {
                        await sendText(from, "⚠️ Invalid email format. Please enter a valid email address:");
                        return;
                    }
                }

                // Check if we need shipping address (only if not set)
                if (!draft.shipping_address) {
                    console.log(`[WA] Saving shipping address for draft ${draft.id}`);
                    return await handleNewShippingAddress(from, draft.id, message.text.body);
                }

                // Check if we need state selection (via text)
                if ((!draft.customer_state || draft.customer_state === 'Other') && !MENU_TRIGGERS.includes(messageText)) {
                    console.log(`[WA] Attempting to set state for draft ${draft.id}: ${messageText}`);
                    const INDIAN_STATES = ["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Puducherry", "Chandigarh", "Ladakh", "Jammu and Kashmir"];

                    const matchedState = INDIAN_STATES.find(s => s.toLowerCase() === messageText.toLowerCase() || messageText.toLowerCase().includes(s.toLowerCase()));
                    if (matchedState) {
                        return await handleStateSelection(from, matchedState.toLowerCase().replace(/ /g, '_'), draft.id);
                    }
                }
            }

            // Legacy: Check for old draft with delivery_address field only
            const { data: legacyDraft } = await supabase
                .from('orders')
                .select('id, delivery_address')
                .eq('customer_phone', from)
                .eq('status', 'DRAFT')
                .not('delivery_address', 'is', null)
                .is('billing_address', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (legacyDraft && !legacyDraft.delivery_address) {
                // User is replying with their delivery details
                let name = 'Valued Customer';
                let mobile = from; // default to WhatsApp number
                let address = message.text.body.trim();

                const rawBody = message.text.body.trim();

                if (rawBody.includes(',')) {
                    const parts = rawBody.split(',').map(p => p.trim());
                    if (parts.length >= 3) {
                        name = parts[0];
                        mobile = parts[1];
                        address = parts.slice(2).join(', ');
                    } else if (parts.length === 2) {
                        name = parts[0];
                        address = parts[1];
                    }
                } else if (rawBody.includes('\n')) {
                    const parts = rawBody.split('\n').map(p => p.trim()).filter(Boolean);
                    if (parts.length >= 3) {
                        name = parts[0];
                        mobile = parts[1];
                        address = parts.slice(2).join(', ');
                    } else if (parts.length === 2) {
                        name = parts[0];
                        address = parts[1];
                    }
                }

                console.log(`[WA] Saving address for draft ${draft.id}: name=${name}, mobile=${mobile}, addr=${address}`);
                await supabase.from('orders').update({
                    customer_name: name,
                    customer_phone: mobile,
                    delivery_address: address
                }).eq('id', draft.id);

                return await askState(from, draft.id);
            }

            // ─── STEP 3: Default fallback — show main menu ───
            return await sendMainMenu(from);
        }

        if (msgType === 'interactive') {
            const reply = message.interactive;
            const id = reply.list_reply?.id || reply.button_reply?.id;

            if (id === 'menu_main') return await sendMainMenu(from);
            if (id === 'menu_cancel_order') return await handleCancelOrder(from);

            if (id.startsWith('init_cancel_')) {
                const orderId = id.replace('init_cancel_', '');
                return await processCancelOrder(from, orderId);
            }
            if (id.startsWith('init_return_')) {
                const orderId = id.replace('init_return_', '');
                return await processReturnExchangeOrder(customer.id, orderId, from);
            }
            if (id.startsWith('confirm_cancel_')) {
                const orderId = id.replace('confirm_cancel_', '');
                return await confirmCancelOrder(from, orderId);
            }
            if (id === 'menu_shop_web') {
                // Customer tapped "Shop Now" — send the shopping website URL
                return await sendText(from,
                    `Open our Online Store:\n\nTap the link below to browse & order sarees:\n\n${shopUrl}\n\nYou can browse our full collection, add to cart and place your order directly from the website!\n\nAfter placing your order, you'll be redirected back here with your order confirmation.`
                );
            }
            if (id === 'menu_browse') return await sendCatalog(from);
            if (id === 'menu_catalogue') return await sendCatalogueCategories(from);
            if (id === 'menu_cart') return await handleViewCart(from);
            if (id === 'menu_track' || id === 'menu_my_orders') return await handleTrackOrder(from);
            if (id === 'menu_contact') return await handleContact(from);

            // ── Catalogue flow: ctlg_ and ctlg_page_ ──
            if (id.startsWith('ctlg_page_')) {
                // Paginated catalogue: ctlg_page_silk_saree_50
                const parts = id.replace('ctlg_page_', '').split('_');
                const offset = parseInt(parts.pop());
                const typeId = parts.join('_');
                return await sendCatalogueByType(from, typeId, offset);
            }
            if (id === 'ctlg_all_new' || id === 'ctlg_all_full') return await sendCatalogueByType(from, 'all');
            if (id.startsWith('ctlg_')) return await sendCatalogueByType(from, id);

            if (id.startsWith('cat_')) return await sendProductsByCategory(from, id);
            if (id.startsWith('page_')) {
                const parts = id.split('_');
                // id format: page_catname_offset
                // parts: ['page', 'catname', 'offset']
                // Wait, catname might contain underscores? 
                // robust: last part is offset, rest is cat.
                const offset = parseInt(parts.pop());
                const catId = parts.join('_').replace('page_', '');
                return await sendProductsByCategory(from, catId, offset);
            }
            if (id.startsWith('addcart_')) return await handleAddToCart(from, id);


            if (id === 'clear_cart') {
                await clearCart(from);
                return await sendText(from, "Cart cleared. Send 'Hi' to start shopping again.");
            }

            if (id === 'edit_cart') return await handleEditCart(from);
            if (id.startsWith('remove_item_')) return await handleRemoveItem(from, id.replace('remove_item_', ''));

            if (id === 'start_checkout') return await startCheckout(from);

            // New Billing/Shipping Address Flow Handlers
            if (id.startsWith('use_saved_billing_')) {
                const orderId = id.replace('use_saved_billing_', '');
                return await handleSavedBilling(from, orderId);
            }

            if (id.startsWith('new_billing_')) {
                const orderId = id.replace('new_billing_', '');
                await supabase.from('orders').update({ billing_address: null }).eq('id', orderId);
                return await sendText(from,
                    `📝 *Enter New Billing Address*\n\n` +
                    `Reply with your *billing details* in this format:\n\n` +
                    `*Name, Mobile Number, Email, Full Address*\n\n` +
                    `Example:\n_Lakshmi, 9876543210, lakshmi@example.com, 12 Main St, Bangalore, 560001_`
                );
            }

            if (id.startsWith('shipping_same_')) {
                const orderId = id.replace('shipping_same_', '');
                return await handleShippingSame(from, orderId);
            }

            if (id.startsWith('shipping_diff_')) {
                const orderId = id.replace('shipping_diff_', '');
                // Clear existing shipping address to trigger the draft check for next message
                await supabase.from('orders').update({ shipping_address: null }).eq('id', orderId);
                return await sendText(from,
                    `📝 *Enter Shipping Address*\n\n` +
                    `Reply with your *shipping details* in this format:\n\n` +
                    `*Name, Mobile Number, Email, Full Address, City, Pincode*\n\n` +
                    `Example:\n_Lakshmi, 9876543210, lakshmi@example.com, 12 Main St, Bangalore, 560001_`
                );
            }

            // Legacy handlers (for backward compatibility)
            if (id.startsWith('use_saved_')) {
                const orderId = id.replace('use_saved_', '');
                // Copy the saved address into the current draft order
                const { data: lastOrders } = await supabase.from('orders')
                    .select('customer_name, delivery_address')
                    .eq('customer_phone', from)
                    .not('delivery_address', 'is', null)
                    .neq('status', 'DRAFT')
                    .order('created_at', { ascending: false })
                    .limit(1);

                const lastOrder = lastOrders?.[0];
                if (lastOrder) {
                    await supabase.from('orders').update({
                        customer_name: lastOrder.customer_name,
                        delivery_address: lastOrder.delivery_address
                    }).eq('id', orderId);
                }
                return await askState(from, orderId);
            }

            if (id.startsWith('new_addr_')) {
                // Clear any existing delivery address so draft stays open
                const orderId = id.replace('new_addr_', '');
                await supabase.from('orders').update({ delivery_address: null, customer_name: null }).eq('id', orderId);
                return await sendText(from,
                    `📝 *Enter New Delivery Details*\n\n` +
                    `Reply with your:\n_Name, Mobile Number, Full Address_\n\n` +
                    `Example:\n_Lakshmi, 9876543210, 12 Main St, Bangalore_`
                );
            }

            if (id.startsWith('qty_inc_')) return await handleModifyQuantity(from, 'inc', id.replace('qty_inc_', ''));
            if (id.startsWith('qty_dec_')) return await handleModifyQuantity(from, 'dec', id.replace('qty_dec_', ''));

            if (id.startsWith('vqty_inc_')) return await handleModifyQuantity(from, 'inc', id.replace('vqty_inc_', ''), true);
            if (id.startsWith('vqty_dec_')) return await handleModifyQuantity(from, 'dec', id.replace('vqty_dec_', ''), true);
            if (id.startsWith('vsel_')) return await handleVariantSelection(from, id.replace('vsel_', ''));

            if (id.startsWith('edit_item_')) return await handleCartItemOptions(from, id.replace('edit_item_', ''));

            if (id.startsWith('state_')) {
                const parts = id.split('_');
                const orderId = parts.pop();
                const stateClean = parts.slice(1).join('_');
                return await handleStateSelection(from, stateClean, orderId);
            }

            if (id.startsWith('pay_')) {
                const parts = id.split('_');
                return await finalizeOrder(from, parts[1].toUpperCase(), parts.slice(2).join('_'));
            }

            if (id.startsWith('paid_confirm_')) {
                const orderId = id.replace('paid_confirm_', '');
                return await handlePaymentConfirmed(from, orderId);
            }

            // Return/Exchange Handlers
            if (id.startsWith('rectype_')) {
                const parts = id.split('_'); // rectype_return_ORD-123
                const type = parts[1].toUpperCase();
                const orderId = parts.slice(2).join('_');
                return await handleReturnExchangeTypeSelection(customer.id, type, orderId, from);
            }

        }

    } catch (e) {
        console.error('Handler Error:', e);
    }
}

