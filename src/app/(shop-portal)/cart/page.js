'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, ShoppingCart, ArrowRight, Tag, Check, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import styles from './cart.module.css';

export default function CartPage() {
    const {
        cart, removeFromCart, updateQty, cartTotal, showToast,
        discountData, appliedCoupon, couponMessage, couponError, applyCoupon, removeCoupon,
        activeDiscountRules, isCartLoaded, user
    } = useShop();

    const [pageMounted, setPageMounted] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);

    useEffect(() => {
        setPageMounted(true);
    }, []);

    const availableCouponOffers = useMemo(() => {
        return (activeDiscountRules || []).filter(r => {
            const hasCode = Boolean(r.coupon_code && r.coupon_code.trim());
            const isActive = r.is_active === 1 || r.is_active === true || r.is_active === '1';
            return hasCode && isActive;
        });
    }, [activeDiscountRules]);

    const hasStockIssue = useMemo(() => {
        return (cart || []).some(item => {
            if (item.stock === undefined || item.stock === null) return false;
            return item.stock <= 0 || item.qty > item.stock;
        });
    }, [cart]);

    const handleQtyChange = (itemKeyOrId, delta) => {
        updateQty(itemKeyOrId, delta);
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

    const handleApplySpecificCoupon = async (code) => {
        if (!code || applyingCoupon) return;
        setApplyingCoupon(true);
        await applyCoupon(code);
        setApplyingCoupon(false);
    };

    const totalDiscount = Math.round(discountData?.totalDiscount || 0);
    const finalCartTotal = Math.max(0, Math.round(cartTotal - (discountData?.totalDiscount || 0)));

    if (!pageMounted || !isCartLoaded) {
        return (
            <div className={styles.cartContainer} style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={36} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
            </div>
        );
    }

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
                        {cart.map((item, idx) => {
                            const itemKey = item.variantId ? `${item.id}_${item.variantId}` : `${item.id}_${idx}`;
                            const targetIdentifier = item.variantId || item.id;
                            const priceNum = Number(item.price || 0);
                            const subtotalNum = priceNum * (Number(item.qty) || 1);
                            const isOut = item.stock !== undefined && item.stock !== null && item.stock <= 0;
                            const isExceeded = item.stock !== undefined && item.stock !== null && item.stock > 0 && item.qty > item.stock;

                            return (
                                <div key={itemKey} className={styles.cartItem}>
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
                                            {isOut && <span className={styles.stockWarning}>Out of Stock</span>}
                                            {isExceeded && <span className={styles.stockWarning}>Only {item.stock} left in stock</span>}
                                        </div>
                                    </div>
                                    <div className={styles.priceCell}>₹{priceNum.toLocaleString('en-IN')}.00</div>
                                    <div className={styles.qtyCell}>
                                        <div className={styles.qtyControl}>
                                            <button onClick={() => handleQtyChange(targetIdentifier, -1)} aria-label="Decrease quantity">-</button>
                                            <span>{item.qty}</span>
                                            <button
                                                onClick={() => handleQtyChange(targetIdentifier, 1)}
                                                disabled={item.stock !== undefined && item.stock !== null && item.qty >= item.stock}
                                                aria-label="Increase quantity"
                                            >+</button>
                                        </div>
                                    </div>
                                    <div className={styles.subtotalCell}>
                                        <span>₹{subtotalNum.toLocaleString('en-IN')}.00</span>
                                    </div>
                                    <div className={styles.removeCell}>
                                        <button onClick={() => removeFromCart(targetIdentifier)} className={styles.removeBtn} title="Remove item">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
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
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#16a34a', fontWeight: 700, fontSize: '0.78rem', background: '#dcfce7', padding: '3px 8px', borderRadius: '6px' }}>
                                            <Check size={13} strokeWidth={2.5} /> Applied
                                        </span>
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

                                {/* Available Offers / Active Coupon Badges */}
                                {availableCouponOffers.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed hsl(var(--border-subtle, #e2e8f0))' }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={12} color="#f59e0b" /> Available Offers
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {availableCouponOffers.map((offer) => {
                                                const isThisApplied = appliedCoupon?.couponCode === offer.coupon_code?.trim().toUpperCase();
                                                const offerSavings = offer.discount_type === 'FREE_SHIPPING'
                                                    ? 'Free Delivery'
                                                    : (offer.discount_type === 'PERCENTAGE' ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`);

                                                return (
                                                    <div
                                                        key={offer.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '6px 10px',
                                                            background: isThisApplied ? '#f0fdf4' : '#f8fafc',
                                                            border: `1px dashed ${isThisApplied ? '#86efac' : '#cbd5e1'}`,
                                                            borderRadius: '8px',
                                                            fontSize: '0.78rem'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Tag size={13} color={isThisApplied ? '#16a34a' : '#64748b'} />
                                                            <span style={{ fontWeight: 800, color: '#0f172a', letterSpacing: '0.03em' }}>{offer.coupon_code}</span>
                                                            <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>({offerSavings})</span>
                                                        </div>
                                                        {isThisApplied ? (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#16a34a', fontWeight: 800, fontSize: '0.72rem' }}>
                                                                <Check size={12} /> Applied
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleApplySpecificCoupon(offer.coupon_code)}
                                                                disabled={applyingCoupon}
                                                                style={{
                                                                    background: 'hsl(var(--primary))',
                                                                    color: '#ffffff',
                                                                    border: 'none',
                                                                    borderRadius: '5px',
                                                                    padding: '3px 8px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Apply
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles.summaryLine}>
                                <span>Subtotal</span>
                                <span>₹{(cartTotal || 0).toLocaleString()}.00</span>
                            </div>

                            {totalDiscount > 0 && (() => {
                                const appliedRules = discountData?.appliedRules || [];
                                const singleRule = appliedRules.length === 1 ? appliedRules[0] : null;
                                const singleRuleName = singleRule ? (singleRule.ruleName || singleRule.name || (singleRule.couponCode ? `Coupon ${singleRule.couponCode}` : 'Promotion')) : '';

                                return (
                                    <>
                                        <div className={styles.summaryLine} style={{ color: '#16a34a', fontWeight: 700, alignItems: 'flex-start' }}>
                                            <div>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Sparkles size={14} /> Discount
                                                </span>
                                                {singleRuleName && (
                                                    <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#15803d', marginTop: '2px' }}>
                                                        ({singleRuleName})
                                                    </span>
                                                )}
                                            </div>
                                            <span>-₹{totalDiscount.toLocaleString()}.00</span>
                                        </div>

                                        {appliedRules.length > 1 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '-2px 0 10px', padding: '8px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.78rem', color: '#15803d' }}>
                                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                                    Offers Applied (Breakdown):
                                                </span>
                                                {appliedRules.map((r, i) => {
                                                    const ruleDisplayName = r.ruleName || r.name || (r.couponCode ? `Coupon ${r.couponCode}` : 'Promotion');
                                                    const savingsText = r.discountType === 'FREE_SHIPPING'
                                                        ? 'Free Shipping'
                                                        : `-₹${Math.round(r.discountAmount || 0).toLocaleString('en-IN')}.00`;
                                                    return (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontWeight: 600 }}>• {ruleDisplayName}</span>
                                                            <span style={{ fontWeight: 700 }}>{savingsText}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            <div className={styles.summaryLine}>
                                <span>Shipping</span>
                                <span>Calculated at checkout</span>
                            </div>
                            <div className={styles.divider} />
                            <div className={styles.summaryTotal}>
                                <span>Total</span>
                                <span>₹{Number(finalCartTotal || 0).toLocaleString('en-IN')}.00</span>
                            </div>
                            {hasStockIssue ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button disabled className={styles.checkoutBtnDisabled}>
                                        Adjust Stock to Checkout
                                    </button>
                                    <p style={{ color: '#ef4444', fontSize: '0.78rem', textAlign: 'center', margin: 0, fontWeight: 600 }}>
                                        Some items in your cart exceed available stock. Please adjust quantities before checkout.
                                    </p>
                                </div>
                            ) : (
                                <Link href={user?.id ? "/checkout" : "/checkout/auth"} className={styles.checkoutBtn}>
                                    Proceed to Checkout <ArrowRight size={18} />
                                </Link>
                            )}
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
