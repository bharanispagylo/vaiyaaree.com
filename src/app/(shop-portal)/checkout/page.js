'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { MessageCircle, ShoppingBag, Truck, CreditCard, ChevronLeft, Download, CheckCircle, Package, Clock, MapPin, Check, Tag } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import CheckoutAuthModal from '@/components/CheckoutAuthModal';
import Link from 'next/link';
import styles from './checkout.module.css';

export default function CheckoutPage() {
    const router = useRouter();
    const { cart, cartTotal, checkoutForm, setCheckoutForm, taxDetails, placeOrder, mysqlClient, showToast, user, appliedCoupon, couponMessage, couponError, applyCoupon, removeCoupon } = useShop();
    const [placing, setPlacing] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [couponInput, setCouponInput] = useState('');
    const [applyingCoupon, setApplyingCoupon] = useState(false);

    const isUserLoggedIn = Boolean(user && user.id);


    // Sync shipping with billing when sameAsBilling is checked
    useEffect(() => {
        if (checkoutForm.sameAsBilling) {
            setCheckoutForm(p => ({
                ...p,
                shippingName: p.billingName,
                shippingPhone: p.billingPhone,
                shippingAddress: p.billingAddress,
                shippingCity: p.billingCity,
                shippingState: p.billingState,
                shippingPincode: p.billingPincode,
                shippingCountry: p.billingCountry || 'India'
            }));
        }
    }, [
        checkoutForm.sameAsBilling,
        checkoutForm.billingName,
        checkoutForm.billingPhone,
        checkoutForm.billingAddress,
        checkoutForm.billingCity,
        checkoutForm.billingState,
        checkoutForm.billingPincode,
        checkoutForm.billingCountry
    ]);

    const states = ["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"];

    const isBillingComplete = Boolean(
        checkoutForm.billingName?.trim() &&
        checkoutForm.billingPhone?.trim()?.length === 10 &&
        checkoutForm.billingWhatsApp?.trim()?.length === 10 &&
        checkoutForm.billingEmail?.trim() &&
        checkoutForm.billingEmail?.includes('@') &&
        checkoutForm.billingAddress?.trim() &&
        checkoutForm.billingCity?.trim() &&
        checkoutForm.billingPincode?.trim()?.length >= 6
    );

    const handlePlaceOrder = async () => {
        if (!checkoutForm.billingName?.trim()) {
            showToast('Please enter your Full Name', 'error');
            return;
        }
        if (!checkoutForm.billingPhone || checkoutForm.billingPhone.trim().length !== 10) {
            showToast('Please enter a valid 10-digit Phone Number', 'error');
            return;
        }
        const effectiveWhatsApp = checkoutForm.billingWhatsApp?.trim() || checkoutForm.billingPhone?.trim();
        if (!effectiveWhatsApp || effectiveWhatsApp.length !== 10) {
            showToast('Please enter a valid 10-digit WhatsApp Number', 'error');
            return;
        }
        if (!checkoutForm.billingEmail || !checkoutForm.billingEmail.includes('@')) {
            showToast('Please enter a valid Email Address', 'error');
            return;
        }
        if (!checkoutForm.billingAddress?.trim()) {
            showToast('Please enter your Billing Address', 'error');
            return;
        }
        if (!checkoutForm.billingCity?.trim()) {
            showToast('Please enter your City / Town', 'error');
            return;
        }
        if (!checkoutForm.billingPincode || checkoutForm.billingPincode.trim().length < 6) {
            showToast('Please enter a valid 6-digit Pincode', 'error');
            return;
        }

        // Validate shipping if different from billing
        if (!checkoutForm.sameAsBilling && (!checkoutForm.shippingName || !checkoutForm.shippingPhone || !checkoutForm.shippingAddress)) {
            showToast('Please fill all required shipping details', 'error');
            return;
        }

        // Validate product stock limits
        const unavailableItem = cart.find(i => i.stock !== undefined && i.stock !== null && (i.stock <= 0 || i.qty > i.stock));
        if (unavailableItem) {
            showToast(`Saree Not Available: "${unavailableItem.name}" exceeds available stock limit (${unavailableItem.stock ?? 0}). Please update cart.`, 'error');
            return;
        }

        // Validate payment method selected
        if (checkoutForm.paymentMethod !== 'COD') {
            showToast('Please select Cash on Delivery to place your order', 'error');
            return;
        }

        setPlacing(true);
        try {
            const data = await placeOrder();

            if (data) {
                setOrderData(data);
                showToast('Your Placed Order Confirmed!', 'success');
            }
        } catch (err) {
            console.error('Checkout Error:', err);
            showToast(err.message || 'Failed to place order', 'error');
        } finally {
            setPlacing(false);
        }
    };

    const goToWhatsApp = (orderId) => {
        const message = encodeURIComponent(`Hi! I just placed an order #${orderId} on your website. Please confirm.`);
        const bizPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '918667793292';
        window.open(`https://wa.me/${bizPhone}?text=${message}`, '_blank');
    };

    if (cart.length === 0 && !orderData) {
        return (
            <div className={styles.emptyCheckout}>
                <ShoppingBag size={64} style={{ opacity: 0.1, marginBottom: '2rem' }} />
                <h3>Your cart is empty</h3>
                <p>Add some items before checking out.</p>
                <Link href="/shop" className={styles.primaryBtn}>Return to Shop</Link>
            </div>
        );
    }

    return (
        <>
            {!isUserLoggedIn && (
                <CheckoutAuthModal />
            )}

            <div style={{
                filter: !isUserLoggedIn ? 'blur(6px)' : 'none',
                pointerEvents: !isUserLoggedIn ? 'none' : 'auto',
                userSelect: !isUserLoggedIn ? 'none' : 'auto',
                opacity: !isUserLoggedIn ? 0.45 : 1,
                transition: 'all 0.3s ease'
            }}>
                <div className={styles.checkoutLayout}>
                    <div className={styles.checkoutLeft}>
                        {/* BILLING ADDRESS SECTION */}
                        <section className={styles.checkoutCard}>
                            <h3 className={styles.cardTitle}>Billing Details</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>FULL NAME <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={checkoutForm.billingName || ''} 
                                        onChange={e => setCheckoutForm(p => ({ ...p, billingName: e.target.value.replace(/[^a-zA-Z\s]/g, '') }))} 
                                        placeholder="Enter your full name" 
                                        pattern="[a-zA-Z\s]+"
                                        title="Only letters and spaces are allowed"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>PHONE NUMBER <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="tel" 
                                        value={checkoutForm.billingPhone || ''} 
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                            setCheckoutForm(p => ({
                                                ...p,
                                                billingPhone: val,
                                                billingWhatsApp: (!p.billingWhatsApp || p.billingWhatsApp === p.billingPhone) ? val : p.billingWhatsApp
                                            }));
                                        }} 
                                        placeholder="10-digit phone number" 
                                        pattern="[0-9]{10}"
                                        maxLength="10"
                                        minLength="10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>WHATSAPP NUMBER <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="tel" 
                                        value={checkoutForm.billingWhatsApp || ''} 
                                        onChange={e => setCheckoutForm(p => ({ ...p, billingWhatsApp: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))} 
                                        placeholder="WhatsApp number for order updates" 
                                        pattern="[0-9]{10}"
                                        maxLength="10"
                                        minLength="10"
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>EMAIL ADDRESS <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="email" 
                                        value={checkoutForm.billingEmail || ''} 
                                        onChange={e => setCheckoutForm(p => ({ ...p, billingEmail: e.target.value }))} 
                                        placeholder="your@email.com" 
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                                <label>BILLING ADDRESS <span className={styles.requiredStar}>*</span></label>
                                <textarea 
                                    value={checkoutForm.billingAddress || ''} 
                                    onChange={e => setCheckoutForm(p => ({ ...p, billingAddress: e.target.value }))} 
                                    placeholder="House No, Building, Street, Area..." 
                                    rows={2} 
                                    required
                                />
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>CITY / TOWN <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={checkoutForm.billingCity || ''} 
                                        onChange={e => setCheckoutForm(p => ({ ...p, billingCity: e.target.value }))} 
                                        placeholder="City name" 
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>STATE <span className={styles.requiredStar}>*</span></label>
                                    {(checkoutForm.billingCountry || 'India') === 'India' ? (
                                        <select 
                                            value={checkoutForm.billingState || 'Tamil Nadu'} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, billingState: e.target.value }))}
                                        >
                                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={checkoutForm.billingState || ''}
                                            onChange={e => setCheckoutForm(p => ({ ...p, billingState: e.target.value }))}
                                            placeholder="State / Province / Region"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>PINCODE <span className={styles.requiredStar}>*</span></label>
                                    <input 
                                        type="text" 
                                        value={checkoutForm.billingPincode || ''} 
                                        onChange={e => setCheckoutForm(p => ({ ...p, billingPincode: e.target.value.replace(/[^0-9a-zA-Z\s-]/g, '').slice(0, 10) }))} 
                                        placeholder="Pincode / Postal Code" 
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>COUNTRY <span className={styles.requiredStar}>*</span></label>
                                    <select 
                                        value={checkoutForm.billingCountry || 'India'}
                                        onChange={e => {
                                            const newCountry = e.target.value;
                                            setCheckoutForm(p => ({ 
                                                ...p, 
                                                billingCountry: newCountry,
                                                ...(p.sameAsBilling ? { shippingCountry: newCountry } : {})
                                            }));
                                        }}
                                    >
                                        <option value="India">India</option>
                                        <option value="USA">USA</option>
                                        <option value="UK">UK</option>
                                        <option value="UAE">UAE</option>
                                        <option value="Singapore">Singapore</option>
                                        <option value="Malaysia">Malaysia</option>
                                        <option value="Australia">Australia</option>
                                        <option value="Canada">Canada</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                {/* SHIPPING ADDRESS SECTION */}
                <section className={styles.checkoutCard} style={{ marginTop: '2rem' }}>
                            <h3 className={styles.cardTitle}>Shipping Details</h3>
                            
                            {/* Same as Billing Checkbox */}
                            <label className={styles.sameAsBillingCheckbox}>
                                <input 
                                    type="checkbox" 
                                    checked={checkoutForm.sameAsBilling || false}
                                    onChange={e => {
                                        const isChecked = e.target.checked;
                                        setCheckoutForm(p => ({ 
                                            ...p, 
                                            sameAsBilling: isChecked,
                                            ...(isChecked ? {
                                                shippingName: p.billingName,
                                                shippingPhone: p.billingPhone,
                                                shippingAddress: p.billingAddress,
                                                shippingCity: p.billingCity,
                                                shippingState: p.billingState,
                                                shippingPincode: p.billingPincode,
                                                shippingCountry: p.billingCountry || 'India'
                                            } : {})
                                        }));
                                    }}
                                />
                                <span className={styles.checkmark}></span>
                                <span className={styles.checkboxLabel}>Same as billing address</span>
                            </label>

                            {/* Shipping fields */}
                            <div className={styles.shippingFields} style={{ marginTop: '1.5rem' }}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING FULL NAME</label>
                                        <input 
                                            type="text" 
                                            value={checkoutForm.shippingName || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingName: e.target.value.replace(/[^a-zA-Z\s]/g, '') }))} 
                                            placeholder="Enter recipient full name" 
                                            pattern="[a-zA-Z\s]+"
                                            title="Only letters and spaces are allowed"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING PHONE NUMBER</label>
                                        <input 
                                            type="tel" 
                                            value={checkoutForm.shippingPhone || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingPhone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))} 
                                            placeholder="10-digit phone number"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            pattern="[0-9]{10}"
                                            maxLength="10"
                                            minLength="10"
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                                    <label>SHIPPING ADDRESS</label>
                                    <textarea 
                                        value={checkoutForm.shippingAddress || ''} 
                                        onChange={e => setCheckoutForm(p => ({ ...p, shippingAddress: e.target.value }))} 
                                        placeholder="House No, Building, Street, Area..." 
                                        rows={2}
                                        disabled={checkoutForm.sameAsBilling}
                                        className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                    />
                                </div>

                                <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>CITY / TOWN</label>
                                        <input 
                                            type="text" 
                                            value={checkoutForm.shippingCity || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingCity: e.target.value }))} 
                                            placeholder="City name"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>STATE</label>
                                        {(checkoutForm.shippingCountry || 'India') === 'India' ? (
                                            <select 
                                                value={checkoutForm.shippingState || 'Tamil Nadu'} 
                                                onChange={e => setCheckoutForm(p => ({ ...p, shippingState: e.target.value }))}
                                                disabled={checkoutForm.sameAsBilling}
                                                className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            >
                                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={checkoutForm.shippingState || ''}
                                                onChange={e => setCheckoutForm(p => ({ ...p, shippingState: e.target.value }))}
                                                placeholder="State / Province / Region"
                                                disabled={checkoutForm.sameAsBilling}
                                                className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING PINCODE</label>
                                        <input 
                                            type="text" 
                                            value={checkoutForm.shippingPincode || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingPincode: e.target.value }))} 
                                            placeholder="6-digit pincode"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>SHIPPING EMAIL</label>
                                        <input 
                                            type="email" 
                                            value={checkoutForm.shippingEmail || ''} 
                                            onChange={e => setCheckoutForm(p => ({ ...p, shippingEmail: e.target.value }))} 
                                            placeholder="recipient@email.com"
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                        />
                                    </div>
                                </div>
                                <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                                    <div className={styles.formGroup}>
                                        <label>COUNTRY</label>
                                        <select 
                                            value={checkoutForm.shippingCountry || 'India'}
                                            onChange={e => {
                                                const newCountry = e.target.value;
                                                setCheckoutForm(p => ({ 
                                                    ...p, 
                                                    shippingCountry: newCountry
                                                }));
                                            }}
                                            disabled={checkoutForm.sameAsBilling}
                                            className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                        >
                                            <option value="India">India</option>
                                            <option value="USA">USA</option>
                                            <option value="UK">UK</option>
                                            <option value="UAE">UAE</option>
                                            <option value="Singapore">Singapore</option>
                                            <option value="Malaysia">Malaysia</option>
                                            <option value="Australia">Australia</option>
                                            <option value="Canada">Canada</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>

                <p className={styles.privacyNote}>
                    Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
                </p>
            </div>

            <aside className={styles.checkoutRight}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryHeader}>
                        <h3>Your order</h3>
                    </div>
                    <div className={styles.summaryBody}>
                        <div className={styles.tableHeader}>
                            <span>PRODUCT</span>
                            <span>SUBTOTAL</span>
                        </div>
                        <div className={styles.itemList}>
                            {cart.map((item, i) => (
                                <div key={i} className={styles.summaryItem}>
                                    <span>{item.name} <strong>× {item.qty}</strong></span>
                                    <span>₹{(item.price * item.qty).toLocaleString()}.00</span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.summaryDivider} />

                        {/* COUPON PROMO INPUT BOX */}
                        <div className="coupon-box-section">
                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>Have a Coupon / Promo Code?</label>
                            {appliedCoupon ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', background: '#fef3c7', border: '1px dashed #f59e0b', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#b45309' }}>
                                        <Tag size={14} />
                                        <span>{appliedCoupon.couponCode}</span>
                                        {appliedCoupon.couponDiscount > 0 && <small>(Save ₹{appliedCoupon.couponDiscount})</small>}
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={removeCoupon}
                                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', fontWeight: 800, marginLeft: 'auto' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="Enter code (e.g. WELCOME10)"
                                        value={couponInput}
                                        onChange={e => setCouponInput(e.target.value.toUpperCase())}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}
                                    />
                                    <button
                                        type="button"
                                        disabled={applyingCoupon || !couponInput.trim()}
                                        onClick={async () => {
                                            setApplyingCoupon(true);
                                            await applyCoupon(couponInput);
                                            setApplyingCoupon(false);
                                        }}
                                        style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        {applyingCoupon ? '...' : 'Apply'}
                                    </button>
                                </div>
                            )}
                            {couponError && <p style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, margin: '-6px 0 8px' }}>{couponError}</p>}
                            {couponMessage && <p style={{ color: '#16a34a', fontSize: '12px', fontWeight: 600, margin: '-6px 0 8px' }}>{couponMessage}</p>}
                        </div>

                        <div className={styles.summaryRow}>
                            <span>Subtotal</span>
                            <span>₹{cartTotal.toLocaleString()}.00</span>
                        </div>

                        {appliedCoupon && appliedCoupon.couponDiscount > 0 && (
                            <div className={styles.summaryRow} style={{ color: '#16a34a', fontWeight: 700 }}>
                                <span>Coupon Discount ({appliedCoupon.couponCode})</span>
                                <span>-₹{appliedCoupon.couponDiscount.toLocaleString()}.00</span>
                            </div>
                        )}

                        {taxDetails.cgst > 0 && (
                            <div className={styles.summaryRow}>
                                <span>CGST (2.5%)</span>
                                <span>₹{taxDetails.cgst.toLocaleString()}.00</span>
                            </div>
                        )}
                        {taxDetails.sgst > 0 && (
                            <div className={styles.summaryRow}>
                                <span>SGST (2.5%)</span>
                                <span>₹{taxDetails.sgst.toLocaleString()}.00</span>
                            </div>
                        )}
                        {taxDetails.igst > 0 && (
                            <div className={styles.summaryRow}>
                                <span>IGST (5%)</span>
                                <span>₹{taxDetails.igst.toLocaleString()}.00</span>
                            </div>
                        )}

                        <div className={styles.summaryRow}>
                            <span>Shipping</span>
                            <span className={taxDetails.shipping === 0 ? styles.freeText : ''}>
                                {taxDetails.shipping === 0 ? 'FREE' : `₹${taxDetails.shipping.toLocaleString()}.00`}
                            </span>
                        </div>

                        <div className={styles.summaryTotalRow}>
                            <span>Total</span>
                            <span className={styles.totalPrice}>
                                ₹{Math.max(0, taxDetails.totalOrder - (appliedCoupon?.couponDiscount || 0)).toLocaleString()}.00
                            </span>
                        </div>
                    </div>

                    <div className={styles.summaryPaymentWrapper}>
                        <div className={styles.summaryPaymentTitle}>Payment Method</div>
                        <div 
                            className={`${styles.summaryPaymentOption} ${checkoutForm.paymentMethod === 'COD' ? styles.codSelected : ''}`}
                            onClick={() => setCheckoutForm(p => ({ ...p, paymentMethod: p.paymentMethod === 'COD' ? '' : 'COD' }))}
                            role="button"
                            tabIndex={0}
                        >
                            <div className={`${styles.customCheckbox} ${checkoutForm.paymentMethod === 'COD' ? styles.checkboxChecked : ''}`}>
                                {checkoutForm.paymentMethod === 'COD' && <Check size={13} strokeWidth={3.5} />}
                            </div>
                            <Truck size={20} className={styles.truckIcon} />
                            <div className={styles.paymentTextGroup}>
                                <div className={styles.paymentOptionTitle}>Cash on Delivery</div>
                                <div className={styles.paymentOptionDesc}>Pay when you receive the product</div>
                            </div>
                        </div>
                    </div>

                    {placing && checkoutForm.paymentMethod === 'COD' && (
                        <div style={{ marginBottom: '1rem', marginInline: '1.25rem', padding: '12px', background: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '14px', textAlign: 'center', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong>Cash on Delivery Selected</strong>
                            <span>Order is processing, please do not close the window...</span>
                        </div>
                    )}
                    <button className={styles.placeOrderBtn} onClick={handlePlaceOrder} disabled={placing}>
                        {placing ? 'Processing...' : 'Place Order'}
                    </button>
                </div>
            </aside>
        </div>
        </div>

        {/* Order Confirmed Pop-up Modal */}
        {orderData && (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                    <div className={styles.modalHeaderBadge}>
                        <CheckCircle size={44} color="#16a34a" />
                    </div>
                    <h2 className={styles.modalTitle}>Your Placed Order Confirmed</h2>
                    <p className={styles.modalSubtitle}>
                        Thank you for your purchase! We have received your order and will process it shortly.
                    </p>

                    <div className={styles.modalActions}>
                        <button onClick={() => router.push('/profile?tab=orders')} className={styles.modalPrimaryBtn}>
                            View My Orders
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
