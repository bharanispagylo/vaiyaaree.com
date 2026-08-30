'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mysqlClient } from '@/lib/mysqlClient';
import { Mail, Phone, MapPin, ArrowLeft, ArrowRight, MessageSquare, Check, Truck, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getProductUrl } from '@/lib/productUrl';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';
import WhatsAppMockup from '@/components/WhatsAppMockup';
import ComingSoonPage from '@/components/ComingSoonPage';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function HomePage() {
    const router = useRouter();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comingSoonSettings, setComingSoonSettings] = useState(null);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [exploreProducts, setExploreProducts] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [heroSliderImages, setHeroSliderImages] = useState([
        'https://images.unsplash.com/photo-1610030469983-98e550d6153c?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1583391733958-d25974644ed1?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1621644820935-46b7a0808e04?q=80&w=2000&auto=format&fit=crop'
    ]);
    const [galleryImages, setGalleryImages] = useState([
        'https://images.unsplash.com/photo-1583391733958-d25974644ed1?w=800&q=80',
        'https://images.unsplash.com/photo-1610030469983-98e550d6153c?w=800&q=80',
        'https://images.unsplash.com/photo-1621644820935-46b7a0808e04?w=800&q=80',
        'https://images.unsplash.com/photo-1628169222442-83b6f272c72b?w=800&q=80',
        'https://images.unsplash.com/photo-1596472481622-c4349f7b1129?w=800&q=80'
    ]);
    const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);
    const [sliderIndex, setSliderIndex] = useState(0);
    const [exploreSliderIndex, setExploreSliderIndex] = useState(0);
    const [heroSliderIndex, setHeroSliderIndex] = useState(0);

    const heroBannerSlides = [
        {
            title: "Wedding & Festive Collection",
            subtitle: "Celebrate Love with Timeless Handwoven Elegance",
            image: "https://images.unsplash.com/photo-1610030469983-98e550d6153c?q=80&w=2000&auto=format&fit=crop",
            link: "/shop?category=Silk"
        },
        {
            title: "Authentic Kanjivaram Pure Silks",
            subtitle: "Woven by Master Artisans with Pure Zari Borders",
            image: "https://images.unsplash.com/photo-1583391733958-d25974644ed1?q=80&w=2000&auto=format&fit=crop",
            link: "/shop"
        },
        {
            title: "Everyday Comfort Soft Linen Cottons",
            subtitle: "Lightweight, Breathable & Graceful Weaves",
            image: "https://images.unsplash.com/photo-1621644820935-46b7a0808e04?q=80&w=2000&auto=format&fit=crop",
            link: "/shop"
        }
    ];

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

                // 2. Fetch CMS Page & Store Data
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

                // 3. Always fetch Featured Products, Explore Products & Categories
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
                                    catMap.set(p.category, rawImg || 'https://images.unsplash.com/photo-1610030469983-98e550d6153c?w=1200&q=85');
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

                // 4. Always fetch Hero Slider Images from App Settings
                try {
                    const { data: heroData } = await mysqlClient.from('app_settings').select('value').eq('key', 'hero_slider_images').single();
                    if (heroData?.value) {
                        let parsed = [];
                        if (Array.isArray(heroData.value)) {
                            parsed = heroData.value;
                        } else if (typeof heroData.value === 'string') {
                            const trimmed = heroData.value.trim();
                            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                                try {
                                    const jsonParsed = JSON.parse(trimmed);
                                    parsed = Array.isArray(jsonParsed) ? jsonParsed : [jsonParsed];
                                } catch (e) {
                                    parsed = trimmed.includes(',') ? trimmed.split(',') : [trimmed];
                                }
                            } else if (trimmed.includes(',')) {
                                parsed = trimmed.split(',');
                            } else if (trimmed) {
                                parsed = [trimmed];
                            }
                        }
                        const validUrls = parsed.map(s => typeof s === 'string' ? s.trim() : s).filter(Boolean);
                        if (validUrls.length > 0) {
                            setHeroSliderImages(validUrls);
                        }
                    }
                } catch (e) {
                    console.error('Hero Slider fetch error:', e);
                }

                // 5. Always fetch Gallery Images from App Settings
                try {
                    const { data: galleryData } = await mysqlClient.from('app_settings').select('value').eq('key', 'gallery_images').single();
                    if (galleryData?.value) {
                        let parsed = [];
                        if (Array.isArray(galleryData.value)) {
                            parsed = galleryData.value;
                        } else if (typeof galleryData.value === 'string') {
                            const trimmed = galleryData.value.trim();
                            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                                try {
                                    const jsonParsed = JSON.parse(trimmed);
                                    parsed = Array.isArray(jsonParsed) ? jsonParsed : [jsonParsed];
                                } catch (e) {
                                    parsed = trimmed.includes(',') ? trimmed.split(',') : [trimmed];
                                }
                            } else if (trimmed.includes(',')) {
                                parsed = trimmed.split(',');
                            } else if (trimmed) {
                                parsed = [trimmed];
                            }
                        }
                        const validUrls = parsed.map(s => typeof s === 'string' ? s.trim() : s).filter(Boolean);
                        if (validUrls.length > 0) {
                            setGalleryImages(validUrls);
                        }
                    }
                } catch (e) {
                    console.error('Gallery Images fetch error:', e);
                }
            } catch (err) {
                console.error('Home Page Data Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [router]);

    // Auto-sliders
    useEffect(() => {
        if (featuredProducts.length <= 4) return;
        const interval = setInterval(() => {
            setSliderIndex(prev => (prev + 1) > featuredProducts.length - 4 ? 0 : prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, [featuredProducts]);

    useEffect(() => {
        if (exploreProducts.length <= 4) return;
        const interval = setInterval(() => {
            setExploreSliderIndex(prev => (prev + 1) > exploreProducts.length - 4 ? 0 : prev + 1);
        }, 6000);
        return () => clearInterval(interval);
    }, [exploreProducts]);

    useEffect(() => {
        const interval = setInterval(() => {
            setHeroSliderIndex(prev => (prev + 1) % heroBannerSlides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [heroBannerSlides.length]);

    if (loading) return null;
    if (comingSoonSettings?.enabled) {
        return <ComingSoonPage settings={comingSoonSettings} />;
    }
    const activePage = page || { title: 'Vaiyaaree Sarees', custom_css: '' };

    const currentSlide = heroBannerSlides[heroSliderIndex];

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



            {/* Light Luxury Hero Banner Section (Vaiyaaree Theme) */}
            <div className="hero-banner-section" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="hero-banner-grid">

                    {/* Hero Text Content */}
                    <div style={{ animation: 'fadeInUp 0.8s ease' }}>
                        <span style={{
                            color: '#5d0821',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            display: 'inline-block',
                            marginBottom: '1rem',
                            background: 'rgba(93, 8, 33, 0.08)',
                            padding: '0.4rem 1rem',
                            borderRadius: '30px',
                            fontFamily: 'var(--font-roboto), sans-serif'
                        }}>
                            EXCLUSIVE WEAVES & SILKS
                        </span>
                        <h1 style={{
                            fontSize: 'clamp(2.25rem, 4.5vw, 3.75rem)',
                            fontWeight: 700,
                            fontFamily: 'var(--font-roboto), sans-serif',
                            color: '#1a1a1a',
                            lineHeight: 1.2,
                            margin: '0 0 1.25rem'
                        }}>
                            {currentSlide.title}
                        </h1>
                        <p style={{
                            color: '#554f4b',
                            fontSize: '1.15rem',
                            lineHeight: 1.6,
                            marginBottom: '2.5rem',
                            maxWidth: '520px',
                            marginInline: 'auto',
                            fontFamily: 'var(--font-roboto), sans-serif'
                        }}>
                            {currentSlide.subtitle}
                        </p>
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                            <Link href={currentSlide.link} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: '#5d0821',
                                color: '#ffffff',
                                padding: '1.1rem 2.75rem',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                borderRadius: '4px',
                                boxShadow: '0 8px 25px rgba(93, 8, 33, 0.25)',
                                transition: 'all 0.3s ease',
                                fontFamily: 'var(--font-roboto), sans-serif'
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#7a0c2e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#5d0821'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                SHOP NOW &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* Hero Feature Image */}
                    <div style={{ position: 'relative', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '480px',
                            height: '450px',
                            borderRadius: '24px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 50px rgba(93, 8, 33, 0.12)',
                            position: 'relative',
                            border: '6px solid #ffffff',
                            background: '#ffffff'
                        }}>
                            <img
                                src={heroSliderImages[heroSliderIndex % heroSliderImages.length] || currentSlide.image}
                                alt={currentSlide.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.8s ease' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Slider Controls & Navigation Dots (Positioned Below Hero Image) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    marginTop: '1.75rem',
                    marginBottom: '1rem',
                    zIndex: 10
                }}>
                    {heroBannerSlides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setHeroSliderIndex(idx)}
                            style={{
                                width: heroSliderIndex === idx ? '32px' : '10px',
                                height: '10px',
                                borderRadius: '10px',
                                background: heroSliderIndex === idx ? '#5d0821' : 'rgba(93, 8, 33, 0.25)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            aria-label={`Slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>


            {/* Best Sellers Collection Section */}
            {featuredProducts.length > 0 && (
                <div style={{ padding: '3rem 2rem 5rem', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <span style={{ color: '#5d0821', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-roboto), sans-serif' }}>
                            TRENDING SELECTIONS
                        </span>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-roboto), sans-serif', position: 'relative', width: 'fit-content', margin: '0 auto', paddingBottom: '12px', color: '#1a1a1a' }}>
                            Best Sellers
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '50px', height: '2px', background: '#5d0821' }}></div>
                        </h2>
                    </div>
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', transition: 'transform 0.5s ease', transform: `translateX(-${sliderIndex * (100 / Math.min(4, featuredProducts.length))}%)`, gap: '2rem' }}>
                            {featuredProducts.map(product => (
                                <Link key={product.id} href={getProductUrl(product)} style={{ flex: '0 0 calc(25% - 1.5rem)', minWidth: '270px', textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{
                                        background: '#ffffff',
                                        borderRadius: '16px',
                                        padding: '1.25rem',
                                        border: '1px solid #f0e6df',
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                                        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(93, 8, 33, 0.12)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.05)'; }}
                                    >
                                        <div style={{ aspectRatio: '4/5', marginBottom: '1rem', overflow: 'hidden', borderRadius: '12px', background: '#faf6f2', position: 'relative' }}>
                                            <img src={product.image_url?.split(',')[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: Number(product.stock || 0) <= 0 ? 'grayscale(25%)' : 'none' }} />
                                            {Number(product.stock || 0) <= 0 ? (
                                                <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#e11d48', color: '#ffffff', fontSize: '0.7rem', fontWeight: 800, padding: '0.25rem 0.6rem', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-roboto), sans-serif', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)' }}>
                                                    Out of Stock
                                                </span>
                                            ) : Number(product.stock || 0) <= 5 && (
                                                <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#5d0821', color: '#ffffff', fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '20px', fontFamily: 'var(--font-roboto), sans-serif' }}>
                                                    Only {product.stock} Left
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ color: '#777', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 600, fontFamily: 'var(--font-roboto), sans-serif' }}>{product.category || 'Vaiyaaree Exclusive'}</span>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1a1a1a', margin: '0.4rem 0 0.5rem', fontFamily: 'var(--font-roboto), sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <p style={{ color: '#5d0821', fontWeight: 800, fontSize: '1.15rem', margin: 0, fontFamily: 'var(--font-roboto), sans-serif' }}>₹{product.price.toLocaleString()}</p>
                                            {Number(product.stock || 0) <= 0 && (
                                                <span style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', fontSize: '0.68rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>Out of Stock</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Explore Collection Section */}
            {exploreProducts.length > 0 && (
                <div style={{ padding: '4rem 2rem 6rem', maxWidth: '1400px', margin: '0 auto', borderTop: '1px solid #f0e6df' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <span style={{ color: '#5d0821', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-roboto), sans-serif' }}>
                            HANDPICKED SELECTIONS
                        </span>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-roboto), sans-serif', position: 'relative', width: 'fit-content', margin: '0 auto', paddingBottom: '12px', color: '#1a1a1a' }}>
                            Explore Our Weaves
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '50px', height: '2px', background: '#5d0821' }}></div>
                        </h2>
                    </div>
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', transition: 'transform 0.5s ease', transform: `translateX(-${exploreSliderIndex * (100 / Math.min(4, exploreProducts.length))}%)`, gap: '2rem' }}>
                            {exploreProducts.map(product => (
                                <Link key={product.id} href={getProductUrl(product)} style={{ flex: '0 0 calc(25% - 1.5rem)', minWidth: '270px', textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{
                                        background: '#ffffff',
                                        borderRadius: '16px',
                                        padding: '1.25rem',
                                        border: '1px solid #f0e6df',
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
                                        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(93, 8, 33, 0.12)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.05)'; }}
                                    >
                                        <div style={{ aspectRatio: '4/5', marginBottom: '1rem', overflow: 'hidden', borderRadius: '12px', background: '#faf6f2', position: 'relative' }}>
                                            <img src={product.image_url?.split(',')[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: Number(product.stock || 0) <= 0 ? 'grayscale(25%)' : 'none' }} />
                                            {Number(product.stock || 0) <= 0 ? (
                                                <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#e11d48', color: '#ffffff', fontSize: '0.7rem', fontWeight: 800, padding: '0.25rem 0.6rem', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-roboto), sans-serif', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)' }}>
                                                    Out of Stock
                                                </span>
                                            ) : Number(product.stock || 0) <= 5 && (
                                                <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#5d0821', color: '#ffffff', fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '20px', fontFamily: 'var(--font-roboto), sans-serif' }}>
                                                    Only {product.stock} Left
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ color: '#777', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em', fontWeight: 600, fontFamily: 'var(--font-roboto), sans-serif' }}>{product.category || 'Authentic Weave'}</span>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1a1a1a', margin: '0.4rem 0 0.5rem', fontFamily: 'var(--font-roboto), sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <p style={{ color: '#5d0821', fontWeight: 800, fontSize: '1.15rem', margin: 0, fontFamily: 'var(--font-roboto), sans-serif' }}>₹{product.price.toLocaleString()}</p>
                                            {Number(product.stock || 0) <= 0 && (
                                                <span style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', fontSize: '0.68rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase' }}>Out of Stock</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Shop by Category Section */}
            {allCategories.length > 0 && (
                <section style={{ padding: '5rem 2rem 6rem', background: '#f8f4ee', borderTop: '1px solid #f0e6df' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                            <span style={{
                                color: '#5d0821',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                display: 'block',
                                marginBottom: '0.75rem',
                                fontFamily: 'var(--font-roboto), sans-serif'
                            }}>
                                CURATED WEAVES
                            </span>
                            <h2 style={{
                                fontSize: '2.25rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-roboto), sans-serif',
                                position: 'relative',
                                width: 'fit-content',
                                margin: '0 auto',
                                paddingBottom: '12px',
                                color: '#1a1a1a'
                            }}>
                                Shop by Category
                                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '50px', height: '2px', background: '#5d0821' }}></div>
                            </h2>
                            <p style={{ color: '#666', fontSize: '1rem', marginTop: '1rem', maxWidth: '600px', marginInline: 'auto', fontFamily: 'var(--font-roboto), sans-serif' }}>
                                Explore handcrafted weaves, rich silks, and everyday elegance in our exclusive saree ranges.
                            </p>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gap: '2rem'
                        }}>
                            {allCategories.map((cat) => (
                                <Link key={cat.name} href={`/shop?category=${encodeURIComponent(cat.name)}`} style={{ textDecoration: 'none' }}>
                                    <div
                                        style={{
                                            position: 'relative',
                                            height: '380px',
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            boxShadow: '0 12px 35px rgba(0,0,0,0.06)',
                                            cursor: 'pointer',
                                            background: '#ffffff',
                                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-8px)';
                                            e.currentTarget.style.boxShadow = '0 20px 45px rgba(93, 8, 33, 0.15)';
                                            const img = e.currentTarget.querySelector('.cat-bg-img');
                                            if (img) img.style.transform = 'scale(1.08)';
                                            const cta = e.currentTarget.querySelector('.cat-cta-btn');
                                            if (cta) {
                                                cta.style.background = '#5d0821';
                                                cta.style.color = '#ffffff';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.06)';
                                            const img = e.currentTarget.querySelector('.cat-bg-img');
                                            if (img) img.style.transform = 'scale(1)';
                                            const cta = e.currentTarget.querySelector('.cat-cta-btn');
                                            if (cta) {
                                                cta.style.background = 'rgba(255, 255, 255, 0.95)';
                                                cta.style.color = '#1a1a1a';
                                            }
                                        }}
                                    >
                                        <div
                                            className="cat-bg-img"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundImage: `url(${cat.image})`,
                                                backgroundPosition: 'center center',
                                                backgroundSize: 'cover',
                                                backgroundRepeat: 'no-repeat',
                                                transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
                                            }}
                                        />

                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.15) 50%, transparent 100%)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-end',
                                            padding: '2rem 1.5rem',
                                        }}>
                                            <div>
                                                <h3 style={{
                                                    color: '#ffffff',
                                                    fontSize: '1.6rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.06em',
                                                    textTransform: 'uppercase',
                                                    margin: 0,
                                                    fontFamily: 'var(--font-roboto), sans-serif',
                                                    textShadow: '0 2px 10px rgba(0,0,0,0.4)'
                                                }}>
                                                    {cat.name}
                                                </h3>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                                                    <span style={{
                                                        color: 'rgba(255, 255, 255, 0.88)',
                                                        fontSize: '0.85rem',
                                                        fontWeight: 500,
                                                        letterSpacing: '0.05em',
                                                        fontFamily: 'var(--font-roboto), sans-serif'
                                                    }}>
                                                        {cat.count > 0 ? `${cat.count} Saree${cat.count > 1 ? 's' : ''}` : 'View Collection'}
                                                    </span>
                                                    <div
                                                        className="cat-cta-btn"
                                                        style={{
                                                            padding: '0.45rem 1rem',
                                                            borderRadius: '20px',
                                                            background: 'rgba(255, 255, 255, 0.95)',
                                                            color: '#1a1a1a',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            letterSpacing: '0.08em',
                                                            textTransform: 'uppercase',
                                                            backdropFilter: 'blur(4px)',
                                                            transition: 'all 0.3s ease',
                                                            fontFamily: 'var(--font-roboto), sans-serif'
                                                        }}
                                                    >
                                                        Explore &rarr;
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Brand Craftsmanship Story Feature Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: '480px', background: '#ffffff', borderTop: '1px solid #f0e6df' }}>
                <div style={{ padding: '4rem 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ letterSpacing: '0.2rem', color: '#5d0821', fontWeight: 800, marginBottom: '1rem', fontSize: '0.75rem', fontFamily: 'var(--font-roboto), sans-serif' }}>HERITAGE & CRAFTSMANSHIP</span>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 1.5rem', lineHeight: 1.2, fontFamily: 'var(--font-roboto), sans-serif', color: '#1a1a1a', position: 'relative', paddingBottom: '15px' }}>
                        Authentic Weaves, Timeless Grace
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '60px', height: '2px', background: '#5d0821' }}></div>
                    </h2>
                    <p style={{ color: '#554f4b', lineHeight: 1.8, fontSize: '1.05rem', fontWeight: 400, maxWidth: '480px', fontFamily: 'var(--font-roboto), sans-serif' }}>
                        Vaiyaaree brings you authentic handloom weaves straight from master artisans in South India. Discover rich silk sarees, soft cotton prints, and designer festive drapes tailored for every occasion.
                    </p>
                    <Link href="/shop" style={{
                        marginTop: '1.5rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        color: '#ffffff',
                        background: '#5d0821',
                        padding: '0.6rem 1.4rem',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                        width: 'fit-content',
                        boxShadow: '0 4px 15px rgba(93, 8, 33, 0.2)',
                        transition: 'all 0.3s ease',
                        fontFamily: 'var(--font-roboto), sans-serif'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#7a0c2e'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#5d0821'}
                    >
                        <span>EXPLORE CATALOG</span>
                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>&rarr;</span>
                    </Link>
                </div>
                <div style={{ background: 'url(https://images.unsplash.com/photo-1610030469983-98e550d6153c?q=80&w=1200&auto=format&fit=crop) center/cover no-repeat', minHeight: '350px' }}></div>
            </div>

            {/* WhatsApp Section - Styled with Vaiyaaree Theme */}
            <div style={{ padding: '5rem 2rem', background: '#5d0821', color: '#ffffff' }}>
                <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '3rem', alignItems: 'center' }}>
                    <div>
                        <span style={{ letterSpacing: '0.2rem', color: 'rgba(255,255,255,0.75)', fontWeight: 800, marginBottom: '1rem', fontSize: '0.75rem', display: 'block', fontFamily: 'var(--font-roboto), sans-serif' }}>PERSONALIZED SHOPPING</span>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-roboto), sans-serif', lineHeight: 1.2, paddingBottom: '15px', position: 'relative', color: '#ffffff' }}>
                            Shop via WhatsApp
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '50px', height: '2px', background: '#ffffff' }}></div>
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: 1.6, fontFamily: 'var(--font-roboto), sans-serif' }}>Connect directly with our saree experts, view live fabric photos, and place your order seamlessly via chat.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {[{ icon: MessageSquare, t: 'Direct Fabric & Video Preview' }, { icon: Check, t: 'Quick Order Confirmation & Tracking' }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                                        <item.icon size={20} />
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: 'var(--font-roboto), sans-serif' }}>{item.t}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.75rem' }}>
                        <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: 'none', textAlign: 'center', width: '100%', maxWidth: '280px' }}>
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292'}`} style={{ width: '140px', margin: '0 auto 1rem', display: 'block' }} alt="QR" />
                            <div style={{ color: '#5d0821', fontWeight: 800, fontSize: '1.15rem', fontFamily: 'var(--font-roboto), sans-serif' }}>+{process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292'}</div>
                        </div>

                        <Link
                            href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292'}`}
                            target="_blank"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2rem', background: '#ffffff', color: '#5d0821', borderRadius: '4px', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem', width: '100%', maxWidth: '280px', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', transition: 'transform 0.3s', fontFamily: 'var(--font-roboto), sans-serif'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <MessageSquare size={18} />
                            CHAT WITH US NOW
                        </Link>
                    </div>

                    <div style={{ transform: 'scale(0.85)', transformOrigin: 'right center', color: '#000000' }}>
                        <WhatsAppMockup />
                    </div>
                </div>
            </div>

            {/* Gallery Swiper Section */}
            <div style={{ padding: '5rem 2rem', background: '#fdfbf7', borderTop: '1px solid #f0e6df' }}>
                <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <span style={{ color: '#5d0821', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-roboto), sans-serif' }}>
                        CUSTOMER SHOWCASE
                    </span>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 700, fontFamily: 'var(--font-roboto), sans-serif', position: 'relative', width: 'fit-content', margin: '0 auto', paddingBottom: '12px', color: '#1a1a1a' }}>
                        Our Collection Gallery
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '50px', height: '2px', background: '#5d0821' }}></div>
                    </h2>
                </div>

                <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="gallery-swiper-container">
                    <Swiper
                        modules={[Autoplay, Pagination, Navigation]}
                        spaceBetween={24}
                        slidesPerView={1}
                        loop={true}
                        autoplay={{
                            delay: 3500,
                            disableOnInteraction: false,
                        }}
                        pagination={{ clickable: true }}
                        navigation={true}
                        breakpoints={{
                            640: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                            1280: { slidesPerView: 4 }
                        }}
                        className="mySwiper"
                        style={{ padding: '0 0 50px 0' }}
                    >
                        {galleryImages.map((url, i) => (
                            <SwiperSlide key={i}>
                                <div
                                    onClick={() => setSelectedGalleryImage(url)}
                                    style={{
                                        aspectRatio: '4/5',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        background: '#faf6f2',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                                        transition: 'transform 0.4s ease',
                                        cursor: 'zoom-in'
                                    }}
                                    className="gallery-item-hover"
                                >
                                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} alt={`Gallery ${i + 1}`} />
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>

                <style>{`
                    .gallery-swiper-container .swiper-button-next,
                    .gallery-swiper-container .swiper-button-prev {
                        color: #5d0821;
                        background: rgba(255, 255, 255, 0.95);
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    }
                    .gallery-swiper-container .swiper-button-next:after,
                    .gallery-swiper-container .swiper-button-prev:after {
                        font-size: 1.1rem;
                        font-weight: 900;
                    }
                    .gallery-swiper-container .swiper-pagination-bullet-active {
                        background: #5d0821 !important;
                    }
                    .gallery-item-hover:hover {
                        transform: scale(1.03);
                    }
                `}</style>
            </div>

            {/* Feature Perks Bar */}
            <div style={{ background: '#ffffff', borderTop: '1px solid #f0e6df', borderBottom: '1px solid #f0e6df', padding: '2.5rem 1rem' }}>
                <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                    {[
                        { icon: Truck, title: "Free Shipping Nationwide", desc: "Completely free delivery across India" },
                        { icon: Sparkles, title: "100% Authentic Handcraft", desc: "Direct from master weavers in Coimbatore" },
                        { icon: MessageSquare, title: "WhatsApp Direct Order", desc: "Chat, view live fabrics & order via WhatsApp" },
                        { icon: ShieldCheck, title: "Guaranteed Quality & Care", desc: "Hassle-free 10-day return & exchange window" }
                    ].map((perk, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '0.5rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'rgba(93, 8, 33, 0.07)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#5d0821',
                                flexShrink: 0
                            }}>
                                <perk.icon size={24} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', fontFamily: 'var(--font-roboto), sans-serif' }}>{perk.title}</h4>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#777', fontFamily: 'var(--font-roboto), sans-serif' }}>{perk.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ShopFooter />

            {/* Modal for Zoomed Image */}
            {selectedGalleryImage && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
                        animation: 'fadeIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)'
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
                        >
                            &times;
                        </button>
                        <img
                            src={selectedGalleryImage}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                            alt="Zoomed"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <style>{`
                        @keyframes fadeIn { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
                    `}</style>
                </div>
            )}
        </div>
    );
}
