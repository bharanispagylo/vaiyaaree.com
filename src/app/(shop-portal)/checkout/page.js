'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { MessageCircle, ShoppingBag, Truck, CreditCard, ChevronLeft, Download, CheckCircle, Package, Clock, MapPin } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import Link from 'next/link';
import styles from './checkout.module.css';

export default function CheckoutPage() {
    const router = useRouter();
    const { cart, cartTotal, checkoutForm, setCheckoutForm, taxDetails, placeOrder, supabase, showToast } = useShop();
    const [placing, setPlacing] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [invoiceUrl, setInvoiceUrl] = useState(null);
    const [polling, setPolling] = useState(false);

    // The invoice is now dynamically generated via the API route natively without needing to wait
    // for an external worker to upload to supabase. We can just link directly to it.
    useEffect(() => {
        if (orderData?.orderId) {
            setInvoiceUrl(`/api/invoice/${orderData.orderId}`);
            setPolling(false);
        }
    }, [orderData?.orderId, invoiceUrl, supabase]);

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
                shippingCountry: 'India'
            }));
        }
    }, [
        checkoutForm.sameAsBilling,
        checkoutForm.billingName,
        checkoutForm.billingPhone,
        checkoutForm.billingAddress,
        checkoutForm.billingCity,
        checkoutForm.billingState,
        checkoutForm.billingPincode
    ]);

    const states = ["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"];

    const handlePlaceOrder = async () => {
        if (!checkoutForm.billingName || !checkoutForm.billingPhone || !checkoutForm.billingAddress || !checkoutForm.billingCity || !checkoutForm.billingPincode || !checkoutForm.billingWhatsApp || !checkoutForm.billingEmail) {
            showToast('Please fill all required billing details', 'error');
            return;
        }

        // Validate shipping if different from billing
        if (!checkoutForm.sameAsBilling && (!checkoutForm.shippingName || !checkoutForm.shippingPhone || !checkoutForm.shippingAddress)) {
            showToast('Please fill all required shipping details', 'error');
            return;
        }

        setPlacing(true);
        try {
            const data = await placeOrder();

            if (data) {
                if (checkoutForm.paymentMethod === 'ONLINE') {
                    // Trigger Razorpay
                    await initiateRazorpayPayment(data);
                } else {
                    // COD success is handled in ShopContext redirect/data returned
                    setOrderData(data);
                }
            }
        } catch (err) {
            console.error('Checkout Error:', err);
        } finally {
            setPlacing(false);
        }
    };

    const initiateRazorpayPayment = async (orderData) => {
        try {
            const res = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderData.orderId })
            });
            const rzpData = await res.json();

            if (rzpData.error) throw new Error(rzpData.error);

            const options = {
                key: rzpData.keyId,
                amount: rzpData.amount,
                currency: rzpData.currency,
                name: "Caste Print",
                description: "Order Payment for Caste Print",
                order_id: rzpData.razorpayOrderId,
                handler: async function (response) {
                    // Verify payment
                    const verifyRes = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        setOrderData(orderData);
                    } else {
                        showToast('Payment verification failed', 'error');
                    }
                },
                prefill: {
                    name: checkoutForm.billingName,
                    contact: checkoutForm.billingPhone
                },
                theme: { color: "#000000" }
            };

            if (!window.Razorpay) {
                showToast('Payment system not loaded. Please refresh.', 'error');
                return;
            }

            if (rzpData.keyId === 'rzp_test_placeholder') {
                showToast('Payment is in Test Mode. Use real keys for live payments.', 'info');
                // We'll still try to open it if they want to see the UI, 
                // but real Razorpay SDK might reject this key.
            }

            const rzp = new window.Razorpay(options);

            rzp.on('payment.failed', function (response) {
                console.error('Payment failed:', response.error);
                showToast(`Payment failed: ${response.error.description}`, 'error');
            });

            rzp.open();
        } catch (err) {
            console.error('Razorpay Error:', err);
            showToast(err.message || 'Failed to initialize payment', 'error');
        }
    };

    const goToWhatsApp = (orderId) => {
        const message = encodeURIComponent(`Hi! I just placed an order #${orderId} on your website. Please confirm.`);
        const bizPhone = process.env.NEXT_PUBLIC_BUSINESS_PHONE || '15551678232';
        window.open(`https://wa.me/${bizPhone}?text=${message}`, '_blank');
    };

    if (orderData) {
        return (
            <div className={styles.successView}>
                <div className={styles.successCard}>
                    <div className={styles.successBadge}>
                        <CheckCircle size={48} color="#000000" />
                    </div>
                    <h2>Thank You for Your Order!</h2>
                    <p className={styles.successSub}>We've received your order and sent a confirmation to your WhatsApp.</p>

                    <div className={styles.successDetailsGrid}>
                        <div className={styles.detailCard}>
                            <Package size={20} />
                            <div>
                                <label>Order ID</label>
                                <strong>#{orderData.orderId}</strong>
                            </div>
                        </div>
                        <div className={styles.detailCard}>
                            <Clock size={20} />
                            <div>
                                <label>Customer Name</label>
                                <strong>{orderData.billingName || orderData.customerName}</strong>
                            </div>
                        </div>
                        <div className={styles.detailCard}>
                            <CreditCard size={20} />
                            <div className={styles.taxBreakdownContainer}>
                                <label>Payment Summary</label>
                                <div className={styles.successTaxRow}>
                                    <span>Subtotal</span>
                                    <span>₹{orderData.subtotal?.toLocaleString() || (orderData.total - orderData.shipping - ((orderData.cgst || 0) + (orderData.sgst || 0) + (orderData.igst || 0))).toLocaleString()}</span>
                                </div>
                                {orderData.shipping > 0 && (
                                    <div className={styles.successTaxRow}>
                                        <span>Shipping</span>
                                        <span>₹{orderData.shipping.toLocaleString()}</span>
                                    </div>
                                )}
                                {orderData.cgst > 0 && (
                                    <div className={styles.successTaxRow}>
                                        <span>CGST (2.5%)</span>
                                        <span>₹{orderData.cgst.toLocaleString()}</span>
                                    </div>
                                )}
                                {orderData.sgst > 0 && (
                                    <div className={styles.successTaxRow}>
                                        <span>SGST (2.5%)</span>
                                        <span>₹{orderData.sgst.toLocaleString()}</span>
                                    </div>
                                )}
                                {orderData.igst > 0 && (
                                    <div className={styles.successTaxRow}>
                                        <span>IGST (5%)</span>
                                        <span>₹{orderData.igst.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className={`${styles.successTaxRow} ${styles.successTotalRow}`}>
                                    <span>Grand Total</span>
                                    <strong>₹{orderData.total.toLocaleString()}.00</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.successActions}>
                        <button onClick={() => goToWhatsApp(orderData.orderId)} className={styles.waBtn}>
                            <MessageCircle size={18} /> Chat with Us on WhatsApp
                        </button>

                        <a
                            href={invoiceUrl || '#'}
                            target={invoiceUrl ? "_blank" : "_self"}
                            className={`${styles.downloadBtn} ${!invoiceUrl ? styles.disabled : ''}`}
                            onClick={(e) => !invoiceUrl && e.preventDefault()}
                        >
                            <Download size={18} /> {invoiceUrl ? 'Download Bill' : (polling ? 'Generating Bill...' : 'Download Bill')}
                        </a>
                    </div>

                    <div className={styles.navigationLinks}>
                        <Link href="/my-orders" className={styles.secondaryBtn}>View My Orders</Link>
                        <Link href="/shop" className={styles.secondaryBtn}>Continue Shopping</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (cart.length === 0) {
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
        <div className={styles.checkoutLayout}>
            <div className={styles.checkoutLeft}>
                {/* BILLING ADDRESS SECTION */}
                <section className={styles.checkoutCard}>
                    <h3 className={styles.cardTitle}>Billing Details</h3>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>FULL NAME</label>
                            <input 
                                type="text" 
                                value={checkoutForm.billingName || ''} 
                                onChange={e => setCheckoutForm(p => ({ ...p, billingName: e.target.value }))} 
                                placeholder="Enter your full name" 
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>PHONE NUMBER</label>
                            <input 
                                type="tel" 
                                value={checkoutForm.billingPhone || ''} 
                                onChange={e => setCheckoutForm(p => ({ ...p, billingPhone: e.target.value }))} 
                                placeholder="10-digit phone number" 
                            />
                        </div>
                    </div>

                    <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label>WHATSAPP NUMBER</label>
                            <input 
                                type="tel" 
                                value={checkoutForm.billingWhatsApp || ''} 
                                onChange={e => setCheckoutForm(p => ({ ...p, billingWhatsApp: e.target.value }))} 
                                placeholder="WhatsApp number for order updates" 
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>EMAIL ADDRESS</label>
                            <input 
                                type="email" 
                                value={checkoutForm.billingEmail || ''} 
                                onChange={e => setCheckoutForm(p => ({ ...p, billingEmail: e.target.value }))} 
                                placeholder="your@email.com" 
                            />
                        </div>
                    </div>

                    <div className={styles.formGroupFull} style={{ marginTop: '1.5rem' }}>
                        <label>BILLING ADDRESS</label>
                        <textarea 
                            value={checkoutForm.billingAddress || ''} 
                            onChange={e => setCheckoutForm(p => ({ ...p, billingAddress: e.target.value }))} 
                            placeholder="House No, Building, Street, Area..." 
                            rows={2} 
                        />
                    </div>

                    <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label>CITY / TOWN</label>
                            <input 
                                type="text" 
                                value={checkoutForm.billingCity || ''} 
                                onChange={e => setCheckoutForm(p => ({ ...p, billingCity: e.target.value }))} 
                                placeholder="City name" 
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>STATE</label>
                            <select 
                                value={checkoutForm.billingState || 'Tamil Nadu'} 
                                onChange={e => setCheckoutForm(p => ({ ...p, billingState: e.target.value }))}
                            >
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGroup}>
                            <label>PINCODE</label>
                            <input 
                                type="text" 
                                value={checkoutForm.billingPincode || ''} 
                                onChange={e => setCheckoutForm(p => ({ ...p, billingPincode: e.target.value }))} 
                                placeholder="6-digit pincode" 
                            />
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
                                    // If checked, copy billing to shipping
                                    ...(isChecked ? {
                                        shippingName: p.billingName,
                                        shippingPhone: p.billingPhone,
                                        shippingAddress: p.billingAddress,
                                        shippingCity: p.billingCity,
                                        shippingState: p.billingState,
                                        shippingPincode: p.billingPincode
                                    } : {})
                                }));
                            }}
                        />
                        <span className={styles.checkmark}></span>
                        <span className={styles.checkboxLabel}>Same as billing address</span>
                    </label>

                    {/* Shipping fields - always visible, auto-filled when sameAsBilling is checked */}
                    <div className={styles.shippingFields} style={{ marginTop: '1.5rem' }}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>SHIPPING FULL NAME</label>
                                <input 
                                    type="text" 
                                    value={checkoutForm.shippingName || ''} 
                                    onChange={e => setCheckoutForm(p => ({ ...p, shippingName: e.target.value }))} 
                                    placeholder="Enter recipient name"
                                    disabled={checkoutForm.sameAsBilling}
                                    className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>SHIPPING PHONE NUMBER</label>
                                <input 
                                    type="tel" 
                                    value={checkoutForm.shippingPhone || ''} 
                                    onChange={e => setCheckoutForm(p => ({ ...p, shippingPhone: e.target.value }))} 
                                    placeholder="10-digit phone number"
                                    disabled={checkoutForm.sameAsBilling}
                                    className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
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
                                <select 
                                    value={checkoutForm.shippingState || 'Tamil Nadu'} 
                                    onChange={e => setCheckoutForm(p => ({ ...p, shippingState: e.target.value }))}
                                    disabled={checkoutForm.sameAsBilling}
                                    className={checkoutForm.sameAsBilling ? styles.disabledInput : ''}
                                >
                                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                            <div className={styles.formGroup}>
                                <label>PINCODE</label>
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
                                <label>COUNTRY</label>
                                <select 
                                    value={checkoutForm.shippingCountry || 'India'}
                                    onChange={e => {
                                        const newCountry = e.target.value;
                                        setCheckoutForm(p => ({ 
                                            ...p, 
                                            shippingCountry: newCountry,
                                            // Auto-switch to ONLINE if COD was selected and country is not India
                                            ...(p.paymentMethod === 'COD' && newCountry !== 'India' ? { paymentMethod: 'ONLINE' } : {})
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

                <section className={styles.checkoutCard} style={{ marginTop: '2rem' }}>
                    <h3 className={styles.cardTitle}>Payment Method</h3>
                    <div className={styles.paymentOptions}>
                        <label className={`${styles.paymentRadio} ${checkoutForm.paymentMethod === 'ONLINE' ? styles.activeRadio : ''}`}>
                            <input type="radio" value="ONLINE" checked={checkoutForm.paymentMethod === 'ONLINE'} onChange={() => setCheckoutForm(p => ({ ...p, paymentMethod: 'ONLINE' }))} />
                            <div className={styles.paymentMeta}>
                                <span>Credit Card/Debit Card/NetBanking</span>
                                <div className={styles.razorpayBrand}>
                                    <img src="https://cdn.razorpay.com/static/assets/logo_white.png" alt="Razorpay" className={styles.razorpayLogo} />
                                    <span>Pay by Razorpay</span>
                                </div>
                            </div>
                        </label>

                        {checkoutForm.paymentMethod === 'ONLINE' && (
                            <div className={styles.paymentDesc}>
                                Pay securely by Credit or Debit card or Internet Banking through Razorpay.
                            </div>
                        )}

                        {/* COD only available for India */}
                        {(checkoutForm.shippingCountry === 'India' || (!checkoutForm.shippingCountry && checkoutForm.sameAsBilling)) && (
                            <label className={`${styles.paymentRadio} ${checkoutForm.paymentMethod === 'COD' ? styles.activeRadio : ''}`} style={{ marginTop: '1rem' }}>
                                <input type="radio" value="COD" checked={checkoutForm.paymentMethod === 'COD'} onChange={() => setCheckoutForm(p => ({ ...p, paymentMethod: 'COD' }))} />
                                <div className={styles.radioInfo}>
                                    <Truck size={20} />
                                    <div>
                                        <div className={styles.radioTitle}>Cash on Delivery</div>
                                        <div className={styles.radioDesc}>Pay when you receive the product</div>
                                    </div>
                                </div>
                            </label>
                        )}

                        {/* Show message for international orders */}
                        {checkoutForm.shippingCountry && checkoutForm.shippingCountry !== 'India' && !checkoutForm.sameAsBilling && (
                            <div style={{ 
                                marginTop: '1rem', 
                                padding: '0.75rem 1rem', 
                                background: '#fef3c7', 
                                borderRadius: '8px', 
                                fontSize: '0.85rem', 
                                color: '#92400e' 
                            }}>
                                💳 COD is only available for orders within India. Please pay online for international shipping.
                            </div>
                        )}
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

                        <div className={styles.summaryRow}>
                            <span>Subtotal</span>
                            <span>₹{cartTotal.toLocaleString()}.00</span>
                        </div>

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
                            <span className={styles.totalPrice}>₹{taxDetails.totalOrder.toLocaleString()}.00</span>
                        </div>
                    </div>

                    <button className={styles.placeOrderBtn} onClick={handlePlaceOrder} disabled={placing}>
                        {placing ? 'Processing...' : 'Place Order'}
                    </button>
                </div>
            </aside>

            {/* Razorpay SDK */}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
        </div>
    );
}
