'use client';

import { useShop } from '@/context/ShopContext';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import { Heart, Home, Package } from 'lucide-react';
import styles from './wishlist.module.css';
import { useMemo } from 'react';

export default function WishlistPage() {
    const { products, wishlist, user } = useShop();

    const wishlistProducts = useMemo(() => {
        return products.filter(p => wishlist.includes(p.id));
    }, [products, wishlist]);

    return (
        <div className={styles.wishlistContainer}>
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <Heart size={32} className={styles.titleIcon} color="#ef4444" fill="#ef4444" />
                    <h2>My Wishlist</h2>
                </div>
                <p className={styles.subtitle}>{wishlistProducts.length} items saved</p>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link> &gt; 
                    <span className={styles.current}>Wishlist</span>
                </div>
            </div>

            {wishlistProducts.length === 0 ? (
                <div className={styles.emptyState}>
                    <Heart size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                    <h3>Your wishlist is empty</h3>
                    <p>Save items you like to your wishlist by clicking the heart icon on any product.</p>
                    <Link href="/shop" className={styles.btnPrimary}>Explore Products</Link>
                </div>
            ) : (
                <div className={styles.grid}>
                    {wishlistProducts.map(product => (
                        <ProductCard key={product.id} product={product} gridView={true} />
                    ))}
                </div>
            )}
        </div>
    );
}
