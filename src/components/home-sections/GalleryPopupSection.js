'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, X, ChevronLeft, ChevronRight, Maximize2, Sparkles } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { SectionDivider } from '@/components/RangoliMotif';

export default function GalleryPopupSection({ sec, onOpenImage }) {
    const { title, subtitle, badge_text, settings = {} } = sec;
    const galList = (settings.images && settings.images.length > 0) ? settings.images : [];
    
    // Modal state for scrollable interactive lightbox popup
    const [activeModalIdx, setActiveModalIdx] = useState(null);
    const thumbnailScrollRef = useRef(null);

    const enableZoomPopup = settings.enable_popup !== false;

    // Navigation handlers inside modal
    const handlePrev = useCallback((e) => {
        if (e) e.stopPropagation();
        if (galList.length === 0) return;
        setActiveModalIdx((prev) => (prev === null || prev === 0 ? galList.length - 1 : prev - 1));
    }, [galList.length]);

    const handleNext = useCallback((e) => {
        if (e) e.stopPropagation();
        if (galList.length === 0) return;
        setActiveModalIdx((prev) => (prev === null || prev === galList.length - 1 ? 0 : prev + 1));
    }, [galList.length]);

    const handleClose = useCallback((e) => {
        if (e) e.stopPropagation();
        setActiveModalIdx(null);
    }, []);

    // Keyboard navigation & body scroll lock
    useEffect(() => {
        if (activeModalIdx === null) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') handleClose();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activeModalIdx, handleClose, handleNext, handlePrev]);

    // Smoothly scroll active thumbnail into view
    useEffect(() => {
        if (activeModalIdx !== null && thumbnailScrollRef.current) {
            const activeEl = thumbnailScrollRef.current.children[activeModalIdx];
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [activeModalIdx]);

    if (galList.length === 0) return null;

    const currentItem = activeModalIdx !== null ? galList[activeModalIdx] : null;
    const currentImgUrl = currentItem ? (typeof currentItem === 'string' ? currentItem : currentItem.url) : '';
    const currentCaption = currentItem ? (typeof currentItem === 'object' ? currentItem.caption : '') : '';

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
                                    onClick={() => {
                                        if (enableZoomPopup) {
                                            setActiveModalIdx(idx);
                                            if (onOpenImage) onOpenImage(imgUrl);
                                        }
                                    }}
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
                                                background: 'rgba(212, 122, 6, 0.9)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#ffffff',
                                                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                                                transition: 'transform 0.2s ease'
                                            }}>
                                                <Eye size={22} />
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

            {/* Interactive Scrollable Lightbox Modal Popup */}
            {activeModalIdx !== null && currentImgUrl && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 12, 10, 0.92)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        animation: 'fadeInModal 0.25s ease-out'
                    }}
                    onClick={handleClose}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '1050px',
                            maxHeight: '92vh',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            backgroundColor: '#1b1715',
                            borderRadius: '24px',
                            border: '1px solid rgba(212, 122, 6, 0.35)',
                            boxShadow: '0 25px 70px rgba(0,0,0,0.85)',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '1.25rem 1.5rem 1.5rem',
                            color: '#fdfbf7',
                            cursor: 'default'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1rem',
                            paddingBottom: '0.75rem',
                            borderBottom: '1px solid rgba(235, 220, 208, 0.12)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: 'rgba(212, 122, 6, 0.18)',
                                    border: '1px solid rgba(212, 122, 6, 0.4)',
                                    color: '#d47a06',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px'
                                }}>
                                    <Sparkles size={13} />
                                    Photo {activeModalIdx + 1} of {galList.length}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <a
                                    href={currentImgUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Open full resolution in new tab"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        color: '#ebdcd0',
                                        transition: 'all 0.2s ease',
                                        textDecoration: 'none'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 122, 6, 0.3)'; e.currentTarget.style.color = '#ffffff'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#ebdcd0'; }}
                                >
                                    <Maximize2 size={16} />
                                </a>

                                <button
                                    onClick={handleClose}
                                    aria-label="Close modal"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.borderColor = '#dc2626'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Main Image Display Area with Floating Next/Prev Buttons */}
                        <div style={{
                            position: 'relative',
                            minHeight: '280px',
                            maxHeight: '62vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#120f0d',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                            marginBottom: '1rem',
                            padding: '0.5rem'
                        }}>
                            <img
                                src={currentImgUrl}
                                alt={currentCaption || `Showcase Photo ${activeModalIdx + 1}`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '58vh',
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                                    transition: 'transform 0.3s ease'
                                }}
                            />

                            {/* Left Navigation Arrow Button */}
                            {galList.length > 1 && (
                                <button
                                    onClick={handlePrev}
                                    aria-label="Previous photo"
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(27, 23, 21, 0.85)',
                                        border: '1px solid rgba(212, 122, 6, 0.4)',
                                        color: '#ebdcd0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                        transition: 'all 0.2s ease',
                                        zIndex: 2
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d47a06'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(27, 23, 21, 0.85)'; e.currentTarget.style.color = '#ebdcd0'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            )}

                            {/* Right Navigation Arrow Button */}
                            {galList.length > 1 && (
                                <button
                                    onClick={handleNext}
                                    aria-label="Next photo"
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(27, 23, 21, 0.85)',
                                        border: '1px solid rgba(212, 122, 6, 0.4)',
                                        color: '#ebdcd0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                        transition: 'all 0.2s ease',
                                        zIndex: 2
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#d47a06'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(27, 23, 21, 0.85)'; e.currentTarget.style.color = '#ebdcd0'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                                >
                                    <ChevronRight size={24} />
                                </button>
                            )}
                        </div>

                        {/* Caption Bar */}
                        {currentCaption && (
                            <div style={{
                                textAlign: 'center',
                                padding: '0.6rem 1rem',
                                marginBottom: '1rem',
                                background: 'rgba(255, 255, 255, 0.04)',
                                borderRadius: '12px',
                                borderLeft: '3px solid #d47a06',
                                borderRight: '3px solid #d47a06'
                            }}>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.95rem',
                                    color: '#ebdcd0',
                                    fontStyle: 'italic',
                                    lineHeight: 1.4
                                }}>
                                    "{currentCaption}"
                                </p>
                            </div>
                        )}

                        {/* Scrollable Mini-Thumbnail Strip */}
                        {galList.length > 1 && (
                            <div
                                ref={thumbnailScrollRef}
                                style={{
                                    display: 'flex',
                                    gap: '10px',
                                    overflowX: 'auto',
                                    padding: '6px 4px 10px',
                                    justifyContent: galList.length > 6 ? 'flex-start' : 'center',
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#d47a06 #2a221e'
                                }}
                            >
                                {galList.map((thumb, tIdx) => {
                                    const thumbUrl = typeof thumb === 'string' ? thumb : thumb.url;
                                    const isSelected = tIdx === activeModalIdx;

                                    return (
                                        <button
                                            key={tIdx}
                                            onClick={() => setActiveModalIdx(tIdx)}
                                            style={{
                                                flex: '0 0 auto',
                                                width: '64px',
                                                height: '64px',
                                                borderRadius: '12px',
                                                overflow: 'hidden',
                                                padding: 0,
                                                background: 'none',
                                                border: isSelected ? '2px solid #d47a06' : '1px solid rgba(255, 255, 255, 0.15)',
                                                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                                boxShadow: isSelected ? '0 0 12px rgba(212, 122, 6, 0.6)' : 'none',
                                                cursor: 'pointer',
                                                opacity: isSelected ? 1 : 0.65,
                                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                            }}
                                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.opacity = '1'; }}
                                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.opacity = '0.65'; }}
                                        >
                                            <img
                                                src={thumbUrl}
                                                alt={`Thumbnail ${tIdx + 1}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeInModal {
                    from { opacity: 0; transform: scale(0.97); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </section>
    );
}

