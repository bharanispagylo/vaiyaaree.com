'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, Phone, Mail } from 'lucide-react';
import ShopHeader from '@/components/ShopHeader';
import ShopFooter from '@/components/ShopFooter';

export default function ContactPage() {
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPageData = async () => {
            try {
                const { data } = await supabase
                    .from('cms_pages')
                    .select('*')
                    .eq('slug', 'contact')
                    .single();
                if (data) {
                    setPage(data);
                    document.title = `${data.seo_title || data.title} | Cast Printz`;
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
            <div style={{ padding: '4rem 2rem 8rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
                    <h2 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-body)', marginBottom: '1.5rem', fontWeight: 500 }}>Get in Touch</h2>
                    <p style={{ fontSize: '1.25rem', color: '#666', maxWidth: '800px', margin: '0 auto', lineHeight: 1.8 }}>
                        Experience the touch of luxury in person or reach out to us for any queries. Our team is here to assist you with every detail of your collection.
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                    <div style={{ background: '#fbfbfb', padding: '3rem', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><MapPin size={36} /></div>
                        <div>
                            <h4 style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '1.3rem' }}>Our Flagship Store</h4>
                            <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: 1.6, margin: 0 }}>1 Dhanalakshminagar West Street, Uppilipalayam,<br />Coimbatore, Tamilnadu - 641015</p>
                        </div>
                    </div>
                    <div style={{ background: '#fbfbfb', padding: '3rem', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><Phone size={36} /></div>
                        <div>
                            <h4 style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '1.3rem' }}>Direct Line</h4>
                            <p style={{ color: '#666', fontSize: '1.1rem', margin: 0 }}>+1 (555) 167-8232</p>
                        </div>
                    </div>
                    <div style={{ background: '#fbfbfb', padding: '3rem', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}><Mail size={36} /></div>
                        <div>
                            <h4 style={{ margin: '0 0 1rem', fontWeight: 700, fontSize: '1.3rem' }}>Online Support</h4>
                            <p style={{ color: '#666', fontSize: '1.1rem', margin: 0 }}>castprintzofficial@gmail.com</p>
                        </div>
                    </div>
                </div>
            </div>
            <ShopFooter />
        </div>
    );
}
