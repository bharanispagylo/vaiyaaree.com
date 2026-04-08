'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, Share2, Facebook, Twitter, Linkedin, MessageCircle, ChevronLeft, ChevronRight, CheckCircle, X, ZoomIn } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import ProductCard from '@/components/ProductCard';
import styles from './product.module.css';

export default function ProductDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { products, addToCart, loading: productsLoading, supabase } = useShop();

    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    useEffect(() => {
        if (!productsLoading && products.length > 0) {
            const found = products.find(p => String(p.id) === String(id));
            if (found) {
                setProduct(found);
                if (found.type === 'variant') {
                    fetchVariants(found.id);
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }

        if (product) {
            const viewed = JSON.parse(localStorage.getItem('recently_viewed') || '[]');
            const updated = [product.id, ...viewed.filter(vId => vId !== product.id)].slice(0, 4);
            localStorage.setItem('recently_viewed', JSON.stringify(updated));

            if (products.length > 0) {
                const viewedProds = updated.filter(vId => vId !== product.id).map(vId => products.find(p => p.id === vId)).filter(Boolean);
                setRecentlyViewed(viewedProds);
            }
        }
    }, [id, products, productsLoading, product]);

    async function fetchVariants(productId) {
        const { data } = await supabase.from('product_variants').select('*').eq('product_id', productId).order('created_at', { ascending: true });
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

    const handleAddToCart = () => {
        if (!product) return;
        for (let i = 0; i < qty; i++) {
            addToCart(product, selectedVariant);
        }
    };



    if (loading) return <div className={styles.loading}>Loading product details...</div>;
    if (!product) return <div className={styles.notFound}>Product not found. <button onClick={() => router.push('/shop')}>Back to Shop</button></div>;

    const displayPrice = selectedVariant ? selectedVariant.price : product.price;
    const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

    const galleryImages = (selectedVariant?.image_url || product.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80').split(',').filter(Boolean);
    const activeImageUrl = galleryImages[currentImageIdx] || galleryImages[0];

    return (
        <div className={styles.productContainer}>
            <button onClick={() => router.back()} className={styles.backButton}>
                <ChevronLeft size={20} /> Back
            </button>
            <div className={styles.breadcrumb}>
                <Link href="/">Home</Link> &gt; 
                <Link href="/shop">Shop</Link> &gt; 
                {product.category && <><Link href={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link> &gt;</>}
                <span className={styles.breadcrumbCurrent}>{product.name}</span>
            </div>
            <div className={styles.mainSection}>
                {/* Left: Product Image — Amazon style */}
                <div className={styles.imageGallery}>
                    {/* Main large image on top */}
                    <div
                        className={styles.imageWrapper}
                        onClick={() => setIsZoomed(true)}
                        title="Click to zoom"
                    >
                        <img
                            src={activeImageUrl}
                            alt={product.name}
                            className={styles.mainImage}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80'; }}
                        />
                        <div className={styles.zoomIconWrapper}>
                            <ZoomIn size={24} />
                        </div>
                    </div>
                    {/* Horizontal thumbnail strip below */}
                    {galleryImages.length > 1 && (
                        <div className={styles.thumbStrip}>
                            {galleryImages.map((img, idx) => (
                                <div
                                    key={idx}
                                    className={`${styles.thumbItem} ${currentImageIdx === idx ? styles.thumbActive : ''}`}
                                    onMouseEnter={() => setCurrentImageIdx(idx)}
                                    onClick={() => setCurrentImageIdx(idx)}
                                >
                                    <img
                                        src={img}
                                        alt={`View ${idx + 1}`}
                                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'; }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Product Details */}
                <div className={styles.productDetails}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h1 className={styles.productName} style={{ margin: 0, paddingRight: '1rem' }}>{product.name}</h1>
                    </div>
                    <div className={styles.priceTag} style={{ marginTop: '0.75rem' }}>₹{displayPrice?.toLocaleString()}.00</div>

                    <div className={styles.stockStatus}>
                        {currentStock > 0 ? (
                            <span className={styles.inStock}><CheckCircle size={16} /> Availability: {currentStock} in stock</span>
                        ) : (
                            <span className={styles.outOfStock}>Out of Stock</span>
                        )}
                    </div>

                    <p className={styles.description}>{product.description}</p>

                    {product.type === 'variant' && variants.length > 0 && (
                        <div className={styles.variantsSection}>
                            <h3>Select Option</h3>
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

                    <div className={styles.actions}>
                        {currentStock === 0 ? (
                            <div className={styles.outOfStockContainer}>
                                <h4 className={styles.outOfStockTitle}>Out of Stock</h4>
                                <p className={styles.outOfStockMessage}>Please check back later or contact support.</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.qtySelector}>
                                    <button onClick={() => setQty(Math.max(1, qty - 1))}>-</button>
                                    <span>{qty}</span>
                                    <button onClick={() => setQty(qty + 1)}>+</button>
                                </div>
                                <button
                                    className={styles.addToCartBtn}
                                    onClick={handleAddToCart}
                                    disabled={currentStock === 0}
                                >
                                    <ShoppingCart size={18} /> ADD TO CART
                                </button>
                                
                                <button
                                    className={styles.buyNowBtn}
                                    onClick={() => {
                                        handleAddToCart();
                                        router.push('/checkout');
                                    }}
                                    disabled={currentStock === 0}
                                >
                                    BUY NOW
                                </button>
                            </>
                        )}
                    </div>

                    <div className={styles.meta}>
                        <div className={styles.metaItem}><strong>Category:</strong> {product.category}</div>
                        {product.product_group && <div className={styles.metaItem}><strong>Brand:</strong> {product.product_group}</div>}
                    </div>

                    {product.tags && product.tags.length > 0 && (
                        <div className={styles.tagsContainer} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {product.tags.map(tag => (
                                <span key={tag} style={{ background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}


                </div>
            </div>

            {/* Related Products Section */}
            {relatedProducts.length > 0 && (
                <section className={styles.relatedSection}>
                    <h2 className={styles.sectionTitle}>Related products</h2>
                    <div className={styles.relatedGrid}>
                        {relatedProducts.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </section>
            )}

            {/* Recently Viewed Section */}
            {recentlyViewed.length > 0 && (
                <section className={styles.relatedSection} style={{ marginTop: '2rem' }}>
                    <h2 className={styles.sectionTitle}>Recently Viewed</h2>
                    <div className={styles.relatedGrid}>
                        {recentlyViewed.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </section>
            )}

            {/* Zoom Modal */}
            {isZoomed && (
                <div className={styles.zoomModal} onClick={() => setIsZoomed(false)}>
                    <button className={styles.closeZoomBtn} onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}>
                        <X size={32} />
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
