'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCart, CheckCircle, X, ZoomIn, ChevronLeft, ChevronRight, Tag, ShieldCheck } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import ProductCard from '@/components/ProductCard';
import { findProductBySlugOrId, getProductSlug, extractProductGalleryImages, normalizeImageUrl } from '@/lib/productUrl';
import styles from '@/app/(shop-portal)/product/[id]/product.module.css';

// Import Swiper React components & modules
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';

export default function ProductDetailsClient({ initialProduct = null, initialVariants = [] }) {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { products, addToCart, loading: productsLoading, mysqlClient, getEffectiveProductPrice } = useShop();

    const [product, setProduct] = useState(initialProduct);
    const [variants, setVariants] = useState(initialVariants || []);
    const [selectedVariant, setSelectedVariant] = useState(() => {
        if (!initialVariants || initialVariants.length === 0) return null;
        const currentParam = searchParams?.get('variant') || null;
        if (currentParam) {
            const cleanParam = decodeURIComponent(currentParam).trim().toLowerCase();
            const found = initialVariants.find(v =>
                String(v.id).toLowerCase() === cleanParam ||
                String(v.sku || '').toLowerCase() === cleanParam ||
                String(v.name || '').trim().toLowerCase() === cleanParam
            );
            if (found) return found;
        }
        return initialVariants.find(v => Number(v.stock || 0) > 0) || initialVariants[0];
    });
    const [loading, setLoading] = useState(!initialProduct);
    const [qty, setQty] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [swiperInstance, setSwiperInstance] = useState(null);
    const loadedProductIdRef = useRef(initialProduct ? id : null);

    // Sync state whenever initialProduct or initialVariants change from server
    useEffect(() => {
        if (initialProduct) {
            setProduct(initialProduct);
            loadedProductIdRef.current = id;
            setLoading(false);
        }
        if (initialVariants && initialVariants.length > 0) {
            setVariants(initialVariants);
            if (!selectedVariant) {
                const currentParam = searchParams?.get('variant') || null;
                let target = null;
                if (currentParam) {
                    const cleanParam = decodeURIComponent(currentParam).trim().toLowerCase();
                    target = initialVariants.find(v =>
                        String(v.id).toLowerCase() === cleanParam ||
                        String(v.sku || '').toLowerCase() === cleanParam ||
                        String(v.name || '').trim().toLowerCase() === cleanParam
                    );
                }
                if (!target) {
                    target = initialVariants.find(v => Number(v.stock || 0) > 0) || initialVariants[0];
                }
                setSelectedVariant(target);
            }
        }
    }, [initialProduct, initialVariants, id, searchParams]);

    // Load Product and Variants once per id without triggering reload loops
    useEffect(() => {
        let isMounted = true;

        async function loadProductDetails() {
            if (!id) return;

            // If we already have the matching product loaded, do not re-fetch or show skeleton
            if (product && (product.id === id || getProductSlug(product) === id || findProductBySlugOrId(id, [product]))) {
                if (isMounted) setLoading(false);
                return;
            }

            try {
                // 1. Try finding in loaded products list from context
                let found = findProductBySlugOrId(id, products) || initialProduct;

                // 2. If not found in memory products list, query MySQL DB directly
                if (!found && mysqlClient) {
                    const rawParam = decodeURIComponent(String(id)).trim().replace(/\/$/, '');

                    // A. Direct Slug match
                    const { data: directSlug } = await mysqlClient.from('products').select('*').eq('slug', rawParam).eq('is_active', true).maybeSingle();
                    if (directSlug) found = directSlug;

                    // B. Direct ID match
                    if (!found) {
                        const { data: directData } = await mysqlClient.from('products').select('*').eq('id', rawParam).eq('is_active', true).maybeSingle();
                        if (directData) found = directData;
                    }

                    // C. Direct SKU match
                    if (!found) {
                        const { data: directSku } = await mysqlClient.from('products').select('*').eq('sku', rawParam).eq('is_active', true).maybeSingle();
                        if (directSku) found = directSku;
                    }

                    // D. Trailing identifier match (Product No / SKU / ID)
                    if (!found) {
                        const lastHyphen = rawParam.lastIndexOf('-');
                        if (lastHyphen !== -1) {
                            const identifier = rawParam.substring(lastHyphen + 1);
                            const { data: bySku } = await mysqlClient.from('products').select('*').eq('sku', identifier).eq('is_active', true).maybeSingle();
                            if (bySku) found = bySku;
                            if (!found) {
                                const { data: byId } = await mysqlClient.from('products').select('*').eq('id', identifier).eq('is_active', true).maybeSingle();
                                if (byId) found = byId;
                            }
                        }
                    }

                    // E. Full list fallback match by slug
                    if (!found) {
                        const { data: allP } = await mysqlClient.from('products').select('*').eq('is_active', true);
                        if (allP && allP.length > 0) {
                            found = findProductBySlugOrId(id, allP);
                        }
                    }
                }

                if (!isMounted) return;

                // Ensure draft products are not displayed
                if (found && (found.is_active === 0 || found.is_active === false || String(found.is_active) === '0')) {
                    found = null;
                }

                if (found) {
                    setProduct(found);
                    loadedProductIdRef.current = id;

                    // Fetch variants if applicable
                    if ((found.type === 'variant' || found.type === 'variable') && mysqlClient) {
                        try {
                            const { data: variantData } = await mysqlClient
                                .from('product_variants')
                                .select('*')
                                .eq('product_id', found.id)
                                .order('created_at', { ascending: true });

                            if (isMounted) {
                                if (variantData && variantData.length > 0) {
                                    setVariants(variantData);

                                    // Select matching variant from searchParams or URL query
                                    const currentParam = searchParams?.get('variant') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('variant') : null);
                                    let target = null;
                                    if (currentParam) {
                                        const cleanParam = decodeURIComponent(currentParam).trim().toLowerCase();
                                        target = variantData.find(v =>
                                            String(v.id).toLowerCase() === cleanParam ||
                                            String(v.sku || '').toLowerCase() === cleanParam ||
                                            String(v.name || '').trim().toLowerCase() === cleanParam
                                        );
                                    }
                                    if (!target) {
                                        target = variantData.find(v => Number(v.stock || 0) > 0) || variantData[0];
                                    }
                                    setSelectedVariant(target);
                                } else {
                                    setVariants([]);
                                    setSelectedVariant(null);
                                }
                            }
                        } catch (err) {
                            console.error('Error loading variants:', err);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading product details:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadProductDetails();

        return () => {
            isMounted = false;
        };
    }, [id, products, productsLoading, mysqlClient, initialProduct]);

    // Instant, flicker-free variant selection
    const handleSelectVariant = useCallback((v) => {
        if (!v) return;
        setSelectedVariant(v);

        // Quietly sync URL without re-triggering router or page unmount
        if (typeof window !== 'undefined' && v.id) {
            const url = new URL(window.location.href);
            if (url.searchParams.get('variant') !== String(v.id)) {
                url.searchParams.set('variant', String(v.id));
                window.history.replaceState(null, '', url.toString());
            }
        }
    }, []);

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

    // Gallery images stable list (auto-normalizes JSON brackets, commas, with-watermark paths)
    const galleryImages = useMemo(() => {
        return extractProductGalleryImages(product, selectedVariant);
    }, [product, selectedVariant]);

    // Smoothly slide to variant image when variant changes
    useEffect(() => {
        if (!selectedVariant || !swiperInstance || swiperInstance.destroyed) return;
        const rawVarImg = selectedVariant.image_url ? selectedVariant.image_url.split(',')[0].trim() : null;
        const variantImg = normalizeImageUrl(rawVarImg);
        if (variantImg) {
            const varBasename = variantImg.split('/').pop();
            const foundIdx = galleryImages.findIndex(img => img === variantImg || (varBasename && img.endsWith(varBasename)));
            if (foundIdx !== -1 && foundIdx !== currentImageIdx) {
                setCurrentImageIdx(foundIdx);
                swiperInstance.slideTo(foundIdx, 300);
            }
        }
    }, [selectedVariant, galleryImages, swiperInstance, currentImageIdx]);

    if (loading && !product) {
        return (
            <div className={styles.productContainer}>
                <div className={styles.mainSection}>
                    <div className={styles.imageGallerySkeleton}>
                        <div className={styles.imageSkeleton} />
                        <div className={styles.thumbStripSkeleton}>
                            {[1, 2, 3, 4].map(n => <div key={n} className={styles.thumbSkeleton} />)}
                        </div>
                    </div>
                    <div className={styles.detailsSkeleton}>
                        <div className={styles.pillSkeleton} />
                        <div className={styles.titleSkeleton} />
                        <div className={styles.priceSkeleton} />
                        <div className={styles.descSkeleton} />
                        <div className={styles.variantsSkeleton} />
                        <div className={styles.btnSkeleton} />
                    </div>
                </div>
            </div>
        );
    }

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

                    {/* Small Dot Thumbnails Indicator Bar */}
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

                    {/* Square Image Thumbnail Strip */}
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

                    {/* Price + Stock + Discount Rules */}
                    {(() => {
                        const pricing = typeof getEffectiveProductPrice === 'function'
                            ? getEffectiveProductPrice(product, selectedVariant)
                            : { originalPrice: displayPrice, comparePrice: displayPrice, discountedPrice: displayPrice, discountPercent: 0, discountAmount: 0, activeRule: null, hasDiscount: false };

                        const finalPrice = pricing.discountedPrice || displayPrice;
                        const originalPrice = pricing.comparePrice || pricing.originalPrice;
                        const hasDiscount = pricing.hasDiscount;
                        const discountPercent = pricing.discountPercent;
                        const savings = pricing.discountAmount;
                        const activeRule = pricing.activeRule;

                        return (
                            <div>
                                <div className={styles.priceRow}>
                                    <span className={styles.priceTag}>
                                        ₹{finalPrice?.toLocaleString()}
                                    </span>
                                    {hasDiscount && (
                                        <>
                                            <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '1.2rem', fontWeight: 600 }}>
                                                ₹{Number(originalPrice).toLocaleString()}
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

                                {hasDiscount && savings > 0 && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: activeRule ? '#eff6ff' : '#f0fdf4',
                                        border: activeRule ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                                        color: activeRule ? '#1d4ed8' : '#15803d',
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        marginTop: '0.65rem'
                                    }}>
                                        <Tag size={14} />
                                        <span>
                                            {activeRule ? `${activeRule.name}: You Save ₹${savings.toLocaleString()}` : `Special Offer: You Save ₹${savings.toLocaleString()}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <div className={styles.divider} />

                    {/* Description - only show if exists */}
                    {product.description && String(product.description).trim().length > 0 && (
                        <div className={styles.descriptionBlock}>
                            <p className={styles.descLabel}>Description</p>
                            <p className={styles.descText}>
                                {product.description}
                            </p>
                        </div>
                    )}

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
