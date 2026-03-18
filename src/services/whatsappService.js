//  Cast Print — WHATSAPP BUSINESS BOT (Premium Edition)

import { createClient } from '@supabase/supabase-js';
import { jsPDF } from "jspdf";

// ─── 1. CONFIGURATION & CLIENTS ───────────────────────────────────────────────

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const WHATSAPP_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();

// --- UTILS ---
const truncate = (str, limit) => (str && str.length > limit) ? str.substring(0, limit - 3) + "..." : str;

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

    try {
        debugLog(`Sending ${payload.type} to ${to}`);
        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const errorMsg = data.error?.message || 'Unknown Meta API Error';
            const errorCode = data.error?.code || 'No Code';
            console.error(`❌ [WA-ERROR][${response.status}] ${errorMsg} (Code: ${errorCode})`);
            
            if (errorCode === 131030) {
                console.error('💡 TIP: This usually means the 24-hour window is closed. The customer must message the bot first.');
            }
            
            return { error: errorMsg, code: errorCode, full: data.error };
        }
        
        debugLog(`Message sent successfully to ${to}`, { message_id: data.messages?.[0]?.id });
        return data;
    } catch (error) { 
        console.error('❌ [WA-NETWORK-ERROR]:', error);
        return { error: 'Network failure' };
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

export async function sendList(to, headerText, bodyText, buttonLabel, sections, footerText = "Cast Print • Premium Collection") {
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


// ─── 3. CART MANAGEMENT & STOCK ───────────────────────────────────────────────

async function getCart(phone) {
    const { data } = await supabase.from('whatsapp_cart').select('*').eq('phone', phone).order('created_at', { ascending: true });
    return data || [];
}

async function addToCart(phone, product, quantity = 1, variant = null) {
    const productId = product.id;
    const variantId = variant?.id || null;

    // Check if same product+variant combo exists
    const query = supabase.from('whatsapp_cart').select('*').eq('phone', phone).eq('product_id', productId);
    if (variantId) query.eq('variant_id', variantId);
    else query.is('variant_id', null);

    const { data: existing } = await query.single();

    if (existing) {
        await supabase.from('whatsapp_cart').update({ quantity: existing.quantity + quantity }).eq('id', existing.id);
    } else {
        await supabase.from('whatsapp_cart').insert({
            phone,
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
    await supabase.from('whatsapp_cart').delete().eq('phone', phone);
}

// Deduct stock for all items in an order
async function deductStock(orderId) {
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (items) {
        for (const item of items) {
            if (item.variant_id) {
                // Deduct from variant
                const { data: variant } = await supabase.from('product_variants')
                    .select('stock')
                    .eq('id', item.variant_id)
                    .single();
                if (variant) {
                    const newStock = Math.max(0, variant.stock - item.quantity);
                    await supabase.from('product_variants').update({ stock: newStock }).eq('id', item.variant_id);

                    // LOG HISTORY
                    await supabase.from('product_history').insert({
                        product_id: item.product_id,
                        variant_id: item.variant_id,
                        change_type: 'SALE',
                        quantity_change: -item.quantity,
                        new_stock: newStock,
                        reason: `Sold in Order #${orderId}`
                    });

                    await supabase.rpc('increment_total_sold', { prod_id: item.product_id, qty: item.quantity });

                    // Check low stock alert
                    const { data: fullVariant } = await supabase.from('product_variants').select('*, products(name, alert_threshold)').eq('id', item.variant_id).single();
                    if (fullVariant && fullVariant.stock <= (fullVariant.products?.alert_threshold || 0)) {
                        const adminPhone = process.env.WHATSAPP_ADMIN_NUMBER || '917558189732';
                        await sendText(adminPhone, `⚠️ *LOW STOCK ALERT*\n\nProduct: *${fullVariant.products.name}*\nVariant: *${fullVariant.name}*\nCurrent Stock: *${fullVariant.stock}*\nThreshold: *${fullVariant.products.alert_threshold}*`);
                    }
                }
            } else {
                // Deduct from main product
                const { data: product } = await supabase.from('products')
                    .select('name, stock, alert_threshold')
                    .eq('id', item.product_id)
                    .single();
                if (product) {
                    const newStock = Math.max(0, product.stock - item.quantity);
                    await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);

                    // LOG HISTORY
                    await supabase.from('product_history').insert({
                        product_id: item.product_id,
                        change_type: 'SALE',
                        quantity_change: -item.quantity,
                        new_stock: newStock,
                        reason: `Sold in Order #${orderId}`
                    });

                    await supabase.rpc('increment_total_sold', { prod_id: item.product_id, qty: item.quantity });

                    // Check low stock alert
                    if (newStock <= (product.alert_threshold || 0)) {
                        const adminPhone = process.env.WHATSAPP_ADMIN_NUMBER || '917558189732';
                        await sendText(adminPhone, `⚠️ *LOW STOCK ALERT*\n\nProduct: *${product.name}*\nCurrent Stock: *${newStock}*\nThreshold: *${product.alert_threshold}*`);
                    }
                }
            }
        }
    }
}

// ─── 4. PDF INVOICE ───────────────────────────────────────────────────────────

async function generateAndUploadInvoice(order) {
    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);        doc.text("Cast Print", 105, 20, { align: "center" });
        doc.setFontSize(10); doc.text(`Order ID: #${order.id}`, 15, 35);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 40);

        // Customer Info
        doc.setFont("helvetica", "bold");
        doc.text("Bill To:", 15, 50);
        doc.setFont("helvetica", "normal");
        const name = order.customer_name || 'Valued Customer';
        const address = order.delivery_address || 'Address provided';
        doc.text(name, 15, 55);

        const splitAddress = doc.splitTextToSize(address, 80);
        doc.text(splitAddress, 15, 60);

        let y = 85;

        // Items
        doc.setFillColor(240, 240, 240);
        doc.rect(10, y, 190, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("Item", 15, y + 6);
        doc.text("Qty", 140, y + 6, { align: "right" });
        doc.text("Price", 170, y + 6, { align: "right" });
        doc.text("Total", 195, y + 6, { align: "right" });

        y += 14;
        doc.setFont("helvetica", "normal");

        let grandTotal = 0;
        if (order.order_items) {
            order.order_items.forEach(item => {
                const total = item.price_at_time * item.quantity;
                grandTotal += total;
                const itemName = item.variant_name ? `${item.product_name} (${item.variant_name})` : item.product_name;
                doc.text(itemName.substring(0, 35), 15, y);
                doc.text(String(item.quantity), 140, y, { align: "right" });
                doc.text(item.price_at_time.toLocaleString(), 170, y, { align: "right" });
                doc.text(total.toLocaleString(), 195, y, { align: "right" });
                y += 8;
            });
        }

        // Summary
        doc.setFontSize(10);
        const subtotal = order.subtotal || (order.total_amount - (order.shipping_cost || 0) - (order.tax_amount || 0));
        doc.text(`Subtotal:`, 140, y, { align: "right" });
        doc.text(`Rs. ${subtotal.toLocaleString()}`, 195, y, { align: "right" });
        y += 6;

        if (order.shipping_cost > 0) {
            doc.text(`Shipping:`, 140, y, { align: "right" });
            doc.text(`Rs. ${order.shipping_cost.toLocaleString()}`, 195, y, { align: "right" });
            y += 6;
        }

        const cgst = order.cgst || 0;
        const sgst = order.sgst || 0;
        const igst = order.igst || 0;
        const taxAmount = order.tax_amount || (cgst + sgst + igst);

        if (taxAmount > 0) {
            if (cgst > 0 || sgst > 0) {
                if (cgst > 0) {
                    doc.text(`CGST (2.5%):`, 140, y, { align: "right" });
                    doc.text(`Rs. ${cgst.toLocaleString()}`, 195, y, { align: "right" });
                    y += 6;
                }
                if (sgst > 0) {
                    doc.text(`SGST (2.5%):`, 140, y, { align: "right" });
                    doc.text(`Rs. ${sgst.toLocaleString()}`, 195, y, { align: "right" });
                    y += 6;
                }
            } else if (igst > 0) {
                doc.text(`IGST (5%):`, 140, y, { align: "right" });
                doc.text(`Rs. ${igst.toLocaleString()}`, 195, y, { align: "right" });
                y += 6;
            }
        }

        y += 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`Grand Total: Rs. ${(order.total_amount || grandTotal).toLocaleString()}`, 195, y, { align: "right" });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        const fileName = `invoice_${order.id}.pdf`;
        const { error } = await supabase.storage.from('invoices').upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

        if (error) return null;
        const { data } = supabase.storage.from('invoices').getPublicUrl(fileName);
        const invoiceUrl = data.publicUrl;

        // Save URL to Database
        await supabase.from('orders').update({ invoice_url: invoiceUrl }).eq('id', order.id);

        return invoiceUrl;
    } catch (e) { console.error(e); return null; }
}

// ─── 5. FLOW FUNCTIONS ───────────────────────────────────────────────────────

// ─── PRODUCT INQUIRY via Catalog ID (printed on product image) ────────────────
// Customer reads the CAT-XXXXX code from the product image and texts it to the bot.

// Generate lookup variants to fix common OCR misreads (e.g. 1→I, 0→O)
function getCatalogIdVariants(catalogId) {
    const code = catalogId.replace(/^CAT-/i, '').toUpperCase();
    const CONFUSABLES = {
        '1': ['I', 'L'], '0': ['O'], '5': ['S'], '8': ['B'],
        'I': ['1'], 'O': ['0'], 'S': ['5'], 'B': ['8']
    };
    const variants = new Set([`CAT-${code}`]);
    for (let i = 0; i < code.length; i++) {
        const alts = CONFUSABLES[code[i]];
        if (alts) alts.forEach(a => variants.add(`CAT-${code.slice(0, i)}${a}${code.slice(i + 1)}`));
    }
    return [...variants];
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

        if (!product) {
            return sendText(to,
                `❌ Product code *${catalogId.toUpperCase()}* not found.\n\nSend *Hi* to browse our full collection! 💮`
            );
        }

        const stock = product.stock || 0;
        const alertThreshold = product.alert_threshold || 5;
        const stockStatus = stock <= 0
            ? '❌ Out of Stock'
            : stock <= alertThreshold
                ? `⚠️ Only ${stock} left — Order soon!`
                : `✅ In Stock`;

        const desc = product.description
            ? `\n📝 ${product.description.substring(0, 120)}${product.description.length > 120 ? '...' : ''}`
            : '';

        const caption =
            `📦 *${product.name}*\n` +
            (product.category ? `🏷️ ${product.category}\n` : '') +
            `💎 *₹${(product.price || 0).toLocaleString()}*\n` +
            `${stockStatus}${desc}`;

        const imgUrl = getPremiumImage(product);
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
    const welcomeMsg = await getConfig('wa_welcome_message',
        "💮 *Welcome to Cast Print!*\n\nDiscover our premium collection of silk & cotton sarees."
    );
    const welcomeImg = await getConfig('wa_welcome_image',
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=85"
    );

    // Build shop URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://casteprint.vercel.app');
    const shopUrl = `${appUrl}/shop?phone=${encodeURIComponent(to)}`;

    // ── SIMPLIFIED FLOW (More robust for Vercel/V21.0) ──
    // 1. Send Image with caption
    await sendRawMessage(to, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "image",
        image: {
            link: welcomeImg,
            caption: welcomeMsg + "\n\n🛍️ *Shop Online:*\n" + shopUrl
        }
    });

    // 2. Send Action Buttons
    await sendButtons(to, "Explore our collection and manage:", [
        { id: "menu_catalogue", title: "📖 View Catalogue" },
        { id: "menu_track", title: "My Orders" },
        { id: "menu_contact", title: "Contact Us" }
    ]);
}




