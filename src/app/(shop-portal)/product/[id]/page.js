'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, CheckCircle, X, ZoomIn, ChevronLeft, ChevronRight, Tag, ShieldCheck } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import ProductCard from '@/components/ProductCard';
import { findProductBySlugOrId, getProductSlug } from '@/lib/productUrl';
import styles from './product.module.css';

// Import Swiper React components & modules
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';

export default function ProductDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { products, addToCart, loading: productsLoading, mysqlClient } = useShop();

    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [swiperInstance, setSwiperInstance] = useState(null);

    // Sync selected variant with URL query parameter (Shopify Style)
    const syncVariantToUrl = useCallback((variantId) => {
        if (typeof window === 'undefined' || !variantId) return;
        const url = new URL(window.location.href);
        if (url.searchParams.get('variant') !== String(variantId)) {
            url.searchParams.set('variant', String(variantId));
            window.history.replaceState(null, '', url.toString());
        }
    }, []);

    const fetchVariants = useCallback(async (productId, initialVariantParam = null) => {
        if (!mysqlClient || !productId) return;
        try {
            const { data } = await mysqlClient
                .from('product_variants')
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                setVariants(data);

                // Priority 1: Match variant from URL search params
                let target = null;
                const paramToMatch = initialVariantParam || searchParams?.get('variant') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('variant') : null);
                if (paramToMatch) {
                    const cleanParam = decodeURIComponent(paramToMatch).trim().toLowerCase();
                    target = data.find(v => 
                        String(v.id).toLowerCase() === cleanParam ||
                        String(v.sku || '').toLowerCase() === cleanParam ||
                        String(v.name || '').trim().toLowerCase() === cleanParam
                    );
                }

                // Priority 2: Fallback to first in-stock variant, or first variant
                if (!target) {
                    target = data.find(v => Number(v.stock || 0) > 0) || data[0];
                }

                setSelectedVariant(target);
                if (target?.id) {
                    syncVariantToUrl(target.id);
                }
            } else {
                setVariants([]);
                setSelectedVariant(null);
            }
        } catch (err) {
            console.error('Error loading variants:', err);
        } finally {
            setLoading(false);
        }
    }, [mysqlClient, searchParams, syncVariantToUrl]);

    useEffect(() => {
        async function loadProductDetails() {
            if (!id) return;
            setLoading(true);

            // 1. Try finding in loaded products list
            let found = findProductBySlugOrId(id, products);

            // 2. If not found in memory products list, query MySQL DB directly
            if (!found && mysqlClient) {
                const rawParam = decodeURIComponent(String(id)).trim().replace(/\/$/, '');

                // A. Direct Slug match
                let { data: directSlug } = await mysqlClient.from('products').select('*').eq('slug', rawParam).maybeSingle();
                if (directSlug) found = directSlug;

                // B. Direct ID / UUID query
                if (!found) {
                    let { data: directData } = await mysqlClient.from('products').select('*').eq('id', rawParam).maybeSingle();
                    if (directData) found = directData;
                }

                // C. Trailing identifier match (Product No / SKU / ID)
                if (!found) {
                    const lastHyphen = rawParam.lastIndexOf('-');
                    if (lastHyphen !== -1) {
                        const identifier = rawParam.substring(lastHyphen + 1);
                        if (/^\d+$/.test(identifier)) {
                            const { data: byNo } = await mysqlClient.from('products').select('*').or(`sku.eq.${identifier}`).maybeSingle();
                            if (byNo) found = byNo;
                        } else {
                            const { data: byId } = await mysqlClient.from('products').select('*').eq('id', identifier).maybeSingle();
                            if (byId) found = byId;
                        }
                    }
                }

                // D. Full list fallback match by slug
                if (!found) {
                    const { data: allP } = await mysqlClient.from('products').select('*');
                    if (allP) {
                        found = findProductBySlugOrId(id, allP);
                    }
                }
            }

            if (found) {
                setProduct(found);
                if (found.type === 'variant') {
                    fetchVariants(found.id);
                } else {
                    setLoading(false);
                }
            } else if (!productsLoading) {
                setLoading(false);
            }
        }

        loadProductDetails();
    }, [id, products, productsLoading, mysqlClient, fetchVariants]);

    const handleSelectVariant = (v) => {
        setSelectedVariant(v);
        if (v?.id) {
            syncVariantToUrl(v.id);
        }
    };

    // Multi-Option detection for Storefront (e.g. Size: S, M; Color: Red, Green)
    const parsedOptionGroups = useMemo(() => {
        if (!variants || variants.length === 0) return [];
        const first = variants[0]?.name || '';
        if (first.includes('/')) {
            const partsCount = first.split('/').length;
            const defaultLabels = ['Size', 'Color', 'Material', 'Style'];
            const groups = [];
            for (let i = 0; i < partsCount; i++) {
                groups.push({
                    index: i,
                    label: defaultLabels[i] || `Option ${i + 1}`,
                    values: []
                });
            }
            variants.forEach(v => {
                const parts = String(v.name || '').split('/').map(p => p.trim());
                parts.forEach((p, idx) => {
                    if (groups[idx] && p && !groups[idx].values.includes(p)) {
                        groups[idx].values.push(p);
                    }
                });
            });
            return groups.filter(g => g.values.length > 0);
        }
        return [];
    }, [variants]);

    const activeOptionValues = useMemo(() => {
        if (!selectedVariant || !selectedVariant.name) return [];
        if (selectedVariant.name.includes('/')) {
            return selectedVariant.name.split('/').map(p => p.trim());
        }
        return [selectedVariant.name.trim()];
    }, [selectedVariant]);

    const handleSelectOptionValue = (groupIndex, val) => {
        if (!parsedOptionGroups || parsedOptionGroups.length === 0) return;
        const currentVals = [...activeOptionValues];
        while (currentVals.length < parsedOptionGroups.length) {
            currentVals.push(parsedOptionGroups[currentVals.length].values[0] || '');
        }
        currentVals[groupIndex] = val;

        // 1. Try exact combination match (e.g. "S / Green")
        const targetName = currentVals.join(' / ').toLowerCase();
        let matched = variants.find(v => String(v.name || '').trim().toLowerCase() === targetName);

        // 2. Fallback match: if exact combo not found, find first variant having clicked option
        if (!matched) {
            matched = variants.find(v => {
                const parts = String(v.name || '').split('/').map(p => p.trim().toLowerCase());
                return parts[groupIndex] === val.toLowerCase();
            });
        }

        if (matched) {
            handleSelectVariant(matched);
        }
    };

    const relatedProducts = useMemo(() => {
        if (!product || products.length === 0) return [];
        return products
            .filter(p => p.id !== product.id && p.category === product.category)
            .slice(0, 4);
    }, [product, products]);

    const priceRange = useMemo(() => {
        if (product?.type === 'variant' && variants.length > 0) {
            const prices = variants.map(v => Number(v.price || 0)).filter(p => p > 0);
            if (prices.length > 0) {
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                return { min, max, isRange: min !== max };
            }
        }
        return null;
    }, [product, variants]);

    const handleAddToCart = () => {
        if (!product) return;
        addToCart(product, selectedVariant, qty);
    };

    const galleryImages = useMemo(() => {
        if (!product) return [];
        const mainImg = selectedVariant?.image_url || product.image_url || '';
        const mainList = typeof mainImg === 'string' ? mainImg.split(',') : [];

        let galleryList = [];
        if (Array.isArray(product.gallery_image)) {
            galleryList = product.gallery_image;
        } else if (typeof product.gallery_image === 'string' && product.gallery_image) {
            galleryList = product.gallery_image.split(',');
        }

        const fallbackImg = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';
        const combined = [...mainList, ...galleryList].map(url => (url || '').trim()).filter(Boolean);
        const unique = Array.from(new Set(combined));
        return unique.length > 0 ? unique : [fallbackImg];
    }, [product, selectedVariant]);

    useEffect(() => {
        setCurrentImageIdx(0);
        if (swiperInstance && !swiperInstance.destroyed) {
            swiperInstance.slideTo(0);
        }
    }, [selectedVariant, product]);

    if (loading) return <div className={styles.loading}>Loading product details...</div>;
    if (!product) return (
        <div className={styles.notFound}>
            Product not found.
            <button onClick={() => router.push('/shop')}>Back to Shop</button>
        </div>
    );

    const displayPrice = selectedVariant ? selectedVariant.price : product.price;
    const currentStock = selectedVariant ? Number(selectedVariant.stock ?? 0) : Number(product.stock ?? 0);
    const isOutOfStock = currentStock <= 0;
    const activeImageUrl = galleryImages[currentImageIdx] || galleryImages[0];

    return (
        <div className={styles.productContainer}>

            {/*  Main Two-Column Section  */}
            <div className={styles.mainSection}>

                {/*  LEFT: Image Gallery with Swiper.js Slider & Dot Thumbnails  */}
                <div className={styles.imageGallery}>
                    <div className={styles.swiperWrapper}>
                        {isOutOfStock && (
                            <div className={styles.imageOutOfStockBadge}>
                                Out of Stock
                            </div>
                        )}
                        <Swiper
                            modules={[Autoplay]}
                            onSwiper={setSwiperInstance}
                            onSlideChange={(swiper) => setCurrentImageIdx(swiper.activeIndex)}
                            loop={false}
                            spaceBetween={0}
                            slidesPerView={1}
                            className={styles.swiperContainer}
                        >
                            {galleryImages.map((img, idx) => (
                                <SwiperSlide key={`slide-${img}-${idx}`} className={styles.swiperSlide}>
                                    <div
                                        className={styles.imageWrapper}
                                        onClick={() => setIsZoomed(true)}
                                        title="Click to zoom image"
                                    >
                                        <img
                                            src={img}
                                            alt={`${product.name} - View ${idx + 1}`}
                                            className={styles.mainImage}
                                            style={{ filter: isOutOfStock ? 'grayscale(25%)' : 'none' }}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';
                                            }}
                                        />
                                        <div className={styles.zoomBadge}>
                                            <ZoomIn size={14} />
                                            <span>Zoom</span>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                    {/* Small Dot Thumbnails Indicator Bar — directly below main image */}
                    {galleryImages.length > 1 && (
                        <div className={styles.dotThumbnailsBar}>
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={`dot-${img}-${idx}`}
                                    type="button"
                                    aria-label={`Go to slide ${idx + 1}`}
                                    className={`${styles.dotItem} ${currentImageIdx === idx ? styles.dotActive : ''}`}
                                    onClick={() => {
                                        setCurrentImageIdx(idx);
                                        if (swiperInstance && !swiperInstance.destroyed) {
                                            swiperInstance.slideTo(idx);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Square Image Thumbnail Strip — below small dots */}
                    {galleryImages.length > 1 && (
                        <div className={styles.thumbStrip}>
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={`thumb-${img}-${idx}`}
                                    type="button"
                                    className={`${styles.thumbItem} ${currentImageIdx === idx ? styles.thumbActive : ''}`}
                                    onMouseEnter={() => {
                                        setCurrentImageIdx(idx);
                                        if (swiperInstance && !swiperInstance.destroyed) {
                                            swiperInstance.slideTo(idx);
                                        }
                                    }}
                                    onClick={() => {
                                        setCurrentImageIdx(idx);
                                        if (swiperInstance && !swiperInstance.destroyed) {
                                            swiperInstance.slideTo(idx);
                                        }
                                    }}
                                >
                                    <img
                                        src={img}
                                        alt={`View ${idx + 1}`}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80';
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/*  RIGHT: Product Info  */}
                <div className={styles.productDetails}>

                    {/* Category */}
                    <span className={styles.categoryPill}>{product.category}</span>

                    {/* Name */}
                    <h1 className={styles.productName}>{product.name}</h1>

                    {/* Price + Stock */}
                    {(() => {
                        const tagList = Array.isArray(product.tags)
                            ? product.tags
                            : (typeof product.tags === 'string' ? product.tags.split(',') : []);

                        const mrpTag = tagList.map(t => String(t).trim()).find(t => t.toLowerCase().startsWith('mrp:'));
                        const mrpVal = mrpTag ? Number(mrpTag.split(':')[1]) : (selectedVariant?.compare_price || product.compare_price || product.original_price || product.mrp);

                        const hasDiscount = mrpVal && !isNaN(mrpVal) && mrpVal > (displayPrice || 0);
                        const discountPercent = hasDiscount ? Math.round(((mrpVal - displayPrice) / mrpVal) * 100) : 0;

                        return (
                            <div className={styles.priceRow}>
                                <span className={styles.priceTag}>
                                    ₹{displayPrice?.toLocaleString()}
                                </span>
                                {hasDiscount && (
                                    <>
                                        <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '1.2rem', fontWeight: 600 }}>
                                            ₹{Number(mrpVal).toLocaleString()}
                                        </span>
                                        <span style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', fontSize: '0.85rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                                            {discountPercent}% OFF
                                        </span>
                                    </>
                                )}
                                {!isOutOfStock
                                    ? <span className={styles.inStock}><CheckCircle size={13} /> {currentStock} sarees in stock</span>
                                    : <span className={styles.outOfStock}><X size={13} /> Out of Stock</span>
                                }
                            </div>
                        );
                    })()}

                    <div className={styles.divider} />

                    {/* Description */}
                    <div className={styles.descriptionBlock}>
                        <p className={styles.descLabel}>Description</p>
                        <p className={styles.descText}>
                            {product.description || "Premium quality saree from our exclusive collection. Crafted with elegance and precision for your special occasions."}
                        </p>
                    </div>

                    {/* Multi-Option Selectors (Shopify Style: Size, Color, etc.) */}
                    {product.type === 'variant' && variants.length > 0 && parsedOptionGroups.length > 1 && (
                        <div className={styles.variantsSection} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                            {parsedOptionGroups.map((grp) => (
                                <div key={grp.index}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                                        <p className={styles.variantLabel} style={{ margin: 0, fontSize: '0.85rem' }}>
                                            Select {grp.label}: <strong style={{ color: '#0f172a' }}>{activeOptionValues[grp.index] || ''}</strong>
                                        </p>
                                    </div>
                                    <div className={styles.variantChips}>
                                        {grp.values.map(val => {
                                            const isSelected = (activeOptionValues[grp.index] || '').toLowerCase() === val.toLowerCase();
                                            // Check if this option value has any in-stock combo
                                            const hasInStock = variants.some(v => {
                                                const parts = String(v.name || '').split('/').map(p => p.trim().toLowerCase());
                                                return parts[grp.index] === val.toLowerCase() && Number(v.stock || 0) > 0;
                                            });

                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    className={`${styles.variantChip} ${isSelected ? styles.activeVariant : ''} ${!hasInStock ? styles.variantOutOfStock : ''}`}
                                                    onClick={() => handleSelectOptionValue(grp.index, val)}
                                                >
                                                    {val} {!hasInStock ? '(Out of Stock)' : ''}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Single Option / Direct Combinations Selector */}
                    {product.type === 'variant' && variants.length > 0 && parsedOptionGroups.length <= 1 && (
                        <div className={styles.variantsSection}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                                <p className={styles.variantLabel} style={{ margin: 0 }}>Select Size / Option:</p>
                                {selectedVariant?.sku && (
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, fontFamily: 'monospace' }}>
                                        SKU: {selectedVariant.sku}
                                    </span>
                                )}
                            </div>
                            <div className={styles.variantChips}>
                                {variants.map(v => {
                                    const vOutOfStock = Number(v.stock ?? 0) <= 0;
                                    const isSelected = selectedVariant?.id === v.id;
                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            className={`${styles.variantChip} ${isSelected ? styles.activeVariant : ''} ${vOutOfStock ? styles.variantOutOfStock : ''}`}
                                            onClick={() => handleSelectVariant(v)}
                                            title={vOutOfStock ? `${v.name} is currently Out of Stock` : `${v.name} (${v.stock} in stock)`}
                                        >
                                            {v.name} {vOutOfStock ? '(Out of Stock)' : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {!isOutOfStock ? (
                        <div>
                            <div className={styles.actions}>
                                <div className={styles.qtySelector}>
                                    <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                                    <span>{qty}</span>
                                    <button 
                                        onClick={() => setQty(Math.min(currentStock, qty + 1))}
                                        disabled={qty >= currentStock}
                                        title={qty >= currentStock ? `Maximum ${currentStock} sarees available` : 'Increase quantity'}
                                    >
                                        +
                                    </button>
                                </div>
                                <button className={styles.addToCartBtn} onClick={handleAddToCart}>
                                    <ShoppingCart size={16} /> Add to Cart
                                </button>
                                <button
                                    className={styles.buyNowBtn}
                                    onClick={() => { handleAddToCart(); router.push('/checkout'); }}
                                >
                                    Buy Now
                                </button>
                            </div>
                            {qty >= currentStock && (
                                <div style={{
                                    marginTop: '0.75rem',
                                    padding: '0.45rem 0.85rem',
                                    background: '#fff1f2',
                                    border: '1px solid #fecdd3',
                                    borderRadius: '8px',
                                    color: '#e11d48',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    Out of Stock for higher quantity (Maximum {currentStock} in stock)
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.actions}>
                            <button disabled className={styles.addToCartBtn} style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#94a3b8', border: '1px solid #e2e8f0', gridColumn: '1 / -1', height: '52px', fontWeight: 800 }}>
                                Out of Stock
                            </button>
                        </div>
                    )}

                    {/* Meta Table */}
                    <div className={styles.metaTable}>
                        <div className={styles.metaRow}>
                            <span className={styles.metaKey}>Category</span>
                            <span className={styles.metaVal}>{product.category}</span>
                        </div>
                        {product.product_group && (
                            <div className={styles.metaRow}>
                                <span className={styles.metaKey}>Brand</span>
                                <span className={styles.metaVal}>{product.product_group}</span>
                            </div>
                        )}
                        <div className={styles.metaRow}>
                            <span className={styles.metaKey}>SKU</span>
                            <span className={styles.metaVal}>
                                {product.product_catalog_image_id || 'AS-PRD-' + product.id}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/*  Related Products  */}
            {relatedProducts.length > 0 && (
                <section className={styles.relatedSection}>
                    <div className={styles.relatedHeader}>
                        <h2 className={styles.sectionTitle}>You may also like</h2>
                    </div>
                    <div className={styles.relatedGrid}>
                        {relatedProducts.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </section>
            )}

            {/*  Zoom Modal  */}
            {isZoomed && (
                <div className={styles.zoomModal} onClick={() => setIsZoomed(false)}>
                    <button
                        className={styles.closeZoomBtn}
                        onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
                    >
                        <X size={26} strokeWidth={1.5} />
                    </button>
                    <img
                        src={activeImageUrl}
                        alt={product.name}
                        className={styles.zoomedImage}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
