'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Package, ArrowRight, ArrowLeft, Check, Upload, X, MapPin, 
    RotateCcw, AlertCircle, CheckCircle, Clock, Truck, Search,
    ChevronDown, Camera, FileText, Home, ExternalLink, ShieldCheck,
    XCircle, AlertTriangle
} from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    RETURN_REQUESTED:           { label: 'Request Submitted', color: '#6366f1', bg: '#eef2ff', icon: '📋' },
    RETURN_APPROVED:            { label: 'Approved — Please Courier Product', color: '#059669', bg: '#d1fae5', icon: '✅' },
    RETURN_REJECTED:            { label: 'Request Rejected', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
    CUSTOMER_SHIPPED:           { label: 'Product Shipped by You', color: '#7c3aed', bg: '#ede9fe', icon: '🚚' },
    IN_TRANSIT:                 { label: 'In Transit to Company', color: '#7c3aed', bg: '#ede9fe', icon: '🚚' },
    RECEIVED_BY_COMPANY:        { label: 'Received by Company', color: '#0891b2', bg: '#e0f2fe', icon: '🏭' },
    INSPECTION_PENDING:         { label: 'Inspection Pending', color: '#d97706', bg: '#fef3c7', icon: '🔍' },
    UNDER_INSPECTION:           { label: 'Under Quality Inspection', color: '#d97706', bg: '#fef3c7', icon: '🔎' },
    INSPECTION_APPROVED:        { label: 'Inspection Passed', color: '#059669', bg: '#d1fae5', icon: '✅' },
    INSPECTION_REJECTED:        { label: 'Inspection Failed', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
    REFUND_PENDING:             { label: 'Refund Pending', color: '#d97706', bg: '#fef3c7', icon: '💰' },
    REFUND_PROCESSING:          { label: 'Refund Processing', color: '#2563eb', bg: '#dbeafe', icon: '💳' },
    REFUND_COMPLETED:           { label: 'Refund Completed', color: '#059669', bg: '#d1fae5', icon: '💚' },
    EXCHANGE_PENDING:           { label: 'Exchange Pending', color: '#d97706', bg: '#fef3c7', icon: '🔄' },
    EXCHANGE_PROCESSING:        { label: 'Exchange Processing', color: '#2563eb', bg: '#dbeafe', icon: '⚙️' },
    EXCHANGE_SHIPPED:           { label: 'Exchange Shipped', color: '#7c3aed', bg: '#ede9fe', icon: '🚀' },
    EXCHANGE_DELIVERED:         { label: 'Exchange Delivered', color: '#059669', bg: '#d1fae5', icon: '📬' },
    RETURN_TO_CUSTOMER:         { label: 'Being Returned to You', color: '#d97706', bg: '#fef3c7', icon: '↩️' },
    RETURN_TO_CUSTOMER_SHIPPED: { label: 'Shipped Back to You', color: '#7c3aed', bg: '#ede9fe', icon: '📤' },
    RETURN_TO_CUSTOMER_DELIVERED:{ label: 'Returned to You', color: '#6b7280', bg: '#f3f4f6', icon: '📬' },
    RETURN_CLOSED:              { label: 'Case Closed', color: '#6b7280', bg: '#f3f4f6', icon: '📌' },
    COMPLETED:                  { label: 'Completed', color: '#059669', bg: '#d1fae5', icon: '🎉' },
    CANCELLED:                  { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6', icon: '🚫' },
    // Legacy
    PENDING:                    { label: 'Under Review', color: '#d97706', bg: '#fef3c7', icon: '⏳' },
    APPROVED:                   { label: 'Approved — Please Courier Product', color: '#059669', bg: '#d1fae5', icon: '✅' },
    REJECTED:                   { label: 'Rejected', color: '#dc2626', bg: '#fee2e2', icon: '❌' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', icon: '❓' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.75rem', borderRadius: '20px',
            background: cfg.bg, color: cfg.color,
            fontSize: '0.75rem', fontWeight: 700,
        }}>
            <span>{cfg.icon}</span> {cfg.label}
        </span>
    );
}

