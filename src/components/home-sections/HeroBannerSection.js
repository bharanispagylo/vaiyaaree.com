'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation, EffectFade } from 'swiper/modules';
import { ChevronLeft, ChevronRight, ArrowRight, Award, Sparkles } from 'lucide-react';
import { RangoliOrnament, LotusMotif } from '@/components/RangoliMotif';
import { RotatingRangoliMandala } from '@/components/RangoliDecorations';

// Swiper core & module styles
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function HeroBannerSection({ sec }) {
    const { title, subtitle, badge_text, settings = {} } = sec || {};

    const prevRef = useRef(null);
    const nextRef = useRef(null);

    const heroSlideList = (settings?.slides && settings.slides.length > 0)
        ? settings.slides
        : [{
            title: title || 'Exclusive Handwoven Silks & Sarees',
            subtitle: subtitle || 'Celebrate Timeless Indian Heritage with Masterfully Woven Drapes',
            image: '/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg',
            badge: badge_text || 'AUTHENTIC WEAVES & SILKS',
            button_text: 'EXPLORE COLLECTION',
            button_link: '/shop'
        }];

    const autoplayDelay = Number(settings.auto_play_interval) || 5500;
    const isSingleSlide = heroSlideList.length <= 1;

    return (
        <section className="hero-split-section" style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#fdfbf7', borderBottom: '1px solid #ebdcd0' }}>
            <Swiper
                modules={[Autoplay, Pagination, Navigation, EffectFade]}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                speed={900}
                loop={!isSingleSlide}
                autoplay={isSingleSlide ? false : {
                    delay: autoplayDelay,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                }}
                pagination={isSingleSlide ? false : {
                    clickable: true,
                    el: '.hero-custom-pagination',
                    bulletClass: 'hero-bullet',
                    bulletActiveClass: 'hero-bullet-active'
                }}
                navigation={isSingleSlide ? false : {
                    prevEl: '.hero-custom-prev',
                    nextEl: '.hero-custom-next'
                }}
                className="hero-swiper-container"
                style={{ width: '100%', height: '100%' }}
            >
                {heroSlideList.map((slide, index) => {
                    const slideTitle = slide.title || title || 'Exclusive Handwoven Silks & Sarees';
                    const slideSubtitle = slide.subtitle || subtitle || 'Celebrate Timeless Indian Heritage with Masterfully Woven Drapes';
                    const slideBadge = slide.badge || slide.badge_text || badge_text || 'AUTHENTIC HANDLOOM SILKS';
                    const slideImage = slide.image || '/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg';
                    const slideBtnText = slide.button_text || 'EXPLORE COLLECTION';
                    const slideBtnLink = slide.button_link || slide.link || '/shop';

                    return (
                        <SwiperSlide key={`hero-slide-${index}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <div className="hero-split-grid">
                                
                                {/* 50% LEFT: Minimalist Cultural Text & Mascot Accents */}
                                <div className="hero-text-side">
                                    {/* Rotating Rangoli Mandala Background Watermark */}
                                    <div className="hero-mandala-bg">
                                        <RotatingRangoliMandala
                                            position="left"
                                            size={440}
                                            opacity={0.08}
                                            speed={50}
                                            color="#d47a06"
                                            top="50%"
                                        />
                                    </div>

                                    <div className="hero-text-content">
                                        {/* Logo Lotus Badge */}
                                        {slideBadge && (
                                            <div className="hero-lotus-badge">
                                                <RangoliOrnament size={16} color="#d47a06" />
                                                <span>{slideBadge}</span>
                                            </div>
                                        )}

                                        {/* Main Slide Title */}
                                        <h1 className="hero-slide-heading">
                                            {slideTitle}
                                        </h1>

                                        {/* Gold Divider Line with Lotus Center */}
                                        <div className="hero-lotus-divider">
                                            <span className="divider-line" />
                                            <LotusMotif size={24} color="#d47a06" />
                                            <span className="divider-line" />
                                        </div>

                                        {/* Narrative Subtitle */}
                                        {slideSubtitle && (
                                            <p className="hero-slide-desc">
                                                {slideSubtitle}
                                            </p>
                                        )}

                                        {/* Minimalist Action Button */}
                                        <div className="hero-action-row">
                                            <Link href={slideBtnLink} className="hero-cta-btn">
                                                <span>{slideBtnText}</span>
                                                <ArrowRight size={16} className="cta-arrow" />
                                            </Link>
                                        </div>

                                        {/* Micro Trust Indicators */}
                                        <div className="hero-trust-bar">
                                            <div className="trust-item">
                                                <Award size={15} color="#a06650" />
                                                <span>100% Pure Silk Mark</span>
                                            </div>
                                            <div className="trust-dot">•</div>
                                            <div className="trust-item">
                                                <Sparkles size={15} color="#d47a06" />
                                                <span>Direct from Artisan Looms</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 50% RIGHT: Full Saree Image with Smooth Zoom */}
                                <div className="hero-image-side">
                                    <img
                                        src={slideImage}
                                        alt={slideTitle}
                                        className="hero-saree-img"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/uploads/media/without-watermark/CAT-C3FNP_1780653461488.jpg';
                                        }}
                                    />
                                    {/* Subtle Gradient Blend into the Text Side */}
                                    <div className="hero-image-scrim" />
                                </div>

                            </div>
                        </SwiperSlide>
                    );
                })}
            </Swiper>

            {/* Custom Navigation Arrows */}
            {!isSingleSlide && (
                <>
                    <button
                        ref={prevRef}
                        type="button"
                        className="hero-nav-btn hero-custom-prev"
                        aria-label="Previous Slide"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <button
                        ref={nextRef}
                        type="button"
                        className="hero-nav-btn hero-custom-next"
                        aria-label="Next Slide"
                    >
                        <ChevronRight size={22} />
                    </button>
                </>
            )}

            {/* Custom Centered Pagination Bullets */}
            {!isSingleSlide && (
                <div className="hero-custom-pagination" />
            )}

            <style jsx global>{`
                .hero-split-section {
                    width: 100%;
                    min-height: 560px;
                    background: #fdfbf7;
                }

                .hero-split-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    min-height: 580px;
                    height: 75vh;
                    max-height: 800px;
                    width: 100%;
                    position: relative;
                }

                /* LEFT 50%: TEXT SIDE */
                .hero-text-side {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justifyContent: center;
                    padding: 4.5rem 8% 5rem;
                    background: radial-gradient(circle at 10% 20%, rgba(212, 122, 6, 0.05) 0%, rgba(253, 251, 247, 0.98) 65%, #f7f2ea 100%);
                    z-index: 2;
                    overflow: hidden;
                }

                .hero-mandala-bg {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 1;
                }

                .hero-text-content {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    gap: 1.15rem;
                    max-width: 580px;
                }

                .hero-lotus-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0.45rem 1.15rem;
                    border-radius: 9999px;
                    background: rgba(255, 255, 255, 0.92);
                    border: 1px solid rgba(212, 122, 6, 0.35);
                    box-shadow: 0 4px 15px rgba(160, 102, 80, 0.08);
                    width: fit-content;
                }

                .hero-lotus-badge span {
                    font-size: 0.76rem;
                    font-weight: 800;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    color: #a06650;
                    font-family: var(--font-body);
                }

                .hero-slide-heading {
                    font-family: var(--font-serif-royal), var(--font-heading), serif;
                    font-size: clamp(2.2rem, 3.8vw, 3.4rem);
                    font-weight: 700;
                    color: #27302b;
                    line-height: 1.18;
                    margin: 0;
                    letter-spacing: -0.01em;
                }

                .hero-lotus-divider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 0.2rem 0;
                }

                .divider-line {
                    height: 1.5px;
                    width: 50px;
                    background: linear-gradient(90deg, #d47a06, transparent);
                }

                .hero-slide-desc {
                    color: #6e645e;
                    font-size: 1.06rem;
                    line-height: 1.75;
                    margin: 0;
                    font-family: var(--font-body);
                }

                .hero-action-row {
                    margin-top: 0.5rem;
                }

                .hero-cta-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: linear-gradient(135deg, #a06650 0%, #844c38 100%);
                    color: #ffffff;
                    padding: 0.95rem 2.25rem;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 800;
                    font-size: 0.86rem;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    border: 1px solid rgba(212, 122, 6, 0.5);
                    box-shadow: 0 8px 25px rgba(160, 102, 80, 0.3);
                    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    font-family: var(--font-body);
                    width: fit-content;
                }

                .hero-cta-btn:hover {
                    background: linear-gradient(135deg, #844c38 0%, #683727 100%);
                    transform: translateY(-3px);
                    box-shadow: 0 12px 30px rgba(160, 102, 80, 0.45);
                    border-color: #d47a06;
                }

                .cta-arrow {
                    transition: transform 0.3s ease;
                }

                .hero-cta-btn:hover .cta-arrow {
                    transform: translateX(4px);
                }

                .hero-trust-bar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 0.5rem;
                    flex-wrap: wrap;
                }

                .trust-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.78rem;
                    font-weight: 700;
                    color: #7c8675;
                    font-family: var(--font-body);
                }

                .trust-dot {
                    color: #d47a06;
                    font-size: 0.9rem;
                }

                /* RIGHT 50%: FULL IMAGE SIDE */
                .hero-image-side {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    background: #27302b;
                }

                .hero-saree-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center 25%;
                    transform: scale(1);
                    transition: transform 7s cubic-bezier(0.25, 1, 0.5, 1);
                }

                .swiper-slide-active .hero-saree-img {
                    transform: scale(1.06);
                }

                .hero-image-scrim {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, rgba(253, 251, 247, 0.45) 0%, rgba(0, 0, 0, 0.05) 20%, transparent 100%);
                    pointer-events: none;
                }

                /* NAVIGATION ARROWS */
                .hero-nav-btn {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(212, 122, 6, 0.35);
                    color: #a06650;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 6px 20px rgba(43, 38, 35, 0.12);
                    z-index: 20;
                    transition: all 0.3s ease;
                }

                .hero-custom-prev {
                    left: 1.5rem;
                }

                .hero-custom-next {
                    right: 1.5rem;
                }

                .hero-nav-btn:hover {
                    background: #a06650;
                    color: #ffffff;
                    border-color: #d47a06;
                    transform: translateY(-50%) scale(1.08);
                }

                /* CENTERED PAGINATION BULLETS */
                .hero-custom-pagination {
                    position: absolute !important;
                    bottom: 1.75rem !important;
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                    transform: none !important;
                    margin: 0 auto !important;
                    z-index: 25 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 0.65rem !important;
                    pointer-events: auto !important;
                }

                .hero-bullet {
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 10px;
                    background: rgba(160, 102, 80, 0.3);
                    border: 1px solid rgba(160, 102, 80, 0.5);
                    cursor: pointer;
                    transition: all 0.35s ease;
                }

                .hero-bullet-active {
                    width: 32px;
                    background: #a06650 !important;
                    border-color: #d47a06 !important;
                    box-shadow: 0 0 12px rgba(160, 102, 80, 0.5);
                }

                /* RESPONSIVE MOBILE BEHAVIOR */
                @media (max-width: 991px) {
                    .hero-split-grid {
                        grid-template-columns: 1fr;
                        height: auto;
                        min-height: auto;
                        max-height: none;
                    }

                    .hero-image-side {
                        height: 420px;
                        order: 1;
                    }

                    .hero-text-side {
                        padding: 3rem 1.5rem 4rem;
                        order: 2;
                        text-align: center;
                        align-items: center;
                    }

                    .hero-text-content {
                        align-items: center;
                    }

                    .hero-lotus-divider {
                        justify-content: center;
                    }

                    .hero-trust-bar {
                        justify-content: center;
                    }

                    .hero-nav-btn {
                        display: none;
                    }
                }
            `}</style>
        </section>
    );
}
