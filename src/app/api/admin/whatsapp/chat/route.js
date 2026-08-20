import { NextResponse } from 'next/server';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { sendImageButtons, sendButtons } from '@/services/whatsappService';

export async function POST(req) {
    try {
        const body = await req.json();
        const { phone, message, mediaUrl, productId } = body;

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }
        if (!message && !mediaUrl) {
            return NextResponse.json({ error: 'Message or media is required' }, { status: 400 });
        }

        const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
        const WHATSAPP_API_URL = 'https://graph.facebook.com/v22.0';

        let cleanPhone = phone.replace(/\s+/g, '').replace('+', '');
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }

        // If we have a product ID, send it as an interactive button message
        if (productId) {
            const buttons = [
                { id: `addcart_${productId}`, title: ' Add to Cart' },
                { id: `menu_cart`, title: ' View Cart' }
            ];

            let result;
            if (mediaUrl) {
                result = await sendImageButtons(cleanPhone, mediaUrl, message || "Check this out!", buttons);
            } else {
                result = await sendButtons(cleanPhone, message || "Check this out!", buttons);
            }
            
            if (result && result.error) {
                return NextResponse.json({ error: result.error.message || result.error }, { status: 500 });
            }
            return NextResponse.json({ success: true, data: result });
        }

        // If it's a text-only message (no product)
        if (!mediaUrl) {
            const result = await sendWhatsAppText(cleanPhone, message);
            if (result.error) {
                return NextResponse.json({ error: result.error }, { status: 500 });
            }
            return NextResponse.json({ success: true, data: result.data });
        }

        // Fallback for image without buttons
        if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
            return NextResponse.json({ error: 'WhatsApp credentials missing' }, { status: 500 });
        }

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
                type: "image",
                image: {
                    link: mediaUrl,
                    caption: message || ""
                }
            })
        });

        const data = await response.json();
        if (data.error) {
            console.error('WhatsApp Image API Error:', data.error);
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('Broadcast API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
