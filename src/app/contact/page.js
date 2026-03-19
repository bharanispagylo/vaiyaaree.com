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
            <div style={{ padding: '4rem 2rem 8rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
                    <h2 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-body)', marginBottom: '1.5rem', fontWeight: 500 }}>Get in Touch</h2>
                    <p style={{ fontSize: '1.25rem', color: '#666', maxWidth: '800px', margin: '0 auto', lineHeight: 1.8 }}>
                        Experience the touch of luxury in person or reach out to us for any queries. Our team is here to assist you with every detail of your collection.
                    </p>
                    {page.content && (
                        <div 
                            className="cms-content"
                            dangerouslySetInnerHTML={{ __html: page.content.replace(/Aiswarya Sarees/gi, 'Cast Print') }}
                            style={{ marginTop: '2.5rem', borderTop: '1px solid #eee', paddingTop: '2.5rem', fontSize: '1.1rem', color: '#888' }}
                        />
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8rem' }}>
                    <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821' }}><MapPin size={28} /></div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Our Flagship Store</h4>
                                    <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: 1.6 }}>1 Dhanalakshminagar West Street, Uppilipalayam,<br />Coimbatore, Tamilnadu - 641015</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821' }}><Phone size={28} /></div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Direct Line</h4>
                                    <p style={{ color: '#666', fontSize: '1.1rem' }}>+1 (555) 167-8232</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '2rem' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5d0821' }}><Mail size={28} /></div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Online Support</h4>
                                    <p style={{ color: '#666', fontSize: '1.1rem' }}>castprinceofficial@gmail.com</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ background: '#fbfbfb', padding: '6rem', borderRadius: '8px' }}>
                        <form style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                                <input type="text" style={{ padding: '1.5rem', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', fontSize: '1.1rem' }} placeholder="Full Name" />
                                <input type="email" style={{ padding: '1.5rem', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', fontSize: '1.1rem' }} placeholder="Email Address" />
                            </div>
                            <input type="text" style={{ padding: '1.5rem', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', fontSize: '1.1rem' }} placeholder="Subject" />
                            <textarea rows={5} style={{ padding: '1.5rem', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', resize: 'none', fontSize: '1.1rem' }} placeholder="Your message here..." />
                            <button style={{ background: '#5d0821', color: '#fff', padding: '1.5rem', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}>SEND MESSAGE</button>
                        </form>
                    </div>
                </div>
            </div>
            <ShopFooter />
        </div>
    );
}
