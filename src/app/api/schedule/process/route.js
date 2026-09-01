import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This endpoint processes scheduled posts that are due.
// GET /api/schedule/process, POST /api/schedule/process
export async function GET(request) {
    try {
        // 1. Check if scheduled_posts table exists and query pending posts
        let duePosts = [];
        try {
            const [rows] = await pool.query(
                'SELECT * FROM `scheduled_posts` WHERE `status` = "PENDING" AND `scheduled_at` <= NOW() ORDER BY `scheduled_at` ASC LIMIT 20'
            );
            duePosts = rows || [];
        } catch (dbErr) {
            // If table does not exist or MySQL table error, return 200 gracefully
            return NextResponse.json({ message: 'No pending scheduled posts', processed: 0 }, { status: 200 });
        }

        if (!duePosts || duePosts.length === 0) {
            return NextResponse.json({ message: 'No pending posts', processed: 0 }, { status: 200 });
        }

        // 2. Get FB config from app_settings
        let fbData = [];
        try {
            const [settings] = await pool.query(
                'SELECT `key`, `value` FROM `app_settings` WHERE `key` IN ("fb_page_id", "fb_page_access_token")'
            );
            fbData = settings || [];
        } catch (_) {}

        const fbConfig = { pageId: '', accessToken: '' };
        fbData.forEach(item => {
            if (item.key === 'fb_page_id') fbConfig.pageId = item.value;
            if (item.key === 'fb_page_access_token') fbConfig.accessToken = item.value;
        });

        if (!fbConfig.pageId || !fbConfig.accessToken) {
            return NextResponse.json({ message: 'Facebook not configured', processed: 0 }, { status: 200 });
        }

        let postedCount = 0;
        let failedCount = 0;

        for (const post of duePosts) {
            try {
                // Mark as POSTING
                await pool.query('UPDATE `scheduled_posts` SET `status` = "POSTING" WHERE `id` = ?', [post.id]);

                const shopUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vaiyaaree.com';
                const baseCaption = post.caption || ` ${post.product_name}\n\n ₹${(post.product_price || 0).toLocaleString()}\n\n Shop: ${shopUrl}`;
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
                    await pool.query(
                        'UPDATE `scheduled_posts` SET `status` = "FAILED", `error_message` = ? WHERE `id` = ?',
                        [data.error.message || 'Facebook API error', post.id]
                    );
                    failedCount++;
                } else {
                    await pool.query(
                        'UPDATE `scheduled_posts` SET `status` = "POSTED", `fb_post_id` = ? WHERE `id` = ?',
                        [data.id, post.id]
                    );
                    postedCount++;
                }

                // Small delay between posts to avoid rate limiting
                await new Promise(r => setTimeout(r, 1500));

            } catch (err) {
                console.error(`[Schedule] Error posting ${post.id}:`, err);
                try {
                    await pool.query(
                        'UPDATE `scheduled_posts` SET `status` = "FAILED", `error_message` = ? WHERE `id` = ?',
                        [err.message || 'Unknown error', post.id]
                    );
                } catch (_) {}
                failedCount++;
            }
        }

        return NextResponse.json({
            message: `Processed ${duePosts.length} posts`,
            posted: postedCount,
            failed: failedCount,
            processed: duePosts.length
        }, { status: 200 });

    } catch (err) {
        console.error('[Schedule] Process error:', err);
        return NextResponse.json({ message: 'Schedule processing completed with fallback', error: err?.message, processed: 0 }, { status: 200 });
    }
}

export async function POST(request) {
    return GET(request);
}