export async function sendCatalog(to) {
    const header = await getConfig('wa_catalog_header', "PREMIUM COLLECTIONS");
    const body = await getConfig('wa_catalog_body', "Curated just for you:");

    await sendList(to, header, body, "View Collections", [
        { id: "menu_catalogue", title: "📂 Browse Categories", description: "By Saree Type" },
        { id: "ctlg_all", title: "🌟 New Arrivals", description: "Latest Collections" },
        { id: "ctlg_all_full", title: "📖 Full Catalogue", description: "Browse Inventory" }
    ]);
}

// ─── CATALOGUE FLOW (Dynamic categories from DB) ────────────────────────────

const CATEGORY_EMOJIS = {
    'silk saree': '✨', 'cotton saree': '🌿', 'designer': '💎',
    'georgette': '🌸', 'banarasi': '🏛️', 'chiffon': '🦋',
    'linen': '🌾', 'pattu': '🪔', 'kanjivaram': '👑',
    'organza': '💫', 'tussar': '🍂', 'crepe': '🌙'
};

function getCategoryEmoji(category) {
    const lower = (category || '').toLowerCase();
    for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
        if (lower.includes(key)) return emoji;
    }
    return '🧵';
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
        id: 'ctlg_all_new', // This will show all, starting with newest (due to sorting in sendCatalogueByType)
        title: '🆕 New Arrivals',
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
        title: '🌟 View Full Collection',
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
    const PAGE_LIMIT = 60; // Set high to capture everything in one flow

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

        // Slightly faster delay to stay within webhook response windows
        await new Promise(r => setTimeout(r, 250));
    }

    console.log(`[WA] Successfully finished sending ${prods.length} items to ${to}`);

    if (!isStreamActive(to, streamId)) return;

    const nextOffset = startOffset + prods.length;
    const hasMore = totalCount > nextOffset;

    if (hasMore) {
        await sendButtons(to, `👇 Showing ${nextOffset} of ${totalCount} sarees in *${categoryName}*.`, [
            { id: `ctlg_page_${typeId}_${nextOffset}`, title: "📜 Show More" },
            { id: "menu_catalogue", title: "📖 Back to Types" }
        ]);
    } else {
        await sendButtons(to, `✅ That's all ${totalCount} saree${totalCount > 1 ? 's' : ''} in *${categoryName}*!\n\nWhat would you like to do next?`, [
            { id: "menu_catalogue", title: "📖 More Types" },
            { id: "menu_cart", title: "🛒 View Cart" },
            { id: "menu_shop_web", title: "🛍️ Visit Web Store" }
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
        total_amount: subtotal, // Placeholder
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

    // Check Previous COMPLETED Orders for Address Reuse
    // Look for any past order from this WhatsApp number that has an address
    const { data: lastOrders } = await supabase.from('orders')
        .select('customer_name, delivery_address, customer_phone')
        .eq('customer_phone', to)
        .not('delivery_address', 'is', null)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })
        .limit(1);

    const lastOrder = lastOrders?.[0];
    console.log(`[WA] Checkout for ${to} — last order found:`, lastOrder ? 'YES' : 'NO');

    if (lastOrder && lastOrder.delivery_address) {
        await sendButtons(to,
            `📝 *Checkout*\n\nWe found your saved address:\n\n` +
            `👤 ${lastOrder.customer_name || 'Customer'}\n` +
            `📍 ${lastOrder.delivery_address}\n\n` +
            `Use this address?`,
            [
                { id: `use_saved_${orderId}`, title: "✅ Yes, Use This" },
                { id: `new_addr_${orderId}`, title: "✏️ Enter New Address" }
            ]
        );
    } else {
        await sendText(to,
            `📝 *Checkout - Delivery Details*\n\n` +
            `Please reply with your details in this format:\n\n` +
            `*Name, Mobile Number, Full Address*\n\n` +
            `Example:\n_Lakshmi, 9876543210, 12 Main St, Bangalore_`
        );
    }
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
export async function notifyOrderSuccess(orderId) {
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

        const to = order.customer_phone;
        if (!to) return;

        const total = order.total_amount?.toLocaleString() || '0';
        const itemsList = (order.order_items || [])
            .map(item => `• ${item.product_name} x${item.quantity} — ₹${(item.price_at_time * item.quantity).toLocaleString()}`)
            .join('\n');

        const message =
            `✅ *Order Confirmed — Cast Print* 🎉\n\n` +
            `Hi ${order.customer_name || 'Customer'}! Your order has been placed successfully.\n\n` +
            `📦 *Order ID:* #${orderId}\n` +
            `💰 *Grand Total:* ₹${total}\n` +
            `🛍️ *Items:*\n${itemsList}\n\n` +
            `📍 *Delivery Address:*\n${order.delivery_address || 'As provided'}\n\n` +
            `📄 Generating your invoice...`;

        await sendText(to, message);

        // Send Invoice
        const invoiceUrl = await generateAndUploadInvoice(order);
        if (invoiceUrl) {
            await sendDocument(to, invoiceUrl, `Invoice - Order #${orderId}`, `Invoice_${orderId}.pdf`);
        }

        await sendButtons(to, "💗 Thank you for shopping with *Cast Print*!\n\nTap below to manage your orders.", [
            { id: "menu_track", title: "Track Order" },
            { id: "menu_my_orders", title: "My Orders" }
        ]);

        console.log(`[NOTIFY] Notification sent successfully for #${orderId}`);
    } catch (err) {
        console.error(`[NOTIFY] Error in notifyOrderSuccess:`, err);
    }
}

