'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Award, Sparkles, HeartHandshake } from 'lucide-react';
import { RangoliOrnament, LotusMotif } from '@/components/RangoliMotif';

export default function BrandStoryLogoSection({ sec = {} }) {
    const { 
        title = "The Sacred Thread of Indian Grace",
        subtitle = "Born from the timeless loom traditions of South India, Vaiyaaree weaves pure silk sarees that celebrate cultural heritage, feminine majesty, and generational artisan mastery.",
        badge_text = "OUR HERITAGE & IDENTITY",
        settings = {}
    } = sec;

    const logoImg = settings.logo_image || "/images/vaiyaaree-logo.png";
    const buttonText = settings.button_text || "EXPLORE OUR SILK CATALOG";
    const buttonLink = settings.button_link || "/shop";

    return (
        <section 
            className="brand-story-logo-section"
            style={{ 
                position: 'relative',
                overflow: 'hidden',
                borderTop: '2px solid rgba(212, 122, 6, 0.4)',
                borderBottom: '2px solid rgba(212, 122, 6, 0.4)',
                background: '#fdfbf7'
            }}
        >
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                minHeight: '620px',
                width: '100%',
                margin: '0 auto'
            }}>
                {/* 50% LEFT: Logo & Saree Maiden encased in Temple Jharokha Arch with Rotating Mandala */}
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5rem 2rem',
                    background: 'radial-gradient(circle at center, rgba(212, 122, 6, 0.1) 0%, rgba(253, 251, 247, 0.95) 70%, #f7f2ea 100%)',
                    overflow: 'hidden',
                    borderRight: '1px solid rgba(212, 122, 6, 0.25)'
                }}>
                    {/* Rotating Rangoli Mandala in the Background */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '520px',
                        height: '520px',
                        pointerEvents: 'none',
                        zIndex: 1,
                        opacity: 0.22
                    }}>
                        <svg
                            width="520"
                            height="520"
                            viewBox="0 0 400 400"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{
                                width: '100%',
                                height: '100%',
                                animation: 'spinRangoli 40s linear infinite'
                            }}
                        >
                            {/* Outer Radiance Rings */}
                            <circle cx="200" cy="200" r="192" stroke="#d47a06" strokeWidth="1.5" strokeDasharray="4 4" />
                            <circle cx="200" cy="200" r="180" stroke="#a06650" strokeWidth="1.8" />
                            <circle cx="200" cy="200" r="168" stroke="#d47a06" strokeWidth="0.8" strokeDasharray="6 3" />

                            {/* 16 Outer Temple Arch Petals */}
                            {[...Array(16)].map((_, i) => {
                                const angle = (i * 360) / 16;
                                return (
                                    <g key={`outer-${i}`} transform={`rotate(${angle} 200 200)`}>
                                        <path
                                            d="M200 16 C192 42, 185 68, 195 92 C200 82, 200 82, 205 92 C215 68, 208 42, 200 16 Z"
                                            fill="#d47a06"
                                        />
                                        <circle cx="200" cy="12" r="3.5" fill="#a06650" />
                                    </g>
                                );
                            })}

                            {/* Middle Ring */}
                            <circle cx="200" cy="200" r="118" stroke="#a06650" strokeWidth="2" />
                            <circle cx="200" cy="200" r="110" stroke="#d47a06" strokeWidth="1" strokeDasharray="3 3" />

                            {/* 12 Middle Lotus Petals */}
                            {[...Array(12)].map((_, i) => {
                                const angle = (i * 360) / 12;
                                return (
                                    <g key={`mid-${i}`} transform={`rotate(${angle} 200 200)`}>
                                        <path
                                            d="M200 88 C186 116, 178 142, 200 156 C222 142, 214 116, 200 88 Z"
                                            fill="#a06650"
                                        />
                                    </g>
                                );
                            })}

                            {/* Inner Ring */}
                            <circle cx="200" cy="200" r="64" stroke="#d47a06" strokeWidth="1.5" />
                            <circle cx="200" cy="200" r="56" stroke="#a06650" strokeWidth="0.8" strokeDasharray="2 2" />

                            {/* 8 Inner Core Petals */}
                            {[...Array(8)].map((_, i) => {
                                const angle = (i * 360) / 8;
                                return (
                                    <g key={`inner-${i}`} transform={`rotate(${angle} 200 200)`}>
                                        <path
                                            d="M200 146 C192 165, 192 180, 200 186 C208 180, 208 165, 200 146 Z"
                                            fill="#d47a06"
                                        />
                                    </g>
                                );
                            })}

                            <circle cx="200" cy="200" r="16" fill="#a06650" />
                            <circle cx="200" cy="200" r="8" fill="#d47a06" />
                        </svg>
                    </div>

                    {/* Logo & Saree Maiden In Temple Jharokha Arch Frame */}
                    <div 
                        className="logo-jharokha-frame"
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            padding: '3rem 2.5rem 2rem',
                            borderRadius: '170px 170px 24px 24px',
                            background: 'rgba(255, 255, 255, 0.96)',
                            backdropFilter: 'blur(10px)',
                            border: '3px solid #a06650',
                            boxShadow: '0 25px 60px rgba(160, 102, 80, 0.2), 0 0 0 8px rgba(253, 251, 247, 0.85)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            transition: 'all 0.4s ease',
                            maxWidth: '360px',
                            width: '100%'
                        }}
                    >
                        {/* Top Pointed Temple Crest */}
                        <div style={{
                            position: 'absolute',
                            top: '-16px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#ffffff',
                            padding: '4px 14px',
                            borderRadius: '20px',
                            border: '1.5px solid #a06650',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}>
                            <LotusMotif size={24} color="#d47a06" />
                        </div>

                        {/* Centered Brand Logo (Girl with Parrot & Lotus) */}
                        <div style={{ position: 'relative', width: '220px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                                src={logoImg} 
                                alt="Vaiyaaree Classical Saree Maiden Logo" 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 6px 16px rgba(160, 102, 80, 0.15))'
                                }} 
                                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
                            />
                        </div>

                        {/* Brand Motto Pill */}
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.45rem 1.25rem',
                            borderRadius: '24px',
                            background: 'rgba(160, 102, 80, 0.1)',
                            border: '1px solid rgba(212, 122, 6, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <Sparkles size={13} color="#d47a06" />
                            <span style={{
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                letterSpacing: '0.18em',
                                color: '#a06650',
                                textTransform: 'uppercase',
                                fontFamily: 'var(--font-serif-royal), serif'
                            }}>
                                Authentic South Indian Silks
                            </span>
                        </div>
                    </div>
                </div>

                {/* 50% RIGHT: FULL MAROON BACKGROUND with Rich Brand Text & Cultural Guarantees */}
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '5rem 8%',
                    background: 'linear-gradient(135deg, #5d0821 0%, #440618 60%, #2d0410 100%)',
                    color: '#ffffff',
                    overflow: 'hidden'
                }}>
                    {/* Subtle Maiden with Parrot Watermark in background */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-20px',
                        right: '-20px',
                        width: '320px',
                        height: '380px',
                        opacity: 0.08,
                        pointerEvents: 'none',
                        filter: 'invert(1) drop-shadow(0 0 20px rgba(255,255,255,0.2))'
                    }}>
                        <img
                            src="/images/vaiyaaree-logo.png"
                            alt="Watermark Motif"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>

                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
                        {/* Top Badge with Lotus Icon */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0.45rem 1.25rem',
                                borderRadius: '9999px',
                                background: 'rgba(255, 255, 255, 0.12)',
                                backdropFilter: 'blur(8px)',
                                color: '#fde047',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                border: '1px solid rgba(223, 170, 91, 0.45)'
                            }}>
                                <LotusMotif size={16} color="#fde047" />
                                {badge_text}
                            </span>
                        </div>

                        {/* Heading */}
                        <h2 style={{
                            fontFamily: 'var(--font-serif-royal), serif',
                            fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)',
                            fontWeight: 700,
                            color: '#ffffff',
                            lineHeight: 1.2,
                            margin: 0,
                            letterSpacing: '0.02em',
                            textShadow: '0 2px 12px rgba(0,0,0,0.5)'
                        }}>
                            {title}
                        </h2>

                        {/* Gold Divider Line with Lotus Center */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '60px', height: '2px', background: 'linear-gradient(90deg, #dfaa5b, transparent)' }} />
                            <LotusMotif size={22} color="#dfaa5b" />
                            <div style={{ width: '60px', height: '2px', background: 'linear-gradient(270deg, #dfaa5b, transparent)' }} />
                        </div>

                        {/* Subtitle / Narrative */}
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.94)',
                            fontSize: '1.08rem',
                            lineHeight: 1.8,
                            margin: 0,
                            fontFamily: 'var(--font-body)',
                            maxWidth: '560px'
                        }}>
                            {subtitle}
                        </p>

                        {/* 3 Value Pillars */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginTop: '0.5rem'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '0.85rem 1.1rem',
                                background: 'rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                border: '1px solid rgba(223, 170, 91, 0.3)'
                            }}>
                                <Award size={20} color="#dfaa5b" style={{ flexShrink: 0 }} />
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 800, color: '#ffffff' }}>Silk Mark 100% Pure</h4>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>Certified Handloom</p>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '0.85rem 1.1rem',
                                background: 'rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                border: '1px solid rgba(223, 170, 91, 0.3)'
                            }}>
                                <HeartHandshake size={20} color="#dfaa5b" style={{ flexShrink: 0 }} />
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 800, color: '#ffffff' }}>Direct From Looms</h4>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>Generational Weavers</p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive CTA Button */}
                        <div style={{ marginTop: '0.75rem' }}>
                            <Link
                                href={buttonLink}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: 'linear-gradient(135deg, #dfaa5b 0%, #c8933b 100%)',
                                    color: '#2d0410',
                                    padding: '1.05rem 2.5rem',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: 900,
                                    fontSize: '0.9rem',
                                    letterSpacing: '0.14em',
                                    textTransform: 'uppercase',
                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.35)',
                                    transition: 'all 0.35s ease',
                                    fontFamily: 'var(--font-body)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(223, 170, 91, 0.45)';
                                    e.currentTarget.style.background = '#ffffff';
                                    e.currentTarget.style.color = '#5d0821';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.35)';
                                    e.currentTarget.style.background = 'linear-gradient(135deg, #dfaa5b 0%, #c8933b 100%)';
                                    e.currentTarget.style.color = '#2d0410';
                                }}
                            >
                                <span>{buttonText}</span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
