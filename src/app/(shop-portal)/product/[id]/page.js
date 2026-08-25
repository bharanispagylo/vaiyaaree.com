'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, CheckCircle, X, ZoomIn } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import ProductCard from '@/components/ProductCard';
import { findProductBySlugOrId, getProductSlug } from '@/lib/productUrl';
import styles from './product.module.css';

export default function ProductDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { products, addToCart, loading: productsLoading, mysqlClient } = useShop();

    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);
    const [currentImageIdx, setCurrentImageIdx] = useState(0);

    useEffect(() => {
        async function loadProductDetails() {
            if (!id) return;
            setLoading(true);

            // 1. Try finding in loaded products list
            let found = findProductBySlugOrId(id, products);

            // 2. If not found in memory products list, query MySQL DB directly
            if (!found && mysqlClient) {
                const rawParam = decodeURIComponent(String(id)).trim().replace(/\/$/, '');

                // A. Direct ID / UUID query
                let { data: directData } = await mysqlClient.from('products').select('*').eq('id', rawParam).maybeSingle();
                if (directData) found = directData;

                // B. Trailing identifier match (Product No / SKU / ID)
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

                // C. Full list fallback match by slug
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
    }, [id, products, productsLoading, mysqlClient]);

    useEffect(() => {
        if (product && products.length > 0) {
            const viewed = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
            const updated = [product.id, ...viewed.filter(vId => vId !== product.id)].slice(0, 4);
            localStorage.setItem('recently_viewed', JSON.stringify(updated));
        }
    }, [product, products]);

    async function fetchVariants(productId) {
        const { data } = await mysqlClient
            .from('product_variants')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: true });
        if (data) {
            setVariants(data);
            if (data.length > 0) setSelectedVariant(data[0]);
        }
        setLoading(false);
    }

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

    if (loading) return <div className={styles.loading}>Loading product details...</div>;
    if (!product) return (
        <div className={styles.notFound}>
            Product not found.
            <button onClick={() => router.push('/shop')}>Back to Shop</button>
        </div>
    );

    const displayPrice = selectedVariant ? selectedVariant.price : product.price;
    const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

    const galleryImages = (
        selectedVariant?.image_url ||
        product.image_url ||
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80'
    ).split(',').filter(Boolean);

    const activeImageUrl = galleryImages[currentImageIdx] || galleryImages[0];

    return (
        <div className={styles.productContainer}>

            {/*  Main Two-Column Section  */}
            <div className={styles.mainSection}>

                {/*  LEFT: Image Gallery  */}
                <div className={styles.imageGallery}>

                    {/* Main Image */}
                    <div
                        className={styles.imageWrapper}
                        onClick={() => setIsZoomed(true)}
                        title="Click to zoom"
                    >
                        <img
                            src={activeImageUrl}
                            alt={product.name}
                            className={styles.mainImage}
                            onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';
                            }}
                        />
                        <div className={styles.zoomBadge}>
                            <ZoomIn size={12} />
                            <span>Zoom</span>
                        </div>
                    </div>

                    {/* Thumbnail Strip — below main image */}
                    {galleryImages.length > 1 && (
                        <div className={styles.thumbStrip}>
                            {galleryImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    className={`${styles.thumbItem} ${currentImageIdx === idx ? styles.thumbActive : ''}`}
                                    onMouseEnter={() => setCurrentImageIdx(idx)}
                                    onClick={() => setCurrentImageIdx(idx)}
                                >
                                    <img
                                        src={img}
                                        alt={`View ${idx + 1}`}
                                        onError={(e) => {
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
                                    {priceRange?.isRange
                                        ? `₹${priceRange.min.toLocaleString()} – ₹${priceRange.max.toLocaleString()}`
                                        : `₹${displayPrice?.toLocaleString()}`
                                    }
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
                                {selectedVariant && priceRange?.isRange && (
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                                        (Selected Price: ₹{selectedVariant.price?.toLocaleString()})
                                    </span>
                                )}
                                {currentStock > 0
                                    ? <span className={styles.inStock}><CheckCircle size={13} /> {currentStock} sarees in stock</span>
                                    : <span className={styles.outOfStock}><X size={13} /> Saree Not Available</span>
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

                    {/* Variants / Size Selector */}
                    {product.type === 'variant' && variants.length > 0 && (
                        <div className={styles.variantsSection}>
                            <p className={styles.variantLabel}>Select Size / Option</p>
                            <div className={styles.variantChips}>
                                {variants.map(v => (
                                    <button
                                        key={v.id}
                                        className={`${styles.variantChip} ${selectedVariant?.id === v.id ? styles.activeVariant : ''}`}
                                        onClick={() => setSelectedVariant(v)}
                                    >
                                        {v.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {currentStock > 0 ? (
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
                                     Saree Not Available for higher quantity (Maximum {currentStock} in stock)
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.actions}>
                            <button disabled className={styles.addToCartBtn} style={{ background: '#cbd5e1', cursor: 'not-allowed', color: '#64748b' }}>
                                Saree Not Available
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