// Finalize Order
export async function finalizeOrder(to, method, orderId) {
    const status = method === 'COD' ? 'PLACED' : 'AWAITING_PAYMENT';
    await supabase.from('orders').update({ status, payment_method: method }).eq('id', orderId);

    const { data: order } = await supabase.from('orders').select(`*, order_items(*)`).eq('id', orderId).single();
    const total = order?.total_amount?.toLocaleString() || '0';

    if (method === 'UPI') {
        // Build UPI deep link — opens GPay / PhonePe / any UPI app with amount pre-filled
        const rawAmount = order?.total_amount || 0;
        const upiId = 'samypranesh@okicici';
        const payeeName = 'Caste Print+Sarees';
        const note = `Order+${orderId}`;
        const upiLink = `upi://pay?pa=${upiId}\u0026pn=${payeeName}\u0026am=${rawAmount}\u0026cu=INR\u0026tn=${note}`;

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

    } else {
        // COD — deduct stock, clear cart, send notification
        await clearCart(to);
        await deductStock(orderId);
        await notifyOrderSuccess(orderId);
    }
}

// Called when UPI customer confirms payment
export async function handlePaymentConfirmed(to, orderId) {
    // Mark order as PAID
    await supabase.from('orders').update({ status: 'PAID' }).eq('id', orderId);
    await clearCart(to);
    await deductStock(orderId);

    const { data: order } = await supabase.from('orders').select(`*, order_items(*)`).eq('id', orderId).single();

    await sendText(to, `✅ *Payment Confirmed! Thank you!*\n\nGenerating your invoice now...`);
    const invoiceUrl = await generateAndUploadInvoice(order);
    if (invoiceUrl) {
        await sendDocument(to, invoiceUrl, `Invoice - Order #${orderId}`, `Invoice_${orderId}.pdf`);
    } else {
        await sendText(to, `⚠️ Invoice generation failed. Please contact us with Order ID: *#${orderId}*`);
    }

    await sendButtons(to, "💗 Thank you for shopping with *Cast Print*!\n\nTap below to manage your orders.", [
        { id: "menu_track", title: "Track Order" },
        { id: "menu_my_orders", title: "My Orders" }
    ]);
}
export async function handleTrackOrder(to) {
    const { data: orders } = await supabase.from('orders').select('*').eq('customer_phone', to).neq('status', 'DRAFT').order('created_at', { ascending: false }).limit(1);
    if (!orders?.length) return sendButtons(to, "No previous orders found.", [{ id: "menu_main", title: "🏠 Main Menu" }]);

    const o = orders[0];
    await sendButtons(to, `📦 *Last Order Details*\n\nID: #${o.id}\nStatus: ${o.status}\nAmount: ₹${o.total_amount}\nDate: ${new Date(o.created_at).toLocaleDateString()}`, [
        { id: "menu_main", title: "🏠 Main Menu" }
    ]);
}

