'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import { useCompare } from '@/context/CompareContext';
import { getProductUrl, normalizeImageUrl } from '@/lib/productUrl';
import styles from './ProductCard.module.css';

const COLOR_MAP = {
    'red': '#dc2626',
    'maroon': '#800000',
    'burgundy': '#5d0821',
    'wine': '#722f37',
    'pink': '#ec4899',
    'rose': '#f43f5e',
    'magenta': '#d946ef',
    'green': '#16a34a',
    'bottle green': '#004225',
    'olive': '#808000',
    'mint': '#6ee7b7',
    'blue': '#2563eb',
    'navy': '#1e3a8a',
    'navy blue': '#000080',
    'royal blue': '#4169e1',
    'sky blue': '#38bdf8',
    'teal': '#0d9488',
    'turquoise': '#06b6d4',
    'yellow': '#eab308',
    'mustard': '#ca8a04',
    'gold': '#d97706',
    'golden': '#ffd700',
    'orange': '#f97316',
    'peach': '#ffdab9',
    'coral': '#f87171',
    'purple': '#9333ea',
    'violet': '#7c3aed',
    'lavender': '#c084fc',
    'black': '#0f172a',
    'white': '#ffffff',
    'cream': '#fffdd0',
    'beige': '#f5f5dc',
    'grey': '#64748b',
    'gray': '#64748b',
    'silver': '#cbd5e1',
    'brown': '#78350f',
    'copper': '#b87333',
    'rust': '#b7410e'
};

function getVariantColor(variantName) {
    if (!variantName) return null;
    const lower = String(variantName).toLowerCase();
    for (const [key, color] of Object.entries(COLOR_MAP)) {
        if (lower.includes(key)) return color;
    }
    return null;
}

