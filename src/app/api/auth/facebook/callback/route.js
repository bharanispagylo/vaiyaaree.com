
import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        console.error('Meta Auth Error:', error);
        return NextResponse.redirect(new URL('/admin/facebook?error=' + error, request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/admin/facebook?error=no_code', request.url));
    }

    try {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        // IMPORTANT: redirect_uri MUST match exactly what was sent in the OAuth dialog.
        // The OAuth dialog uses window.location.origin, so we must use the same origin here.
        const requestOrigin = new URL(request.url).origin;
        const redirectUri = `${requestOrigin}/api/auth/facebook/callback`;

        // 1. Exchange code for Short-lived User Token
        const tokenRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`);
        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            console.error('FB Token Error:', tokenData.error);
            return NextResponse.redirect(new URL('/admin/facebook?error=token_exchange_failed', request.url));
        }

        const shortLivedToken = tokenData.access_token;

        // 2. Exchange for Long-lived User Token (60 days)
        const longLivedRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
        const longLivedData = await longLivedRes.json();
        const userToken = longLivedData.access_token;

        // 3. Get User's Pages and Page Access Tokens
        const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
        const pagesData = await pagesRes.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            return NextResponse.redirect(new URL('/admin/facebook?error=no_pages_found', request.url));
        }

        // For now, we'll store the first page's info or allow user to pick.
        // We'll store the full pages JSON in app_settings for now so the UI can let them choose.
        await mysqlClient.from('app_settings').upsert([
            { key: 'fb_user_access_token', value: userToken },
            { key: 'fb_available_pages', value: JSON.stringify(pagesData.data) }
        ]);

        return NextResponse.redirect(new URL('/admin/facebook?success=connected', request.url));

    } catch (err) {
        console.error('Callback Logic Error:', err);
        return NextResponse.redirect(new URL('/admin/facebook?error=internal_error', request.url));
    }
}
