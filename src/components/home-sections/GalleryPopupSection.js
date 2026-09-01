'use client';

import { Eye } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { SectionDivider, RangoliOrnament } from '@/components/RangoliMotif';

export default function GalleryPopupSection({ sec, onOpenImage }) {
    const { title, subtitle, badge_text, settings = {} } = sec;
    const galList = (settings.images && settings.images.length > 0) ? settings.images : [];
    if (galList.length === 0) return null;

    const enableZoomPopup = settings.enable_popup !== false;

    return (
        <section style={{ padding: '5rem 2rem 6rem', background: '#fdfbf7', borderTop: '1px solid #ebdcd0' }}>
            <SectionDivider
                badge={badge_text || 'DRAPES IN REAL LIFE'}
                title={title || 'Customer & Artisan Showcase'}
                subtitle={subtitle || 'See our handcrafted sarees embraced by graceful patrons across festive occasions & weddings.'}
                badgeType="gold"
            />

            <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="gallery-swiper-container">
                <Swiper
                    modules={[Autoplay, Pagination, Navigation]}
                    spaceBetween={24}
                    slidesPerView={1}
                    loop={galList.length > 3}
                    autoplay={{
                        delay: settings.auto_play_delay || 3500,
                        disableOnInteraction: false,
                    }}
                    pagination={{ clickable: true }}
                    navigation={true}
                    breakpoints={{
                        640: { slidesPerView: 2, spaceBetween: 20 },
                        1024: { slidesPerView: 3, spaceBetween: 24 },
                        1280: { slidesPerView: 4, spaceBetween: 24 }
                    }}
                    style={{ paddingBottom: '3.5rem' }}
                >
                    {galList.map((item, idx) => {
                        const imgUrl = typeof item === 'string' ? item : item.url;
                        const itemCaption = typeof item === 'object' ? item.caption : '';

                        return (
                            <SwiperSlide key={idx}>
                                <div
                                    className="gallery-item-hover"
                                    style={{
                                        position: 'relative',
                                        height: '380px',
                                        borderRadius: '24px',
                                        overflow: 'hidden',
                                        boxShadow: '0 10px 30px rgba(43, 38, 35, 0.08)',
                                        cursor: enableZoomPopup ? 'pointer' : 'default',
                                        background: '#f7f2ea',
                                        border: '1px solid #ebdcd0',
                                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                                    }}
                                    onClick={() => enableZoomPopup && onOpenImage && onOpenImage(imgUrl)}
                                >
                                    <img
                                        src={imgUrl}
                                        alt={itemCaption || `Gallery Showcase ${idx + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s ease' }}
                                    />

                                    {/* Hover Overlay */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(to top, rgba(39, 48, 43, 0.85) 0%, rgba(160, 102, 80, 0.4) 50%, transparent 100%)',
                                            opacity: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'flex-end',
                                            padding: '1.5rem',
                                            transition: 'opacity 0.3s ease',
                                            color: '#ffffff'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                                    >
                                        {enableZoomPopup && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '50px',
                                                height: '50px',
                                                borderRadius: '50%',
                                                background: 'rgba(212, 122, 6, 0.85)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#ffffff',
                                                boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                                            }}>
                                                <Eye size={24} />
                                            </div>
                                        )}
                                        {itemCaption && (
                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fdfbf7', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                                                {itemCaption}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>
        </section>
    );
}
