'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';

export default function PolicyPage({ slug, title: fallbackTitle }) {
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const { data } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', slug)
                    .single();
                if (data) {
                    setPage(data);
                    document.title = `${data.seo_title || data.title} | Vaiyaaree`;
                }
            } catch (err) {
                console.error(`Error fetching CMS page (${slug}):`, err);
            } finally {
                setLoading(false);
            }
        };
        fetchPageData();
    }, [slug]);

    if (loading) return null;
    if (!page) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ShopHeader />
            <div style={{ flex: 1, padding: '8rem 2rem', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h1>
                <p>We couldn't find the page you're looking for.</p>
            </div>
            <ShopFooter />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)' }}>
            <ShopHeader />
            <div style={{ padding: '6rem 2rem 10rem', maxWidth: '800px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 500, marginBottom: '3rem', color: '#000' }}>{page.title}</h1>
                <div 
                    className="cms-content"
                    dangerouslySetInnerHTML={{ __html: page.content }} 
                    style={{ 
                        fontSize: '1.1rem', 
                        lineHeight: 1.8, 
                        color: '#444' 
                    }} 
                />
            </div>
            <ShopFooter />
        </div>
    );
}
