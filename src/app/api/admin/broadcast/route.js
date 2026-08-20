import { NextResponse } from 'next/server';
import { sendRawMessage } from '@/services/whatsappService';

// Admin Broadcast Route - Handles sending bulk messages to customers
// v3.0 - Product image + Shop Now + Add to Cart buttons

export async function POST(req) {
    try {
        const { to, product, message, shopUrl, addToCartUrl } = await req.json();

        if (!to) return NextResponse.json({ error: 'Recipient required' }, { status: 400 });

        let payload;

        if (product && product.image_url) {
            //  Message 1: Product Image + "Add to Cart" button 
            // Send product image with details and Add to Cart CTA
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "interactive",
                interactive: {
                    type: "cta_url",
                    header: {
                        type: "image",
                        image: { link: product.image_url }
                    },
                    body: {
                        text: `*${product.name}*\n Price: ₹${(product.price || 0).toLocaleString()}\n\n${message}`
                    },
                    footer: { text: "Vaiyaaree • Exclusive Collection" },
                    action: {
                        name: "cta_url",
                        parameters: {
                            display_text: " Add to Cart",
                            url: addToCartUrl || shopUrl
                        }
                    }
                }
            };

            await sendRawMessage(to, payload);

            //  Message 2: "Shop Now" button to browse the full store 
            await sendRawMessage(to, {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "interactive",
                interactive: {
                    type: "cta_url",
                    body: { text: " Browse our full collection:" },
                    action: {
                        name: "cta_url",
                        parameters: {
                            display_text: " Shop Now",
                            url: shopUrl
                        }
                    }
                }
            });
        } else {
            // Text only message — general broadcast without product
            payload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "interactive",
                interactive: {
                    type: "cta_url",
                    body: {
                        text: `${message}\n\n Tap below to explore our collection!`
                    },
                    footer: { text: "Vaiyaaree • Premium Ethnic Wear" },
                    action: {
                        name: "cta_url",
                        parameters: {
                            display_text: " Shop Now",
                            url: shopUrl
                        }
                    }
                }
            };
            await sendRawMessage(to, payload);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Broadcast failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
