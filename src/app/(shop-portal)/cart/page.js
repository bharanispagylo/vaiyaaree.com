'use client';

import { useState } from 'react';
import { X, ShoppingCart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import styles from './cart.module.css';

export default function CartPage() {
    const { cart, removeFromCart, updateQty, cartTotal, showToast } = useShop();
    const [isDirty, setIsDirty] = useState(false);

    const handleQtyChange = (idx, delta) => {
        updateQty(idx, delta);
        setIsDirty(true);
    };

    const handleUpdateCart = () => {
        setIsDirty(false);
        showToast('Cart updated successfully');
    };

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
                            <div className={styles.summaryLine}>
                                <span>Subtotal</span>
                                <span>₹{(cartTotal || 0).toLocaleString()}.00</span>
                            </div>
                            <div className={styles.summaryLine}>
                                <span>Shipping</span>
                                <span>Calculated at checkout</span>
                            </div>
                            <div className={styles.divider} />
                            <div className={styles.summaryTotal}>
                                <span>Total</span>
                                <span>₹{(cartTotal || 0).toLocaleString()}.00</span>
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
