'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, Heart, Share2, Facebook, Twitter, Linkedin, MessageCircle, ChevronLeft, CheckCircle, X, ZoomIn } from 'lucide-react';
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
    }, [id, products, productsLoading]);

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
    const displayImage = selectedVariant?.image_url || product.image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80';
    const currentStock = selectedVariant ? selectedVariant.stock : product.stock;

    return (
        <div className={styles.productContainer}>
            <button onClick={() => router.back()} className={styles.backButton}>
                <ChevronLeft size={20} /> Back
            </button>
            <div className={styles.mainSection}>
                {/* Left: Product Image */}
                <div className={styles.imageGallery}>
                    <div 
                        className={styles.imageWrapper} 
                        onClick={() => setIsZoomed(true)}
                        title="Click to zoom"
                    >
                        <img
                            src={displayImage}
                            alt={product.name}
                            className={styles.mainImage}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80'; }}
                        />
                        <div className={styles.zoomIconWrapper}>
                            <ZoomIn size={24} />
                        </div>
                    </div>
                </div>

                {/* Right: Product Details */}
                <div className={styles.productDetails}>
                    <h1 className={styles.productName}>{product.name}</h1>
                    <div className={styles.priceTag}>₹{displayPrice?.toLocaleString()}.00</div>

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
                            className={styles.whatsAppOrderBtn}
                            onClick={() => {
                                const message = `Hi! I want to order the "${product.name}" ${selectedVariant ? `(${selectedVariant.name})` : ''}. \n\nPrice: ₹${displayPrice}\nQuantity: ${qty}\nLink: ${window.location.href}\n\nPlease confirm availability and payment details.`;
                                window.open(`https://wa.me/15551678232?text=${encodeURIComponent(message)}`, '_blank');
                            }}
                        >
                            <MessageCircle size={18} /> BUY ON WHATSAPP
                        </button>
                    </div>

                    <div className={styles.meta}>
                        <div className={styles.metaItem}><strong>Category:</strong> {product.category}</div>
                        {product.product_group && <div className={styles.metaItem}><strong>Brand:</strong> {product.product_group}</div>}
                    </div>


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

            {/* Zoom Modal */}
            {isZoomed && (
                <div className={styles.zoomModal} onClick={() => setIsZoomed(false)}>
                    <button className={styles.closeZoomBtn} onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}>
                        <X size={32} />
                    </button>
                    <img
                        src={displayImage}
                        alt={product.name}
                        className={styles.zoomedImage}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
