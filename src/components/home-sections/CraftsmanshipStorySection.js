'use client';

import Link from 'next/link';
import { RangoliOrnament, LotusMotif } from '@/components/RangoliMotif';
import { ArrowRight, Award, HeartHandshake } from 'lucide-react';

export default function CraftsmanshipStorySection({ sec }) {
    const { title, subtitle, badge_text, settings = {} } = sec;
    const storyImg = settings.image_url || '/uploads/media/without-watermark/CAT-HSZ16_1780638581090.jpg';

    return (
        <section style={{ background: '#fdfbf7', padding: '6rem 2rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                
                {/* Left: Text & Artisan Promise */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="indian-badge-pill">
                            <RangoliOrnament size={14} color="#627e72" />
                            {badge_text || 'HERITAGE & CRAFTSMANSHIP'}
                        </span>
                    </div>

                    <h2 style={{
                        fontFamily: 'var(--font-serif-royal), serif',
                        fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
                        fontWeight: 700,
                        color: '#27302b',
                        lineHeight: 1.2,
                        margin: 0,
                        letterSpacing: '-0.01em'
                    }}>
                        {title || 'Authentic Weaves, Timeless Grace'}
                    </h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '60px', height: '2px', background: 'linear-gradient(90deg, #d47a06, transparent)' }} />
                        <LotusMotif size={24} color="#d47a06" />
                    </div>

                    <p style={{
                        color: '#6e645e',
                        fontSize: '1.08rem',
                        lineHeight: 1.8,
                        margin: 0,
                        fontFamily: 'var(--font-body)'
                    }}>
                        {subtitle || 'Vaiyaaree brings you authentic handloom weaves straight from master artisans in South India. Discover rich silk sarees, soft cotton prints, and designer festive drapes tailored for every occasion.'}
                    </p>

                    {/* 3 Pillars */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginTop: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#f7f2ea', padding: '1.1rem', borderRadius: '14px', border: '1px solid #ebdcd0' }}>
                            <Award size={22} color="#a06650" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#27302b' }}>Silk Mark Certified</h4>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#7c8675' }}>100% Pure Natural Silks</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#f7f2ea', padding: '1.1rem', borderRadius: '14px', border: '1px solid #ebdcd0' }}>
                            <HeartHandshake size={22} color="#d47a06" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#27302b' }}>Direct from Weavers</h4>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#7c8675' }}>Empowering Artisan Looms</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <Link
                            href={settings.button_link || '/shop'}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'linear-gradient(135deg, #a06650 0%, #844c38 100%)',
                                color: '#ffffff',
                                padding: '1rem 2.25rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                border: '1px solid rgba(212, 122, 6, 0.5)',
                                boxShadow: '0 8px 25px rgba(160, 102, 80, 0.3)',
                                transition: 'all 0.3s ease',
                                fontFamily: 'var(--font-body)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 12px 30px rgba(160, 102, 80, 0.45)';
                                e.currentTarget.style.borderColor = '#d47a06';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(160, 102, 80, 0.3)';
                                e.currentTarget.style.borderColor = 'rgba(212, 122, 6, 0.5)';
                            }}
                        >
                            <span>{settings.button_text || 'EXPLORE OUR CATALOG'}</span>
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>

                {/* Right: Jharokha Framed Image with Lotus Base & Floating Maiden Emblem */}
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '520px',
                        height: '520px',
                        borderRadius: '240px 240px 24px 24px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(43, 38, 35, 0.15)',
                        border: '8px solid #ffffff',
                        position: 'relative',
                        background: '#f7f2ea'
                    }}>
                        <img
                            src={storyImg}
                            alt="Handloom Artisan Weaving Saree"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            border: '2px solid rgba(212, 122, 6, 0.4)',
                            borderRadius: '232px 232px 16px 16px',
                            pointerEvents: 'none'
                        }} />
                    </div>

                    {/* Floating Authentic Maiden Emblem Seal */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '8%',
                        background: '#27302b',
                        color: '#fdfbf7',
                        padding: '0.85rem 1.4rem',
                        borderRadius: '18px',
                        boxShadow: '0 12px 35px rgba(0,0,0,0.3)',
                        border: '1.5px solid rgba(212, 122, 6, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <LotusMotif size={26} color="#d47a06" />
                        <div>
                            <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', color: '#d47a06', fontWeight: 800, textTransform: 'uppercase' }}>HERITAGE ASSURED</div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>Direct From Artisan Looms</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
