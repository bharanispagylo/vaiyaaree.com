'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Sparkles } from 'lucide-react';
import { getProductUrl } from '@/lib/productUrl';
import { SectionDivider, RangoliOrnament } from '@/components/RangoliMotif';
import { RotatingRangoliMandala } from '@/components/RangoliDecorations';
import { useShop } from '@/context/ShopContext';

export default function ExploreCollectionSection({ sec, exploreProducts = [] }) {
    const { title, subtitle, badge_text, settings = {} } = sec;
    const [exploreSliderIndex, setExploreSliderIndex] = useState(0);
    const { wishlist = [], toggleWishlist } = useShop ? useShop() : {};

    const exploreLimit = settings.limit || 8;
    const exploreList = (exploreProducts || []).slice(0, exploreLimit);

    useEffect(() => {
        if (exploreList.length <= 4) return;
        const interval = setInterval(() => {
            setExploreSliderIndex(prev => (prev + 1) > exploreList.length - 4 ? 0 : prev + 1);
        }, settings.scroll_interval || 6000);
        return () => clearInterval(interval);
    }, [exploreList.length, settings.scroll_interval]);

    if (exploreList.length === 0) return null;

    return (
        <section 
            style={{ 
                padding: '6rem 2rem 7rem', 
                maxWidth: '100%', 
                margin: '0 auto', 
                position: 'relative', 
                overflow: 'hidden',
                background: 'radial-gradient(ellipse at 85% 30%, rgba(212, 122, 6, 0.05) 0%, transparent 60%), radial-gradient(ellipse at 15% 70%, rgba(134, 163, 151, 0.05) 0%, transparent 60%), #fdfbf7' 
            }}
        >
            {/* Rotating Rangoli Mandala Background Watermark (Right Side) */}
            <RotatingRangoliMandala
                position="right"
                size={500}
                opacity={0.12}
                speed={65}
                color="#d47a06"
                top="48%"
            />

            <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
                <SectionDivider
                    badge={badge_text || 'HANDPICKED DRAPES'}
                    title={title || 'Explore Handcrafted Collections'}
                    subtitle={subtitle || 'Unveil the luxury of genuine silk weaves, heritage zari borders, and soft drape textures.'}
                    badgeType="sage"
                />

                <div style={{ position: 'relative', overflow: 'hidden', padding: '10px 4px' }}>
                    <div style={{
                        display: 'flex',
                        transition: 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
                        transform: `translateX(-${exploreSliderIndex * (100 / Math.min(4, exploreList.length))}%)`,
                        gap: '2rem'
                    }}>
                        {exploreList.map(product => {
                            const isWishlisted = wishlist?.some(item => (typeof item === 'object' ? item.id : item) === product.id);

                            return (
                                <div
                                    key={product.id}
                                    style={{ flex: '0 0 calc(25% - 1.5rem)', minWidth: '275px', position: 'relative' }}
                                >
                                    <Link
                                        href={getProductUrl(product)}
                                        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                                    >
                                        <div
                                            className="saree-product-card"
                                            style={{
                                                background: '#ffffff',
                                                borderRadius: '22px',
                                                padding: '1.25rem',
                                                border: '1px solid #ebdcd0',
                                                boxShadow: '0 8px 30px rgba(43, 38, 35, 0.06)',
                                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                                position: 'relative'
                                            }}
                                            onMouseEnter={(e) => { 
                                                e.currentTarget.style.transform = 'translateY(-8px)'; 
                                                e.currentTarget.style.boxShadow = '0 20px 45px rgba(160, 102, 80, 0.18)';
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
                                                marginBottom: '1.15rem', 
                                                overflow: 'hidden', 
                                                borderRadius: '16px', 
                                                background: '#f7f2ea', 
                                                position: 'relative',
                                                border: '1px solid rgba(212, 122, 6, 0.15)'
                                            }}>
                                                <img
                                                    src={product.image_url?.split(',')[0]}
                                                    alt={product.name}
                                                    style={{ 
                                                        width: '100%', 
                                                        height: '100%', 
                                                        objectFit: 'cover', 
                                                        transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                                                        filter: Number(product.stock || 0) <= 0 ? 'grayscale(25%)' : 'none' 
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                />
                                                {Number(product.stock || 0) <= 0 ? (
                                                    <span style={{ 
                                                        position: 'absolute', top: '12px', left: '12px', 
                                                        background: '#27302b', color: '#ffffff', fontSize: '0.68rem', 
                                                        fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '6px', 
                                                        textTransform: 'uppercase', letterSpacing: '0.08em', 
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)' 
                                                    }}>
                                                        Sold Out
                                                    </span>
                                                ) : Number(product.stock || 0) <= 5 ? (
                                                    <span style={{ 
                                                        position: 'absolute', top: '12px', left: '12px', 
                                                        background: 'linear-gradient(135deg, #a06650, #844c38)', color: '#ffffff', fontSize: '0.68rem', 
                                                        fontWeight: 800, padding: '0.35rem 0.85rem', borderRadius: '20px', 
                                                        letterSpacing: '0.04em',
                                                        boxShadow: '0 4px 12px rgba(160, 102, 80, 0.4)',
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                    }}>
                                                        <Sparkles size={11} color="#fde047" /> Only {product.stock} Left
                                                    </span>
                                                ) : (
                                                    <span style={{ 
                                                        position: 'absolute', top: '12px', left: '12px', 
                                                        background: 'rgba(253, 251, 247, 0.92)', color: '#627e72', fontSize: '0.68rem', 
                                                        fontWeight: 800, padding: '0.3rem 0.7rem', borderRadius: '20px', 
                                                        letterSpacing: '0.08em', textTransform: 'uppercase',
                                                        border: '1px solid rgba(134, 163, 151, 0.4)',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                                                    }}>
                                                        Handcrafted
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                                <span style={{ color: '#7c8675', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.14em', fontWeight: 800 }}>
                                                    {product.category || 'Vaiyaaree Exclusive'}
                                                </span>
                                                <RangoliOrnament size={14} color="#d47a06" />
                                            </div>

                                            <h3 style={{ 
                                                fontSize: '1.08rem', 
                                                fontWeight: 700, 
                                                color: '#27302b', 
                                                margin: '0.35rem 0 0.65rem', 
                                                fontFamily: 'var(--font-body)',
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis', 
                                                whiteSpace: 'nowrap' 
                                            }}>
                                                {product.name}
                                            </h3>

                                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                                    <p style={{ color: '#a06650', fontWeight: 800, fontSize: '1.28rem', margin: 0, letterSpacing: '-0.02em' }}>
                                                        ₹{product.price.toLocaleString()}
                                                    </p>
                                                    {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                                                        <span style={{ color: '#998c84', textDecoration: 'line-through', fontSize: '0.86rem' }}>
                                                            ₹{Number(product.compare_at_price).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <span style={{ fontSize: '0.74rem', color: '#d47a06', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    View &rarr;
                                                </span>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Wishlist Button */}
                                    {toggleWishlist && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleWishlist(product);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '24px',
                                                right: '24px',
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: '#ffffff',
                                                border: '1px solid #ebdcd0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                color: isWishlisted ? '#e11d48' : '#7c8675',
                                                transition: 'all 0.2s ease',
                                                zIndex: 10
                                            }}
                                            aria-label="Wishlist Saree"
                                        >
                                            <Heart size={18} fill={isWishlisted ? '#e11d48' : 'none'} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
