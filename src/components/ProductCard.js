'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, gridView = true }) {
    const { addToCart } = useShop();

    if (!gridView) {
        return (
            <div className={styles.productCardList}>
                <div className={styles.productImageWrap}>
                    <Link href={`/product/${product.id}`}>
                        <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${product.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.5, zIndex: 0 }} />
                        <img
                            src={product.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'}
                            alt={product.name}
                            className={styles.productImage}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                            style={{ position: 'relative', zIndex: 1 }}
                        />
                    </Link>
                    {product.stock === 0 && <div className={styles.outOfStockOverlay}>Sold Out</div>}
                </div>
                <div className={styles.productInfo}>
                    <div className={styles.productCategory}>{product.category}</div>
                    <Link href={`/product/${product.id}`} className={styles.link}>
                        <h3 className={styles.productName}>{product.name}</h3>
                    </Link>
                    <p className={styles.productDescription}>{product.description?.slice(0, 150)}...</p>
                    <div className={styles.productPrice}>₹{(product.price || 0).toLocaleString()}</div>
                    <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className={`${styles.addToCartBtn} ${product.stock === 0 ? styles.addToCartDisabled : ''}`}
                    >
                        {product.stock === 0 ? 'Out of Stock' : (product.type === 'variant' ? 'Select Option' : 'Add to Cart')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.productCard}>
            <div className={styles.productImageWrap}>
                <Link href={`/product/${product.id}`}>
                    <div style={{ position: 'absolute', inset: -20, backgroundImage: `url(${product.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(20px)', opacity: 0.5, zIndex: 0 }} />
                    <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'}
                        alt={product.name}
                        className={styles.productImage}
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                        style={{ position: 'relative', zIndex: 1 }}
                    />
                </Link>
                {product.stock === 0 && <div className={styles.outOfStockOverlay}>Sold Out</div>}
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
                <Link href={`/product/${product.id}`} className={styles.link}>
                    <h3 className={styles.productName}>{product.name}</h3>
                </Link>
                <div className={styles.productPrice}>₹{(product.price || 0).toLocaleString()}</div>
            </div>
        </div>
    );
}
