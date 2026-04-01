//  Cast Printz — WHATSAPP BUSINESS BOT (Premium Edition)

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

// Normalize phone number to E.164 format (with country code)
function normalizePhoneNumber(phone) {
    if (!phone) return phone;
    
    // Remove any non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // If it starts with 0, remove the leading 0 and add India country code (91)
    if (digits.startsWith('0')) {
        digits = '91' + digits.substring(1);
    }
    
    // If it doesn't have a country code (less than 12 digits for India), add 91
    if (digits.length === 10) {
        digits = '91' + digits;
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

            return { error: errorMsg, code: errorCode, full: data.error };
        }

        debugLog(`Message sent successfully to ${normalizedTo}`, { message_id: data.messages?.[0]?.id });
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
                        const adminPhone = process.env.WHATSAPP_ADMIN_NUMBER || '15551678232';
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
                        const adminPhone = process.env.WHATSAPP_ADMIN_NUMBER || '15551678232';
                        await sendText(adminPhone, `⚠️ *LOW STOCK ALERT*\n\nProduct: *${product.name}*\nCurrent Stock: *${newStock}*\nThreshold: *${product.alert_threshold}*`);
                    }
                }
            }
        }
    }
}

// ─── 4. PDF INVOICE ───────────────────────────────────────────────────────────

