'use client';

import { useState, useEffect } from 'react';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';
import { Instagram } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function AboutUsPage() {
    const [mounted, setMounted] = useState(false);
    const [pageData, setPageData] = useState(null);

    useEffect(() => {
        setMounted(true);
        document.title = 'About Us | Vaiyaaree';

        const fetchCmsAbout = async () => {
            try {
                const { data } = await supabase
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
            <ShopHeader />

            {/* Main 2-Column Content */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem 8rem' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '4rem',
                    alignItems: 'start'
                }}>
                    {/* Left Column: Brand Story */}
                    <div>
                        <div style={{ marginBottom: '1.8rem' }}>
                            <h2 style={{ fontSize: '1.6rem', fontWeight: 600, color: '#111', margin: '0 0 0.25rem 0' }}>{pageData?.title || 'Vaiyaaree'}</h2>
                            <p style={{ fontSize: '0.95rem', color: '#666', margin: 0, fontWeight: 400 }}>A Vaiyaaree company</p>
                        </div>

                        {pageData?.content && pageData.content.trim() ? (
                            <div 
                                className="cms-content" 
                                style={{ fontSize: '1.05rem', lineHeight: '1.85', color: '#444' }} 
                                dangerouslySetInnerHTML={{ __html: pageData.content }} 
                            />
                        ) : (
                            <div style={{ fontSize: '1.05rem', lineHeight: '1.85', color: '#444', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <p style={{ margin: 0 }}>
                                    Vaiyaaree sarees aims at offering a fantastic blend of style, fashion, colours and quality. Our journey began with a simple idea – to create a platform where saree lovers could find the most exquisite and authentic collection of sarees from all over India.
                                </p>
                                <p style={{ margin: 0 }}>
                                    Started as an Instagram-based business with South cotton printed sarees, we have been committed to promoting traditional Indian textiles and craftsmanship.
                                </p>
                                <p style={{ margin: 0 }}>
                                    Vaiyaaree sarees grew as a well trusted brand, well-received by its 100K+ Instagram followers, stands a testimony.
                                </p>
                                <p style={{ margin: 0 }}>
                                    We are passionate about providing our customers with a seamless shopping experience. Our team is always ready to assist you with any queries or concerns you may have. We pride ourselves on our customer-centric approach and our commitment to making every customer feel special. Our goal is to be your go-to destination for all your saree needs.
                                </p>
                                <p style={{ margin: 0 }}>
                                    Each print has a story to tell and each product is created with lot of love.
                                </p>
                            </div>
                        )}

                        {/* Sign-off */}
                        <div style={{ marginTop: '2.5rem', color: '#222', fontSize: '1.05rem', lineHeight: '1.6' }}>
                            <p style={{ margin: 0, color: '#555' }}>Yours</p>
                            <p style={{ margin: 0, fontWeight: 600, color: '#111' }}>Vaiyaaree Sarees</p>
                        </div>

                        {/* Social Icons */}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', alignItems: 'center' }}>
                            {[
                                { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/vaiyaaree' },
                            ].map((social, idx) => (
                                <a
                                    key={idx}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    style={{
                                        width: '38px',
                                        height: '38px',
                                        borderRadius: '50%',
                                        border: '1px solid #e0e0e0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#555',
                                        textDecoration: 'none',
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
                                        e.currentTarget.style.color = '#555';
                                        e.currentTarget.style.borderColor = '#e0e0e0';
                                    }}
                                >
                                    <social.icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Model Saree Image */}
                    <div style={{ position: 'sticky', top: '100px' }}>
                        <div style={{
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 15px 40px rgba(0,0,0,0.08)',
                            background: '#f8f8f8',
                            border: '1px solid #eaeaea'
                        }}>
                            <img
                                src={pageData?.featured_image || "/images/about-us-saree.jpg"}
                                alt="Vaiyaaree About Us Saree"
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '680px',
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <ShopFooter />
        </div>
    );
}
