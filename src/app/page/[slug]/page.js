'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ArrowLeft, Home, ShoppingCart, MessageCircle, Clock, Calendar, User, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function CMSPageView() {
    const params = useParams();
    const router = useRouter();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPageData = async () => {
            if (!params.slug) return;
            try {
                const { data, error } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', params.slug)
                    .eq('status', 'published') // Only show published
                    .eq('visibility', 'public') // Only show public
                    .single();

                if (error || !data) {
                    console.error('Content unreachable or missing:', error);
                    setPage(null);
                } else {
                    setPage(data);

                    // SE Suite Header Updates
                    document.title = `${data.seo_title || data.title} | Caste Print`;

                    // Inject Custom JS if present
                    if (data.custom_js) {
                        try {
                            const script = document.createElement('script');
                            script.innerHTML = data.custom_js;
                            document.body.appendChild(script);
                        } catch (err) {
                            console.error('Custom JS Failure:', err);
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

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1.5rem', background: '#ffffff' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid #f3f3f3', borderTop: '4px solid #000', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#111', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>Rendering specialized content...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!page) {
        return (
            <div style={{ padding: '8rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui' }}>
                <h1 style={{ fontSize: '5rem', margin: '0 0 1rem', fontWeight: 900, letterSpacing: '-0.04em' }}>404</h1>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Page is currently unreachable</h2>
                <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '3rem', lineHeight: 1.6 }}>The content you are looking for has been moved, archived, or is being updated by our team.</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <Link href="/shop" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: '#000', color: '#fff', padding: '1rem 2rem', borderRadius: '50px', textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem' }}>
                        Return to Collections <ShoppingCart size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    // Dynamic Style Injection
    const renderCustomCSS = () => {
        if (!page.custom_css) return null;
        return <style dangerouslySetInnerHTML={{ __html: page.custom_css }} />;
    };

    // Template Layouts
    if (page.template === 'landing') {
        return (
            <div className="landing-template" style={{ minHeight: '100vh', background: '#fff' }}>
                {renderCustomCSS()}
                <div
                    className="cms-content-raw"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                />
            </div>
        );
    }

    const isHome = page.template === 'home';

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {renderCustomCSS()}

            {/* Elegant Fixed Header */}
            <header style={{
                borderBottom: '1px solid #f0f0f0', padding: '1.25rem 2rem',
                position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(15px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Link href="/shop" style={{ textDecoration: 'none', color: '#000', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, fontSize: '1.2rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>💮</span>
                    Caste Print
                </Link>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link href="/shop" style={{ textDecoration: 'none', color: '#111', fontSize: '0.9rem', fontWeight: 700 }}>Shop Collection</Link>
                    <Link href="/cart" style={{ textDecoration: 'none', color: '#111', fontSize: '0.9rem', fontWeight: 700 }}>My Cart</Link>
                    <button style={{ background: '#000', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                        Contact Us
                    </button>
                </div>
            </header>

            {/* Featured Hero Area (WooCommerce Style) */}
            <div style={{
                background: page.featured_image ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${page.featured_image})` : '#f9fafb',
                backgroundSize: 'cover', backgroundPosition: 'center',
                padding: isHome ? '10rem 2rem' : '6rem 2rem 4rem', textAlign: isHome ? 'center' : 'left',
                color: page.featured_image ? '#fff' : '#000',
                borderBottom: '1px solid #f0f0f0'
            }}>
                <div style={{ maxWidth: isHome ? '1000px' : '900px', margin: '0 auto' }}>
                    {!isHome && (
                        <button
                            onClick={() => router.back()}
                            style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: page.featured_image ? 'rgba(255,255,255,0.8)' : '#666', fontSize: '0.85rem', marginBottom: '2rem', padding: 0 }}
                        >
                            <ArrowLeft size={16} /> Previous
                        </button>
                    )}

                    <h1 style={{
                        fontSize: isHome ? '4.5rem' : '3.5rem', fontWeight: 900, margin: '0 0 1.5rem',
                        lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: '800px',
                        fontFamily: 'var(--font-heading), serif'
                    }}>
                        {page.title}
                    </h1>

                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontSize: '0.9rem', opacity: 0.8, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> Admin Editorial</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> Updated {new Date(page.updated_at).toLocaleDateString()}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} /> 5 min read</span>
                    </div>
                </div>
            </div>

            {/* Content Body Rendering */}
            <div style={{
                padding: '5rem 2rem',
                maxWidth: page.template === 'wide' ? '1200px' : '900px',
                margin: '0 auto'
            }}>
                <div
                    className="cms-content-wrapper"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                    style={{
                        fontSize: '1.25rem', lineHeight: 1.85, color: '#2d3748',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                />
            </div>

            {/* Content Sharing / Action Footer */}
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem 6rem' }}>
                <div style={{ background: '#f8fafc', padding: '2.5rem', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #edf2f7' }}>
                    <div>
                        <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800 }}>Found this helpful?</h4>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.95rem' }}>Share this guide with your circle for their next celebration.</p>
                    </div>
                    <button style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.8rem 1.5rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                        <Share2 size={18} /> Copy Link
                    </button>
                </div>
            </div>

            {/* Premium Site Footer */}
            <footer style={{ background: '#000', color: '#fff', padding: '8rem 2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '4rem' }}>
                    <div>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>💮</div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 1rem' }}>Caste Print</h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: '2rem' }}>Experience the heritage of Indian textiles. Curated with love, delivered with elegance.</p>
                    </div>
                    <div>
                        <h5 style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>Collections</h5>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
                            <li><Link href="/shop" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Pure Silk Special</Link></li>
                            <li><Link href="/shop" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Wedding Bridal</Link></li>
                            <li><Link href="/shop" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Daily Elegance</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5 style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>Information</h5>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
                            <li><Link href="/page/about-us" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Legacy & Story</Link></li>
                            <li><Link href="/page/contact" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Visit Our Boutique</Link></li>
                            <li><Link href="/page/shipping-policy" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Care & Shipping</Link></li>
                        </ul>
                    </div>
                </div>
                <div style={{ maxWidth: '1200px', margin: '5rem auto 0', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    <span>© 2026 Caste Print. Curated by Premium CMS.</span>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <Link href="/page/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
                        <Link href="/page/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
                    </div>
                </div>
            </footer>

            <style jsx global>{`
                .cms-content-wrapper h2 { font-size: 2.25rem; font-weight: 900; margin: 4rem 0 1.5rem; color: #111; letter-spacing: -0.02em; }
                .cms-content-wrapper h3 { font-size: 1.75rem; font-weight: 800; margin: 3rem 0 1.25rem; color: #222; }
                .cms-content-wrapper p { margin-bottom: 2rem; }
                .cms-content-wrapper b, .cms-content-wrapper strong { font-weight: 800; color: #000; }
                .cms-content-wrapper ul, .cms-content-wrapper ol { margin-bottom: 2.5rem; padding-left: 2rem; }
                .cms-content-wrapper li { margin-bottom: 1rem; }
                .cms-content-wrapper a { color: black; text-decoration: underline; font-weight: 700; text-underline-offset: 4px; }
                .cms-content-wrapper blockquote { border-left: 5px solid #000; padding: 2rem 0 2rem 3rem; margin: 3rem 0; font-size: 1.5rem; font-style: italic; color: #4a5568; }
                .cms-content-wrapper img { width: 100%; border-radius: 20px; margin: 3rem 0; box-shadow: 0 20px 50px rgba(0,0,0,0.1); }
            `}</style>
        </div>
    );
}
