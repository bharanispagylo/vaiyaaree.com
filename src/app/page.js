'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mysqlClient } from '@/lib/mysqlClient';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';
import ComingSoonPage from '@/components/ComingSoonPage';
import HomepageSectionDispatcher from '@/components/home-sections';
import { HorizontalRangoliBorder } from '@/components/RangoliDecorations';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function HomePage() {
    const router = useRouter();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comingSoonSettings, setComingSoonSettings] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [exploreProducts, setExploreProducts] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [sectionsConfig, setSectionsConfig] = useState([]);
    const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                // 1. Check Coming Soon mode FIRST
                const { data: csData } = await mysqlClient
                    .from('app_settings')
                    .select('key, value')
                    .in('key', [
                        'coming_soon_enabled',
                        'coming_soon_title',
                        'coming_soon_subtitle',
                        'coming_soon_launch_date',
                        'coming_soon_phone',
                        'coming_soon_email',
                        'coming_soon_whatsapp',
                        'coming_soon_instagram',
                        'coming_soon_facebook',
                        'shop_logo',
                        'shop_name'
                    ]);

                if (csData) {
                    const csMap = {};
                    csData.forEach(item => { csMap[item.key] = item.value; });
                    if (csMap.coming_soon_enabled === 'true' || csMap.coming_soon_enabled === '1' || csMap.coming_soon_enabled === true) {
                        setComingSoonSettings({
                            enabled: true,
                            title: csMap.coming_soon_title || 'We Are Weaving Something Extraordinary',
                            subtitle: csMap.coming_soon_subtitle || 'Experience the timeless grace of authentic handloom silk & cotton sarees. Our grand digital boutique is opening soon.',
                            launch_date: csMap.coming_soon_launch_date || '',
                            phone: csMap.coming_soon_phone || '8667793292',
                            email: csMap.coming_soon_email || 'vaiyaaree@gmail.com',
                            whatsapp: csMap.coming_soon_whatsapp || '8667793292',
                            instagram: csMap.coming_soon_instagram || '',
                            facebook: csMap.coming_soon_facebook || '',
                            logo: csMap.shop_logo || '/images/vaiyaaree-logo.png',
                            shop_name: csMap.shop_name || 'Vaiyaaree Sarees'
                        });
                    } else {
                        setComingSoonSettings(null);
                    }
                }

                // 2. Fetch Homepage Sections from `homepage_sections` table
                try {
                    const res = await fetch(`/api/admin/homepage-builder?_t=${Date.now()}`, {
                        cache: 'no-store',
                        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
                    });
                    const json = await res.json();
                    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                        const activeOnly = json.data.filter(s => s.is_enabled === true || s.is_enabled === 1);
                        setSectionsConfig(activeOnly);
                    } else {
                        const { data: dbSecs } = await mysqlClient
                            .from('homepage_sections')
                            .select('*')
                            .eq('is_enabled', true)
                            .order('display_order', { ascending: true });

                        if (dbSecs && dbSecs.length > 0) {
                            const parsed = dbSecs.map(s => {
                                let sett = {};
                                if (s.settings) {
                                    try {
                                        sett = typeof s.settings === 'string' ? JSON.parse(s.settings) : s.settings;
                                    } catch (e) {
                                        sett = {};
                                    }
                                }
                                return { ...s, settings: sett };
                            });
                            setSectionsConfig(parsed);
                        }
                    }
                } catch (secErr) {
                    console.error('Homepage sections fetch error:', secErr);
                }

                // 3. Fetch CMS Page & Store Data
                try {
                    const { data: cmsData } = await mysqlClient
                        .from('cms_pages')
                        .select('*')
                        .eq('slug', 'home')
                        .single();

                    if (cmsData) {
                        setPage(cmsData);
                        if (typeof document !== 'undefined') {
                            document.title = `${cmsData.seo_title || cmsData.title} | Vaiyaaree`;
                        }
                    } else {
                        setPage({ title: 'Vaiyaaree Sarees', custom_css: '' });
                    }
                } catch (cmsErr) {
                    setPage({ title: 'Vaiyaaree Sarees', custom_css: '' });
                }

                // 4. Fetch Products & Categories
                try {
                    const { data: prods } = await mysqlClient
                        .from('products')
                        .select('*')
                        .eq('is_active', true)
                        .order('created_at', { ascending: false })
                        .order('id', { ascending: false });

                    if (prods && prods.length > 0) {
                        const getSortKey = (p) => {
                            let time = 0;
                            if (p.created_at) {
                                const parsed = typeof p.created_at === 'number' ? p.created_at : new Date(p.created_at).getTime();
                                if (!isNaN(parsed) && parsed > 0) time = parsed;
                            }
                            if (time === 0 && p.updated_at) {
                                const parsed = typeof p.updated_at === 'number' ? p.updated_at : new Date(p.updated_at).getTime();
                                if (!isNaN(parsed) && parsed > 0) time = parsed;
                            }
                            let num = 0;
                            if (p.product_no !== undefined && p.product_no !== null && !isNaN(Number(p.product_no))) {
                                num = Number(p.product_no);
                            } else if (p.sku && !isNaN(Number(p.sku))) {
                                num = Number(p.sku);
                            } else if (p.id) {
                                const digits = Number(String(p.id).replace(/\D/g, ''));
                                if (!isNaN(digits) && digits > 0) num = digits;
                            }
                            return { time, num, id: String(p.id || '') };
                        };

                        const sortedProds = [...prods].sort((a, b) => {
                            const keyA = getSortKey(a);
                            const keyB = getSortKey(b);
                            if (keyB.time !== keyA.time) return keyB.time - keyA.time;
                            if (keyB.num !== keyA.num) return keyB.num - keyA.num;
                            return keyB.id.localeCompare(keyA.id);
                        });

                        setAllProducts(sortedProds);

                        const featured = sortedProds.filter(p => p.is_featured === 1 || p.is_featured === true);
                        setFeaturedProducts(featured.length > 0 ? featured : sortedProds.slice(0, 8));

                        const explore = sortedProds.filter(p => p.product_group === 'EXPLORE');
                        setExploreProducts(explore.length > 0 ? explore : sortedProds.slice(0, 8));

                        const uniqueCats = [];
                        const catMap = new Map();
                        const catCountMap = new Map();
                        for (const p of prods) {
                            if (p.category) {
                                catCountMap.set(p.category, (catCountMap.get(p.category) || 0) + 1);
                                if (!catMap.has(p.category)) {
                                    const rawImg = p.image_url ? p.image_url.split(',')[0].trim() : '';
                                    catMap.set(p.category, rawImg || '/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg');
                                }
                            }
                        }
                        for (const [name, image] of catMap.entries()) {
                            uniqueCats.push({
                                name,
                                image,
                                count: catCountMap.get(name) || 0
                            });
                        }
                        setAllCategories(uniqueCats.slice(0, 6)); // Top 6 categories
                    }
                } catch (prodErr) {
                    console.error('Products Fetch Error:', prodErr);
                }
            } catch (err) {
                console.error('Home Page Data Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [router]);

    if (loading) return null;
    if (comingSoonSettings?.enabled) {
        return <ComingSoonPage settings={comingSoonSettings} />;
    }

    // Default fallback order if database has no active records
    const fallbackDefaultSections = [
        { id: 'sec_hero_banner', section_type: 'hero_banner' },
        { id: 'sec_best_sellers', section_type: 'best_sellers' },
        { id: 'sec_explore_collection', section_type: 'explore_collection' },
        { id: 'sec_shop_by_category', section_type: 'shop_by_category' },
        { id: 'sec_brand_story', section_type: 'brand_story' },
        { id: 'sec_craftsmanship_story', section_type: 'craftsmanship_story' },
        { id: 'sec_whatsapp_shopping', section_type: 'whatsapp_shopping' },
        { id: 'sec_gallery_popup', section_type: 'gallery_popup' },
        { id: 'sec_feature_perks', section_type: 'feature_perks' }
    ];

    let activeSectionsToRender = (sectionsConfig && sectionsConfig.length > 0)
        ? [...sectionsConfig]
        : fallbackDefaultSections;

    // Guarantee Brand Story 50-50 Section is present if not already in DB list
    if (!activeSectionsToRender.some(s => s.section_type === 'brand_story' || s.section_type === 'logo_with_text')) {
        const insertIdx = activeSectionsToRender.findIndex(s => s.section_type === 'shop_by_category');
        const brandSec = { id: 'sec_brand_story', section_type: 'brand_story' };
        if (insertIdx !== -1) {
            activeSectionsToRender.splice(insertIdx + 1, 0, brandSec);
        } else {
            activeSectionsToRender.push(brandSec);
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#fdfbf7', fontFamily: 'var(--font-roboto), sans-serif', color: '#2b2623' }}>
            <style dangerouslySetInnerHTML={{ __html: page?.custom_css || '' }} />
            <ShopHeader />

            {/* CMS Custom Page Content (Reflects Admin CMS Page Builder Edits) */}
            {page?.content && page.content.trim() && (
                <div style={{ background: '#ffffff', borderBottom: '1px solid #f0e6df', padding: '2rem 1.5rem' }}>
                    <div 
                        className="cms-content-wrapper" 
                        style={{ maxWidth: '1300px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.7 }} 
                        dangerouslySetInnerHTML={{ __html: page.content }} 
                    />
                </div>
            )}

            {/* Render all active sections dynamically via modular dispatcher */}
            {activeSectionsToRender.map(sec => (
                <HomepageSectionDispatcher
                    key={sec.id}
                    sec={sec}
                    allProducts={allProducts}
                    featuredProducts={featuredProducts}
                    exploreProducts={exploreProducts}
                    allCategories={allCategories}
                    onOpenGalleryImage={setSelectedGalleryImage}
                />
            ))}

            {/* Horizontal Rangoli Strip above Footer */}
            <HorizontalRangoliBorder height={54} color="#d47a06" accentColor="#a06650" />

            <ShopFooter />

            {/* Modal for Zoomed Gallery Lightbox Popup */}
            {selectedGalleryImage && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
                        animation: 'fadeIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)',
                        padding: '1.5rem'
                    }}
                    onClick={() => setSelectedGalleryImage(null)}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <button
                            style={{
                                position: 'absolute', top: '-40px', right: '-40px', background: 'none', border: 'none',
                                color: '#ffffff', fontSize: '3rem', cursor: 'pointer', fontWeight: 200, padding: '10px',
                                fontFamily: 'var(--font-roboto), sans-serif'
                            }}
                            onClick={(e) => { e.stopPropagation(); setSelectedGalleryImage(null); }}
                            aria-label="Close zoomed image"
                        >
                            &times;
                        </button>
                        <img
                            src={selectedGalleryImage}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.15)' }}
                            alt="Zoomed saree showcase"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            <style>{`
                .gallery-swiper-container .swiper-button-next,
                .gallery-swiper-container .swiper-button-prev {
                    color: #a06650;
                    background: rgba(253, 251, 247, 0.95);
                    border: 1px solid rgba(212, 122, 6, 0.35);
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    box-shadow: 0 8px 20px rgba(43, 38, 35, 0.12);
                    transition: all 0.3s ease;
                }
                .gallery-swiper-container .swiper-button-next:hover,
                .gallery-swiper-container .swiper-button-prev:hover {
                    background: #a06650;
                    color: #fdf6e7;
                    border-color: #d47a06;
                    transform: scale(1.08);
                }
                .gallery-swiper-container .swiper-button-next:after,
                .gallery-swiper-container .swiper-button-prev:after {
                    font-size: 1.1rem;
                    font-weight: 900;
                }
                .gallery-swiper-container .swiper-pagination-bullet-active {
                    background: #d47a06 !important;
                    width: 24px !important;
                    border-radius: 8px !important;
                }
                .gallery-item-hover:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 16px 36px rgba(160, 102, 80, 0.2) !important;
                    border-color: #d47a06 !important;
                }
                @keyframes fadeIn { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
}
