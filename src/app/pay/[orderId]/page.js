'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import Script from 'next/script';

// Using MySQL supabase client from @/lib/supabaseClient

// Inner component that uses useSearchParams (must be wrapped in Suspense)
function PaymentPageInner({ orderId }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [activeGateway, setActiveGateway] = useState(null); // 'razorpay' | 'phonepe'
    const [sdkReady, setSdkReady] = useState(false);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState({
        razorpay_enabled: true,
        razorpay_title: 'Pay with Razorpay',
        phonepe_enabled: true,
        phonepe_title: 'Pay with PhonePe',
        default_gateway: 'razorpay'
    });

    useEffect(() => {
        // Handle PhonePe redirect callback
        const status = searchParams.get('status');
        const reason = searchParams.get('reason');
        if (status === 'success') {
            setPaymentStatus('success');
        } else if (status === 'failed') {
            setError(`Payment failed: ${reason || 'Please try again'}`);
        }

        async function fetchSettings() {
            try {
                const { data, error: sError } = await supabase
                    .from('app_settings')
                    .select('key, value')
                    .in('key', ['razorpay_enabled', 'razorpay_title', 'phonepe_enabled', 'phonepe_title', 'default_gateway']);

                if (!sError && data) {
                    const sMap = {};
                    data.forEach(item => { sMap[item.key] = item.value; });
                    setSettings(prev => ({
                        ...prev,
                        razorpay_enabled: sMap.razorpay_enabled !== 'false',
                        razorpay_title: sMap.razorpay_title || 'Pay with Razorpay',
                        phonepe_enabled: sMap.phonepe_enabled !== 'false',
                        phonepe_title: sMap.phonepe_title || 'Pay with PhonePe',
                        default_gateway: sMap.default_gateway || 'razorpay'
                    }));
                }
            } catch (e) { console.error('Error fetching settings:', e); }
        }

        async function fetchOrder() {
            const { data, fetchError } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', orderId)
                .single();

            if (fetchError || !data) {
                setPaymentStatus('failed');
                setError('Order not found.');
            } else {
                setOrder(data);
                if (data.status === 'PAID') setPaymentStatus('success');
            }
            setLoading(false);
        }
        fetchSettings();
        fetchOrder();
    }, [orderId, searchParams]);

    //  Razorpay Handler 
    const handleRazorpay = useCallback(async () => {
        if (!sdkReady) {
            setError('Payment system is loading. Please try again in a moment.');
            return;
        }
        setActiveGateway('razorpay');
        setError('');

        try {
            const res = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');

            const options = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency || 'INR',
                name: "Vaiyaaree",
                description: `Payment for Order #${orderId}`,
                image: '/favicon.ico',
                order_id: data.razorpayOrderId,
                prefill: {
                    name: order?.customer_name || '',
                    contact: order?.customer_phone || '',
                },
                theme: { color: '#c2185b' },
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                orderId,
                            }),
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.success) {
                            setPaymentStatus('success');
                        } else {
                            throw new Error(verifyData.error || 'Verification failed');
                        }
                    } catch (err) {
                        setError('Payment received but verification failed. Contact support with Payment ID: ' + response.razorpay_payment_id);
                        setActiveGateway(null);
                    }
                },
                modal: { ondismiss: () => setActiveGateway(null) },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (resp) => {
                setError(`Payment failed: ${resp.error.description}`);
                setActiveGateway(null);
            });
            rzp.open();
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
            setActiveGateway(null);
        }
    }, [sdkReady, orderId, order]);

    //  PhonePe Handler 
    const handlePhonePe = useCallback(async () => {
        setActiveGateway('phonepe');
        setError('');

        try {
            const res = await fetch('/api/payment/phonepe-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'PhonePe initiation failed');

            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                throw new Error('No redirect URL from PhonePe');
            }
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
            setActiveGateway(null);
        }
    }, [orderId]);

    //  Loading 
    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, border: '3px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: 'hsl(var(--text-muted))' }}>Loading your order...</p>
            </div>
        </div>
    );

    //  Order Not Found 
    if (!order && paymentStatus === 'failed' && !error.includes('failed')) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-app))', color: 'hsl(var(--danger))', fontSize: '1.2rem' }}>
            Order not found.
        </div>
    );

    //  Success Screen 
    if (paymentStatus === 'success') return (
        <div style={{ minHeight: '100vh', background: 'hsl(var(--bg-app))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-body)' }}>
            <div style={{ background: 'white', border: '1px solid hsl(var(--border-subtle))', borderRadius: 24, padding: '3rem 2.5rem', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ width: 80, height: 80, background: 'hsl(var(--success) / 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '2px solid hsl(var(--success) / 0.4)' }}>
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="hsl(var(--success))" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 style={{ color: 'hsl(var(--text-main))', fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', fontFamily: 'var(--font-heading)' }}>Payment Successful!</h1>
                <p style={{ color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>Order <span style={{ color: 'hsl(var(--primary))', fontWeight: 700, fontFamily: 'var(--font-body)' }}>#{orderId}</span> has been confirmed.</p>

                <div style={{ background: 'hsl(var(--bg-app))', borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left', border: '1px solid hsl(var(--border-subtle))' }}>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontWeight: 700 }}>Order Summary</p>
                    {(order?.order_items || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i < (order?.order_items?.length || 0) - 1 ? '1px solid hsl(var(--border-subtle))' : 'none' }}>
                            <span style={{ color: 'hsl(var(--text-main))', fontSize: '0.9rem' }}>{item.product_name} <span style={{ color: 'hsl(var(--text-muted))' }}>×{item.quantity}</span></span>
                            <span style={{ color: 'hsl(var(--text-main))', fontWeight: 700 }}>₹{(item.price_at_time * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid hsl(var(--border-subtle))' }}>
                        <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Total Paid</span>
                        <span style={{ color: 'hsl(var(--primary))', fontWeight: 800, fontSize: '1.25rem' }}>₹{order?.total_amount?.toLocaleString()}</span>
                    </div>
                </div>

                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem', marginBottom: '2rem' }}>Invoice sent to your WhatsApp number</p>

                <button
                    onClick={() => router.push('/shop')}
                    style={{ 
                        width: '100%', padding: '1.1rem', background: 'hsl(var(--primary))', color: 'white', 
                        border: 'none', borderRadius: 16, fontWeight: 700, fontSize: '1rem', 
                        cursor: 'pointer', boxShadow: '0 10px 20px hsl(var(--primary) / 0.2)'
                    }}
                >
                    Continue Shopping →
                </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    //  Main Checkout Page 
    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setSdkReady(true)} strategy="afterInteractive" />

            <div style={{ minHeight: '100vh', background: 'hsl(var(--bg-app))', padding: '2rem 1rem', fontFamily: 'var(--font-body)' }}>
                <div style={{ maxWidth: 480, margin: '0 auto' }}>

                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ color: 'hsl(var(--text-main))', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Checkout</h2>
                        <p style={{ color: 'hsl(var(--primary))', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem', fontWeight: 700 }}>Vaiyaaree — Secure Payment</p>
                    </div>

                    {/* Order Summary Card */}
                    <div style={{ background: 'white', borderRadius: 24, overflow: 'hidden', border: '1px solid hsl(var(--border-subtle))', marginBottom: '1.5rem', boxShadow: 'var(--shadow-card)' }}>
                        <div style={{ background: 'hsl(var(--primary))', padding: '2.5rem 2rem', textAlign: 'center' }}>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem', fontWeight: 700 }}>Total Amount</p>
                            <h3 style={{ color: 'white', fontSize: '3rem', fontWeight: 800, margin: 0 }}>₹{order?.total_amount?.toLocaleString()}</h3>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', fontWeight: 700 }}>Order Items</p>
                            {(order?.order_items || []).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: i < (order?.order_items?.length || 0) - 1 ? '1px solid hsl(var(--bg-app))' : 'none' }}>
                                    <span style={{ color: 'hsl(var(--text-main))', fontSize: '0.9rem', fontWeight: 600 }}>{item.product_name} <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 400 }}>×{item.quantity}</span></span>
                                    <span style={{ color: 'hsl(var(--text-main))', fontWeight: 800 }}>₹{(item.price_at_time * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid hsl(var(--bg-app))' }}>
                                <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Customer</span>
                                <span style={{ color: 'hsl(var(--text-main))', fontWeight: 700 }}>{order?.customer_name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: 'hsl(var(--danger) / 0.1)', border: '1px solid hsl(var(--danger) / 0.3)', color: 'hsl(var(--danger))', padding: '1rem', borderRadius: 16, marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                            {error}
                        </div>
                    )}

                    {/* Payment Buttons */}
                    <p style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', textAlign: 'center' }}>Choose Payment Method</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { id: 'razorpay', enabled: settings.razorpay_enabled, title: settings.razorpay_title, handler: handleRazorpay, color: '#3395FF', bg: '#072654', char: 'R', subtitle: 'Cards, UPI, NetBanking' },
                            { id: 'phonepe', enabled: settings.phonepe_enabled, title: settings.phonepe_title, handler: handlePhonePe, color: '#5e17eb', bg: 'white', char: 'Pe', subtitle: 'Direct UPI & PhonePe App' }
                        ]
                            .filter(g => g.enabled)
                            .sort((a, b) => a.id === settings.default_gateway ? -1 : 1)
                            .map((g) => (
                                <button
                                    key={g.id}
                                    onClick={g.handler}
                                    disabled={!!activeGateway}
                                    style={{
                                        width: '100%', padding: '1.25rem', borderRadius: 20, border: '1px solid hsl(var(--border-subtle))', cursor: activeGateway ? 'not-allowed' : 'pointer', transition: '0.2s', position: 'relative', overflow: 'hidden', textAlign: 'left',
                                        background: activeGateway === g.id ? 'hsl(var(--bg-app))' : 'white',
                                        boxShadow: (activeGateway === g.id || (activeGateway === null && g.id === settings.default_gateway)) ? 'var(--shadow-card)' : 'var(--shadow-sm)',
                                        borderColor: (activeGateway === null && g.id === settings.default_gateway) ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border-subtle))'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{ width: 44, height: 44, background: g.id === 'phonepe' ? '#5e17eb' : g.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: g.id === 'phonepe' ? 'white' : g.color, fontWeight: 900, fontSize: '1.2rem' }}>{g.char}</div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: 0, fontWeight: 700, color: 'hsl(var(--text-main))' }}>{g.title}</p>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{g.subtitle}</p>
                                        </div>
                                        <div style={{ color: 'hsl(var(--primary))', fontWeight: 800 }}>
                                            {activeGateway === g.id ? <div style={{ width: 20, height: 20, border: '2px solid hsl(var(--primary) / 0.2)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : '→'}
                                        </div>
                                    </div>
                                    {g.id === settings.default_gateway && !activeGateway && (
                                        <div style={{ position: 'absolute', top: 0, right: 0, background: 'hsl(var(--primary))', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '0 0 0 10px', fontWeight: 800 }}>RECOMMENDED</div>
                                    )}
                                </button>
                            ))
                        }

                        {/* If both disabled */}
                        {!settings.razorpay_enabled && !settings.phonepe_enabled && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#666', border: '1px dashed #333', borderRadius: 16 }}>
                                No online payment methods available at the moment.
                            </div>
                        )}
                    </div>

                    {/* Accepted Methods */}
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            {['UPI', 'PhonePe', 'GPay', 'Paytm', 'VISA', 'Mastercard', 'Net Banking'].map(m => (
                                <span key={m} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#666', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.65rem' }}>{m}</span>
                            ))}
                        </div>
                        <p style={{ color: '#333', fontSize: '0.7rem' }}>Secured by Razorpay & PhonePe · 256-bit SSL</p>
                    </div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </>
    );
}

export default function PaymentPage({ params }) {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--bg-app))' }}>
                <div style={{ width: 48, height: 48, border: '3px solid hsl(var(--primary))', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <PaymentPageInner orderId={params.orderId} />
        </Suspense>
    );
}
