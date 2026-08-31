'use client';

import { useState } from 'react';
import { X, ShoppingCart, ArrowRight, Tag, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import styles from './cart.module.css';

export default function CartPage() {
    const {
        cart, removeFromCart, updateQty, cartTotal, showToast,
        discountData, appliedCoupon, couponMessage, couponError, applyCoupon, removeCoupon
    } = useShop();

    const [isDirty, setIsDirty] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);

    const handleQtyChange = (idx, delta) => {
        updateQty(idx, delta);
        setIsDirty(true);
    };

    const handleUpdateCart = () => {
        setIsDirty(false);
        showToast('Cart updated successfully');
    };

    const handleApplyCoupon = async (e) => {
        e.preventDefault();
        if (!couponInput.trim()) return;
        setApplyingCoupon(true);
        const success = await applyCoupon(couponInput.trim());
        if (success) {
            setCouponInput('');
        }
        setApplyingCoupon(false);
    };

    const totalDiscount = discountData?.totalDiscount || 0;
    const finalCartTotal = Math.max(0, cartTotal - totalDiscount);

    return (
        <div className={styles.cartContainer}>
            <div className={styles.sectionTitle}>
                <h2>Your Selection ( {cart.length} {cart.length === 1 ? 'item' : 'items'} )</h2>
            </div>

            {cart.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}><ShoppingCart size={64} /></div>
                    <h3>Your cart is empty</h3>
                    <p>Looks like you haven't added anything to your cart yet.</p>
                    <Link href="/shop" className={styles.continueBtn}>Start Shopping</Link>
                </div>
            ) : (
                <div className={styles.cartLayout}>
                    <div className={styles.cartItems}>
                        <div className={styles.tableHeader}>
                            <span>Product</span>
                            <span>Price</span>
                            <span>Quantity</span>
                            <span>Subtotal</span>
                            <span></span>
                        </div>
                        {cart.map((item, idx) => (
                            <div key={idx} className={styles.cartItem}>
                                <div className={styles.productCell}>
                                    <img 
                                        src={item.image_url?.split(',')[0]} 
                                        className={item.image_url ? styles.itemImg : styles.itemImgPlaceholder} 
                                        alt={item.name} 
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/100x125?text=No+Image';
                                        }}
                                    />
                                    <div className={styles.itemName}>
                                        {item.name}
                                        {item.variantName && <span className={styles.variantName}>({item.variantName})</span>}
                                    </div>
                                </div>
                                <div className={styles.priceCell}>₹{item.price.toLocaleString()}.00</div>
                                <div className={styles.qtyCell}>
                                    <div className={styles.qtyControl}>
                                        <button onClick={() => handleQtyChange(idx, -1)}>-</button>
                                        <span>{item.qty}</span>
                                        <button onClick={() => handleQtyChange(idx, 1)}>+</button>
                                    </div>
                                </div>
                                <div className={styles.subtotalCell}>
                                    <span>₹{(item.price * item.qty).toLocaleString()}.00</span>
                                </div>
                                <div className={styles.removeCell}>
                                    <button onClick={() => removeFromCart(idx)} className={styles.removeBtn} title="Remove item">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <div className={styles.cartActions}>
                            <button
                                className={styles.updateCartBtn}
                                onClick={handleUpdateCart}
                                disabled={!isDirty}
                            >
                                Update Cart
                            </button>
                        </div>
                    </div>

                    <div className={styles.cartSummary}>
                        <div className={styles.summaryCard}>
                            <h3>Cart Totals</h3>
                            
                            {/* Promo Coupon Form */}
                            <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--border-subtle, #e2e8f0))' }}>
                                {appliedCoupon ? (
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 700, fontSize: '0.85rem' }}>
                                            <Tag size={15} />
                                            <span>{appliedCoupon.couponCode}</span>
                                            {appliedCoupon.couponDiscount > 0 && <span>(-₹{appliedCoupon.couponDiscount.toLocaleString()})</span>}
                                        </div>
                                        <button onClick={removeCoupon} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                            <X size={15} />
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '6px' }}>
                                        <input
                                            type="text"
                                            placeholder="Promo Code"
                                            value={couponInput}
                                            onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                            style={{
                                                flex: 1,
                                                padding: '0.55rem 0.75rem',
                                                border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                                                borderRadius: '8px',
                                                fontSize: '0.82rem',
                                                textTransform: 'uppercase',
                                                fontWeight: 700,
                                                outline: 'none'
                                            }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={applyingCoupon || !couponInput.trim()}
                                            style={{
                                                padding: '0.55rem 0.9rem',
                                                background: 'hsl(var(--primary))',
                                                color: '#ffffff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {applyingCoupon ? 'Applying...' : 'Apply'}
                                        </button>
                                    </form>
                                )}
                                {couponMessage && <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>{couponMessage}</div>}
                                {couponError && <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '4px' }}>{couponError}</div>}
                            </div>

                            <div className={styles.summaryLine}>
                                <span>Subtotal</span>
                                <span>₹{(cartTotal || 0).toLocaleString()}.00</span>
                            </div>

                            {totalDiscount > 0 && (
                                <>
                                    <div className={styles.summaryLine} style={{ color: '#16a34a', fontWeight: 700 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={14} /> Promotional Savings
                                        </span>
                                        <span>-₹{totalDiscount.toLocaleString()}.00</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '-4px 0 8px', fontSize: '0.75rem', color: '#15803d' }}>
                                        {(discountData.appliedRules || []).map((r, i) => (
                                            <div key={i}>• {r.ruleName}</div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className={styles.summaryLine}>
                                <span>Shipping</span>
                                <span>Calculated at checkout</span>
                            </div>
                            <div className={styles.divider} />
                            <div className={styles.summaryTotal}>
                                <span>Total</span>
                                <span>₹{finalCartTotal.toLocaleString()}.00</span>
                            </div>
                            <Link href="/checkout" className={styles.checkoutBtn}>
                                Proceed to Checkout <ArrowRight size={18} />
                            </Link>
                            <Link href="/shop" className={styles.continueShoppingBtn}>
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