// Helper to fetch logo and convert to base64 with retry logic
async function fetchLogoAsBase64(logoUrl, retries = 3) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[INVOICE] Fetching logo from: ${logoUrl} (attempt ${attempt}/${retries})`);
            
            // Use AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(logoUrl, {
                headers: { 
                    'Accept': 'image/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                console.error(`[INVOICE] Failed to fetch logo: ${response.status} ${response.statusText}`);
                if (attempt < retries) {
                    console.log(`[INVOICE] Retrying in ${attempt * 1000}ms...`);
                    await delay(attempt * 1000);
                    continue;
                }
                return null;
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Detect image type from URL
            let mimeType = 'image/png';
            const lowerUrl = logoUrl.toLowerCase();
            if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
                mimeType = 'image/jpeg';
            } else if (lowerUrl.endsWith('.webp')) {
                mimeType = 'image/webp';
            } else if (lowerUrl.endsWith('.gif')) {
                mimeType = 'image/gif';
            }
            
            const base64 = buffer.toString('base64');
            console.log(`[INVOICE] Logo fetched successfully, size: ${base64.length} bytes`);
            return `data:${mimeType};base64,${base64}`;
        } catch (error) {
            console.error(`[INVOICE] Error fetching logo (attempt ${attempt}/${retries}):`, error.message);
            if (attempt < retries) {
                console.log(`[INVOICE] Retrying in ${attempt * 1000}ms...`);
                await delay(attempt * 1000);
            }
        }
    }
    return null;
}

// Helper to read local logo file as base64
async function getLocalLogoAsBase64() {
    try {
        const fs = await import('fs');
        const path = await import('path');
        
        // Try multiple possible logo paths
        const possiblePaths = [
            path.join(process.cwd(), 'public', 'logo.png'),
            path.join(process.cwd(), 'public', 'logo1.jpg'),
            path.join(process.cwd(), 'public', 'logo.jpg'),
            path.join(process.cwd(), 'public', 'logo.jpeg'),
            path.join(process.cwd(), 'public', 'images', 'logo.png'),
            path.join(process.cwd(), 'public', 'images', 'logo1.jpg'),
            path.join(process.cwd(), 'public', 'images', 'logo.jpg'),
        ];
        
        for (const logoPath of possiblePaths) {
            if (fs.existsSync(logoPath)) {
                console.log(`[INVOICE] Found local logo at: ${logoPath}`);
                const buffer = fs.readFileSync(logoPath);
                const ext = path.extname(logoPath).toLowerCase();
                let mimeType = 'image/png';
                if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                if (ext === '.webp') mimeType = 'image/webp';
                
                const base64 = buffer.toString('base64');
                console.log(`[INVOICE] Local logo loaded, size: ${base64.length} bytes`);
                return `data:${mimeType};base64,${base64}`;
            }
        }
        
        console.log('[INVOICE] No local logo file found');
        return null;
    } catch (error) {
        console.error('[INVOICE] Error reading local logo:', error.message);
        return null;
    }
}

async function generateAndUploadInvoice(order) {
    try {
        const doc = new jsPDF();

        // Fetch branding from settings
        let branding = {
            shop_name: 'Cast Printz',
            shop_logo: ''
        };

        try {
            const { data } = await supabase.from('app_settings').select('*');
            if (data) {
                data.forEach(item => {
                    if (item.key === 'shop_name' || item.key === 'companyName') {
                        branding.shop_name = item.value;
                    } else if (item.key === 'shop_logo') {
                        branding.shop_logo = item.value;
                    }
                });
            }
        } catch (e) {
            console.error("PDF Branding Error:", e);
        }

        // Header with logo if available
        const pageWidth = doc.internal.pageSize.getWidth();
        const centerX = pageWidth / 2;

        if (branding.shop_logo) {
            try {
                let logoBase64 = null;
                
                // First, try to use local logo file
                logoBase64 = await getLocalLogoAsBase64();
                
                // If no local logo, try fetching from URL
                if (!logoBase64 && branding.shop_logo.startsWith('http')) {
                    logoBase64 = await fetchLogoAsBase64(branding.shop_logo);
                }
                
                // If we have a logo (local or fetched), add it to PDF
                if (logoBase64) {
                    // Add logo image to PDF
                    doc.addImage(logoBase64, 'PNG', centerX - 15, 10, 30, 30);
                    doc.setFontSize(18);
                    doc.text(branding.shop_name || "Cast Printz", centerX, 50, { align: "center" });
                } else {
                    throw new Error('No logo available');
                }
            } catch (imgError) {
                console.error('[INVOICE] Logo processing error:', imgError);
                // Fallback to text if image fails
                doc.setFontSize(22);
                doc.text(branding.shop_name || "Cast Printz", centerX, 20, { align: "center" });
            }
        } else {
            doc.setFontSize(22);
            doc.text(branding.shop_name || "Cast Printz", centerX, 20, { align: "center" });
        }
        
        doc.setFontSize(10);
        doc.text(`Order ID: #${order.id}`, 15, 35);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 40);

        // Customer Info - Show billing and shipping
        let y = 55;
        
        // Billing Address
        doc.setFont("helvetica", "bold");
        doc.text("Bill To:", 15, y);
        doc.setFont("helvetica", "normal");
        y += 6;
        
        const billing = order.billing_address || {};
        const billingName = billing.name || order.customer_name || 'Valued Customer';
        const billingAddr = billing.address || order.delivery_address || 'Address provided';
        const billingMobile = billing.mobile || order.customer_phone || '';
        
        doc.text(billingName, 15, y);
        y += 6;
        if (billingMobile) {
            doc.text(`📱 ${billingMobile}`, 15, y);
            y += 6;
        }
        const splitBilling = doc.splitTextToSize(billingAddr, 80);
        doc.text(splitBilling, 15, y);
        y += splitBilling.length * 6 + 4;
        
        // Shipping Address (if different from billing)
        const shipping = order.shipping_address || {};
        const shippingAddr = shipping.address || billingAddr;
        
        if (shippingAddr !== billingAddr || shipping.name !== billingName) {
            doc.setFont("helvetica", "bold");
            doc.text("Ship To:", 15, y);
            doc.setFont("helvetica", "normal");
            y += 6;
            
            const shipName = shipping.name || billingName;
            const shipMobile = shipping.mobile || billingMobile;
            
            doc.text(shipName, 15, y);
            y += 6;
            if (shipMobile) {
                doc.text(`📱 ${shipMobile}`, 15, y);
                y += 6;
            }
            const splitShipping = doc.splitTextToSize(shippingAddr, 80);
            doc.text(splitShipping, 15, y);
            y += splitShipping.length * 6 + 10;
        } else {
            y += 10;
        }

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
    const code = catalogId.replace(/^CAT[-\s]?/i, '').toUpperCase();
    const CONFUSABLES = {
        '1': ['I', 'L'], '0': ['O'], '5': ['S'], '8': ['B'],
        'I': ['1'], 'O': ['0'], 'S': ['5'], 'B': ['8']
    };

    const variants = new Set();
    // Always try with CAT-, without, and with CAT (no dash)
    variants.add(`CAT-${code}`);
    variants.add(`CAT${code}`);
    variants.add(code);

    for (let i = 0; i < code.length; i++) {
        const alts = CONFUSABLES[code[i]];
        if (alts) {
            alts.forEach(a => {
                const altCode = `${code.slice(0, i)}${a}${code.slice(i + 1)}`;
                variants.add(`CAT-${altCode}`);
                variants.add(`CAT${altCode}`);
                variants.add(altCode);
            });
        }
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
                `❌ Product code *${catalogId.toUpperCase()}* not found.\n\nSend *Hi* to browse our full collection! ✨`
            );
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
    // Build shop URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://castprintz.vercel.app');
    const shopUrl = `${appUrl}/shop?phone=${encodeURIComponent(to)}`;

    // Fetch dynamic welcome message from settings, fallback to standard text
    const welcomeMsg = await getConfig('wa_welcome_message', 'Explore our premium collection and manage your orders:');

    // Directly Send Action Buttons - Main Menu
    await sendButtons(to, `${welcomeMsg}\n\nShop Online: ${shopUrl}`, [
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
        total_amount: subtotal,
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
            `*Name, Mobile Number, Full Address*\n\n` +
            `Example:\n_Lakshmi, 9876543210, 12 Main St, Bangalore, 560001_`
        );
    }
}

