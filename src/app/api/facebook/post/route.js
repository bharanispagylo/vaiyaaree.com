
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { imageUrl, name, price, description, hashtags, pageId, accessToken } = await request.json();

        if (!imageUrl || !pageId || !accessToken) {
            return NextResponse.json({ error: 'Missing required Facebook parameters' }, { status: 400 });
        }

        const shopUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vaiyaaree.vercel.app';
        const baseCaption = description || ` New Arrival: ${name}\n\nPrice: ₹${(price || 0).toLocaleString()}\n\nShop now: ${shopUrl}`;
        const message = hashtags ? `${baseCaption}\n\n${hashtags}` : baseCaption;

        const fbUrl = `https://graph.facebook.com/v21.0/${pageId}/photos`;

        const response = await fetch(fbUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: imageUrl,
                caption: message,
                access_token: accessToken
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Facebook API Error:', data.error);
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, postId: data.id });

    } catch (error) {
        console.error('FB Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
