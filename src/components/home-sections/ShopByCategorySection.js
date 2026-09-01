'use client';

import Link from 'next/link';
import { SectionDivider, LotusMotif } from '@/components/RangoliMotif';
import { RotatingRangoliMandala } from '@/components/RangoliDecorations';

export default function ShopByCategorySection({ sec, allCategories = [] }) {
    const { title, subtitle, badge_text } = sec;

    if (!allCategories || allCategories.length === 0) return null;

    return (
        <section 
            style={{ 
                padding: '6rem 2rem 7rem', 
                background: 'radial-gradient(ellipse at 10% 25%, rgba(160, 102, 80, 0.05) 0%, transparent 60%), radial-gradient(ellipse at 90% 75%, rgba(212, 122, 6, 0.05) 0%, transparent 60%), #f7f2ea', 
                borderTop: '1px solid #ebdcd0', 
                borderBottom: '1px solid #ebdcd0',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Rotating Rangoli Mandala Background Watermark (Left Side) */}
            <RotatingRangoliMandala
                position="left"
                size={520}
                opacity={0.12}
                speed={75}
                color="#a06650"
                top="40%"
            />

            <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
                <SectionDivider
                    badge={badge_text || 'CURATED WEAVES'}
                    title={title || 'Shop by Saree Category'}
                    subtitle={subtitle || 'Explore masterfully handcrafted weaves, regal bridal silks, and lightweight drapes curated for every tradition.'}
                    badgeType="sage"
                />

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '2.5rem'
                }}>
                    {allCategories.map((cat) => (
                        <Link key={cat.name} href={`/shop?category=${encodeURIComponent(cat.name)}`} style={{ textDecoration: 'none' }}>
                            <div
                                className="jharokha-category-card"
                                style={{
                                    position: 'relative',
                                    height: '430px',
                                    borderRadius: '140px 140px 22px 22px',
                                    overflow: 'hidden',
                                    boxShadow: '0 12px 35px rgba(43, 38, 35, 0.08)',
                                    cursor: 'pointer',
                                    background: '#ffffff',
                                    border: '2px solid rgba(212, 122, 6, 0.28)',
                                    transition: 'all 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-10px)';
                                    e.currentTarget.style.boxShadow = '0 24px 50px rgba(160, 102, 80, 0.25)';
                                    e.currentTarget.style.borderColor = '#d47a06';
                                    const img = e.currentTarget.querySelector('.cat-bg-img');
                                    if (img) img.style.transform = 'scale(1.1)';
                                    const cta = e.currentTarget.querySelector('.cat-cta-btn');
                                    if (cta) {
                                        cta.style.background = '#a06650';
                                        cta.style.color = '#ffffff';
                                        cta.style.borderColor = '#d47a06';
                                        cta.style.transform = 'scale(1.04)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(43, 38, 35, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(212, 122, 6, 0.28)';
                                    const img = e.currentTarget.querySelector('.cat-bg-img');
                                    if (img) img.style.transform = 'scale(1)';
                                    const cta = e.currentTarget.querySelector('.cat-cta-btn');
                                    if (cta) {
                                        cta.style.background = 'rgba(253, 251, 247, 0.95)';
                                        cta.style.color = '#27302b';
                                        cta.style.borderColor = 'rgba(160, 102, 80, 0.25)';
                                        cta.style.transform = 'scale(1)';
                                    }
                                }}
                            >
                                <div
                                    className="cat-bg-img"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: `url(${cat.image})`,
                                        backgroundPosition: 'center center',
                                        backgroundSize: 'cover',
                                        backgroundRepeat: 'no-repeat',
                                        transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                />

                                {/* Multi-stop gradient scrim */}
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to top, rgba(39, 48, 43, 0.9) 0%, rgba(54, 40, 34, 0.48) 45%, rgba(0,0,0,0.05) 100%)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    padding: '2.5rem 1.75rem',
                                }}>
                                    <div style={{ position: 'relative', zIndex: 2 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
                                            <LotusMotif size={22} color="#d47a06" />
                                            <span style={{ color: '#fef8eb', fontSize: '0.74rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800 }}>
                                                HANDLOOM WEAVE
                                            </span>
                                        </div>

                                        <h3 style={{
                                            color: '#ffffff',
                                            fontSize: '1.75rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                            margin: 0,
                                            fontFamily: 'var(--font-serif-royal), serif',
                                            textShadow: '0 2px 12px rgba(0,0,0,0.6)'
                                        }}>
                                            {cat.name}
                                        </h3>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.1rem' }}>
                                            <span style={{
                                                color: 'rgba(253, 251, 247, 0.92)',
                                                fontSize: '0.88rem',
                                                fontWeight: 600,
                                                letterSpacing: '0.04em',
                                                fontFamily: 'var(--font-body)'
                                            }}>
                                                {cat.count > 0 ? `${cat.count} Saree Design${cat.count > 1 ? 's' : ''}` : 'View Collection'}
                                            </span>
                                            <div
                                                className="cat-cta-btn"
                                                style={{
                                                    padding: '0.55rem 1.25rem',
                                                    borderRadius: '30px',
                                                    background: 'rgba(253, 251, 247, 0.95)',
                                                    color: '#27302b',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 800,
                                                    letterSpacing: '0.12em',
                                                    textTransform: 'uppercase',
                                                    backdropFilter: 'blur(6px)',
                                                    border: '1px solid rgba(160, 102, 80, 0.25)',
                                                    transition: 'all 0.3s ease',
                                                    fontFamily: 'var(--font-body)',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                                }}
                                            >
                                                Explore &rarr;
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
