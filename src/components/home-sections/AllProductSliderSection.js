'use client';

import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { getProductUrl } from '@/lib/productUrl';
import { SectionDivider, RangoliOrnament } from '@/components/RangoliMotif';

export default function AllProductSliderSection({ sec, allProducts = [], featuredProducts = [] }) {
    const { title, subtitle, badge_text, settings = {} } = sec;

    const allLimit = settings.limit || 12;
    const baseList = allProducts.length > 0 ? allProducts : featuredProducts;
    const allItems = (baseList || []).slice(0, allLimit);

    if (allItems.length === 0) return null;

    return (
        <section style={{ padding: '5rem 2rem 6rem', maxWidth: '1400px', margin: '0 auto', background: 'transparent' }}>
            <SectionDivider
                badge={badge_text || 'NEW ARRIVALS'}
                title={title || 'Fresh From the Loom'}
                subtitle={subtitle || 'Explore our newest artisanal weaves fresh from South Indian master looms.'}
                badgeType="sage"
            />

            <Swiper
                modules={[Autoplay, Pagination, Navigation]}
                spaceBetween={24}
                slidesPerView={1}
                loop={allItems.length > 4}
                autoplay={{ delay: settings.auto_play_delay || 4500, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                navigation={true}
                breakpoints={{
                    640: { slidesPerView: 2, spaceBetween: 20 },
                    1024: { slidesPerView: 3, spaceBetween: 24 },
                    1280: { slidesPerView: 4, spaceBetween: 24 }
                }}
                style={{ padding: '0 0 50px 0' }}
            >
                {allItems.map(product => (
                    <SwiperSlide key={product.id}>
                        <Link href={getProductUrl(product)} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div
                                className="saree-product-card"
                                style={{
                                    background: '#ffffff',
                                    borderRadius: '20px',
                                    padding: '1.25rem',
                                    border: '1px solid #ebdcd0',
                                    boxShadow: '0 8px 30px rgba(43, 38, 35, 0.06)',
                                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => { 
                                    e.currentTarget.style.transform = 'translateY(-8px)'; 
                                    e.currentTarget.style.boxShadow = '0 18px 40px rgba(160, 102, 80, 0.16)';
                                    e.currentTarget.style.borderColor = '#d47a06';
                                }}
                                onMouseLeave={(e) => { 
                                    e.currentTarget.style.transform = 'translateY(0)'; 
                                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(43, 38, 35, 0.06)';
                                    e.currentTarget.style.borderColor = '#ebdcd0';
                                }}
                            >
                                <div style={{ 
                                    aspectRatio: '4/5', 
                                    marginBottom: '1.1rem', 
                                    overflow: 'hidden', 
                                    borderRadius: '16px', 
                                    background: '#f7f2ea', 
                                    position: 'relative',
                                    border: '1px solid rgba(212, 122, 6, 0.15)'
                                }}>
                                    <img
                                        src={product.image_url?.split(',')[0]}
                                        alt={product.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                    <span style={{ color: '#7c8675', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.12em', fontWeight: 800 }}>
                                        {product.category || 'Handloom Silk'}
                                    </span>
                                    <RangoliOrnament size={14} color="#d47a06" />
                                </div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#27302b', margin: '0.3rem 0 0.6rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {product.name}
                                </h3>
                                <p style={{ color: '#a06650', fontWeight: 800, fontSize: '1.25rem', margin: 0, letterSpacing: '-0.02em' }}>
                                    ₹{product.price.toLocaleString()}
                                </p>
                            </div>
                        </Link>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
}
