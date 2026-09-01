import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Ensure the table exists in MySQL database
 */
async function ensureTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS homepage_sections (
            id VARCHAR(64) PRIMARY KEY,
            section_key VARCHAR(64) NOT NULL,
            section_type VARCHAR(64) NOT NULL,
            title VARCHAR(255) DEFAULT '',
            subtitle TEXT DEFAULT NULL,
            badge_text VARCHAR(128) DEFAULT NULL,
            display_order INT DEFAULT 0,
            is_enabled TINYINT(1) DEFAULT 1,
            settings JSON DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
}

/**
 * GET - Fetch all homepage sections ordered by display_order
 */
export async function GET(req) {
    try {
        await ensureTable();

        const [rows] = await query(`
            SELECT * FROM homepage_sections
            ORDER BY display_order ASC, id ASC
        `);

        // If no sections in DB yet, initialize defaults
        if (!rows || rows.length === 0) {
            const defaultSections = [
                {
                    id: 'sec_hero_banner',
                    section_key: 'hero_banner',
                    section_type: 'hero_banner',
                    title: 'Exclusive Weaves & Silks',
                    subtitle: 'Celebrate Love with Timeless Handwoven Elegance',
                    badge_text: 'EXCLUSIVE WEAVES & SILKS',
                    display_order: 1,
                    is_enabled: 1,
                    settings: JSON.stringify({
                        slides: [
                            {
                                title: "Wedding & Festive Collection",
                                subtitle: "Celebrate Love with Timeless Handwoven Elegance",
                                image: "/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg",
                                button_text: "SHOP NOW",
                                button_link: "/shop?category=Silk"
                            },
                            {
                                title: "Authentic Kanjivaram Pure Silks",
                                subtitle: "Woven by Master Artisans with Pure Zari Borders",
                                image: "/uploads/media/without-watermark/CAT-34H8O_1780639251590.jpg",
                                button_text: "SHOP NOW",
                                button_link: "/shop"
                            },
                            {
                                title: "Everyday Comfort Soft Linen Cottons",
                                subtitle: "Lightweight, Breathable & Graceful Weaves",
                                image: "/uploads/media/without-watermark/CAT-RPX8M_1780639172860.jpg",
                                button_text: "SHOP NOW",
                                button_link: "/shop"
                            }
                        ],
                        auto_play_interval: 5000
                    })
                },
                {
                    id: 'sec_best_sellers',
                    section_key: 'best_sellers',
                    section_type: 'best_sellers',
                    title: 'Best Sellers',
                    subtitle: 'Explore our most loved handcrafted sarees chosen by patrons worldwide',
                    badge_text: 'TRENDING SELECTIONS',
                    display_order: 2,
                    is_enabled: 1,
                    settings: JSON.stringify({ limit: 8, auto_scroll: true, scroll_interval: 5000 })
                },
                {
                    id: 'sec_explore_collection',
                    section_key: 'explore_collection',
                    section_type: 'explore_collection',
                    title: 'Explore Our Weaves',
                    subtitle: 'Handpicked sarees showcasing the finest South Indian artistry',
                    badge_text: 'HANDPICKED SELECTIONS',
                    display_order: 3,
                    is_enabled: 1,
                    settings: JSON.stringify({ limit: 8, group_filter: 'EXPLORE', auto_scroll: true, scroll_interval: 6000 })
                },
                {
                    id: 'sec_featured_slider',
                    section_key: 'featured_product_slider',
                    section_type: 'featured_product_slider',
                    title: 'Featured Collection',
                    subtitle: 'Special handpicked silk & designer weaves for the festive season',
                    badge_text: 'CURATED PICKS',
                    display_order: 4,
                    is_enabled: 1,
                    settings: JSON.stringify({ limit: 10, auto_play_delay: 4000 })
                },
                {
                    id: 'sec_all_product_slider',
                    section_key: 'all_product_slider',
                    section_type: 'all_product_slider',
                    title: 'Latest Additions',
                    subtitle: 'Fresh arrivals crafted with unmatched precision and pure elegance',
                    badge_text: 'NEW ARRIVALS',
                    display_order: 5,
                    is_enabled: 1,
                    settings: JSON.stringify({ limit: 12, auto_play_delay: 4500 })
                },
                {
                    id: 'sec_shop_by_category',
                    section_key: 'shop_by_category',
                    section_type: 'shop_by_category',
                    title: 'Shop by Category',
                    subtitle: 'Explore handcrafted weaves, rich silks, and everyday elegance in our exclusive saree ranges.',
                    badge_text: 'CURATED WEAVES',
                    display_order: 6,
                    is_enabled: 1,
                    settings: JSON.stringify({ limit: 6, columns: 3 })
                },
                {
                    id: 'sec_brand_story',
                    section_key: 'brand_story',
                    section_type: 'brand_story',
                    title: 'The Sacred Thread of Indian Grace',
                    subtitle: 'Born from the timeless loom traditions of South India, Vaiyaaree crafts pure handloom silk sarees that celebrate heritage, femininity, and exquisite artisan devotion.',
                    badge_text: 'OUR HERITAGE & IDENTITY',
                    display_order: 7,
                    is_enabled: 1,
                    settings: JSON.stringify({
                        logo_image: '/images/vaiyaaree-logo.png',
                        button_text: 'EXPLORE OUR CATALOG',
                        button_link: '/shop'
                    })
                },
                {
                    id: 'sec_image_and_text',
                    section_key: 'image_and_text',
                    section_type: 'image_and_text',
                    title: 'Pure Zari & Handcrafted Perfection',
                    subtitle: 'Each saree in our collection takes up to 45 days of painstaking loom work by generational weavers, creating heirlooms that stay timeless across generations.',
                    badge_text: 'WEAVER SPOTLIGHT',
                    display_order: 7,
                    is_enabled: 1,
                    settings: JSON.stringify({
                        image_url: '/uploads/media/without-watermark/CAT-XZ8NL_1780639099964.jpg',
                        button_text: 'READ WEAVER STORY',
                        button_link: '/shop',
                        image_aspect_ratio: '4/3'
                    })
                },
                {
                    id: 'sec_text_and_image',
                    section_key: 'text_and_image',
                    section_type: 'text_and_image',
                    title: 'Bespoke Custom Blouse & Fall Stitching',
                    subtitle: 'Get your saree delivered pre-stitched with matching fall, pico, and custom-tailored designer blouses crafted to your exact fit.',
                    badge_text: 'EXCLUSIVE SERVICES',
                    display_order: 8,
                    is_enabled: 1,
                    settings: JSON.stringify({
                        image_url: '/uploads/media/without-watermark/CAT-AMB6I_1780639015058.jpg',
                        button_text: 'EXPLORE SERVICES',
                        button_link: '/shop',
                        image_aspect_ratio: '4/3'
                    })
                },
                {
                    id: 'sec_craftsmanship_story',
                    section_key: 'craftsmanship_story',
                    section_type: 'craftsmanship_story',
                    title: 'Authentic Weaves, Timeless Grace',
                    subtitle: 'Vaiyaaree brings you authentic handloom weaves straight from master artisans in South India. Discover rich silk sarees, soft cotton prints, and designer festive drapes tailored for every occasion.',
                    badge_text: 'HERITAGE & CRAFTSMANSHIP',
                    display_order: 9,
                    is_enabled: 1,
                    settings: JSON.stringify({
                        image_url: '/uploads/media/without-watermark/CAT-HSZ16_1780638581090.jpg',
                        button_text: 'EXPLORE CATALOG',
                        button_link: '/shop'
                    })
                },
                {
                    id: 'sec_whatsapp_shopping',
                    section_key: 'whatsapp_shopping',
                    section_type: 'whatsapp_shopping',
                    title: 'Shop via WhatsApp',
                    subtitle: 'Connect directly with our saree experts, view live fabric photos, and place your order seamlessly via chat.',
                    badge_text: 'PERSONALIZED SHOPPING',
                    display_order: 10,
                    is_enabled: 1,
                    settings: JSON.stringify({
                        phone: '8667793292',
                        features: ['Direct Fabric & Video Preview', 'Quick Order Confirmation & Tracking'],
                        show_qr: true
                    })
                },
                {
                    id: 'sec_gallery_popup',
                    section_key: 'gallery_popup',
                    section_type: 'gallery_popup',
                    title: 'Our Collection Gallery',
                    subtitle: 'Click any photo to zoom in and preview the fine intricate weave patterns in high definition.',
                    badge_text: 'CUSTOMER SHOWCASE',
                    display_order: 11,
                    is_enabled: 1,
                    settings: JSON.stringify({
                        enable_popup: true,
                        auto_play: true,
                        auto_play_delay: 3500,
                        images: [
                            '/uploads/media/without-watermark/CAT-34H8O_1780639251590.jpg',
                            '/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg',
                            '/uploads/media/without-watermark/CAT-RPX8M_1780639172860.jpg',
                            '/uploads/media/without-watermark/CAT-XZ8NL_1780639099964.jpg',
                            '/uploads/media/without-watermark/CAT-AMB6I_1780639015058.jpg',
                            '/uploads/media/without-watermark/CAT-HSZ16_1780638581090.jpg',
                            '/uploads/media/without-watermark/CAT-25RUK_1780638448395.jpg'
                        ]
                    })
                },
                {
                    id: 'sec_feature_perks',
                    section_key: 'feature_perks',
                    section_type: 'feature_perks',
                    title: 'Why Choose Vaiyaaree',
                    subtitle: 'Our commitment to authentic quality, trust, and exceptional service',
                    badge_text: 'OUR PROMISE',
                    display_order: 12,
                    is_enabled: 1,
                    settings: JSON.stringify({
                        perks: [
                            { icon: 'Truck', title: "Free Shipping Nationwide", desc: "Completely free delivery across India" },
                            { icon: 'Sparkles', title: "100% Authentic Handcraft", desc: "Direct from master weavers in Coimbatore" },
                            { icon: 'MessageSquare', title: "WhatsApp Direct Order", desc: "Chat, view live fabrics & order via WhatsApp" },
                            { icon: 'ShieldCheck', title: "Guaranteed Quality & Care", desc: "Hassle-free 10-day return & exchange window" }
                        ]
                    })
                }
            ];

            for (const s of defaultSections) {
                await query(`
                    INSERT INTO homepage_sections (id, section_key, section_type, title, subtitle, badge_text, display_order, is_enabled, settings)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        title = VALUES(title),
                        subtitle = VALUES(subtitle),
                        badge_text = VALUES(badge_text),
                        display_order = VALUES(display_order),
                        is_enabled = VALUES(is_enabled),
                        settings = VALUES(settings)
                `, [s.id, s.section_key, s.section_type, s.title, s.subtitle, s.badge_text, s.display_order, s.is_enabled, s.settings]);
            }

            const [freshRows] = await query(`SELECT * FROM homepage_sections ORDER BY display_order ASC, id ASC`);
            const parsedData = freshRows.map(row => {
                let sett = {};
                if (row.settings) {
                    try {
                        sett = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
                    } catch (e) {
                        sett = {};
                    }
                }
                return {
                    ...row,
                    is_enabled: row.is_enabled === 1 || row.is_enabled === true,
                    settings: sett
                };
            });

            return NextResponse.json({ success: true, data: parsedData });
        }

        const parsedData = rows.map(row => {
            let sett = {};
            if (row.settings) {
                try {
                    sett = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
                } catch (e) {
                    sett = {};
                }
            }
            return {
                ...row,
                is_enabled: row.is_enabled === 1 || row.is_enabled === true,
                settings: sett
            };
        });

        return NextResponse.json({ success: true, data: parsedData });
    } catch (error) {
        console.error('Homepage Builder GET Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST - Save reordered, modified, or new sections
 */
export async function POST(req) {
    try {
        await ensureTable();
        const body = await req.json();
        const { sections } = body;

        if (!Array.isArray(sections)) {
            return NextResponse.json({ success: false, error: 'Invalid sections array payload.' }, { status: 400 });
        }

        const currentIds = sections.map(s => s.id).filter(Boolean);

        if (currentIds.length > 0) {
            const placeholders = currentIds.map(() => '?').join(',');
            await query(`DELETE FROM homepage_sections WHERE id NOT IN (${placeholders})`, currentIds);
        }

        for (let index = 0; index < sections.length; index++) {
            const s = sections[index];
            const orderNum = index + 1;
            const settingsStr = typeof s.settings === 'object' ? JSON.stringify(s.settings) : (s.settings || '{}');
            const isEnabledVal = (s.is_enabled === true || s.is_enabled === 1) ? 1 : 0;

            await query(`
                INSERT INTO homepage_sections (id, section_key, section_type, title, subtitle, badge_text, display_order, is_enabled, settings)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    section_key = VALUES(section_key),
                    section_type = VALUES(section_type),
                    title = VALUES(title),
                    subtitle = VALUES(subtitle),
                    badge_text = VALUES(badge_text),
                    display_order = VALUES(display_order),
                    is_enabled = VALUES(is_enabled),
                    settings = VALUES(settings)
            `, [
                s.id || `sec_${Date.now()}_${index}`,
                s.section_key || s.section_type || 'section',
                s.section_type,
                s.title || '',
                s.subtitle || null,
                s.badge_text || null,
                orderNum,
                isEnabledVal,
                settingsStr
            ]);
        }

        return NextResponse.json({ success: true, message: 'Homepage builder layout successfully updated.' });
    } catch (error) {
        console.error('Homepage Builder POST Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE - Remove a specific section by ID or reset all
 */
export async function DELETE(req) {
    try {
        await ensureTable();
        const { searchParams } = new URL(req.url);
        const sectionId = searchParams.get('id');
        const resetDefaults = searchParams.get('reset_defaults');

        if (resetDefaults === 'true') {
            await query(`DELETE FROM homepage_sections`);
            return NextResponse.json({ success: true, message: 'Homepage layout reset to defaults.' });
        }

        if (!sectionId) {
            return NextResponse.json({ success: false, error: 'Section ID is required for deletion.' }, { status: 400 });
        }

        await query(`DELETE FROM homepage_sections WHERE id = ?`, [sectionId]);

        return NextResponse.json({ success: true, message: 'Section removed successfully.' });
    } catch (error) {
        console.error('Homepage Builder DELETE Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
