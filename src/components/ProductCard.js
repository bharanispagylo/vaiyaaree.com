'use client';

import { ShoppingCart, Activity } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import { useCompare } from '@/context/CompareContext';
import { getProductUrl } from '@/lib/productUrl';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, gridView = true }) {
    const { addToCart } = useShop();
    const { compareItems, toggleCompare } = useCompare();
    const firstImage = product.image_url?.split(',')[0] || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';

    if (!gridView) {
        return (
            <div className={styles.productCardList}>
                <div className={styles.productImageWrap}>
                    <Link href={getProductUrl(product)}>
                        <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${firstImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.5, zIndex: 0 }} />
                        <img
                            src={firstImage}
                            alt={product.name}
                            className={styles.productImage}
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                            style={{ position: 'relative', zIndex: 1 }}
                        />
                    </Link>

                    {product.stock <= 0 && <div className={styles.outOfStockOverlay}>Saree Not Available</div>}
                </div>
                <div className={styles.productInfo}>
                    <div className={styles.productCategory}>{product.category}</div>
                    <Link href={getProductUrl(product)} className={styles.link}>
                        <h3 className={styles.productName}>{product.name}</h3>
                    </Link>
                    <p className={styles.productDescription}>{product.description?.slice(0, 150)}...</p>
                    <div className={styles.productPrice}>₹{(product.price || 0).toLocaleString()}</div>
                    <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className={`${styles.addToCartBtn} ${product.stock <= 0 ? styles.addToCartDisabled : ''}`}
                    >
                        {product.stock <= 0 ? 'Saree Not Available' : (product.type === 'variant' ? 'Select Option' : 'Add to Cart')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.productCard}>
            <div className={styles.productImageWrap}>
                <Link href={getProductUrl(product)}>
                    <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${firstImage})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.5, zIndex: 0 }} />
                    <img
                        src={firstImage}
                        alt={product.name}
                        className={styles.productImage}
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                        style={{ position: 'relative', zIndex: 1 }}
                    />
                </Link>

                {product.stock <= 0 && <div className={styles.outOfStockOverlay}>Saree Not Available</div>}
                {product.type === 'variant' && <div className={styles.variantBadge}>✨ Variants Available</div>}



                {product.stock > 0 && (
                    <div
                        className={styles.hoverAddToCart}
                        onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                        }}
                    >
                        <ShoppingCart size={16} /> ADD TO CART
                    </div>
                )}
            </div>
            <div className={styles.productInfo}>
                <div className={styles.productCategory}>{product.category}</div>
                <Link href={getProductUrl(product)} className={styles.link}>
                    <h3 className={styles.productName}>{product.name}</h3>
                </Link>
                {(() => {
                    const tagList = Array.isArray(product.tags)
                        ? product.tags
                        : (typeof product.tags === 'string' ? product.tags.split(',') : []);

                    const mrpTag = tagList.map(t => String(t).trim()).find(t => t.toLowerCase().startsWith('mrp:'));
                    const mrpVal = mrpTag ? Number(mrpTag.split(':')[1]) : (product.compare_price || product.original_price || product.mrp);

                    const hasDiscount = mrpVal && !isNaN(mrpVal) && mrpVal > (product.price || 0);
                    const discountPercent = hasDiscount ? Math.round(((mrpVal - product.price) / mrpVal) * 100) : 0;

                    return (
                        <div className={styles.productPriceRow} style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <div className={styles.productPrice}>₹{(product.price || 0).toLocaleString()}</div>
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
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
