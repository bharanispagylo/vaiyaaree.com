'use client';

import Link from 'next/link';
import { RangoliOrnament } from '@/components/RangoliMotif';
import { ArrowRight } from 'lucide-react';

export default function ImageAndTextSection({ sec }) {
    const { title, subtitle, badge_text, settings = {} } = sec;
    const imgUrl = settings.image_url || '/uploads/media/without-watermark/CAT-HSZ16_1780638581090.jpg';

    return (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', minHeight: '500px', background: '#f7f2ea', borderTop: '1px solid #ebdcd0' }}>
            <div style={{ background: `url(${imgUrl}) center/cover no-repeat`, minHeight: '380px' }} />
            <div style={{ padding: '5rem 8%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <span className="indian-badge-pill">
                        <RangoliOrnament size={14} color="#627e72" />
                        {badge_text || 'WEAVING TRADITIONS'}
                    </span>
                </div>
                <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.6rem)', fontWeight: 700, margin: '0 0 1rem', lineHeight: 1.2, fontFamily: 'var(--font-serif-royal), serif', color: '#27302b' }}>
                    {title || 'Preserving Indian Handloom Heritage'}
                </h2>
                <div style={{ width: '60px', height: '2px', background: 'linear-gradient(90deg, #d47a06, transparent)', marginBottom: '1.5rem' }} />
                <p style={{ color: '#6e645e', lineHeight: 1.8, fontSize: '1.05rem', fontWeight: 400, maxWidth: '480px', fontFamily: 'var(--font-body)' }}>
                    {subtitle || 'Each thread is spun with dedication by traditional weavers, ensuring purity, authenticity, and unmatched drape quality.'}
                </p>
                {settings.button_text && (
                    <Link
                        href={settings.button_link || '/shop'}
                        style={{
                            marginTop: '1.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #a06650 0%, #844c38 100%)',
                            padding: '0.85rem 1.85rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 800,
                            fontSize: '0.86rem',
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            width: 'fit-content',
                            border: '1px solid rgba(212, 122, 6, 0.5)',
                            boxShadow: '0 8px 25px rgba(160, 102, 80, 0.3)',
                            transition: 'all 0.3s ease',
                            fontFamily: 'var(--font-body)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 12px 30px rgba(160, 102, 80, 0.45)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(160, 102, 80, 0.3)';
                        }}
                    >
                        <span>{settings.button_text}</span>
                        <ArrowRight size={16} />
                    </Link>
                )}
            </div>
        </section>
    );
}
