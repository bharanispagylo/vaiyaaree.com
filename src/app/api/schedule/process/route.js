import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// This endpoint processes scheduled posts that are due.
// Call it periodically (e.g., every 5 minutes via a cron job or Vercel Cron).
// GET /api/schedule/process

export async function GET(request) {
    try {
        const now = new Date().toISOString();

        // Find all PENDING posts that are due
        const { data: duePosts, error } = await supabase
            .from('scheduled_posts')
            .select('*')
            .eq('status', 'PENDING')
            .lte('scheduled_at', now)
            .order('scheduled_at', { ascending: true });

        if (error) {
            console.error('[Schedule] DB error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!duePosts || duePosts.length === 0) {
            return NextResponse.json({ message: 'No pending posts', processed: 0 });
        }

        // Get FB config
        const { data: fbData } = await supabase.from('app_settings')
            .select('*')
            .in('key', ['fb_page_id', 'fb_page_access_token']);

        const fbConfig = { pageId: '', accessToken: '' };
        (fbData || []).forEach(item => {
            if (item.key === 'fb_page_id') fbConfig.pageId = item.value;
            if (item.key === 'fb_page_access_token') fbConfig.accessToken = item.value;
        });

        if (!fbConfig.pageId || !fbConfig.accessToken) {
            return NextResponse.json({ error: 'Facebook not configured', processed: 0 }, { status: 400 });
        }

        let postedCount = 0;
        let failedCount = 0;

        for (const post of duePosts) {
            try {
                // Mark as POSTING
                await supabase.from('scheduled_posts').update({ status: 'POSTING' }).eq('id', post.id);

                const shopUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://castprintz.vercel.app';
                const baseCaption = post.caption || `🌸 ${post.product_name}\n\n💰 ₹${(post.product_price || 0).toLocaleString()}\n\n🛍️ Shop: ${shopUrl}`;
                const message = post.hashtags ? `${baseCaption}\n\n${post.hashtags}` : baseCaption;

                const fbUrl = `https://graph.facebook.com/v21.0/${fbConfig.pageId}/photos`;
                const response = await fetch(fbUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: post.product_image,
                        caption: message,
                        access_token: fbConfig.accessToken
                    })
                });

                const data = await response.json();

                if (data.error) {
                    console.error(`[Schedule] FB error for post ${post.id}:`, data.error);
                    await supabase.from('scheduled_posts').update({
                        status: 'FAILED',
                        error_message: data.error.message || 'Facebook API error'
                    }).eq('id', post.id);
                    failedCount++;
                } else {
                    await supabase.from('scheduled_posts').update({
                        status: 'POSTED',
                        fb_post_id: data.id
                    }).eq('id', post.id);
                    postedCount++;
                    console.log(`[Schedule] Posted ${post.id} → FB post ${data.id}`);
                }

                // Small delay between posts to avoid rate limiting
                await new Promise(r => setTimeout(r, 2000));

            } catch (err) {
                console.error(`[Schedule] Error posting ${post.id}:`, err);
                await supabase.from('scheduled_posts').update({
                    status: 'FAILED',
                    error_message: err.message || 'Unknown error'
                }).eq('id', post.id);
                failedCount++;
            }
        }

        return NextResponse.json({
            message: `Processed ${duePosts.length} posts`,
            posted: postedCount,
            failed: failedCount,
            processed: duePosts.length
        });

    } catch (err) {
        console.error('[Schedule] Process error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    return GET(request);
}
