import pool from '../lib/mysql.js';

async function syncReturnImages() {
    console.log('--- SYNCING RETURN IMAGES TABLE IN MYSQL ---');

    try {
        const [returns] = await pool.execute(
            `SELECT id, return_id, customer_photos, photo_urls, created_at FROM return_requests`
        );

        for (const r of returns) {
            let photoArray = [];
            
            // Parse customer_photos JSON if string
            if (typeof r.customer_photos === 'string' && r.customer_photos) {
                try { photoArray = JSON.parse(r.customer_photos); } catch(e) {}
            } else if (Array.isArray(r.customer_photos)) {
                photoArray = r.customer_photos;
            }

            if (photoArray.length === 0 && typeof r.photo_urls === 'string' && r.photo_urls) {
                try { photoArray = JSON.parse(r.photo_urls); } catch(e) {}
            } else if (photoArray.length === 0 && Array.isArray(r.photo_urls)) {
                photoArray = r.photo_urls;
            }

            for (const url of photoArray) {
                if (!url) continue;
                const cleanUrl = typeof url === 'object' ? (url.url || url.image_url) : String(url);
                if (!cleanUrl) continue;

                const [exist] = await pool.execute(
                    `SELECT id FROM return_images WHERE return_request_id = ? AND image_url = ?`,
                    [r.id, cleanUrl]
                );

                if (exist.length === 0) {
                    await pool.execute(
                        `INSERT INTO return_images (return_request_id, image_url, image_type, uploaded_at)
                         VALUES (?, ?, 'customer_photo', ?)`,
                        [r.id, cleanUrl, r.created_at || new Date()]
                    );
                    console.log(`✓ Synced photo for Return ${r.return_id || r.id}: ${cleanUrl.slice(0, 40)}...`);
                }
            }
        }

        const [finalCount] = await pool.execute('SELECT COUNT(*) as count FROM return_images');
        console.log(`\n✅ RETURN_IMAGES TABLE SYNC COMPLETE! Total rows: ${finalCount[0].count}`);

    } catch (err) {
        console.error('❌ Return images sync failed:', err);
    } finally {
        process.exit(0);
    }
}

syncReturnImages();
