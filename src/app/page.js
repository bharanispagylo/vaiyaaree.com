'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Mail, Phone, MapPin, ArrowLeft, ArrowRight, MessageSquare, Check } from 'lucide-react';
import Link from 'next/link';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';
import WhatsAppMockup from '@/components/WhatsAppMockup';
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
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [exploreProducts, setExploreProducts] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [heroSliderImages, setHeroSliderImages] = useState([
        '/images/hero-saree.png',
        'https://images.unsplash.com/photo-1583391733958-d25974644ed1?q=80&w=2000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1610030469983-98e550d6153c?q=80&w=2000&auto=format&fit=crop'
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
    const [galleryIndex, setGalleryIndex] = useState(0);

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const { data } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', 'home')
                    .eq('status', 'published')
                    .single();

                if (data) {
                    setPage(data);
                    document.title = `${data.seo_title || data.title} | Vaiyaaree`;

                    const { data: prods } = await supabase
                        .from('products')
                        .select('*')
                        .eq('is_featured', true)
                        .eq('is_active', true)
                        .order('created_at', { ascending: false });
                    setFeaturedProducts(prods || []);

                    const { data: expProds } = await supabase
                        .from('products')
                        .select('*')
                        .eq('product_group', 'EXPLORE')
                        .eq('is_active', true)
                        .order('created_at', { ascending: false });
                    setExploreProducts(expProds || []);

                    const { data: catData } = await supabase
                        .from('products')
                        .select('category, image_url')
                        .eq('is_active', true);
                    if (catData) {
                        const uniqueCats = [];
                        const catMap = new Map();
                        const catCountMap = new Map();
                        for (const p of catData) {
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

                    const { data: heroData } = await supabase.from('app_settings').select('value').eq('key', 'hero_slider_images').single();
                    if (heroData?.value) {
                        try {
                            const parsed = JSON.parse(heroData.value);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setHeroSliderImages(parsed);
                            }
                        } catch(e){}
                    }

                    const { data: galleryData } = await supabase.from('app_settings').select('value').eq('key', 'gallery_images').single();
                    if (galleryData?.value) {
                        try {
                            const parsed = JSON.parse(galleryData.value);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setGalleryImages(parsed);
                            }
                        } catch(e){}
                    }
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
        if (heroSliderImages.length <= 1) return;
        const interval = setInterval(() => {
            setHeroSliderIndex(prev => (prev + 1) % heroSliderImages.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [heroSliderImages]);

    if (loading) return null;
    if (!page) return null;

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)', color: '#000' }}>
            <style dangerouslySetInnerHTML={{ __html: page.custom_css || '' }} />
            <ShopHeader />

            {/* Hero Section - Sliding Carousel */}
            <div style={{
                position: 'relative', height: '70vh', minHeight: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex', width: '100%', height: '100%', position: 'absolute', inset: 0,
                    transition: 'transform 1s cubic-bezier(0.25, 1, 0.5, 1)',
                    transform: `translateX(-${heroSliderIndex * 100}%)`
                }}>
                    {heroSliderImages.map((url, idx) => (
                        <div key={`${url}-${idx}`} style={{
                            flex: '0 0 100%', height: '100%', position: 'relative', background: '#000'
                        }}>
                            <div style={{ position: 'absolute', inset: '-20px', background: `url(${url}) center/cover no-repeat`, filter: 'blur(40px) brightness(0.5)', transform: 'scale(1.1)' }} />
                            <div style={{ position: 'absolute', inset: 0, background: `url(${url}) center/contain no-repeat`, zIndex: 2 }} />
                        </div>
                    ))}
                </div>
                
                <div style={{ position: 'absolute', inset: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 6, pointerEvents: 'none' }}>
                    <button onClick={(e) => { e.preventDefault(); setHeroSliderIndex(prev => prev === 0 ? heroSliderImages.length - 1 : prev - 1); }} 
                        style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', padding: '1rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'background 0.3s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); setHeroSliderIndex(prev => (prev + 1) % heroSliderImages.length); }} 
                        style={{ pointerEvents: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', padding: '1rem', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'background 0.3s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        <ArrowRight size={24} />
                    </button>
                </div>

                <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', color: '#fff', marginTop: '10vh' }}>
                    <Link href="/shop" style={{
                        display: 'inline-block', border: '2px solid #fff', color: '#fff', padding: '1rem 3rem', textDecoration: 'none', fontWeight: 800, letterSpacing: '0.2em', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(5px)', transition: 'background 0.3s, filter 0.3s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}>
                        SHOP NOW
                    </Link>
                </div>
            </div>

            {/* Content Body - Original Styles */}
            <div style={{ padding: '6rem 2rem 4rem', maxWidth: '900px', margin: '0 auto' }}>
                <div 
                    className="cms-content"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                    style={{ fontSize: '1.4rem', lineHeight: 1.8, textAlign: 'center', color: '#555' }}
                />
            </div>

            {/* Best Sellers - Original Styles */}
            {featuredProducts.length > 0 && (
                <div style={{ padding: '2rem 2rem 4rem', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '3rem', fontWeight: 400, fontFamily: 'var(--font-body)', position: 'relative', width: 'fit-content', margin: '0 auto', paddingBottom: '15px' }}>
                            Best Sellers
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '60px', height: '1px', background: '#5d0821' }}></div>
                        </h2>
                    </div>
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', transition: 'transform 0.5s ease', transform: `translateX(-${sliderIndex * (100 / Math.min(4, featuredProducts.length))}%)`, gap: '1.5rem' }}>
                            {featuredProducts.map(product => (
                                <Link key={product.id} href={`/product/${product.id}`} style={{ flex: '0 0 calc(25% - 1.2rem)', minWidth: '280px', textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ aspectRatio: '3/4', marginBottom: '1rem', overflow: 'hidden', borderRadius: '4px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', background: '#fff', position: 'relative' }}>
                                            <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${product.image_url?.split(',')[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.5, zIndex: 0 }}></div>
                                            <img src={product.image_url?.split(',')[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
                                        </div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 500, fontFamily: 'var(--font-body)' }}>{product.name}</h3>
                                        <p style={{ color: '#5d0821', fontWeight: 600 }}>₹{product.price.toLocaleString()}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Explore our collection - Restoring Missing Section */}
            {exploreProducts.length > 0 && (
                <div style={{ padding: '4rem 2rem 8rem', maxWidth: '1400px', margin: '0 auto', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '4rem', fontWeight: 400, fontFamily: 'var(--font-body)', position: 'relative', width: 'fit-content', margin: '0 auto', paddingBottom: '15px' }}>
                            Explore our collection
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '60px', height: '1px', background: '#5d0821' }}></div>
                        </h2>
                    </div>
                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', transition: 'transform 0.5s ease', transform: `translateX(-${exploreSliderIndex * (100 / Math.min(4, exploreProducts.length))}%)`, gap: '2rem' }}>
                            {exploreProducts.map(product => (
                                <Link key={product.id} href={`/product/${product.id}`} style={{ flex: '0 0 calc(25% - 1.5rem)', minWidth: '300px', textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ aspectRatio: '3/4', marginBottom: '1.5rem', overflow: 'hidden', borderRadius: '4px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', background: '#fff', position: 'relative' }}>
                                            <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${product.image_url?.split(',')[0]})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.5, zIndex: 0 }}></div>
                                            <img src={product.image_url?.split(',')[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} />
                                        </div>
                                        <span style={{ color: '#888', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.1em' }}>{product.category}</span>
                                        <h3 style={{ fontSize: '1.2rem', margin: '0.5rem 0', fontFamily: 'var(--font-body)' }}>{product.name}</h3>
                                        <p style={{ fontWeight: 700, color: '#5d0821' }}>₹{product.price.toLocaleString()}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Shop by Category - Redesigned High Clarity & Modern Card Layout */}
            {allCategories.length > 0 && (
                <section style={{ padding: '5rem 2rem 6rem', background: '#faf9f6', borderTop: '1px solid #eaeaea' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                            <span style={{ 
                                color: '#5d0821', 
                                fontSize: '0.85rem', 
                                fontWeight: 700, 
                                letterSpacing: '0.2em', 
                                textTransform: 'uppercase', 
                                display: 'block', 
                                marginBottom: '0.75rem' 
                            }}>
                                Curated Collections
                            </span>
                            <h2 style={{ 
                                fontSize: '2.75rem', 
                                fontWeight: 400, 
                                fontFamily: 'var(--font-body)', 
                                position: 'relative', 
                                width: 'fit-content', 
                                margin: '0 auto', 
                                paddingBottom: '12px',
                                color: '#1a1a1a'
                            }}>
                                Shop by Category
                                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '50px', height: '2px', background: '#5d0821' }}></div>
                            </h2>
                            <p style={{ color: '#666', fontSize: '1rem', marginTop: '1rem', maxWidth: '600px', marginInline: 'auto' }}>
                                Explore handcrafted weaves, rich silks, and everyday elegance in our exclusive saree ranges.
                            </p>
                        </div>

                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
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
                                            boxShadow: '0 12px 35px rgba(0,0,0,0.07)', 
                                            cursor: 'pointer', 
                                            background: '#f0f0f0',
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
                                            e.currentTarget.style.boxShadow = '0 12px 35px rgba(0,0,0,0.07)';
                                            const img = e.currentTarget.querySelector('.cat-bg-img');
                                            if (img) img.style.transform = 'scale(1)';
                                            const cta = e.currentTarget.querySelector('.cat-cta-btn');
                                            if (cta) {
                                                cta.style.background = 'rgba(255, 255, 255, 0.9)';
                                                cta.style.color = '#1a1a1a';
                                            }
                                        }}
                                    >
                                        {/* Crisp, Crystal-Clear Unblurred Image Container */}
                                        <div 
                                            className="cat-bg-img"
                                            style={{ 
                                                position: 'absolute', 
                                                inset: 0, 
                                                backgroundImage: `url(${cat.image})`,
                                                backgroundPosition: 'center center',
                                                backgroundSize: 'cover',
                                                backgroundRepeat: 'no-repeat',
                                                filter: 'none',
                                                opacity: 1,
                                                transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
                                            }} 
                                        />

                                        {/* Subtle Soft Bottom Overlay for Perfect Contrast */}
                                        <div style={{ 
                                            position: 'absolute', 
                                            inset: 0, 
                                            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.2) 50%, transparent 100%)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justify: 'flex-end',
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
                                                    fontFamily: 'var(--font-body)',
                                                    textShadow: '0 2px 10px rgba(0,0,0,0.4)'
                                                }}>
                                                    {cat.name}
                                                </h3>
                                                
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                                                    <span style={{ 
                                                        color: 'rgba(255, 255, 255, 0.88)', 
                                                        fontSize: '0.85rem', 
                                                        fontWeight: 500,
                                                        letterSpacing: '0.05em' 
                                                    }}>
                                                        {cat.count > 0 ? `${cat.count} Saree${cat.count > 1 ? 's' : ''}` : 'View Collection'}
                                                    </span>
                                                    <div 
                                                        className="cat-cta-btn"
                                                        style={{ 
                                                            padding: '0.45rem 1rem', 
                                                            borderRadius: '20px', 
                                                            background: 'rgba(255, 255, 255, 0.9)', 
                                                            color: '#1a1a1a',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            letterSpacing: '0.08em',
                                                            textTransform: 'uppercase',
                                                            backdropFilter: 'blur(4px)',
                                                            transition: 'all 0.3s ease'
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

            {/* Mudhra Collection - Original Styles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: '500px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ padding: '4rem 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ letterSpacing: '0.2rem', color: '#5d0821', fontWeight: 700, marginBottom: '1rem', fontSize: '0.75rem' }}>THE MUDHRA SERIES</span>
                    <h2 style={{ fontSize: '4.5rem', fontWeight: 400, margin: '0 0 1.5rem', lineHeight: 1.1, fontFamily: 'var(--font-body)', position: 'relative', paddingBottom: '15px' }}>
                        Timeless Prints
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '60px', height: '1px', background: '#5d0821' }}></div>
                    </h2>
                    <p style={{ color: '#666', lineHeight: 1.8, fontSize: '1rem', fontWeight: 300, maxWidth: '450px' }}>
                        Discover heritage in every weave. Our Mudhra collection celebrates hand-block printing on the finest cotton.
                    </p>
                    <Link href="/shop" style={{ marginTop: '2rem', color: '#000', fontWeight: 700, borderBottom: '2px solid #5d0821', width: 'fit-content' }}>EXPLORE</Link>
                </div>
                <div style={{ background: 'url(/images/block-print-saree.png) center/cover no-repeat' }}></div>
            </div>

            {/* WhatsApp Section - Highlighted with Vaiyaaree Color */}
            <div style={{ padding: '6rem 2rem', background: '#5d0821', color: '#fff' }}>
                <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '3rem', alignItems: 'center' }}>
                    <div>
                        <span style={{ letterSpacing: '0.2rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: '1rem', fontSize: '0.75rem', display: 'block' }}>PERSONALIZED SHOPPING</span>
                        <h2 style={{ fontSize: '3.5rem', fontWeight: 400, fontFamily: 'var(--font-body)', lineHeight: 1.1, paddingBottom: '15px', position: 'relative', color: '#fff' }}>
                            Shop on WhatsApp
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '60px', height: '1px', background: '#fff' }}></div>
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: 1.6 }}>Connect directly with experts, view fabric details, and checkout via chat.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[{ icon: MessageSquare, t: 'Expert Guidance' }, { icon: Check, t: 'Easy Checkout' }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                        <item.icon size={20} />
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ background: '#fff', padding: '2rem', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: 'none', textAlign: 'center', width: '100%', maxWidth: '280px' }}>
                           <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}`} style={{ width: '140px', margin: '0 auto 1rem', display: 'block' }} alt="QR" />
                           <div style={{ color: '#5d0821', fontWeight: 800, fontSize: '1.2rem' }}>+{process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}</div>
                        </div>
                        
                        <Link 
                            href={`https://wa.me/${process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232'}`} 
                            target="_blank"
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem', background: '#fff', color: '#5d0821', borderRadius: '4px', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', width: '100%', maxWidth: '280px', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', transition: 'transform 0.3s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <MessageSquare size={18} />
                            START CHATTING NOW
                        </Link>
                    </div>

                    <div style={{ transform: 'scale(0.85)', transformOrigin: 'right center', color: '#000' }}>
                        <WhatsAppMockup />
                    </div>
                </div>
            </div>

            {/* Gallery - Swiper Slider */}
            <div style={{ padding: '6rem 2rem', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '3rem', fontFamily: 'var(--font-body)', position: 'relative', width: 'fit-content', margin: '0 auto', paddingBottom: '15px' }}>
                        Our Gallery
                        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '60px', height: '1px', background: '#5d0821' }}></div>
                    </h2>
                </div>
                
                <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="gallery-swiper-container">
                    <Swiper
                        modules={[Autoplay, Pagination, Navigation]}
                        spaceBetween={20}
                        slidesPerView={1}
                        loop={true}
                        autoplay={{
                            delay: 3000,
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
                                        aspectRatio: '1/1', 
                                        borderRadius: '8px', 
                                        overflow: 'hidden', 
                                        position: 'relative', 
                                        background: '#f8f8f8',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                                        transition: 'transform 0.4s ease',
                                        cursor: 'zoom-in'
                                    }}
                                    className="gallery-item-hover"
                                >
                                    <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.3, zIndex: 0 }}></div>
                                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1 }} alt={`Gallery ${i + 1}`} />
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>

                <style>{`
                    .gallery-swiper-container .swiper-button-next,
                    .gallery-swiper-container .swiper-button-prev {
                        color: #5d0821;
                        background: rgba(255, 255, 255, 0.9);
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    }
                    .gallery-swiper-container .swiper-button-next:after,
                    .gallery-swiper-container .swiper-button-prev:after {
                        font-size: 1.2rem;
                        font-weight: 900;
                    }
                    .gallery-swiper-container .swiper-pagination-bullet-active {
                        background: #5d0821 !important;
                    }
                    .gallery-item-hover:hover {
                        transform: scale(1.02);
                    }
                `}</style>
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
                                color: '#fff', fontSize: '3rem', cursor: 'pointer', fontWeight: 200, padding: '10px' 
                            }}
                            onClick={(e) => { e.stopPropagation(); setSelectedGalleryImage(null); }}
                        >
                            &times;
                        </button>
                        <img 
                            src={selectedGalleryImage} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} 
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
