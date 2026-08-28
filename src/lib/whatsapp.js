const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_PHONE_ID = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const WHATSAPP_TOKEN = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();

export function isValidPublicUrl(value) {
    if (!value || typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) return false;
    try {
        const url = new URL(trimmed);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function toPublicImageUrl(imagePath) {
    if (!imagePath || typeof imagePath !== 'string') return '';
    let trimmed = imagePath.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return isValidPublicUrl(trimmed) ? trimmed : '';
    }
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
    if (appUrl && (appUrl.startsWith('http://') || appUrl.startsWith('https://')) && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
        const pathPart = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        const fullUrl = `${appUrl}${pathPart}`;
        return isValidPublicUrl(fullUrl) ? fullUrl : '';
    }
    return '';
}

export async function sendWhatsAppText(to, text) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.log(`[WHATSAPP-LOG-ONLY] To: ${to} | Message: ${text.substring(0, 60)}...`);
        return { success: true, isLoggedOnly: true, message: 'WhatsApp credentials not set - logged only' };
    }

    // Clean phone number (remove +, spaces, ensure it has 91 prefix for India if not present)
    let cleanPhone = to.replace(/\s+/g, '').replace('+', '');
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }

    try {
        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: cleanPhone,
                type: "text",
                text: { body: text }
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error('WhatsApp API Error:', data.error);
            return { error: data.error.message };
        }
        return { success: true, data };
    } catch (error) {
        console.error('WhatsApp send failed:', error);
        return { error: 'Internal server error while sending WhatsApp message' };
    }
}

export async function sendWhatsAppTemplate(to, templateName, components = []) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        return { error: 'WhatsApp configuration missing' };
    }

    let cleanPhone = to.replace(/\s+/g, '').replace('+', '');
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }

    try {
        const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: "en_US" },
                    components
                }
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('WhatsApp template send failed:', error);
        return { error: error.message };
    }
}
