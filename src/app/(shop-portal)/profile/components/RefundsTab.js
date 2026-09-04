'use client';

import React from 'react';
import { IndianRupee, Send, Trash2, Camera, Truck, Building } from 'lucide-react';
import ProductSelectDropdown from './ProductSelectDropdown';
import { formatOrderDate } from '@/lib/dateUtils';
import styles from '../profile.module.css';

export default function RefundsTab({
    eligibleRefundProducts = [],
    refundForm,
    setRefundForm,
    handleSubmitRefund,
    handleDamagedImageUpload,
    submittingRefund,
    loadingRefunds,
    refunds = [],
    fetchRefunds
}) {
    return (
        <section className={styles.profileSection}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}><IndianRupee size={20} /> Refund Requests</h3>
                    <p className={styles.sectionSubtitle}>Request refund for products from your orders</p>
                </div>
            </div>

            {/* Refund Request Form */}
            <div className={styles.requestFormCard}>
                <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: 800 }}>Create New Refund Request</h4>
                <form onSubmit={handleSubmitRefund}>
                    <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            CHOOSE PRODUCT *
                        </label>
                        <ProductSelectDropdown 
                            products={eligibleRefundProducts}
                            selectedKey={refundForm.orderItemKey}
                            placeholder="-- Select Product for Refund --"
                            onSelect={(item) => {
                                if (!item) {
                                    setRefundForm({ ...refundForm, orderItemKey: '', amount: '' });
                                } else {
                                    setRefundForm({ ...refundForm, orderItemKey: item.key, amount: String(item.price) });
                                }
                            }}
                        />
                    </div>

                    <div className={styles.formGrid} style={{ marginBottom: '1.25rem' }}>
                        <div className={styles.formGroup}>
                            <label>REASON *</label>
                            <select 
                                value={refundForm.reason} 
                                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                            >
                                <option value="Defective Product">Defective / Damaged Item</option>
                                <option value="Wrong Product Received">Wrong Product Received</option>
                                <option value="Order Cancelled">Order Cancelled</option>
                                <option value="Billing / Payment Error">Billing / Payment Error</option>
                                <option value="Other">Other Reason</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>ELIGIBLE REFUND AMOUNT (₹)</label>
                            <input 
                                type="text" 
                                readOnly
                                value={refundForm.amount ? `₹${Number(refundForm.amount).toLocaleString('en-IN')}` : 'Select a product to view amount'} 
                                disabled
                                style={{ background: 'hsl(var(--text-main) / 0.05)', cursor: 'not-allowed', color: 'hsl(var(--primary))', fontWeight: 700 }}
                            />
                        </div>
                    </div>

                    {refundForm.reason === 'Other' && (
                        <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                            <label>SPECIFY REASON *</label>
                            <textarea 
                                rows={3} 
                                placeholder="Please specify details regarding your refund request..."
                                value={refundForm.otherReason}
                                onChange={(e) => setRefundForm({ ...refundForm, otherReason: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    {/* DAMAGED PRODUCT IMAGE UPLOAD FIELD */}
                    <div className={styles.formGroupFull} style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.6rem', fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155' }}>
                            UPLOAD DAMAGED PRODUCT IMAGE (RECOMMENDED)
                        </label>
                        {refundForm.image_url ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                                <img src={refundForm.image_url} alt="Damaged product preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Image Attached Successfully</div>
                                    <a href={refundForm.image_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'hsl(var(--primary))', fontWeight: 700, textDecoration: 'underline' }}>
                                        Preview Full Photo
                                    </a>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRefundForm(prev => ({ ...prev, image_url: '' }))}
                                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Trash2 size={15} /> Remove
                                </button>
                            </div>
                        ) : (
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleDamagedImageUpload}
                                    disabled={refundForm.uploadingImage}
                                    style={{ display: 'none' }}
                                    id="damaged_product_image_input"
                                />
                                <label
                                    htmlFor="damaged_product_image_input"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
                                        padding: '1rem', borderRadius: '12px', border: '2px dashed #cbd5e1',
                                        background: '#f8fafc', cursor: refundForm.uploadingImage ? 'not-allowed' : 'pointer',
                                        fontWeight: 700, fontSize: '0.88rem', color: '#475569', transition: 'all 0.2s'
                                    }}
                                >
                                    <Camera size={20} color="hsl(var(--primary))" />
                                    {refundForm.uploadingImage ? 'Uploading Photo...' : 'Click to Upload Photo of Damaged Product (JPG, PNG, WEBP)'}
                                </label>
                            </div>
                        )}
                    </div>

                    <button type="submit" className={styles.formSubmitBtn} disabled={submittingRefund || refundForm.uploadingImage}>
                        <Send size={16} />
                        {submittingRefund ? 'Submitting...' : 'Submit Refund Request'}
                    </button>
                </form>
            </div>

            {/* Submitted Refund Requests History */}
            <h4 style={{ margin: '1.5rem 0 1rem 0', fontWeight: 800 }}>Submitted Refund Requests History</h4>
            {loadingRefunds ? (
                <div className={styles.loadingState}>Loading refund requests...</div>
            ) : refunds.length === 0 ? (
                <div className={styles.emptyState}>
                    <IndianRupee size={40} style={{ opacity: 0.2 }} />
                    <p>No refund requests submitted yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {refunds.map(r => {
                        const displayOrderInv = r.orders?.invoice_no 
                            ? (r.orders.invoice_no.startsWith('#') ? r.orders.invoice_no : `#${r.orders.invoice_no}`)
                            : `#${String(r.order_id).replace(/^[A-Z]+-/, 'INV-')}`;

                        const refundIdDisplay = r.refund_id || `RF-${String(r.id).substring(0, 8)}`;
                        const refStatus = (r.refund_status || r.status || 'REFUND_REQUESTED').toUpperCase();
                        const amountDisplay = r.approved_amount || r.requested_amount || r.amount || 0;

                        let badgeColor = { bg: '#fef3c7', text: '#92400e', label: 'Refund Requested' };
                        if (refStatus === 'UNDER_REVIEW') badgeColor = { bg: '#fef3c7', text: '#92400e', label: 'Under Review' };
                        else if (refStatus === 'APPROVED') badgeColor = { bg: '#dbeafe', text: '#1e40af', label: 'Approved' };
                        else if (refStatus === 'RETURN_REQUIRED') badgeColor = { bg: '#fff7ed', text: '#c2410c', label: 'Return Required' };
                        else if (refStatus === 'CUSTOMER_SHIPPED') badgeColor = { bg: '#e0e7ff', text: '#3730a3', label: 'Customer Shipped' };
                        else if (refStatus === 'RETURN_RECEIVED') badgeColor = { bg: '#f0fdf4', text: '#15803d', label: 'Return Received' };
                        else if (refStatus === 'REFUND_PROCESSING') badgeColor = { bg: '#fef9c3', text: '#854d0e', label: 'Refund Processing' };
                        else if (refStatus === 'REFUNDED') badgeColor = { bg: '#dcfce7', text: '#166534', label: 'Refunded' };
                        else if (refStatus === 'REJECTED') badgeColor = { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' };
                        else if (refStatus === 'CANCELLED') badgeColor = { bg: '#f3f4f6', text: '#4b5563', label: 'Cancelled' };
                        else if (refStatus === 'REFUND_FAILED') badgeColor = { bg: '#fee2e2', text: '#991b1b', label: 'Refund Failed' };

                        const shipment = Array.isArray(r.refund_shipments) ? r.refund_shipments[0] : (r.refund_shipments || null);

                        return (
                            <div key={r.id} style={{
                                background: '#ffffff', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))',
                                padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                            }}>
                                {/* Card Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))', letterSpacing: '0.05em' }}>
                                            {refundIdDisplay}
                                        </span>
                                        <h4 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 800 }}>
                                            Invoice: {displayOrderInv}
                                        </h4>
                                        <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))' }}>
                                            Requested on {formatOrderDate(r.created_at || r.requested_at, { includeTime: false })}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '20px',
                                            background: badgeColor.bg, color: badgeColor.text
                                        }}>
                                            {badgeColor.label}
                                        </span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                            ₹{Number(amountDisplay).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>

                                {/* Details */}
                                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.85rem' }}>
                                    <strong>Reason:</strong> {r.reason || 'N/A'}
                                    {r.image_url && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <img src={r.image_url} alt="Damaged Product" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px' }} />
                                            <div>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Uploaded Damaged Product Photo</div>
                                                <a href={r.image_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'hsl(var(--primary))', textDecoration: 'underline', fontWeight: 700 }}>
                                                    View Full Photo
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    {r.customer_note && (
                                        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#64748b', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                            Note: {r.customer_note}
                                        </div>
                                    )}
                                    {r.admin_note && (
                                        <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#1e40af', background: '#eff6ff', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                                            Admin Note: {r.admin_note}
                                        </div>
                                    )}
                                </div>

                                {/* Section for RETURN_REQUIRED (Customer needs to ship saree) */}
                                {(refStatus === 'RETURN_REQUIRED' || refStatus === 'APPROVED') && (
                                    <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px', padding: '1rem', marginTop: '1rem' }}>
                                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#c2410c', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Truck size={16} /> Return Address & Shipping Required
                                        </h5>
                                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#9a3412' }}>
                                            Please ship your product to our return address below and submit courier details:
                                        </p>
                                        <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.84rem', color: '#1e293b', marginBottom: '1rem', fontWeight: 600 }}>
                                            <Building size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px', color: '#c2410c' }} />
                                            <strong>VAIYAAREE Returns Dept.</strong><br />
                                            16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015
                                        </div>

                                        {/* Shipping Submission Form */}
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const fd = new FormData(e.target);
                                            let receiptUrl = '';
                                            const file = fd.get('receipt_file');
                                            if (file && file.name && file.size > 0) {
                                                const upFd = new FormData();
                                                upFd.append('file', file);
                                                try {
                                                    const upRes = await fetch('/api/refund-requests/upload-receipt', { method: 'POST', body: upFd });
                                                    const upData = await upRes.json();
                                                    if (upData.success && upData.fileUrl) receiptUrl = upData.fileUrl;
                                                } catch (err) {
                                                    console.error('[RECEIPT-UPLOAD-ERROR]', err);
                                                }
                                            }

                                            const payload = {
                                                refundRequestId: r.id,
                                                courierName: fd.get('courier_name'),
                                                trackingNumber: fd.get('tracking_number'),
                                                shippingDate: fd.get('shipping_date'),
                                                notes: fd.get('notes'),
                                                receiptUrl
                                            };

                                            try {
                                                const res = await fetch('/api/refund-requests/submit-shipping', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(payload)
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    alert('Courier details submitted successfully!');
                                                    fetchRefunds();
                                                } else {
                                                    alert('Failed to submit courier details: ' + (data.error || 'Unknown error'));
                                                }
                                            } catch (err) {
                                                alert('Error submitting courier details: ' + err.message);
                                            }
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Courier Company *</label>
                                                    <input type="text" name="courier_name" required placeholder="e.g. DTDC, BlueDart" style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Tracking / AWB No *</label>
                                                    <input type="text" name="tracking_number" required placeholder="Tracking Number" style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Shipping Date</label>
                                                    <input type="date" name="shipping_date" defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Upload Receipt (Optional)</label>
                                                    <input type="file" name="receipt_file" accept="image/*,.pdf" style={{ fontSize: '0.8rem', width: '100%' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#9a3412', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Notes</label>
                                                    <input type="text" name="notes" placeholder="Optional notes..." style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #fdba74', fontSize: '0.82rem', background: '#fff' }} />
                                                </div>
                                            </div>

                                            <button type="submit" style={{ background: '#c2410c', color: '#fff', border: 'none', padding: '0.45rem 1.25rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                Submit Courier Details
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {/* Section for CUSTOMER_SHIPPED */}
                                {shipment && (
                                    <div style={{ background: '#e0e7ff', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#3730a3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <strong>Courier:</strong> {shipment.courier_company || 'N/A'} • <strong>Tracking:</strong> {shipment.tracking_number || 'N/A'}
                                            {shipment.shipping_date && <span> • <strong>Date:</strong> {shipment.shipping_date}</span>}
                                        </div>
                                        {shipment.receipt_url && (
                                            <a href={shipment.receipt_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3730a3', fontWeight: 700, textDecoration: 'underline' }}>
                                                View Receipt
                                            </a>
                                        )}
                                    </div>
                                )}

                                {/* Section for REFUNDED */}
                                {refStatus === 'REFUNDED' && (
                                    <div style={{ background: '#dcfce7', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                                        ✅ Refund Completed! ₹{Number(amountDisplay).toLocaleString('en-IN')} has been returned to your original payment method.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
