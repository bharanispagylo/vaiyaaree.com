'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
    const { isCartOpen, closeCart, cart, cartCount, cartTotal, updateQty, removeFromCart, discountData, appliedCoupon } = useShop();
    const router = useRouter();

    const hasUnavailableItems = cart.some(i => i.stock !== undefined && i.stock !== null && (i.stock <= 0 || i.qty > i.stock));

    // Prevent background scrolling when drawer is active
    useEffect(() => {
        if (isCartOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isCartOpen]);

    // Handle Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isCartOpen) {
                closeCart();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCartOpen, closeCart]);

    const handleNavigate = (path) => {
        closeCart();
        router.push(path);
    };

    return (
        <div className={`${styles.drawerContainer} ${isCartOpen ? styles.open : ''}`}>
            {/* Backdrop Overlay */}
            <div className={styles.overlay} onClick={closeCart} />

            {/* Slide-over Content Panel */}
            <aside className={styles.drawerPanel}>
                {/* Header */}
                <div className={styles.drawerHeader}>
                    <div className={styles.headerTitleGroup}>
                        <div className={styles.cartIconBadge}>
                            <ShoppingBag size={20} />
                        </div>
                        <h2>Your Cart</h2>
                        <span className={styles.countPill}>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
                    </div>
                    <button className={styles.closeBtn} onClick={closeCart} aria-label="Close cart drawer">
                        <X size={20} />
                    </button>
                </div>

                {/* Free Shipping Alert Bar (Optional Perk) */}
                <div className={styles.shippingBar}>
                    <ShieldCheck size={16} />
                    <span>Free shipping on all prepaid saree orders across India!</span>
                </div>

                {/* Body Content */}
                <div className={styles.drawerBody}>
                    {cartCount === 0 ? (
                        <div className={styles.emptyCart}>
                            <div className={styles.emptyIconCircle}>
                                <ShoppingBag size={48} strokeWidth={1.2} />
                            </div>
                            <h3>Your cart is empty</h3>
                            <p>Discover our exquisite handloom & silk saree collections.</p>
                            <button className={styles.shopNowBtn} onClick={() => handleNavigate('/shop')}>
                                Explore Saree Collection
                            </button>
                        </div>
                    ) : (
                        <div className={styles.itemsList}>
                            {cart.map((item, index) => {
                                const firstImage = item.image_url?.split(',')[0] || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80';
                                const itemStock = item.stock !== undefined && item.stock !== null ? item.stock : 999;
                                const isOutOfStock = itemStock <= 0;
                                const isStockLimitReached = item.qty >= itemStock && itemStock > 0;

                                return (
                                    <div key={`${item.id}-${item.variantId || index}`} className={styles.cartCard}>
                                        <img
                                            src={firstImage}
                                            alt={item.name}
                                            className={styles.itemImage}
                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }}
                                        />
                                        <div className={styles.itemDetails}>
                                            <div className={styles.itemTopRow}>
                                                <h4 className={styles.itemName}>{item.name}</h4>
                                                <button
                                                    className={styles.removeBtn}
                                                    onClick={() => removeFromCart(index)}
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {item.variantName && (
                                                <span className={styles.variantBadge}>
                                                    Variant: {item.variantName}
                                                </span>
                                            )}

                                            {isOutOfStock ? (
                                                <div className={styles.notAvailableText}>
                                                     Saree Not Available (Out of Stock)
                                                </div>
                                            ) : isStockLimitReached ? (
                                                <div className={styles.stockLimitText}>
                                                    Stock limit reached ({itemStock} available)
                                                </div>
                                            ) : null}

                                            <div className={styles.itemBottomRow}>
                                                <div className={styles.priceTag}>
                                                    ₹{(item.price || 0).toLocaleString()}
                                                </div>

                                                <div className={styles.qtyControl}>
                                                    <button
                                                        onClick={() => updateQty(index, -1)}
                                                        className={styles.qtyBtn}
                                                        aria-label="Decrease quantity"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className={styles.qtyValue}>{item.qty}</span>
                                                    <button
                                                        onClick={() => updateQty(index, 1)}
                                                        className={`${styles.qtyBtn} ${isStockLimitReached ? styles.qtyBtnDisabled : ''}`}
                                                        disabled={isStockLimitReached || isOutOfStock}
                                                        aria-label="Increase quantity"
                                                        title={isStockLimitReached ? `Maximum ${itemStock} sarees in stock` : 'Increase quantity'}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Actions (Only shown if cart has items) */}
                {cartCount > 0 && (
                    <div className={styles.drawerFooter}>
                        {hasUnavailableItems && (
                            <div className={styles.stockNoticeBox}>
                                <AlertTriangle size={16} />
                                <span>Some sarees exceed available stock. Please adjust quantities to proceed.</span>
                            </div>
                        )}
                        <div className={styles.summaryRow}>
                            <span>Subtotal</span>
                            <span className={styles.totalAmount}>₹{cartTotal.toLocaleString()}</span>
                        </div>

                        {discountData?.totalDiscount > 0 && (
                            <>
                                <div className={styles.summaryRow} style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.9rem' }}>
                                    <span>Promotions & Savings</span>
                                    <span>-₹{discountData.totalDiscount.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', margin: '4px 0 8px' }}>
                                    {(discountData.appliedRules || []).map((r, idx) => (
                                        <div key={idx} style={{ fontSize: '0.75rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>✨ {r.ruleName}</span>
                                            {r.discountAmount > 0 && <span>(-₹{r.discountAmount.toLocaleString()})</span>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        <div className={styles.summaryRow} style={{ borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '8px', marginTop: '4px' }}>
                            <span style={{ fontWeight: 800 }}>Estimated Total</span>
                            <span className={styles.totalAmount} style={{ color: 'hsl(var(--primary))', fontSize: '1.25rem' }}>
                                ₹{Math.max(0, cartTotal - (discountData?.totalDiscount || 0)).toLocaleString()}
                            </span>
                        </div>

                        <p className={styles.taxNotice}>Taxes and shipping calculated at checkout.</p>

                        <div className={styles.footerBtnGroup}>
                            <button 
                                className={styles.checkoutBtn} 
                                onClick={() => handleNavigate('/checkout')}
                                disabled={hasUnavailableItems}
                                style={hasUnavailableItems ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                                Checkout Now <ArrowRight size={18} />
                            </button>
                            <button className={styles.viewCartBtn} onClick={() => handleNavigate('/cart')}>
                                View Full Cart
                            </button>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}
