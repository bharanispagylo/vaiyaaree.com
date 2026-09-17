'use client';

import { useState, useEffect } from 'react';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';
import { Instagram } from 'lucide-react';
import { mysqlClient } from '@/lib/mysqlClient';

export default function AboutUsPage() {
    const [mounted, setMounted] = useState(false);
    const [pageData, setPageData] = useState(null);

    useEffect(() => {
        setMounted(true);
        document.title = 'About Us | Vaiyaaree';

        const fetchCmsAbout = async () => {
            try {
                const { data } = await mysqlClient
                    .from('cms_pages')
                    .select('*')
                    .or('slug.eq.about-us,slug.eq.about')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    setPageData(data);
                    document.title = `${data.seo_title || data.title || 'About Us'} | Vaiyaaree`;
                }
            } catch (err) {
                console.error('Error fetching CMS About Us page:', err);
            }
        };
        fetchCmsAbout();
    }, []);

    if (!mounted) {
        return (
            <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)', color: '#111' }}>
                <ShopHeader />
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem 8rem', minHeight: '600px' }} />
                <ShopFooter />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)', color: '#111' }}>
            {pageData?.custom_css && <style dangerouslySetInnerHTML={{ __html: pageData.custom_css }} />}
            <style dangerouslySetInnerHTML={{
                __html: `
                .about-us-cms-container {
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: 3.5rem 1.5rem 6rem;
                }
                .about-us-cms-content {
                    font-size: 1.05rem;
                    line-height: 1.85;
                    color: #333;
                }
                .about-us-cms-content h1, .about-us-cms-content h2, .about-us-cms-content h3 {
                    color: #111;
                    font-weight: 600;
                }
                .about-us-cms-content img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                }
                @media (max-width: 768px) {
                    .cms-block-text-image, .cms-block-image-text {
                        flex-direction: column !important;
                        gap: 24px !important;
                    }
                    .about-us-cms-container {
                        padding: 2rem 1rem 4rem;
                    }
                }
            `}} />
            <ShopHeader />

            <div className="about-us-cms-container">
                {/* Optional Top Featured Cover Media if set in CMS */}
                {pageData?.featured_image && (
                    <div style={{
                        marginBottom: '3rem',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
                        border: '1px solid #eaeaea',
                        background: '#f8f8f8'
                    }}>
                        <img
                            src={pageData.featured_image}
                            alt={pageData?.title || "About Vaiyaaree"}
                            style={{
                                width: '100%',
                                maxHeight: '460px',
                                objectFit: 'cover',
                                display: 'block'
                            }}
                        />
                    </div>
                )}

                {/* Dynamic CMS Content */}
                {pageData?.content && pageData.content.trim() ? (
                    <div 
                        className="about-us-cms-content" 
                        dangerouslySetInnerHTML={{ __html: pageData.content }} 
                    />
                ) : (
                    /* Default Fallback Content with Text & Image, Image & Text, and Full Width Text */
                    <div className="about-us-cms-content">
                        <section style={{ padding: '40px 20px', textAlign: 'center', background: '#fdfbf7', border: '1px solid #f0e6d2', borderRadius: '16px', marginBottom: '40px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#5d0821', display: 'block', marginBottom: '8px' }}>
                                Welcome to Vaiyaaree
                            </span>
                            <h1 style={{ fontSize: '2.5rem', color: '#111', margin: '0 0 12px 0', fontWeight: 600 }}>
                                The Story Behind Our Sarees
                            </h1>
                            <p style={{ fontSize: '1.1rem', color: '#666', maxWidth: '640px', margin: '0 auto', lineHeight: 1.7 }}>
                                A harmonious blend of tradition, handloom craftsmanship, and modern style.
                            </p>
                        </section>

                        {/* Block 1: Text and Image (Text Left, Image Right) */}
                        <div className="cms-block-text-image" style={{ display: 'flex', gap: '40px', alignItems: 'center', margin: '40px 0', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 340px', minWidth: '280px' }}>
                                <span style={{ display: 'inline-block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5d0821', marginBottom: '8px' }}>
                                    Our Beginning
                                </span>
                                <h2 style={{ fontSize: '1.85rem', fontWeight: 600, color: '#111', margin: '0 0 16px 0', lineHeight: 1.3 }}>
                                    Crafted with Love & Tradition
                                </h2>
                                <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#444', marginBottom: '16px' }}>
                                    Vaiyaaree began with a simple idea: to create a platform where saree lovers could find the most exquisite, authentic collection of handwoven and printed sarees from across India.
                                </p>
                                <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#444', margin: 0 }}>
                                    Started as an Instagram-based business with South cotton printed sarees, we have remained committed to promoting traditional Indian textiles, master weaver clusters, and sustainable craftsmanship.
                                </p>
                            </div>
                            <div style={{ flex: '1 1 340px', minWidth: '280px' }}>
                                <img
                                    src="/images/about-us-saree.jpg"
                                    alt="Vaiyaaree Handcrafted Saree"
                                    style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.08)', objectFit: 'cover', display: 'block' }}
                                />
                            </div>
                        </div>

                        {/* Block 2: Full Width Text Block */}
                        <div className="cms-block-full-text" style={{ margin: '48px 0', padding: '36px 0', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
                            <div style={{ maxWidth: '840px', margin: '0 auto', textAlign: 'left' }}>
                                <h2 style={{ fontSize: '2rem', fontWeight: 600, color: '#111', marginBottom: '18px', lineHeight: 1.3 }}>
                                    Our Philosophy & Promise
                                </h2>
                                <p style={{ fontSize: '1.15rem', lineHeight: '1.85', color: '#333', marginBottom: '16px' }}>
                                    We believe true elegance is effortless. By partnering directly with skilled artisans and weavers, we ensure every saree delivers timeless beauty, supreme comfort, and honest pricing.
                                </p>
                                <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#555', margin: 0 }}>
                                    We are passionate about providing our customers with a seamless shopping experience. Our team is always ready to assist you with any queries or custom blouse stitching needs. We pride ourselves on our customer-centric approach and our commitment to making every customer feel truly special.
                                </p>
                            </div>
                        </div>

                        {/* Block 3: Image and Text (Image Left, Text Right) */}
                        <div className="cms-block-image-text" style={{ display: 'flex', gap: '40px', alignItems: 'center', margin: '40px 0', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 340px', minWidth: '280px' }}>
                                <img
                                    src="/images/about-us-saree.jpg"
                                    alt="Authentic Weaves Community"
                                    style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.08)', objectFit: 'cover', display: 'block' }}
                                />
                            </div>
                            <div style={{ flex: '1 1 340px', minWidth: '280px' }}>
                                <span style={{ display: 'inline-block', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5d0821', marginBottom: '8px' }}>
                                    Trusted by 100K+
                                </span>
                                <h2 style={{ fontSize: '1.85rem', fontWeight: 600, color: '#111', margin: '0 0 16px 0', lineHeight: 1.3 }}>
                                    Every Print Tells a Story
                                </h2>
                                <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#444', marginBottom: '16px' }}>
                                    Each print has a story to tell and each saree is created with a lot of love. Our growing community of over 100K+ Instagram followers stands as a heartfelt testimony to our quality and dedication.
                                </p>
                                <p style={{ fontSize: '1.05rem', lineHeight: '1.8', color: '#444', margin: 0 }}>
                                    From daily office drapes to festive family celebrations, our sarees are designed to make you look and feel your absolute best.
                                </p>
                            </div>
                        </div>

                        {/* Block 4: Sign-off & Social Connect */}
                        <div style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <div>
                                <p style={{ margin: 0, color: '#777', fontSize: '1rem' }}>Warm regards,</p>
                                <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#111', fontSize: '1.15rem' }}>Vaiyaaree Sarees</p>
                                <p style={{ margin: '2px 0 0 0', color: '#888', fontSize: '0.85rem' }}>A Vaiyaaree company</p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <a
                                    href="https://www.instagram.com/vaiyaaree"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Instagram"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '30px',
                                        border: '1px solid #e0e0e0',
                                        color: '#333',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        transition: 'all 0.3s ease',
                                        background: '#fff'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#5d0821';
                                        e.currentTarget.style.color = '#fff';
                                        e.currentTarget.style.borderColor = '#5d0821';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#fff';
                                        e.currentTarget.style.color = '#333';
                                        e.currentTarget.style.borderColor = '#e0e0e0';
                                    }}
                                >
                                    <Instagram size={18} /> Follow on Instagram
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ShopFooter />
        </div>
    );
}