// Handle saved billing address reuse
export async function handleSavedBilling(to, orderId) {
    const { data: lastOrders } = await supabase.from('orders')
        .select('customer_name, billing_address')
        .eq('customer_phone', to)
        .not('billing_address', 'is', null)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })
        .limit(1);
    
    const lastOrder = lastOrders?.[0];
    if (lastOrder && lastOrder.billing_address) {
        await supabase.from('orders').update({
            customer_name: lastOrder.billing_address.name || lastOrder.customer_name,
            billing_address: lastOrder.billing_address
        }).eq('id', orderId);
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
        .select('billing_address, customer_name, customer_phone')
        .eq('id', orderId)
        .single();
    
    if (order && order.billing_address) {
        await supabase.from('orders').update({
            shipping_address: order.billing_address
        }).eq('id', orderId);
    }
    
    // Continue to state selection
    return await askState(to, orderId);
}

// Handle new billing address input
export async function handleNewBillingAddress(to, orderId, text) {
    let name = 'Valued Customer';
    let mobile = to;
    let address = text.trim();

    const rawBody = text.trim();

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

    const billingAddress = {
        name: name,
        mobile: mobile,
        address: address
    };

    await supabase.from('orders').update({
        customer_name: name,
        customer_phone: mobile,
        billing_address: billingAddress
    }).eq('id', orderId);

    // Ask if shipping same as billing
    return await askShippingSameAsBilling(to, orderId);
}

// Handle new shipping address input
export async function handleNewShippingAddress(to, orderId, text) {
    let name = 'Valued Customer';
    let mobile = to;
    let address = text.trim();

    const rawBody = text.trim();

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

    const shippingAddress = {
        name: name,
        mobile: mobile,
        address: address
    };

    await supabase.from('orders').update({
        shipping_address: shippingAddress
    }).eq('id', orderId);

    // Continue to state selection
    return await askState(to, orderId);
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
            `✅ *Order Confirmed — Cast Printz* 🎉\n\n` +
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

        await sendButtons(to, "Thank you for shopping with *Cast Printz*!\n\nTap below to manage your order:", [
            { id: "menu_track", title: "Track Order" },
            { id: "menu_my_orders", title: "My Orders" },
            { id: `menu_cancel_order`, title: "Cancel Order" }
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

    if (method === 'UPI') {
        // Build UPI deep link — opens GPay / PhonePe / any UPI app with amount pre-filled
        const rawAmount = order?.total_amount || 0;
        const upiId = 'samypranesh@okicici';
        const payeeName = 'Cast Printz Sarees';
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
    
    // Add PAID log entry
    await supabase.from('order_status_logs').insert({
        order_id: orderId,
        status: 'PAID',
        notes: 'Payment confirmed via WhatsApp (UPI)',
        created_at: new Date().toISOString()
    });
    
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

    await sendButtons(to, "Thank you for shopping with *Cast Printz*!\n\nTap below to manage your order:", [
        { id: "menu_track", title: "📦 Track Order" },
        { id: "menu_my_orders", title: "🛍️ My Orders" },
        { id: "menu_cancel_order", title: "❌ Cancel Order" }
    ]);
}
export async function handleCancelOrder(to) {
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
            .limit(5);
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
    
    // Ask for confirmation
    return sendButtons(to, 
        `⚠️ *Confirm Cancellation*\n\nOrder: *${orderId}*\nAmount: ₹${order.total_amount?.toLocaleString()}\nStatus: ${order.status}\n\nAre you sure you want to cancel this order?`, 
        [
            { id: `confirm_cancel_${orderId}`, title: "✅ Yes, Cancel" },
            { id: "menu_main", title: "❌ No, Go Back" }
        ]
    );
}

export async function confirmCancelOrder(to, orderId) {
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
                }
            }
        }
    }
    
    // Update order status to CANCELLED
    await supabase.from('orders')
        .update({ 
            status: 'CANCELLED',
            admin_notes: `Order cancelled by customer via WhatsApp on ${new Date().toLocaleString()}`
        })
        .eq('id', upperOrderId);
    
    // Add to status history (both tables for compatibility)
    await supabase.from('order_status_history').insert({
        order_id: upperOrderId,
        status_from: null,
        status_to: 'CANCELLED',
        changed_by: 'customer',
        notes: 'Order cancelled by customer via WhatsApp'
    });
    
    // Also add to order_status_logs which is what the admin panel reads
    await supabase.from('order_status_logs').insert({
        order_id: upperOrderId,
        status: 'CANCELLED',
        notes: 'Order cancelled by customer via WhatsApp',
        created_at: new Date().toISOString()
    });
    
    return sendButtons(to, 
        `Order Cancelled Successfully\n\nOrder: *${upperOrderId}*\n\nYour order has been cancelled and stock has been restored.\n\nIf you have already paid, a refund will be processed within 5-7 business days.`, 
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
    
    let orders = [];
    for (const phone of phoneVariations) {
        const { data } = await supabase.from('orders').select('id, status, total_amount, created_at').eq('customer_phone', phone).eq('status', 'DELIVERED').order('created_at', { ascending: false }).limit(5);
        if (data?.length) { orders = data; break; }
    }
    
    if (!orders?.length) {
        return sendButtons(to, "You don't have any delivered orders available for refund. Only delivered orders can be refunded.", [{ id: "menu_main", title: "Main Menu" }]);
    }
    
    let msg = "Refund Request\n\nYour delivered orders:\n";
    orders.forEach((o, i) => { msg += `${i + 1}. *#${o.id}* - ₹${o.total_amount?.toLocaleString()}\n`; });
    msg += "\nPlease reply with the Order ID you want to refund\n\n_Example: ORD-123456_";
    return sendText(to, msg);
}

