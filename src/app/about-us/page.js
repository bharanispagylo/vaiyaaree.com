'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';

export default function AboutUsPage() {
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const { data } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', 'about-us')
                    .single();
                if (data) {
                    setPage(data);
                    document.title = `${data.seo_title || data.title} | Cast Print`;
                }
            } finally {
                setLoading(false);
            }
        };
        fetchPageData();
    }, []);

    if (loading) return null;
    if (!page) return <div>Page not found</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)' }}>
            <ShopHeader />
            <div style={{ padding: '4rem 2rem 8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8rem', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ aspectRatio: '3/4', background: 'url(/images/hero-saree.png) center/cover no-repeat', borderRadius: '4px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}></div>
                    <div>
                        <h2 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-heading)', marginBottom: '1.5rem', fontWeight: 700, color: 'hsl(var(--text-main))', letterSpacing: '-0.02em' }}>Our Story</h2>
                        
                        <div style={{ fontSize: '1.15rem', lineHeight: 1.8, color: 'hsl(var(--text-muted))', marginBottom: '2.5rem' }}>
                            <p style={{ marginBottom: '1.5rem' }}>
                                Founded with a passion for preserving the rich heritage of Indian textiles, Cast Print has been a beacon of tradition and elegance for generations. What started as a modest boutique has blossomed into a curated destination for pure silk, hand-loomed cottons, and exquisite block prints.
                            </p>
                            <p style={{ marginBottom: '1.5rem' }}>
                                Every saree in our collection is woven with a story of craftsmanship, dedication, and timeless beauty. We work directly with master weavers across India to bring you authentic, ethically sourced fabrics that celebrate the artistry of our culture.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '3rem' }}>
                            <div style={{ padding: '2rem', background: '#fff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', boxShadow: 'var(--shadow-sm)' }}>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', fontFamily: 'var(--font-heading)', color: 'hsl(var(--text-main))' }}>Heritage</h3>
                                <p style={{ fontSize: '0.95rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>Deeply rooted in the traditions of handloom weaving, bringing authentic craftsmanship to the modern era.</p>
                            </div>
                            <div style={{ padding: '2rem', background: '#fff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))', boxShadow: 'var(--shadow-sm)' }}>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', fontFamily: 'var(--font-heading)', color: 'hsl(var(--text-main))' }}>Promise</h3>
                                <p style={{ fontSize: '0.95rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>Guaranteeing the purity of every thread, sustaining artisan livelihoods, and delivering uncompromising quality.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ShopFooter />
        </div>
    );
}