function ReturnTimeline({ logs }) {
    if (!logs || logs.length === 0) return null;
    return (
        <div style={{ marginTop: '1rem' }}>
            {logs.map((log, i) => (
                <div key={log.id || i} style={{
                    display: 'flex', gap: '0.75rem', paddingBottom: i < logs.length - 1 ? '1rem' : 0,
                    position: 'relative'
                }}>
                    {i < logs.length - 1 && (
                        <div style={{ position: 'absolute', left: '11px', top: '22px', bottom: 0, width: '2px', background: '#e2e8f0' }} />
                    )}
                    <div style={{
                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                        background: i === logs.length - 1 ? 'hsl(var(--primary))' : '#cbd5e1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Check size={12} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            {STATUS_CONFIG[log.new_status]?.label || log.new_status}
                        </div>
                        {log.notes && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>{log.notes}</div>}
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                            {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function ReturnWizard({ user, supabase, addresses = [], orders = [], returns = [], onSuccess }) {
    const [step, setStep] = useState(0); // 0=product, 1=reason, 2=photos, 3=review
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(null); // returnId after success
    const [error, setError] = useState('');
    const [expandedHistory, setExpandedHistory] = useState(null);
    const [historyData, setHistoryData] = useState({});
    const [userReturns, setUserReturns] = useState(returns || []);

    // Shipping Modal state for APPROVED returns
    const [shippingModalReturn, setShippingModalReturn] = useState(null);
    const [couriersList, setCouriersList] = useState([]);
    const [shippingForm, setShippingForm] = useState({
        courierCompanyId: '',
        courierCompanyName: 'DTDC',
        trackingNumber: '',
        shippingDate: new Date().toISOString().split('T')[0],
        shippingCost: '',
        receiptUrl: '',
        receiptPreview: '',
        uploadingReceipt: false,
        notes: ''
    });
    const [shippingSubmitLoading, setShippingSubmitLoading] = useState(false);
    const [shippingError, setShippingError] = useState('');

    // Form state
    const [selectedItem, setSelectedItem] = useState(null);
    const [form, setForm] = useState({
        requestType: 'RETURN',
        reason: 'Wrong Item Delivered',
        description: '',
        productCondition: 'ORIGINAL_PACKAGING',
        exchangeNotes: '',
    });
    const [photos, setPhotos] = useState([]); // { url, preview, uploading }
    const [policyAccepted, setPolicyAccepted] = useState(false);
    const fileInputRef = useRef(null);
    const receiptInputRef = useRef(null);

    // ── Fetch real-time user returns ──────────────────────────────────────────
    const fetchUserReturns = useCallback(async () => {
        if (!user?.id && !user?.phone) return;
        try {
            let query = supabase
                .from('return_requests')
                .select('*, products(id, name, image_url, price), orders:order_id(id, invoice_no, created_at, customer_name, customer_phone), return_shipping(*)')
                .order('created_at', { ascending: false });

            if (user?.id) {
                query = query.eq('customer_id', user.id);
            }
            
            const { data, error } = await query;
            if (!error && data) {
                setUserReturns(data);
            }
        } catch (err) {
            console.error('[RETURN-WIZARD] Fetch error:', err);
        }
    }, [user, supabase]);

    useEffect(() => {
        fetchUserReturns();

        // Subscribe to database changes for real-time status updates from Admin
        const channel = supabase.channel('customer_returns_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'return_requests' }, () => {
                fetchUserReturns();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchUserReturns, supabase]);

    // Fetch Couriers list
    useEffect(() => {
        fetch('/api/returns/couriers')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setCouriersList(data);
                    const first = data[0];
                    setShippingForm(f => ({ ...f, courierCompanyId: first.id, courierCompanyName: first.name }));
                }
            })
            .catch(() => {});
    }, []);

    // Build eligible items: DELIVERED orders, no active non-rejected return
    const eligibleItems = [];
    orders.filter(o => o.status === 'DELIVERED').forEach(o => {
        const inv = o.invoice_no
            ? (o.invoice_no.startsWith('#') ? o.invoice_no : `#${o.invoice_no}`)
            : `#${String(o.id).replace(/^[A-Z]+-/, 'INV-')}`;

        (o.order_items || []).forEach(item => {
            const activeReturn = (userReturns || []).some(r =>
                String(r.order_id) === String(o.id) &&
                (String(r.product_id) === String(item.product_id) || !item.product_id) &&
                !['REJECTED', 'RETURN_REJECTED', 'CANCELLED', 'COMPLETED', 'RETURN_CLOSED', 'RETURN_TO_CUSTOMER_DELIVERED'].includes(r.status)
            );
            if (!activeReturn) {
                eligibleItems.push({
                    key: `${o.id}::${item.product_id}::${item.id}`,
                    orderId: o.id,
                    invoiceDisplay: inv,
                    productId: item.product_id,
                    orderItemId: item.id,
                    productName: item.product_name || item.products?.name || 'Saree Product',
                    productImage: item.products?.image_url || item.image_url || null,
                    price: item.price_at_time || item.price || 0,
                    orderDate: new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    deliveredOrder: o,
                });
            }
        });
    });

    // ── Photo upload ──────────────────────────────────────────────────────────
    async function handlePhotoUpload(files) {
        const newPhotos = Array.from(files).slice(0, 5 - photos.length);
        for (const file of newPhotos) {
            const preview = URL.createObjectURL(file);
            const tmp = { preview, uploading: true, url: null, error: null };
            setPhotos(prev => [...prev, tmp]);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/returns/upload-photo', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    setPhotos(prev => prev.map(p => p.preview === preview ? { ...p, uploading: false, url: data.url } : p));
                } else {
                    setPhotos(prev => prev.map(p => p.preview === preview ? { ...p, uploading: false, error: data.error || 'Upload failed' } : p));
                }
            } catch {
                setPhotos(prev => prev.map(p => p.preview === preview ? { ...p, uploading: false, error: 'Upload failed' } : p));
            }
        }
    }

    // ── Receipt Upload ────────────────────────────────────────────────────────
    async function handleReceiptUpload(file) {
        if (!file) return;
        const preview = URL.createObjectURL(file);
        setShippingForm(f => ({ ...f, receiptPreview: preview, uploadingReceipt: true }));

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/returns/upload-photo', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.url) {
                setShippingForm(f => ({ ...f, uploadingReceipt: false, receiptUrl: data.url }));
            } else {
                setShippingError(data.error || 'Receipt upload failed');
                setShippingForm(f => ({ ...f, uploadingReceipt: false }));
            }
        } catch {
            setShippingError('Receipt upload failed');
            setShippingForm(f => ({ ...f, uploadingReceipt: false }));
        }
    }

    // ── Submit Initial Return Request ──────────────────────────────────────────
    async function handleSubmitInitialRequest() {
        if (!policyAccepted) { setError('Please accept the return policy to continue.'); return; }
        setSubmitting(true);
        setError('');

        try {
            const photoUrls = photos.filter(p => p.url).map(p => p.url);
            const payload = {
                orderId: selectedItem.orderId,
                orderItemId: selectedItem.orderItemId,
                productId: selectedItem.productId,
                customerId: user?.id,
                type: form.requestType,
                reason: form.reason,
                description: form.description || null,
                productCondition: form.productCondition,
                policyAccepted: true,
                photoUrls,
                requestedFrom: 'WEBSITE',
            };

            const res = await fetch('/api/returns/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || 'Submission failed. Please try again.');
                return;
            }

            setSubmitted(data.returnId || data.data?.return_id || 'REQ-SUBMITTED');
            fetchUserReturns();
            onSuccess && onSuccess();
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    // ── Submit Shipping Info (Post Approval) ──────────────────────────────────
    async function handleShippingSubmit(e) {
        e.preventDefault();
        if (shippingSubmitLoading) return;
        if (!shippingModalReturn) return;
        if (!shippingForm.courierCompanyName) { setShippingError('Please select or enter Courier Company'); return; }
        if (!shippingForm.trackingNumber.trim()) { setShippingError('Please enter Courier Tracking / AWB Number'); return; }
        if (!shippingForm.shippingDate) { setShippingError('Please select Shipping Date'); return; }

        setShippingSubmitLoading(true);
        setShippingError('');

        try {
            const res = await fetch(`/api/returns/${shippingModalReturn.id}/shipping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courier_company_id: shippingForm.courierCompanyId || null,
                    courier_company_name: shippingForm.courierCompanyName,
                    tracking_number: shippingForm.trackingNumber.trim(),
                    shipping_date: shippingForm.shippingDate,
                    shipping_cost: shippingForm.shippingCost || null,
                    receipt_url: shippingForm.receiptUrl || null,
                    notes: shippingForm.notes || null,
                    customer_id: user?.id
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setShippingError(data.error || 'Failed to submit shipping details.');
                return;
            }

            setShippingModalReturn(null);
            setShippingForm({
                courierCompanyId: '',
                courierCompanyName: 'DTDC',
                trackingNumber: '',
                shippingDate: new Date().toISOString().split('T')[0],
                shippingCost: '',
                receiptUrl: '',
                receiptPreview: '',
                uploadingReceipt: false,
                notes: ''
            });

            fetchUserReturns();
            onSuccess && onSuccess();
        } catch (err) {
            setShippingError('Network error. Please try again.');
        } finally {
            setShippingSubmitLoading(false);
        }
    }

    // ── Fetch timeline for a return ───────────────────────────────────────────
    async function fetchTimeline(returnId) {
        if (historyData[returnId]) { setExpandedHistory(expandedHistory === returnId ? null : returnId); return; }
        try {
            const res = await fetch(`/api/returns/${returnId}`);
            if (res.ok) {
                const data = await res.json();
                setHistoryData(prev => ({ ...prev, [returnId]: data.statusLogs || [] }));
            }
        } catch {}
        setExpandedHistory(returnId);
    }

    const STEPS = ['Product', 'Reason', 'Photos', 'Review & Address'];
    const canAdvance = [
        !!selectedItem,
        !!(form.reason),
        true,
        policyAccepted,
    ];

    // ── Success screen ────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: '#d1fae5', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 1.5rem',
                }}>
                    <CheckCircle size={40} color="#059669" />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Request Submitted!</h3>
                <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>Your return request has been received.</p>
                <div style={{
                    display: 'inline-block', padding: '0.5rem 1.25rem', borderRadius: '8px',
                    background: '#eef2ff', color: '#4f46e5', fontWeight: 700, fontSize: '1rem',
                    marginBottom: '1.5rem',
                }}>
                    Return ID: {submitted}
                </div>
                
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '480px', margin: '0 auto 2rem', textAlign: 'left' }}>
                    <h5 style={{ margin: '0 0 0.5rem', color: '#334155', fontWeight: 700 }}>📍 Next Steps:</h5>
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
                        <li>Our team will review your request within 24–48 hours.</li>
                        <li>Once <strong>Approved</strong>, click <em>"I've Shipped the Product"</em> in your return history below.</li>
                        <li>Send the product to our company address via your courier and submit the tracking number.</li>
                    </ol>
                </div>

                <button
                    onClick={() => { setSubmitted(null); setStep(0); setSelectedItem(null); setPhotos([]); setPolicyAccepted(false); setForm({ requestType: 'RETURN', reason: 'Wrong Item Delivered', description: '', productCondition: 'ORIGINAL_PACKAGING', exchangeNotes: '' }); }}
                    style={{
                        padding: '0.75rem 2rem', background: 'hsl(var(--primary))', color: '#fff',
                        border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    Submit Another Request
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* ── Step Progress Bar ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {STEPS.map((label, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: i < step ? '#059669' : i === step ? 'hsl(var(--primary))' : '#e2e8f0',
                                color: i <= step ? '#fff' : '#94a3b8',
                                fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.3s',
                            }}>
                                {i < step ? <Check size={16} /> : i + 1}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: i === step ? 'hsl(var(--primary))' : '#64748b', fontWeight: i === step ? 700 : 500 }}>
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{ width: '60px', height: '2px', background: i < step ? '#059669' : '#e2e8f0', margin: '0 0.5rem', marginBottom: '1.2rem', transition: 'all 0.3s' }} />
                        )}
                    </div>
                ))}
            </div>

            {/* ── Step 0: Product Selection ─────────────────────────────────── */}
            {step === 0 && (
                <div>
                    <h4 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Select Product to Return / Exchange</h4>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                        Only delivered products from your orders within the 10-day return window are shown.
                    </p>

                    {eligibleItems.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <Package size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p style={{ color: '#64748b', fontWeight: 600 }}>No eligible products for return.</p>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Products must be from delivered orders within 10 days.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {eligibleItems.map(item => (
                                <div
                                    key={item.key}
                                    onClick={() => setSelectedItem(item)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '1rem', borderRadius: '12px', cursor: 'pointer',
                                        border: selectedItem?.key === item.key
                                            ? '2px solid hsl(var(--primary))'
                                            : '1px solid #e2e8f0',
                                        background: selectedItem?.key === item.key ? 'hsl(var(--primary) / 0.04)' : '#fff',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '10px',
                                        overflow: 'hidden', flexShrink: 0, background: '#f1f5f9',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {item.productImage
                                            ? <img src={item.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <Package size={24} style={{ opacity: 0.3 }} />
                                        }
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700 }}>{item.productName}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                            Order {item.invoiceDisplay} • Delivered Date: {item.orderDate}
                                            {item.price ? ` • ₹${Number(item.price).toLocaleString('en-IN')}` : ''}
                                        </div>
                                    </div>
                                    {selectedItem?.key === item.key && (
                                        <CheckCircle size={20} color="hsl(var(--primary))" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 1: Reason ───────────────────────────────────────────── */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h4 style={{ fontWeight: 800, marginBottom: '0' }}>Return Reason & Product Details</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                REQUEST TYPE *
                            </label>
                            <select value={form.requestType} onChange={e => setForm(f => ({ ...f, requestType: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                                <option value="RETURN">Return Product (Get Refund)</option>
                                <option value="EXCHANGE">Exchange Product</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                REASON *
                            </label>
                            <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                                <option value="Wrong Item Delivered">Wrong Item / Size Received</option>
                                <option value="Defective / Damaged">Defective or Damaged Product</option>
                                <option value="Quality Not as Expected">Quality Not as Expected</option>
                                <option value="Changed Mind">Changed Mind</option>
                                <option value="Color Mismatch">Color Mismatch</option>
                                <option value="Size Issue">Size Issue</option>
                                <option value="Other">Other Reason</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            PRODUCT CONDITION *
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {[
                                { v: 'ORIGINAL_PACKAGING', l: '📦 Original Packaging' },
                                { v: 'GOOD', l: '👍 Good Condition' },
                                { v: 'DAMAGED', l: '⚠️ Has Damage' },
                            ].map(({ v, l }) => (
                                <label key={v} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1rem', borderRadius: '10px', cursor: 'pointer',
                                    border: form.productCondition === v ? '2px solid hsl(var(--primary))' : '1px solid #e2e8f0',
                                    background: form.productCondition === v ? 'hsl(var(--primary) / 0.06)' : '#fff',
                                    fontWeight: 600, fontSize: '0.85rem',
                                }}>
                                    <input type="radio" name="condition" value={v} checked={form.productCondition === v}
                                        onChange={() => setForm(f => ({ ...f, productCondition: v }))} style={{ display: 'none' }} />
                                    {l}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            ADDITIONAL DESCRIPTION
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Please describe the issue in detail..."
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                    </div>

                    {form.requestType === 'EXCHANGE' && (
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                DESIRED EXCHANGE PRODUCT / NOTES
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Describe what you'd like in exchange (e.g. specific saree name or color)..."
                                value={form.exchangeNotes}
                                onChange={e => setForm(f => ({ ...f, exchangeNotes: e.target.value }))}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 2: Photos ───────────────────────────────────────────── */}
            {step === 2 && (
                <div>
                    <h4 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Upload Product Photos</h4>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                        Upload clear photos of the product (optional, up to 5 photos). Photos help speed up approval.
                    </p>

                    <div
                        onClick={() => photos.length < 5 && fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed #cbd5e1', borderRadius: '14px', padding: '2rem',
                            textAlign: 'center', cursor: photos.length < 5 ? 'pointer' : 'default',
                            background: '#f8fafc', marginBottom: '1.25rem',
                            opacity: photos.length >= 5 ? 0.5 : 1,
                            transition: 'border-color 0.2s',
                        }}
                    >
                        <Camera size={32} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                        <p style={{ fontWeight: 600, color: '#334155' }}>
                            {photos.length >= 5 ? 'Maximum 5 photos uploaded' : 'Click to upload product photos'}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>JPG, PNG, WEBP • Max 5MB each</p>
                        <input
                            ref={fileInputRef}
                            type="file" accept="image/*" multiple
                            style={{ display: 'none' }}
                            onChange={e => handlePhotoUpload(e.target.files)}
                        />
                    </div>

                    {photos.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
                            {photos.map((photo, i) => (
                                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    <img src={photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {photo.uploading && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: '20px', height: '20px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        </div>
                                    )}
                                    {photo.url && (
                                        <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#059669', borderRadius: '50%', padding: '2px' }}>
                                            <Check size={10} color="#fff" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setPhotos(p => p.filter((_, idx) => idx !== i))}
                                        style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 3: Company Return Address & Policy Review ────────────── */}
            {step === 3 && selectedItem && (
                <div>
                    <h4 style={{ fontWeight: 800, marginBottom: '1rem' }}>Review & Return Address Information</h4>

                    {/* Company Return Address (Read-Only) */}
                    <div style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3730a3', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <MapPin size={18} /> Company Return Address
                        </div>
                        <div style={{ background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e0e7ff', color: '#1e1b4b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            <strong style={{ fontSize: '1rem', color: '#312e81' }}>VAIYAAREE SAREES</strong><br />
                            12/34 Saree Avenue, Main Road<br />
                            Chennai, Tamil Nadu - 600001<br />
                            India
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#4338ca', marginTop: '0.75rem', marginBottom: 0, fontWeight: 600 }}>
                            📌 Note: After your return request is approved by our team, you will send the package to this address using your preferred courier service (e.g. DTDC, Delhivery, India Post). Our company will not collect from your home address.
                        </p>
                    </div>

                    {/* Summary Card */}
                    <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            {selectedItem.productImage && (
                                <img src={selectedItem.productImage} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                            )}
                            <div>
                                <div style={{ fontWeight: 700 }}>{selectedItem.productName}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Order {selectedItem.invoiceDisplay} • {selectedItem.orderDate}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <div><span style={{ color: '#94a3b8' }}>Type:</span> <strong>{form.requestType === 'RETURN' ? '🔄 Return (Refund)' : '🔁 Exchange'}</strong></div>
                            <div><span style={{ color: '#94a3b8' }}>Reason:</span> <strong>{form.reason}</strong></div>
                            <div><span style={{ color: '#94a3b8' }}>Condition:</span> <strong>{form.productCondition?.replace(/_/g, ' ')}</strong></div>
                            <div><span style={{ color: '#94a3b8' }}>Photos Uploaded:</span> <strong>{photos.filter(p => p.url).length}</strong></div>
                        </div>
                    </div>

                    {/* Policy Acceptance */}
                    <div style={{ background: '#fef9ec', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                        <h5 style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#92400e' }}>📋 Return Policy</h5>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#78350f', lineHeight: 1.6 }}>
                            <li>Returns must be submitted within 10 days of delivery.</li>
                            <li>Product must be in original condition with tags intact.</li>
                            <li>Once approved, you will ship the package to our company address and enter your courier tracking details.</li>
                            <li>Refund or Exchange is processed after physical quality inspection at our facility.</li>
                        </ul>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.25rem' }}>
                        <input
                            type="checkbox"
                            checked={policyAccepted}
                            onChange={e => setPolicyAccepted(e.target.checked)}
                            style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px', accentColor: 'hsl(var(--primary))' }}
                        />
                        <span style={{ fontSize: '0.88rem', color: '#475569' }}>
                            I have read and agree to the Return & Exchange Policy. I confirm that the product condition is accurate.
                        </span>
                    </label>

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: '10px', color: '#dc2626', fontSize: '0.88rem', marginBottom: '1rem' }}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}
                </div>
            )}

            {/* ── Navigation Buttons ────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                    onClick={() => step > 0 ? setStep(s => s - 1) : null}
                    disabled={step === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1.25rem', borderRadius: '10px',
                        border: '1.5px solid #e2e8f0', background: '#fff',
                        cursor: step === 0 ? 'not-allowed' : 'pointer',
                        opacity: step === 0 ? 0.4 : 1, fontWeight: 600,
                    }}
                >
                    <ArrowLeft size={16} /> Back
                </button>

                {step < 3 ? (
                    <button
                        onClick={() => { if (canAdvance[step]) setStep(s => s + 1); }}
                        disabled={!canAdvance[step]}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.5rem', borderRadius: '10px',
                            background: canAdvance[step] ? 'hsl(var(--primary))' : '#cbd5e1',
                            border: 'none', color: '#fff', cursor: canAdvance[step] ? 'pointer' : 'not-allowed',
                            fontWeight: 700,
                        }}
                    >
                        Continue <ArrowRight size={16} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmitInitialRequest}
                        disabled={submitting || !policyAccepted}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.75rem', borderRadius: '10px',
                            background: submitting || !policyAccepted ? '#cbd5e1' : '#059669',
                            border: 'none', color: '#fff', cursor: submitting || !policyAccepted ? 'not-allowed' : 'pointer',
                            fontWeight: 700, fontSize: '1rem',
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Return Request'} {!submitting && <Check size={16} />}
                    </button>
                )}
            </div>

            {/* ── Return History Section ────────────────────────────────────── */}
            {userReturns.length > 0 && (
                <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontWeight: 800, marginBottom: '1rem' }}>Submitted Return Requests</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {userReturns.map(r => {
                            const inv = r.orders?.invoice_no
                                ? (r.orders.invoice_no.startsWith('#') ? r.orders.invoice_no : `#${r.orders.invoice_no}`)
                                : `#${String(r.order_id).replace(/^[A-Z]+-/, 'INV-')}`;

                            const isApproved = ['RETURN_APPROVED', 'APPROVED', 'CUSTOMER_SHIPPING_PENDING'].includes(r.status);
                            const isRejected = ['RETURN_REJECTED', 'REJECTED'].includes(r.status);
                            const isShipped = ['CUSTOMER_SHIPPED', 'IN_TRANSIT', 'RECEIVED_BY_COMPANY', 'UNDER_INSPECTION', 'INSPECTION_APPROVED', 'REFUND_PROCESSING', 'REFUND_COMPLETED', 'EXCHANGE_PROCESSING', 'EXCHANGE_SHIPPED', 'EXCHANGE_DELIVERED', 'COMPLETED'].includes(r.status);
                            const shipData = r.return_shipping || null;

                            return (
                                <div key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                    <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {r.return_id && <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.9rem' }}>{r.return_id}</span>}
                                                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Order {inv}</span>
                                                <StatusBadge status={r.status} />
                                            </div>
                                            <div style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 600, marginTop: '0.3rem' }}>
                                                {r.products?.name || 'Product'} • {r.type || r.request_type || 'RETURN'} • {r.reason}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                                                Requested Date: {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {/* Prominent Action Button for APPROVED returns */}
                                            {isApproved && (
                                                <button
                                                    onClick={() => setShippingModalReturn(r)}
                                                    style={{
                                                        padding: '0.6rem 1.25rem', borderRadius: '10px',
                                                        background: '#059669', color: '#fff', border: 'none',
                                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                        boxShadow: '0 4px 12px rgba(5,150,105,0.25)',
                                                    }}
                                                >
                                                    <Truck size={16} /> I've Shipped the Product
                                                </button>
                                            )}

                                            <button
                                                onClick={() => fetchTimeline(r.id)}
                                                style={{ padding: '0.55rem 0.95rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}
                                            >
                                                {expandedHistory === r.id ? '▲ Hide Timeline' : '▼ Timeline'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Approved Alert Banner */}
                                    {isApproved && (
                                        <div style={{ background: '#ecfdf5', borderTop: '1px solid #a7f3d0', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontSize: '0.85rem', fontWeight: 600 }}>
                                                <CheckCircle size={16} />
                                                <span>✓ Return Approved! Please ship the product to our company address and enter your courier tracking details.</span>
                                            </div>
                                            <button
                                                onClick={() => setShippingModalReturn(r)}
                                                style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', background: '#047857', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                                            >
                                                Enter Courier Details →
                                            </button>
                                        </div>
                                    )}

                                    {/* Rejected Alert Banner */}
                                    {isRejected && (
                                        <div style={{ background: '#fef2f2', borderTop: '1px solid #fecaca', padding: '0.85rem 1.25rem', color: '#991b1b', fontSize: '0.85rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                                <XCircle size={16} color="#dc2626" />
                                                <span>Request Rejected by Admin</span>
                                            </div>
                                            {r.rejection_reason && (
                                                <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', color: '#b91c1c' }}>
                                                    Reason: {r.rejection_reason}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Customer Courier Shipping Summary Banner */}
                                    {shipData && (
                                        <div style={{ background: '#f4f4f5', borderTop: '1px solid #e4e4e7', padding: '0.85rem 1.25rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                                            <div><span style={{ color: '#71717a' }}>Courier:</span> <strong>{shipData.courier_company_name}</strong></div>
                                            <div><span style={{ color: '#71717a' }}>AWB / Tracking:</span> <strong style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{shipData.tracking_number}</strong></div>
                                            <div><span style={{ color: '#71717a' }}>Shipped Date:</span> <strong>{new Date(shipData.shipping_date).toLocaleDateString('en-IN')}</strong></div>
                                            {shipData.shipping_cost && <div><span style={{ color: '#71717a' }}>Cost:</span> <strong>₹{shipData.shipping_cost}</strong></div>}
                                            {shipData.receipt_url && (
                                                <a href={shipData.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#059669', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', marginLeft: 'auto' }}>
                                                    View Receipt →
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Timeline Drawer */}
                                    {expandedHistory === r.id && (
                                        <div style={{ padding: '1.25rem', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                                            <ReturnTimeline logs={historyData[r.id]} />
                                            {!historyData[r.id] && <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading timeline...</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ─── POST-APPROVAL COURIER SHIPPING MODAL ───────────────────────── */}
            {shippingModalReturn && (
                <ModalPortal>
                    <div
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                            backdropFilter: 'blur(4px)'
                        }}
                        onClick={() => setShippingModalReturn(null)}
                    >
                        <div
                            style={{
                                background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '580px',
                                maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                                border: '1px solid #e2e8f0'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Truck size={20} color="hsl(var(--primary))" /> Submit Return Shipping Details
                                    </h3>
                                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                                        Return ID: <strong>{shippingModalReturn.return_id || `#${shippingModalReturn.id}`}</strong>
                                    </p>
                                </div>
                                <button onClick={() => setShippingModalReturn(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleShippingSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                
                                {/* Company Return Address Display */}
                                <div style={{ background: '#eef2ff', borderRadius: '12px', padding: '1rem', border: '1px solid #c7d2fe' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                        📍 Send Package To This Address:
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#1e1b4b', lineHeight: 1.5, fontWeight: 600 }}>
                                        VAIYAAREE SAREES<br />
                                        12/34 Saree Avenue, Main Road, Chennai, Tamil Nadu - 600001, India
                                    </div>
                                </div>

                                {/* Courier Company Dropdown */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        COURIER COMPANY *
                                    </label>
                                    <select
                                        value={shippingForm.courierCompanyName}
                                        onChange={e => {
                                            const name = e.target.value;
                                            const found = couriersList.find(c => c.name === name);
                                            setShippingForm(f => ({ ...f, courierCompanyName: name, courierCompanyId: found?.id || '' }));
                                        }}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontWeight: 600 }}
                                        required
                                    >
                                        {couriersList.length > 0 ? (
                                            couriersList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                                        ) : (
                                            <>
                                                <option value="DTDC">DTDC</option>
                                                <option value="Delhivery">Delhivery</option>
                                                <option value="Blue Dart">Blue Dart</option>
                                                <option value="India Post">India Post</option>
                                                <option value="Professional Couriers">Professional Couriers</option>
                                                <option value="Ecom Express">Ecom Express</option>
                                                <option value="Ekart">Ekart</option>
                                                <option value="Other">Other Courier</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                {/* Tracking / AWB Number */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        COURIER TRACKING / AWB NUMBER *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. D123456789 or 147852369"
                                        value={shippingForm.trackingNumber}
                                        onChange={e => setShippingForm(f => ({ ...f, trackingNumber: e.target.value }))}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                                        required
                                    />
                                    <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                        Enter the tracking number shown on your courier receipt.
                                    </p>
                                </div>

                                {/* Shipping Date & Shipping Cost */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            SHIPPING DATE *
                                        </label>
                                        <input
                                            type="date"
                                            value={shippingForm.shippingDate}
                                            onChange={e => setShippingForm(f => ({ ...f, shippingDate: e.target.value }))}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            SHIPPING COST (₹) <span style={{ color: '#94a3b8', fontWeight: 500 }}>(OPTIONAL)</span>
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 120"
                                            value={shippingForm.shippingCost}
                                            onChange={e => setShippingForm(f => ({ ...f, shippingCost: e.target.value }))}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                {/* Upload Courier Receipt */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        UPLOAD COURIER RECEIPT *
                                    </label>
                                    <div
                                        onClick={() => receiptInputRef.current?.click()}
                                        style={{
                                            border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '1.25rem',
                                            textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem'
                                        }}
                                    >
                                        <Upload size={24} style={{ opacity: 0.5 }} />
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>
                                            {shippingForm.uploadingReceipt ? 'Uploading receipt...' : shippingForm.receiptUrl ? '✅ Receipt Uploaded (Click to replace)' : 'Click to upload receipt photo/PDF'}
                                        </span>
                                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>JPG, PNG, PDF • Max 5MB</span>
                                        <input
                                            ref={receiptInputRef}
                                            type="file"
                                            accept="image/*,application/pdf"
                                            style={{ display: 'none' }}
                                            onChange={e => e.target.files?.[0] && handleReceiptUpload(e.target.files[0])}
                                        />
                                    </div>
                                    {shippingForm.receiptPreview && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <img src={shippingForm.receiptPreview} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                            <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>Receipt attached</span>
                                        </div>
                                    )}
                                </div>

                                {/* Additional Notes */}
                                <div>
                                    <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        ADDITIONAL NOTES <span style={{ color: '#94a3b8', fontWeight: 500 }}>(OPTIONAL)</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Any additional info about the package..."
                                        value={shippingForm.notes}
                                        onChange={e => setShippingForm(f => ({ ...f, notes: e.target.value }))}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', resize: 'vertical', boxSizing: 'border-box' }}
                                    />
                                </div>

                                {shippingError && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: '#fee2e2', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem' }}>
                                        <AlertCircle size={16} /> {shippingError}
                                    </div>
                                )}

                                {/* Modal Actions */}
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShippingModalReturn(null)}
                                        style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={shippingSubmitLoading || shippingForm.uploadingReceipt}
                                        style={{
                                            padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none',
                                            background: shippingSubmitLoading ? '#cbd5e1' : '#059669',
                                            color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: shippingSubmitLoading ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {shippingSubmitLoading ? 'Submitting...' : 'Submit Shipping Details →'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}