export default function ProductCard({ product, gridView = true }) {
    const { addToCart, mysqlClient, getEffectiveProductPrice } = useShop();
    const { compareItems, toggleCompare } = useCompare();

    const isVariantProduct = (product.type === 'variant' || product.type === 'variable');

    // Local variants list (from props or lazy fallback)
    const [localVariants, setLocalVariants] = useState(() => isVariantProduct ? (product.variants || []) : []);

    // Sync if product.variants or product.type changes
    useEffect(() => {
        if (isVariantProduct && product.variants && product.variants.length > 0) {
            setLocalVariants(product.variants);
        } else {
            setLocalVariants([]);
        }
    }, [isVariantProduct, product.variants]);

    // Lazy fallback fetch if product is variant type but variants array is missing
    useEffect(() => {
        if (isVariantProduct && (!localVariants || localVariants.length === 0) && mysqlClient && product.id) {
            let isMounted = true;
            mysqlClient
                .from('product_variants')
                .select('*')
                .eq('product_id', product.id)
                .order('created_at', { ascending: true })
                .then(({ data }) => {
                    if (isMounted && data && data.length > 0) {
                        setLocalVariants(data);
                    }
                })
                .catch(() => {});
            return () => { isMounted = false; };
        }
    }, [isVariantProduct, product.id, localVariants, mysqlClient]);

    const hasVariants = isVariantProduct && localVariants && localVariants.length > 0;

    // Selected variant state
    const [selectedVariant, setSelectedVariant] = useState(() => {
        if (hasVariants) {
            return localVariants.find(v => Number(v.stock || 0) > 0) || localVariants[0];
        }
        return null;
    });

    // Keep selectedVariant valid if localVariants updates
    useEffect(() => {
        if (hasVariants) {
            setSelectedVariant(prev => {
                if (prev && localVariants.some(v => v.id === prev.id)) return prev;
                return localVariants.find(v => Number(v.stock || 0) > 0) || localVariants[0];
            });
        } else {
            setSelectedVariant(null);
        }
    }, [localVariants, hasVariants]);

    // Active image computation
    const activeImage = useMemo(() => {
        if (selectedVariant?.image_url) {
            return normalizeImageUrl(selectedVariant.image_url.split(',')[0]);
        }
        const prodImg = product.image_url ? product.image_url.split(',')[0] : '';
        return normalizeImageUrl(prodImg) || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';
    }, [selectedVariant, product.image_url]);

    // Dynamic Price & Discount computation via Central Discount Engine
    const pricing = useMemo(() => {
        if (typeof getEffectiveProductPrice === 'function') {
            return getEffectiveProductPrice(product, selectedVariant);
        }
        const base = selectedVariant?.price !== undefined && selectedVariant?.price !== null ? Number(selectedVariant.price) : Number(product.price || 0);
        return { originalPrice: base, comparePrice: base, discountedPrice: base, discountPercent: 0, hasDiscount: false };
    }, [product, selectedVariant, getEffectiveProductPrice]);

    const activePrice = pricing.discountedPrice;
    const hasDiscount = pricing.hasDiscount;
    const mrpVal = pricing.comparePrice || pricing.originalPrice;
    const discountPercent = pricing.discountPercent;
    const activeOfferTitle = pricing.activeRule?.name;

    const activeStock = selectedVariant
        ? Number(selectedVariant.stock ?? 0)
        : Number(product.stock ?? 0);

    const isOutOfStock = activeStock <= 0;

    // Direct product URL with variant parameter
    const productDetailUrl = useMemo(() => {
        const baseUrl = getProductUrl(product);
        if (selectedVariant?.id) {
            const separator = baseUrl.includes('?') ? '&' : '?';
            return `${baseUrl}${separator}variant=${selectedVariant.id}`;
        }
        return baseUrl;
    }, [product, selectedVariant]);

    // Handle variant chip click
    const handleVariantClick = (e, variant) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedVariant(variant);
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // LIST VIEW
    // ─────────────────────────────────────────────────────────────────────────────
    if (!gridView) {
        return (
            <div className={styles.productCardList}>
                <div className={styles.productImageWrap}>
                    <Link href={productDetailUrl}>
                        <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${activeImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.5, zIndex: 0 }} />
                        <img
                            src={activeImage}
                            alt={product.name}
                            className={styles.productImage}
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                            style={{ position: 'relative', zIndex: 1, filter: isOutOfStock ? 'grayscale(30%)' : 'none' }}
                        />
                    </Link>

                    {isOutOfStock && <div className={styles.outOfStockBadge}>Out of Stock</div>}
                    {isOutOfStock && <div className={styles.outOfStockOverlay}>Out of Stock</div>}
                    {!isOutOfStock && hasVariants && <div className={styles.variantBadge}>{localVariants.length} Options</div>}
                </div>

                <div className={styles.productInfo} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div className={styles.productCategory}>{product.category}</div>
                    <Link href={productDetailUrl} className={styles.link}>
                        <h3 className={styles.productName}>{product.name}</h3>
                    </Link>
                    {product.description && String(product.description).trim().length > 0 && (
                        <p className={styles.productDescription}>
                            {product.description.slice(0, 140)}{product.description.length > 140 ? '...' : ''}
                        </p>
                    )}

                    {/* Variant Selector in List View */}
                    {hasVariants && (
                        <div className={styles.variantSection} style={{ marginBottom: '0.85rem' }}>
                            <div className={styles.variantHeader}>
                                <span>Options ({localVariants.length}):</span>
                                {selectedVariant && (
                                    <span className={styles.variantActiveName}>
                                        Selected: {selectedVariant.name}
                                    </span>
                                )}
                            </div>
                            <div className={styles.variantChipsRow}>
                                {localVariants.map(v => {
                                    const isSelected = selectedVariant?.id === v.id;
                                    const isVarOutOfStock = Number(v.stock ?? 0) <= 0;
                                    const colorHex = getVariantColor(v.name);

                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={(e) => handleVariantClick(e, v)}
                                            title={`${v.name}${isVarOutOfStock ? ' (Out of stock)' : ` - ₹${(v.price || activePrice).toLocaleString()}`}`}
                                            className={`${styles.variantChip} ${isSelected ? styles.variantChipActive : ''} ${isVarOutOfStock ? styles.variantChipOutOfStock : ''}`}
                                        >
                                            {colorHex && (
                                                <span 
                                                    className={styles.variantColorDot} 
                                                    style={{ backgroundColor: colorHex }} 
                                                />
                                            )}
                                            <span>{v.name}</span>
                                            {isVarOutOfStock && <span style={{ fontSize: '0.65rem', color: '#e11d48' }}>• Out</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Price Row */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <div className={styles.productPrice}>₹{activePrice.toLocaleString()}</div>
                        {hasDiscount && (
                            <>
                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
                                    ₹{Number(mrpVal).toLocaleString()}
                                </span>
                                <span style={{ color: '#e11d48', fontSize: '0.75rem', fontWeight: 800, background: '#fff1f2', border: '1px solid #fecdd3', padding: '2px 6px', borderRadius: '4px' }}>
                                    {discountPercent}% OFF
                                </span>
                            </>
                        )}
                        {isOutOfStock && <span className={styles.outOfStockTag}>Out of Stock</span>}
                    </div>

                    <button
                        onClick={() => addToCart(product, selectedVariant || (hasVariants ? localVariants[0] : null))}
                        disabled={isOutOfStock}
                        className={`${styles.addToCartBtn} ${isOutOfStock ? styles.addToCartDisabled : ''}`}
                        style={{ alignSelf: 'flex-start' }}
                    >
                        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // GRID VIEW (Default)
    // ─────────────────────────────────────────────────────────────────────────────
    const displayedVariants = localVariants.slice(0, 4);
    const remainingCount = localVariants.length - 4;

    return (
        <div className={styles.productCard}>
            <div className={styles.productImageWrap}>
                <Link href={productDetailUrl}>
                    <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${activeImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.5, zIndex: 0 }} />
                    <img
                        src={activeImage}
                        alt={product.name}
                        className={styles.productImage}
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                        style={{ position: 'relative', zIndex: 1, filter: isOutOfStock ? 'grayscale(30%)' : 'none' }}
                    />
                </Link>

                {isOutOfStock && <div className={styles.outOfStockBadge}>Out of Stock</div>}
                {isOutOfStock && <div className={styles.outOfStockOverlay}>Out of Stock</div>}
                {!isOutOfStock && hasDiscount && discountPercent > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'linear-gradient(135deg, #e11d48, #be123c)',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(225, 29, 72, 0.4)',
                        zIndex: 5,
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase'
                    }}>
                        {discountPercent}% OFF
                    </div>
                )}
                {!isOutOfStock && hasVariants && (
                    <div className={styles.variantBadge}>
                        {localVariants.length} Options
                    </div>
                )}

                {!isOutOfStock && (
                    <div
                        className={styles.hoverAddToCart}
                        onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, selectedVariant || (hasVariants ? localVariants[0] : null));
                        }}
                    >
                        <ShoppingCart size={16} /> ADD TO CART
                    </div>
                )}
            </div>

            <div className={styles.productInfo}>
                <div className={styles.productCategory}>{product.category}</div>
                <Link href={productDetailUrl} className={styles.link}>
                    <h3 className={styles.productName}>{product.name}</h3>
                </Link>

                {/* Variant Selector in Grid View */}
                {hasVariants && (
                    <div className={styles.variantSection}>
                        <div className={styles.variantHeader}>
                            <span>Options:</span>
                            {selectedVariant && (
                                <span className={styles.variantActiveName}>
                                    {selectedVariant.name}
                                </span>
                            )}
                        </div>
                        <div className={styles.variantChipsRow}>
                            {displayedVariants.map(v => {
                                const isSelected = selectedVariant?.id === v.id;
                                const isVarOutOfStock = Number(v.stock ?? 0) <= 0;
                                const colorHex = getVariantColor(v.name);

                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={(e) => handleVariantClick(e, v)}
                                        title={`${v.name}${isVarOutOfStock ? ' (Out of stock)' : ` - ₹${(v.price || activePrice).toLocaleString()}`}`}
                                        className={`${styles.variantChip} ${isSelected ? styles.variantChipActive : ''} ${isVarOutOfStock ? styles.variantChipOutOfStock : ''}`}
                                    >
                                        {colorHex && (
                                            <span 
                                                className={styles.variantColorDot} 
                                                style={{ backgroundColor: colorHex }} 
                                            />
                                        )}
                                        <span>{v.name}</span>
                                    </button>
                                );
                            })}

                            {remainingCount > 0 && (
                                <Link 
                                    href={productDetailUrl} 
                                    className={styles.variantMoreTag}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    +{remainingCount} more
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Price Row */}
                <div className={styles.productPriceRow} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <div className={styles.productPrice}>₹{activePrice.toLocaleString()}</div>
                    {hasDiscount && (
                        <>
                            <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                                ₹{Number(mrpVal).toLocaleString()}
                            </span>
                            <span style={{ color: '#e11d48', fontSize: '0.72rem', fontWeight: 800, background: '#fff1f2', border: '1px solid #fecdd3', padding: '1px 5px', borderRadius: '4px' }}>
                                {discountPercent}% OFF
                            </span>
                        </>
                    )}
                    {isOutOfStock && (
                        <span className={styles.outOfStockTag}>Out of Stock</span>
                    )}
                </div>
            </div>
        </div>
    );
}