export async function handleContact(to) {
    const contactMsg = await getConfig('wa_contact_message', "📞 *Contact Support*\n\nFor assistance, please call us at:\n+91 75581 89732\n\nOr email:\nsupport@casteprint.com");
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

        // Step 5: Flexible pattern matching — handles:
        // CAT-KY028   CAT KY028   CATKY028   cat-ky028   KY028 etc.
        const patterns = [
            /CAT[-\s]?([A-Z0-9]{5})/i,   // CAT-KY028 or CAT KY028 or CATKY028
            /([A-Z]{2,3})[-\s]([A-Z0-9]{3,5})/i,  // XX-YYYY or XXX-YYY
            /([A-Z0-9]{5})/i, // Last resort: just any 5 chars
        ];

        let catalogId = null;
        for (const pattern of patterns) {
            const m = detectedText.match(pattern);
            if (m) {
                const code = (m[1] + (m[2] || '')).replace(/[-\s]/g, '');
                if (/^[A-Z0-9]{5,8}$/i.test(code)) {
                    catalogId = `CAT-${code.slice(-5).toUpperCase()}`;
                    console.log('[OCR] ✅ Extracted catalog ID:', catalogId);
                    break;
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
    debugLog('Processing incoming message body:', body);
    try {
        const value = body.entry?.[0]?.changes?.[0]?.value;
        const message = value?.messages?.[0];
        if (!message) {
            debugLog('No message found in body');
            return;
        }
        const from = message.from;
        const msgType = message.type;
        const msgId = message.id;

        // --- DEDUPLICATION CHECK ---
        if (isDuplicate(msgId)) {
            debugLog(`Ignoring duplicate message ID: ${msgId}`);
            return;
        }

        const profileName = value?.contacts?.[0]?.profile?.name || 'WhatsApp Customer';

        // --- 0. CUSTOMER SYNC (Always ensure customer exists) ---
        let customer = null;
        try {
            const { data, error } = await supabase.from('customers').select('*').eq('phone', from).single();
            if (!data) {
                const { data: newCust, error: insertErr } = await supabase.from('customers').insert({ 
                    phone: from, 
                    name: profileName, 
                    role: 'user' 
                }).select().single();
                
                if (insertErr) {
                    debugLog(`Customer creation failed for ${from}:`, insertErr);
                } else {
                    debugLog(`New customer created: ${from} (${profileName})`);
                    customer = newCust;
                }
            } else {
                customer = data;
                // Update name if it was generic and we got a real one
                if ((!customer.name || customer.name === 'WhatsApp Customer') && profileName !== 'WhatsApp Customer') {
                    await supabase.from('customers').update({ name: profileName }).eq('id', customer.id);
                }
            }
        } catch (supabaseErr) {
            debugLog(`Supabase connection error during sync for ${from}:`, supabaseErr);
        }

        // -------------------------
        const text = message.text?.body?.toLowerCase().trim();

        // 🛑 Stop any active stream for this user immediately
        cancelStream(from);

        // 📸 IMAGE MESSAGE — Customer sent a screenshot of a product
        // Use Google Cloud Vision OCR to read the catalog ID stamped on the image
        if (msgType === 'image') {
            const mediaId = message.image?.id;
            await sendText(from, '🔍 Analysing your image... Please wait a moment!');
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

            if (RESET_TRIGGERS.includes(text)) {
                // Reset: cancel any open draft orders and show main menu
                await supabase.from('orders').delete().eq('customer_phone', from).eq('status', 'DRAFT');
                return await sendMainMenu(from);
            }
            if (MENU_TRIGGERS.includes(text)) return await sendMainMenu(from);
            if (['cart', 'bag'].includes(text)) return await handleViewCart(from);
            if (['catalogue', 'catalog', 'browse', 'list for sarees', 'list sarees', 'show sarees'].includes(text)) return await sendCatalogueCategories(from);

            // ── CATALOG ID LOOKUP: customer reads CAT-XXXXX code from product image ──
            // Matches patterns like: CAT-AB12X  or  cat-ab12x  or just  AB12X
            const catalogMatch = message.text.body.trim().match(/^(CAT-)?([A-Z0-9]{5})$/i);
            if (catalogMatch) {
                const catalogId = `CAT-${catalogMatch[2].toUpperCase()}`;
                return await handleProductInquiry(from, catalogId);
            }

            if (text === 'contact') return await handleContact(from);
            if (['stop', 'cancel'].includes(text)) return await sendText(from, "✅ Stopped. Send *Hi* to start again.");

            // Handle Website Checkout Redirection
            if (text.includes('i just placed an order #') || text.startsWith('finish order #') || text.includes('please confirm is this your order in the website')) {
                const match = text.match(/order #([a-z0-9-]+)/i);
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
                                `*Name, Mobile Number, Full Address*\n\n` +
                                `Example:\n_Lakshmi, 9876543210, 12 Main St, Bangalore_`
                            );
                            return;
                        }

                        // Order placed completely on website
                        await sendText(from, `✅ *Order Confirmed! (#${orderId})*\n\nThank you, ${order.customer_name || 'Customer'}!\n\n📍 *Delivery Address:*\n${order.delivery_address}\n\n🛒 *Total Billing:* ₹${order.total_amount.toLocaleString()}`);

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
                            await sendText(from, "📄 Generating your invoice...");
                            const { data: fullOrder } = await supabase.from('orders').select(`*, order_items(*)`).eq('id', orderId).single();
                            const invoiceUrl = await generateAndUploadInvoice(fullOrder);
                            if (invoiceUrl) {
                                await sendDocument(from, invoiceUrl, `Invoice - Order #${orderId}`, `Invoice_${orderId}.pdf`);
                            }
                            await sendText(from, "💗 We will contact you shortly to confirm cash on delivery dispatch!");
                        }
                        return;
                    }
                }
            }

            // ─── STEP 2: Draft check — only reached for non-keyword messages ───
            // This captures name/mobile/address when user is in checkout flow
            const { data: draft } = await supabase
                .from('orders')
                .select('id, delivery_address')
                .eq('customer_phone', from)
                .eq('status', 'DRAFT')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (draft && !draft.delivery_address) {
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
            if (id === 'menu_shop_web') {
                // Customer tapped "Shop Now" — send the shopping website URL
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://casteprint.vercel.app');
                const shopUrl = `${appUrl}/shop?phone=${encodeURIComponent(from)}`;
                return await sendText(from,
                    `🛍️ *Open our Online Store:*\n\n👆 Tap the link below to browse & order sarees:\n\n${shopUrl}\n\n✨ You can browse our full collection, add to cart and place your order directly from the website!\n\nAfter placing your order, you'll be redirected back here with your order confirmation. 💮`
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
        }

    } catch (e) {
        console.error('Handler Error:', e);
    }
}

