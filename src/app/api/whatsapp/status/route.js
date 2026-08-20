import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
        const token = (process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

        const status = {
            hasPhoneId: !!phoneId,
            hasToken: !!token,
            hasVerifyToken: !!verifyToken,
            appUrl,
            metaApiTest: null,
            recommendation: []
        };

        if (phoneId && token) {
            try {
                const metaRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const metaData = await metaRes.json();
                
                if (metaRes.ok) {
                    status.metaApiTest = {
                        success: true,
                        displayPhoneNumber: metaData.display_phone_number,
                        verifiedName: metaData.verified_name,
                        qualityRating: metaData.quality_rating
                    };
                } else {
                    const errCode = metaData.error?.code;
                    const errMessage = metaData.error?.message;
                    status.metaApiTest = {
                        success: false,
                        errorCode: errCode,
                        errorMessage: errMessage
                    };

                    if (errCode === 190 || metaRes.status === 401) {
                        status.recommendation.push(' EXPIRED META ACCESS TOKEN: Generate a new WHATSAPP_ACCESS_TOKEN in Meta Developer Console -> WhatsApp -> API Setup and update .env');
                    } else if (errCode === 131030) {
                        status.recommendation.push(' RECIPIENT NOT IN ALLOWED LIST: Add your recipient phone number to the "To" test number list in Meta Console.');
                    }
                }
            } catch (err) {
                status.metaApiTest = { success: false, error: err.message };
            }
        } else {
            status.recommendation.push(' Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in .env file.');
        }

        if (!appUrl || appUrl.includes('localhost')) {
            status.recommendation.push(' Webhook URL should be an HTTPS tunnel (e.g. ngrok or Cloudflare tunnel) so Meta can reach your server.');
        }

        return NextResponse.json(status);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