export async function processRefundOrder(to, orderId) {
    const upperOrderId = orderId.toUpperCase();
    const normalizedPhone = normalizePhoneNumber(to);
    const { data: order } = await supabase.from('orders').select('*').eq('id', upperOrderId).eq('customer_phone', normalizedPhone).single();
    
    if (!order || order.status !== 'DELIVERED') {
        return sendButtons(to, `Order *${orderId}* not found or is not in a refundable status (must be DELIVERED).`, [{ id: "menu_main", title: "Main Menu" }]);
    }
    
    // Store that this user is now in "Waiting for Refund Reason" state for this order
    await supabase.from('customers').update({ admin_notes: `WAITING_REFUND_REASON:${upperOrderId}` }).eq('phone', to);
    
    return sendText(to, `Refund Request: *${upperOrderId}*\n\nPlease reply with the reason for your refund request.\n\nOur team will review your request once submitted.`);
}

export async function confirmRefundOrder(to, orderId, reason) {
    await supabase.from('orders').update({ status: 'REFUND_REQUESTED', refund_reason: reason, refund_status: 'PENDING' }).eq('id', orderId);
    await supabase.from('customers').update({ admin_notes: null }).eq('phone', to);
    
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
    
    // Query with OR condition for all phone variations
    let orders = [];
    for (const phone of phoneVariations) {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_phone', phone)
            .neq('status', 'DRAFT')
            .order('created_at', { ascending: false })
            .limit(1);
        if (data && data.length > 0) {
            orders = data;
            break;
        }
    }
    
    if (!orders?.length) return sendButtons(to, "No previous orders found.", [{ id: "menu_main", title: "🏠 Main Menu" }]);

    const o = orders[0];
    const canCancel = ['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'].includes(o.status);
    
    const buttons = [
        { id: "menu_main", title: "🏠 Main Menu" }
    ];
    
    if (canCancel) {
        buttons.unshift({ id: "menu_cancel_order", title: "Cancel Order" });
    }
    
    await sendButtons(to, `Last Order Details\n\nID: #${o.id}\nStatus: ${o.status}\nAmount: ₹${o.total_amount}\nDate: ${new Date(o.created_at).toLocaleDateString()}`, buttons);
}

