'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Mail, Phone, MapPin, ArrowLeft, ArrowRight, Sparkles, Instagram, Facebook, ShoppingCart, Search, MessageSquare, CreditCard, Truck, Check } from 'lucide-react';
import Link from 'next/link';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';
import { useShop } from '@/context/ShopContext';
import Head from 'next/head';
import WhatsAppMockup from '@/components/WhatsAppMockup';

export default function CMSPageView() {
    const params = useParams();
    const router = useRouter();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [exploreProducts, setExploreProducts] = useState([]);
    const [heroSliderImages, setHeroSliderImages] = useState([]);
    const [galleryImages, setGalleryImages] = useState([]);
    const [sliderIndex, setSliderIndex] = useState(0);
    const [exploreSliderIndex, setExploreSliderIndex] = useState(0);
    const [heroSliderIndex, setHeroSliderIndex] = useState(0);
    const [galleryIndex, setGalleryIndex] = useState(0);

    useEffect(() => {
        const fetchPageData = async () => {
            if (!params.slug) return;
            try {
                const { data, error } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', params.slug)
                    .eq('status', 'published')
                    .eq('visibility', 'public')
                    .single();

                if (error || !data) {
                    setPage(null);
                } else {
                    setPage(data);
                    document.title = `${data.seo_title || data.title} | Cast Print`;

                    if (data.template === 'home') {
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

                        // Fetch Hero Slider
                        const { data: heroData } = await supabase
                            .from('app_settings')
                            .select('value')
                            .eq('key', 'hero_slider_images')
                            .single();
                        
                        if (heroData?.value) {
                            try {
                                const parsed = JSON.parse(heroData.value);
                                setHeroSliderImages(Array.isArray(parsed) ? parsed : []);
                            } catch (e) {
                                console.error('Hero parse error:', e);
                            }
                        }

                        // Fetch Gallery
                        const { data: galleryData } = await supabase
                            .from('app_settings')
                            .select('value')
                            .eq('key', 'gallery_images')
                            .single();
                        
                        if (galleryData?.value) {
                            try {
                                const parsed = JSON.parse(galleryData.value);
                                setGalleryImages(Array.isArray(parsed) ? parsed : []);
                            } catch (e) {
                                console.error('Gallery parse error:', e);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Hydration Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [params.slug]);
    
    // Auto-slide for featured products
    useEffect(() => {
        if (!page || page.template !== 'home' || featuredProducts.length <= 4) return;
        
        const interval = setInterval(() => {
            setSliderIndex(prev => {
                const next = prev + 1;
                return next > featuredProducts.length - 4 ? 0 : next;
            });
        }, 5000);
        
        return () => clearInterval(interval);
    }, [page, featuredProducts.length]);
    
    // Auto-slide for explore products
    useEffect(() => {
        if (!page || page.template !== 'home' || exploreProducts.length <= 4) return;
        
        const interval = setInterval(() => {
            setExploreSliderIndex(prev => {
                const next = prev + 1;
                return next > exploreProducts.length - 4 ? 0 : next;
            });
        }, 6000); // 6 seconds for second slider
        
        return () => clearInterval(interval);
    }, [page, exploreProducts.length]);

    // Auto-slide for gallery pages
    useEffect(() => {
        const galleryPageCount = Math.ceil(galleryImages.length / 6);
        if (!page || page.template !== 'home' || galleryPageCount <= 1) return;
        
        const interval = setInterval(() => {
            setGalleryIndex(prev => (prev + 1) % galleryPageCount);
        }, 6000);
        
        return () => clearInterval(interval);
    }, [page, galleryImages.length]);

    // Auto-slide for hero
    useEffect(() => {
        if (!page || page.template !== 'home' || heroSliderImages.length <= 1) return;
        
        const interval = setInterval(() => {
            setHeroSliderIndex(prev => (prev + 1) % heroSliderImages.length);
        }, 5000);
        
        return () => clearInterval(interval);
    }, [page, heroSliderImages.length]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1.5rem', background: '#ffffff' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid #f3f3f3', borderTop: '4px solid #5d0821', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#111', fontWeight: 600, fontSize: '1.1rem' }}>Loading Cast Print...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!page) {
        return (
            <div style={{ padding: '8rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '5rem', margin: '0 0 1rem', fontWeight: 900 }}>404</h1>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Page not found</h2>
                <Link href="/shop" style={{ display: 'inline-block', background: '#000', color: '#fff', padding: '1rem 2rem', borderRadius: '50px', textDecoration: 'none' }}>
                    Shop Collections
                </Link>
            </div>
        );
    }

    const renderCustomCSS = () => {
        if (!page.custom_css) return null;
        return <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />;
    };

    if (page.template === 'landing') {
        return (
            <div className="landing-template" style={{ minHeight: '100vh', background: '#fff' }}>
                {renderCustomCSS()}
                <div dangerouslySetInnerHTML={{ __html: page.content }} />
            </div>
        );
    }

    const isHome = page.template === 'home';

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '"Inter", sans-serif', color: '#000' }}>
            <Head>
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet" />
            </Head>
            {renderCustomCSS()}
            <ShopHeader />

            {/* Hero Section */}
            {isHome && (
                <div style={{
                    position: 'relative',
                    height: '80vh',
                    minHeight: '500px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#000',
                    overflow: 'hidden'
                }}>
                    {/* Fallback Static Image if none selected */}
                    {heroSliderImages.length === 0 && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: `url(/images/hero-saree.png) center/cover no-repeat`
                        }} />
                    )}

                    {heroSliderImages.map((url, idx) => (
                        <div 
                            key={url}
                            style={{
                                position: 'absolute', inset: 0,
                                opacity: idx === heroSliderIndex ? 1 : 0,
                                transition: 'opacity 1.5s ease-in-out',
                                zIndex: idx === heroSliderIndex ? 1 : 0,
                                background: '#000',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Layer 1: Blurred Backdrop Fill */}
                            <div style={{
                                position: 'absolute', inset: '-20px',
                                background: `url(${url}) center/cover no-repeat`,
                                filter: 'blur(40px) brightness(0.5)',
                                transform: 'scale(1.1)'
                            }} />

                            {/* Layer 2: Primary "Clear & Visible" Image */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: `url(${url}) center/contain no-repeat`,
                                zIndex: 2
                            }} />
                        </div>
                    ))}

                    {/* Content Overlay */}
                    <div style={{ 
                        position: 'relative', zIndex: 5, textAlign: 'center', color: '#fff'
                    }}>
                        <div style={{ marginTop: '20vh' }}>
                            <Link href="/shop" style={{
                                display: 'inline-block', border: '2px solid #fff', color: '#fff',
                                padding: '1.2rem 3.5rem', textDecoration: 'none', fontWeight: 800,
                                letterSpacing: '0.2em', transition: 'all 0.3s ease',
                                background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(5px)'
                            }}>
                                SHOP NOW
                            </Link>
                        </div>
                    </div>

                    {/* Hero Navigation Indicators */}
                    {heroSliderImages.length > 1 && (
                        <div style={{ 
                            position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', gap: '1rem', zIndex: 10
                        }}>
                            {heroSliderImages.map((_, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setHeroSliderIndex(idx)}
                                    style={{
                                        width: idx === heroSliderIndex ? '40px' : '10px',
                                        height: '10px', borderRadius: '5px', background: '#fff',
                                        opacity: idx === heroSliderIndex ? 1 : 0.4, cursor: 'pointer',
                                        transition: 'all 0.4s'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Content Body */}
            <div style={{ padding: isHome ? '5rem 2rem' : '0 2rem 4rem', maxWidth: '900px', margin: '0 auto' }}>
                <div
                    className="cms-content-wrapper"
                    dangerouslySetInnerHTML={{ __html: page.content.replace(/Aiswarya Sarees/g, 'Cast Print').replace(/Discover the finest collection of silk and cotton sarees/g, 'Experience excellence in every weave') }}
                    style={{ fontSize: '1.1rem', lineHeight: 1.8, textAlign: 'center' }}
                />
            </div>

            {/* Best Sellers */}
            {isHome && featuredProducts.length > 0 && (
                <div style={{ padding: '4rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ 
                            fontSize: '3.5rem', fontWeight: 400, margin: '0 auto 1.5rem', 
                            fontFamily: '"Playfair Display", serif', position: 'relative', 
                            width: 'fit-content', paddingBottom: '20px', letterSpacing: '0.05em'
                        }}>
                            Best Sellers
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '80px', height: '1px', background: '#5d0821' }}></div>
                        </h2>
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ 
                                display: 'flex', 
                                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 
                                transform: `translateX(-${sliderIndex * (100 / (featuredProducts.length > 4 ? 4 : featuredProducts.length))}%)`,
                                gap: '2rem'
                            }}>
                                {featuredProducts.map(product => (
                                    <div key={product.id} style={{ flex: '0 0 calc(25% - 1.5rem)', minWidth: '300px' }}>
                                        <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div style={{ textAlign: 'center', transition: 'transform 0.3s ease' }} className="product-card-hover">
                                                <div style={{ position: 'relative', aspectRatio: '3/4', marginBottom: '1.5rem', overflow: 'hidden', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <div className="add-to-cart-overlay" style={{
                                                        position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', color: '#fff',
                                                        padding: '1rem', opacity: 0, transition: 'opacity 0.3s ease', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em'
                                                    }}>
                                                        ADD TO CART
                                                    </div>
                                                </div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 500, margin: '0 0 0.5rem', fontFamily: '"Playfair Display", serif' }}>{product.name}</h3>
                                                <p style={{ fontWeight: 300, color: '#5d0821', letterSpacing: '0.1em' }}>₹{product.price.toLocaleString()}</p>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {featuredProducts.length > 4 && (
                            <>
                                <button 
                                    onClick={() => setSliderIndex(prev => Math.max(0, prev - 1))}
                                    style={{
                                        position: 'absolute', left: '-2.5rem', top: '40%', transform: 'translateY(-50%)',
                                        background: 'white', border: '1px solid #eee', borderRadius: '50%', width: '50px', height: '50px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        zIndex: 10, visibility: sliderIndex === 0 ? 'hidden' : 'visible'
                                    }}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <button 
                                    onClick={() => setSliderIndex(prev => Math.min(featuredProducts.length - 4, prev + 1))}
                                    style={{
                                        position: 'absolute', right: '-2.5rem', top: '40%', transform: 'translateY(-50%)',
                                        background: 'white', border: '1px solid #eee', borderRadius: '50%', width: '50px', height: '50px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        zIndex: 10, visibility: sliderIndex >= featuredProducts.length - 4 ? 'hidden' : 'visible'
                                    }}
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
            {/* Explore Our Products */}
            {isHome && exploreProducts.length > 0 && (
                <div style={{ padding: '4rem 2rem', maxWidth: '1400px', margin: '0 auto', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 style={{ 
                            fontSize: '3.5rem', fontWeight: 400, margin: '0 auto 1.5rem', 
                            fontFamily: '"Playfair Display", serif', position: 'relative', 
                            width: 'fit-content', paddingBottom: '20px', letterSpacing: '0.05em'
                        }}>
                            Explore Our Products
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '80px', height: '1px', background: '#5d0821' }}></div>
                        </h2>
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ 
                                display: 'flex', 
                                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 
                                transform: `translateX(-${exploreSliderIndex * (100 / (exploreProducts.length > 4 ? 4 : exploreProducts.length))}%)`,
                                gap: '2rem'
                            }}>
                                {exploreProducts.map(product => (
                                    <div key={product.id} style={{ flex: '0 0 calc(25% - 1.5rem)', minWidth: '300px' }}>
                                        <Link href={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <div style={{ textAlign: 'center', transition: 'transform 0.3s ease' }} className="product-card-hover">
                                                <div style={{ position: 'relative', aspectRatio: '3/4', marginBottom: '1.5rem', overflow: 'hidden', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                                                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <div className="add-to-cart-overlay" style={{
                                                        position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', color: '#fff',
                                                        padding: '1rem', opacity: 0, transition: 'opacity 0.3s ease', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em'
                                                    }}>
                                                        ADD TO CART
                                                    </div>
                                                </div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 500, margin: '0 0 0.5rem', fontFamily: '"Playfair Display", serif' }}>{product.name}</h3>
                                                <p style={{ fontWeight: 300, color: '#5d0821', letterSpacing: '0.1em' }}>₹{product.price.toLocaleString()}</p>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {exploreProducts.length > 4 && (
                            <>
                                <button 
                                    onClick={() => setExploreSliderIndex(prev => Math.max(0, prev - 1))}
                                    style={{
                                        position: 'absolute', left: '-2.5rem', top: '40%', transform: 'translateY(-50%)',
                                        background: 'white', border: '1px solid #eee', borderRadius: '50%', width: '50px', height: '50px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        zIndex: 10, visibility: exploreSliderIndex === 0 ? 'hidden' : 'visible'
                                    }}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <button 
                                    onClick={() => setExploreSliderIndex(prev => Math.min(exploreProducts.length - 4, prev + 1))}
                                    style={{
                                        position: 'absolute', right: '-2.5rem', top: '40%', transform: 'translateY(-50%)',
                                        background: 'white', border: '1px solid #eee', borderRadius: '50%', width: '50px', height: '50px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        zIndex: 10, visibility: exploreSliderIndex >= exploreProducts.length - 4 ? 'hidden' : 'visible'
                                    }}
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Mudhra Collection */}
            {isHome && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', minHeight: '600px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ padding: '5% 12%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ letterSpacing: '0.3rem', color: '#5d0821', fontWeight: 700, marginBottom: '1.5rem', fontSize: '0.8rem' }}>THE MUDHRA SERIES</span>
                        <h2 style={{ fontSize: '5.5rem', fontWeight: 400, margin: '0 0 2rem', lineHeight: 1, fontFamily: '"Playfair Display", serif', position: 'relative', paddingBottom: '20px' }}>
                            Timeless Block Prints
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '60px', height: '1px', background: '#5d0821' }}></div>
                        </h2>
                        <p style={{ color: '#555', lineHeight: 2, fontSize: '1.1rem', fontWeight: 300, maxWidth: '500px' }}>
                            Discover the essence of heritage in every weave. Our Mudhra collection celebrates the ancient art of hand-block printing on the finest south cotton, curated for the modern connoisseur of elegance.
                        </p>
                        <Link href="/shop" style={{ marginTop: '3rem', color: '#000', textDecoration: 'none', fontWeight: 700, borderBottom: '2px solid #5d0821', width: 'fit-content', paddingBottom: '5px' }}>EXPLORE COLLECTION</Link>
                    </div>
                    <div style={{ background: 'url(/images/block-print-saree.png) center/cover no-repeat' }}></div>
                </div>
            )}
            
            {/* Interactive WhatsApp Feature Showcase */}
            {isHome && (
                <div style={{ padding: '8rem 2rem', background: '#fdfbfb', borderTop: '1px solid #f0f0f0', overflow: 'hidden' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) 1fr', gap: '4rem', alignItems: 'center' }}>
                        <div>
                            <span style={{ letterSpacing: '0.3rem', color: '#5d0821', fontWeight: 700, marginBottom: '1.5rem', fontSize: '0.8rem', display: 'block' }}>PERSONALIZED SHOPPING</span>
                            <h2 style={{ 
                                fontSize: '4.5rem', fontWeight: 400, margin: '0 0 2rem', 
                                fontFamily: '"Playfair Display", serif', lineHeight: 1.1, position: 'relative', paddingBottom: '20px'
                            }}>
                                Shop via WhatsApp
                                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '80px', height: '1px', background: '#5d0821' }}></div>
                            </h2>
                            <p style={{ color: '#555', lineHeight: 1.8, fontSize: '1.2rem', fontWeight: 300, marginBottom: '3rem' }}>
                                Experience the charm of traditional shopping with modern convenience. Connect with our experts directly—view fabric details, asking for more pictures, and checkout effortlessly via chat.
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '4rem' }}>
                                {[
                                    { icon: Search, title: 'Browse & Enquire', desc: 'Love a saree? Just send us a screenshot or type "Hi" to see our digital catalog.' },
                                    { icon: MessageSquare, title: 'Expert Guidance', desc: 'Get personal recommendations and style tips from our design experts in real-time.' },
                                    { icon: Check, title: 'Easy Checkout', desc: 'Finalize your order and pay securely through your preferred UPI or card apps.' }
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                                        <div style={{ 
                                            width: '50px', height: '50px', borderRadius: '50%', background: '#fdf2f2', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821', flexShrink: 0
                                        }}>
                                            <item.icon size={24} />
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem', fontFamily: '"Playfair Display", serif' }}>{item.title}</h4>
                                            <p style={{ color: '#777', fontSize: '0.95rem', margin: 0 }}>{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <a href="https://wa.me/917558189732" target="_blank" rel="noopener noreferrer" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '1rem',
                                background: '#5d0821', color: '#fff', padding: '1.2rem 3rem',
                                textDecoration: 'none', fontWeight: 700, letterSpacing: '0.1em',
                                borderRadius: '4px', boxShadow: '0 15px 35px rgba(93, 8, 33, 0.2)',
                                transition: 'all 0.3s'
                            }}>
                                <MessageSquare size={20} />
                                START CHATTING NOW
                            </a>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: '-20px', background: 'radial-gradient(circle, rgba(93,8,33,0.05) 0%, transparent 70%)', zIndex: 0 }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <WhatsAppMockup />
                            </div>
                        </div>
                    </div>
                </div>
            )}



            {/* About Page Template */}
            {params.slug === 'about-us' && (
                <div style={{ padding: '0 0 8rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '4rem', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
                        <div style={{ aspectRatio: '3/4', background: 'url(/images/hero-saree.png) center/cover no-repeat', borderRadius: '4px' }}></div>
                        <div style={{ padding: '2rem' }}>
                            <span style={{ color: '#5d0821', fontWeight: 700, letterSpacing: '0.2em', fontSize: '0.8rem' }}>OUR STORY</span>
                            <h2 style={{ fontSize: '4rem', fontFamily: '"Playfair Display", serif', margin: '1.5rem 0', fontWeight: 400 }}>Cast Print</h2>
                            <p style={{ fontSize: '1.2rem', lineHeight: 1.8, color: '#444', fontWeight: 300, marginBottom: '2rem' }}>
                                Born from a passion for authentic Indian textiles, Cast Print is dedicated to bringing the finest drapes to your wardrobe. We believe that every saree tells a story of craftsmanship, culture, and timeless beauty.
                            </p>
                            <p style={{ lineHeight: 1.8, color: '#666', marginBottom: '2rem' }}>
                                Our collections are meticulously curated, focusing on the intricate details of hand-block prints, traditional weaves, and contemporary aesthetics. From the spiritual looms of the south to the vibrant prints of the north, we bridge the gap between tradition and modern luxury.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '4rem' }}>
                                <div>
                                    <h4 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', marginBottom: '1rem' }}>Our Vision</h4>
                                    <p style={{ color: '#777', fontSize: '0.9rem', lineHeight: 1.6 }}>To become the premier destination for sustainable and authentic hand-crafted sarees worldwide.</p>
                                </div>
                                <div>
                                    <h4 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', marginBottom: '1rem' }}>Our Promise</h4>
                                    <p style={{ color: '#777', fontSize: '0.9rem', lineHeight: 1.6 }}>Purity in fabric, authenticity in design, and a premium experience in every interaction.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Page Template */}
            {params.slug === 'contact' && (
                <div style={{ padding: '0 2rem 8rem', maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '6rem' }}>
                        <div>
                            <h2 style={{ fontSize: '3rem', fontFamily: '"Playfair Display", serif', marginBottom: '3rem', fontWeight: 400 }}>Get in Touch</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821' }}>
                                        <MapPin size={24} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Our Flagship Store</h4>
                                        <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.6 }}>1 Dhanalakshminagar West Street, Uppilipalayam,<br />Coimbatore, Tamilnadu - 641015</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821' }}>
                                        <Phone size={24} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Direct Line</h4>
                                        <p style={{ color: '#666', fontSize: '0.95rem' }}>+91 75581 89732</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821' }}>
                                        <Mail size={24} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Online Support</h4>
                                        <p style={{ color: '#666', fontSize: '0.95rem' }}>castprinceofficial@gmail.com</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ background: '#fbfbfb', padding: '4rem', borderRadius: '8px' }}>
                            <form style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#999', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Full Name</label>
                                        <input type="text" style={{ width: '100%', padding: '1rem', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none' }} placeholder="John Doe" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#999', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Email Address</label>
                                        <input type="email" style={{ width: '100%', padding: '1rem', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none' }} placeholder="john@example.com" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#999', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Subject</label>
                                    <input type="text" style={{ width: '100%', padding: '1rem', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none' }} placeholder="Inquiry about collections" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#999', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Message</label>
                                    <textarea rows={5} style={{ width: '100%', padding: '1rem', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', resize: 'none' }} placeholder="Your message here..." />
                                </div>
                                <button style={{ background: '#5d0821', color: '#fff', padding: '1.2rem', border: 'none', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', marginTop: '1rem' }}>SEND MESSAGE</button>
                        </form>
                    </div>
                </div>
            </div>
            )}
            
            {/* Lifestyle Gallery Slider (6-image Grid) */}
            {isHome && galleryImages.length > 0 && (
                <div style={{ padding: '8rem 2rem', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                        <h2 style={{ 
                            fontSize: '3.5rem', fontWeight: 400, margin: '0 auto 1.5rem', 
                            fontFamily: '"Playfair Display", serif', position: 'relative', 
                            width: 'fit-content', paddingBottom: '20px', letterSpacing: '0.05em'
                        }}>
                            Our Gallery
                            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '80px', height: '1px', background: '#5d0821' }}></div>
                        </h2>
                        <p style={{ color: '#666', fontSize: '1rem', letterSpacing: '0.1em', fontWeight: 300 }}>GLIMPSES OF ELEGANCE</p>
                    </div>

                    <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
                        <div style={{ 
                            display: 'flex', 
                            transition: 'transform 0.8s cubic-bezier(0.65, 0, 0.35, 1)',
                            transform: `translateX(-${galleryIndex * 100}%)`
                        }}>
                            {/* Chunk images into groups of 6 */}
                            {Array.from({ length: Math.ceil(galleryImages.length / 6) }).map((_, pageIdx) => (
                                <div key={pageIdx} style={{ 
                                    minWidth: '100%', 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(3, 1fr)', 
                                    gridTemplateRows: 'repeat(2, 300px)',
                                    gap: '1.5rem' 
                                }}>
                                    {galleryImages.slice(pageIdx * 6, (pageIdx * 6) + 6).map((url, imgIdx) => (
                                        <div 
                                            key={imgIdx} 
                                            style={{ 
                                                position: 'relative', 
                                                borderRadius: '8px', 
                                                overflow: 'hidden',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                                                background: '#f9f9f9'
                                            }}
                                        >
                                            <img 
                                                src={url} 
                                                alt={`Gallery ${pageIdx}-${imgIdx}`} 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                                                className="gallery-grid-img"
                                            />
                                        </div>
                                    ))}
                                    {/* Fill empty slots if last page has < 6 images */}
                                    {galleryImages.slice(pageIdx * 6, (pageIdx * 6) + 6).length < 6 && 
                                        Array.from({ length: 6 - galleryImages.slice(pageIdx * 6, (pageIdx * 6) + 6).length }).map((_, emptyIdx) => (
                                            <div key={`empty-${emptyIdx}`} style={{ background: '#fdfdfd', borderRadius: '8px', border: '1px dashed #eee' }} />
                                        ))
                                    }
                                </div>
                            ))}
                        </div>

                        {/* Navigation Arrows */}
                        {galleryImages.length > 6 && (
                            <>
                                <button 
                                    onClick={() => setGalleryIndex(prev => (prev - 1 + Math.ceil(galleryImages.length / 6)) % Math.ceil(galleryImages.length / 6))}
                                    style={{
                                        position: 'absolute', left: '-1rem', top: '50%', transform: 'translateY(-50%)',
                                        background: '#fff', border: '1px solid #eee', borderRadius: '50%', width: '50px', height: '50px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10,
                                        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <button 
                                    onClick={() => setGalleryIndex(prev => (prev + 1) % Math.ceil(galleryImages.length / 6))}
                                    style={{
                                        position: 'absolute', right: '-1rem', top: '50%', transform: 'translateY(-50%)',
                                        background: '#fff', border: '1px solid #eee', borderRadius: '50%', width: '50px', height: '50px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10,
                                        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Indicators */}
                    {galleryImages.length > 6 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '3rem' }}>
                            {Array.from({ length: Math.ceil(galleryImages.length / 6) }).map((_, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setGalleryIndex(idx)}
                                    style={{
                                        width: idx === galleryIndex ? '40px' : '10px',
                                        height: '10px', borderRadius: '5px', background: '#5d0821',
                                        opacity: idx === galleryIndex ? 1 : 0.2, cursor: 'pointer',
                                        transition: 'all 0.4s'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ height: '4rem' }}></div>
            <ShopFooter />

            <style jsx global>{`
                .cms-content-wrapper h2 { font-size: 3rem; font-weight: 400; margin: 4rem 0 2rem; color: #111; position: relative; width: fit-content; margin-left: auto; margin-right: auto; padding-bottom: 20px; fontFamily: "Playfair Display", serif; }
                .cms-content-wrapper h2::after { content: ""; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 80px; height: 1px; background: #5d0821; }
                .cms-content-wrapper p { margin-bottom: 2.5rem; color: #666; font-size: 1.1rem; line-height: 1.8; font-weight: 300; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