export async function handleContact(to) {
    const contactMsg = await getConfig('wa_contact_message', "📞 *Contact Support*\n\nFor assistance, please call us at:\n+91 75581 89732\n\nOr email:\ncastprintzofficial@gmail.com");
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
                // Extract the alphanumeric part (5-8 chars)
                const code = (m[1] + (m[2] || '')).replace(/[-\s]/g, '').toUpperCase();
                if (code.length >= 4) {
                    // Pass the raw extracted code to handleProductInquiry (it will use getCatalogIdVariants)
                    catalogId = code;
                    console.log('[OCR] ✅ Extracted code:', catalogId);
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

            if (RESET_TRIGGERS.includes(text)) {
                // Reset: cancel any open draft orders and show main menu
                await supabase.from('orders').delete().eq('customer_phone', from).eq('status', 'DRAFT');
                return await sendMainMenu(from);
            }
            if (MENU_TRIGGERS.includes(text)) return await sendMainMenu(from);
            if (['cart', 'bag'].includes(text)) return await handleViewCart(from);
            if (['catalogue', 'catalog', 'browse', 'list for sarees', 'list sarees', 'show sarees'].includes(text)) return await sendCatalogueCategories(from);

            // ── CATALOG ID LOOKUP: customer reads CAT-XXXXX code from product image ──
            // Matches patterns like: CAT-AB12X, cat ab12x, CAT12345, or just AB12X (5-8 chars)
            // Use a more flexible regex for direct typing
            const catalogMatch = message.text.body.trim().match(/^(CAT[-\s]?)?([A-Z0-9]{4,12})$/i);
            if (catalogMatch) {
                const catalogId = catalogMatch[2].toUpperCase();
                return await handleProductInquiry(from, catalogId);
            }

            if (text === 'contact') return await handleContact(from);
            if (['stop', 'cancel'].includes(text)) return await sendText(from, "✅ Stopped. Send *Hi* to start again.");

            // Text commands for menu items (typed by user)
            if (['track order', 'my orders', 'my order', 'orders', 'order status'].includes(text)) return await handleTrackOrder(from);
            if (['cancel order', 'cancel my order'].includes(text)) return await handleCancelOrder(from);
            if (['refund', 'return', 'refund order', 'return order'].includes(text)) return await handleRefundOrder(from);
            if (['view catalogue', 'view catalog', 'browse catalogue', 'browse catalog', 'show catalogue', 'show products'].includes(text)) return await sendCatalogueCategories(from);
            if (['view cart', 'my cart', 'show cart', 'cart'].includes(text)) return await handleViewCart(from);

            // Check if customer is waiting to provide a refund reason
            if (customer?.admin_notes?.startsWith('WAITING_REFUND_REASON:')) {
                const orderId = customer.admin_notes.split(':')[1];
                return await confirmRefundOrder(from, orderId, message.text.body);
            }

            // Handle Order ID pattern for cancellation or refund
            const orderIdPattern = /^(ORD|WEB)-[A-Z0-9]+$/i;
            if (orderIdPattern.test(message.text.body.trim())) {
                const oId = message.text.body.trim().toUpperCase();
                const { data: o } = await supabase.from('orders').select('status').eq('id', oId).single();
                if (o?.status === 'DELIVERED') return await processRefundOrder(from, oId);
                return await processCancelOrder(from, oId);
            }

            // Handle YES confirmation for cancellation
            if (text === 'yes' || text === 'yes cancel' || text === 'cancel yes') {
                // Check if we have a pending cancel order in memory for this user
                // For now, we'll handle via the button flow above
                return await sendText(from, "📋 Please tap the button above or reply with your Order ID to cancel.\n\nExample: ORD-123456");
            }

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
            // Check for DRAFT orders that need billing or shipping address
            const { data: draft } = await supabase
                .from('orders')
                .select('id, billing_address, shipping_address')
                .eq('customer_phone', from)
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
                
                // Check if we need shipping address
                if (!draft.shipping_address) {
                    console.log(`[WA] Saving shipping address for draft ${draft.id}`);
                    return await handleNewShippingAddress(from, draft.id, message.text.body);
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
                    `📝 *Enter New Billing Address*

` +
                    `Reply with your *billing details* in this format:

` +
                    `*Name, Mobile Number, Full Address*

` +
                    `Example:
_Lakshmi, 9876543210, 12 Main St, Bangalore, 560001_`
                );
            }

            if (id.startsWith('shipping_same_')) {
                const orderId = id.replace('shipping_same_', '');
                return await handleShippingSame(from, orderId);
            }

            if (id.startsWith('shipping_diff_')) {
                const orderId = id.replace('shipping_diff_', '');
                return await sendText(from,
                    `📝 *Enter Shipping Address*

` +
                    `Reply with your *shipping details* in this format:

` +
                    `*Name, Mobile Number, Full Address*

` +
                    `Example:
_Lakshmi, 9876543210, 12 Main St, Bangalore, 560001_`
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
        }

    } catch (e) {
        console.error('Handler Error:', e);
    }
}

