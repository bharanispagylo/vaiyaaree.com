'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Search, Loader2, FileText, Download, Eye, Printer, MessageCircle, Settings, MapPin, Hash, Info, X, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [notification, setNotification] = useState(null);
    const [invoicePage, setInvoicePage] = useState(1);
    const INVOICES_PER_PAGE = 20;
    const [settings, setSettings] = useState({
        shop_name: 'Cast Printz',
        shop_logo: '',
        shop_address: '',
        shop_gstin: '',
        bill_terms: '',
        bill_footer: 'Thank you for shopping with us!',
        business_phone: '15551678232'
    });

    useEffect(() => {
        const fetchInvoices = async () => {
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('orders')
                    .select('*')
                    .neq('status', 'DRAFT')
                    .order('created_at', { ascending: false });
                setInvoices(data || []);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchSettings = async () => {
            try {
                const { data } = await supabase.from('app_settings').select('*');
                if (data) {
                    const mapped = {};
                    data.forEach(item => mapped[item.key] = item.value);
                    setSettings(prev => ({ ...prev, ...mapped }));
                }
            } catch (err) {
                console.error('Settings load error:', err);
            }
        };

        fetchInvoices();
        fetchSettings();
    }, []);

    // Reset page when search changes
    useEffect(() => { setInvoicePage(1); }, [searchTerm]);

    const formatAddress = (addr) => {
        if (!addr) return "";
        try {
            if (typeof addr === 'string') {
                if (addr.startsWith('{') && addr.endsWith('}')) {
                    const parsed = JSON.parse(addr);
                    const parts = [
                        parsed.name,
                        parsed.address,
                        parsed.city,
                        parsed.state,
                        parsed.pincode
                    ].filter(Boolean);
                    return parts.join(', ');
                }
                return addr;
            }
            if (typeof addr === 'object') {
                const parts = [
                    addr.name,
                    addr.address,
                    addr.city,
                    addr.state,
                    addr.pincode
                ].filter(Boolean);
                return parts.join(', ');
            }
        } catch (e) {
            return String(addr);
        }
        return String(addr);
    };

    const openInvoice = async (order) => {
        setSelectedInvoice(order);
        const { data } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
        setInvoiceItems(data || []);
    };

    const printInvoice = () => {
        window.print();
    };

    const getStatusReference = (status) => {
        switch (status) {
            case 'PAID': case 'DELIVERED': return 'badge-delivered';
            case 'PLACED': case 'PENDING': return 'badge-placed';
            default: return 'badge';
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customer_phone?.includes(searchTerm)
    );

    const totalInvoicePages = Math.ceil(filteredInvoices.length / INVOICES_PER_PAGE);
    const paginatedInvoices = filteredInvoices.slice((invoicePage - 1) * INVOICES_PER_PAGE, invoicePage * INVOICES_PER_PAGE);

    const activeOrders = invoices.filter(o => o.status !== 'CANCELLED');
    const totalRevenue = activeOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const paidInvoices = invoices.filter(o => ['PAID', 'DELIVERED', 'SHIPPED'].includes(o.status));
    const paidTotal = paidInvoices.reduce((s, o) => s + (o.total_amount || 0), 0);
    const unpaidTotal = totalRevenue - paidTotal;

    if (loading && !selectedInvoice) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading Invoices...
            </div>
        );
    }

    return (
        <div className="animate-enter">
            {/* Header */}
            {!selectedInvoice && (
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'
                }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Invoices</h1>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'hsl(var(--text-muted))' }}>Manage and generate professional invoices for Cast Printz orders</p>
                    </div>
                    <Link
                        href="/admin/invoices/settings"
                        className="btn btn-secondary"
                        style={{ background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', padding: '0.75rem 1.75rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, transition: 'all 0.2s', textDecoration: 'none', color: 'hsl(var(--text-main))' }}
                    >
                        <Settings size={18} /> Customize Template <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    </Link>
                </div>
            )}

            {notification && (
                <div style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 1100, background: 'hsl(142 70% 45%)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                    <CheckCircle2 size={20} /> {notification.message}
                </div>
            )}

            {/* Revenue Cards */}
            {!selectedInvoice && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Billed</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', fontFamily: 'var(--font-heading)', color: 'hsl(var(--text-main))' }}>₹{totalRevenue.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--success))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'hsl(var(--success))', fontFamily: 'var(--font-heading)' }}>₹{paidTotal.toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--warning))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unpaid (COD)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'hsl(var(--warning))', fontFamily: 'var(--font-heading)' }}>₹{unpaidTotal.toLocaleString()}</div>
                    </div>
                </div>
            )}

            {/* Invoice List */}
            {!selectedInvoice && (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                        <div style={{ position: 'relative', maxWidth: '400px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <input
                                type="text" placeholder="Search invoices..."
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="admin-input"
                                style={{ paddingLeft: '2.75rem' }}
                            />
                        </div>
                    </div>

                    <table style={{ margin: 0 }}>
                        <thead style={{ background: '#f1f5f9' }}>
                            <tr style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                <th style={{ textAlign: 'center' }}>Payment</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'left' }}>Date</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No invoices found.</td></tr>
                            ) : (
                                paginatedInvoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <FileText size={16} style={{ color: 'hsl(var(--primary))' }} />
                                                <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>INV-{inv.id}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>{inv.customer_name || 'WhatsApp Customer'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{inv.customer_phone}</div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'hsl(var(--text-main))' }}>₹{(inv.total_amount || 0).toLocaleString()}</td>
                                        <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{inv.payment_method || '—'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${getStatusReference(inv.status)}`}>{inv.status}</span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                            {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button onClick={() => openInvoice(inv)}
                                                className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                                <Eye size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalInvoicePages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.25rem', borderTop: '1px solid hsl(var(--border-subtle))' }}>
                            <button onClick={() => setInvoicePage(p => Math.max(1, p - 1))} disabled={invoicePage === 1} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: invoicePage === 1 ? 0.4 : 1 }}>← Prev</button>
                            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Page {invoicePage} of {totalInvoicePages} &nbsp;·&nbsp; {filteredInvoices.length} invoices</span>
                            <button onClick={() => setInvoicePage(p => Math.min(totalInvoicePages, p + 1))} disabled={invoicePage === totalInvoicePages} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: invoicePage === totalInvoicePages ? 0.4 : 1 }}>Next →</button>
                        </div>
                    )}
                </div>
            )}

            {/* ────── INVOICE VIEW (FULL PAGE) ────── */}
            {selectedInvoice && (
                <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>
                                ← Back to Invoices
                            </button>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={printInvoice} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
                                    <Printer size={18} /> Print Invoice
                                </button>
                                <a href={`https://wa.me/${selectedInvoice.customer_phone}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', background: 'hsl(var(--primary))20', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))40' }}>
                                    <MessageCircle size={18} /> Send via WhatsApp
                                </a>
                            </div>
                        </div>

                        <div id="printable-invoice" style={{
                            background: 'white', borderRadius: '1rem', width: '210mm', minHeight: '297mm',
                            margin: '0 auto', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', overflow: 'hidden',
                            color: 'black', fontFamily: 'var(--font-roboto)'
                        }}>
                            {/* Invoice Header */}
                            <div style={{ padding: '3rem', borderBottom: '3px solid hsl(var(--primary))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        {settings.shop_logo ? (
                                            <img src={settings.shop_logo.startsWith('http') || settings.shop_logo.startsWith('/') ? settings.shop_logo : `/images/${settings.shop_logo}`} 
                                                alt="Logo" 
                                                style={{ height: '40px', objectFit: 'contain' }}
                                                onError={(e) => { e.target.src = '/images/cp-logo.png'; }}
                                            />
                                        ) : (
                                            <img src="/images/cp-logo.png" 
                                                alt="Logo" 
                                                style={{ height: '40px', objectFit: 'contain' }}
                                                onError={(e) => { e.target.src = '/images/aiswarya-logo.png'; }}
                                            />
                                        )}
                                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: '#111827' }}>{settings.shop_name}</h1>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0, maxWidth: '300px' }}>{settings.shop_address || 'Premium Textiles'}</p>
                                    {settings.shop_gstin && <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>GSTIN: {settings.shop_gstin}</p>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>INVOICE</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.25rem', color: '#374151' }}>#{selectedInvoice.id}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                        {new Date(selectedInvoice.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                            </div>

                            {/* Bill To */}
                            <div style={{ padding: '2rem 3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Bill To</div>
                                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{selectedInvoice.customer_name || 'WhatsApp Customer'}</div>
                                    <div style={{ fontSize: '0.9rem', color: '#4b5563', marginTop: '0.25rem' }}>{selectedInvoice.customer_phone}</div>
                                    
                                    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Billing Address</div>
                                            <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.5' }}>
                                                {formatAddress(selectedInvoice.billing_address || selectedInvoice.delivery_address) || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Shipping Address</div>
                                            <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.5' }}>
                                                {formatAddress(selectedInvoice.shipping_address || selectedInvoice.delivery_address) || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payment Info</div>
                                    <div style={{ fontSize: '0.9rem', color: '#374151' }}>Method: <strong>{selectedInvoice.payment_method || 'N/A'}</strong></div>
                                    <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: '#374151' }}>
                                        Status: <span style={{
                                            padding: '0.15rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                                            background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', textTransform: 'uppercase'
                                        }}>{selectedInvoice.status}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div style={{ padding: '0 3rem' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                                            <th style={{ padding: '0.75rem 0', textAlign: 'left', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Item</th>
                                            <th style={{ padding: '0.75rem 0', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Qty</th>
                                            <th style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Price</th>
                                            <th style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoiceItems.length === 0 ? (
                                            <tr><td colSpan={5} style={{ padding: '1.5rem 0', textAlign: 'center', color: '#9ca3af' }}>No items recorded</td></tr>
                                        ) : (
                                            invoiceItems.map((item, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '1rem 0', color: '#9ca3af' }}>{i + 1}</td>
                                                    <td style={{ padding: '1rem 0', fontWeight: 500, color: '#111827' }}>{item.product_name}</td>
                                                    <td style={{ padding: '1rem 0', textAlign: 'center', color: '#374151' }}>{item.quantity}</td>
                                                    <td style={{ padding: '1rem 0', textAlign: 'right', color: '#374151' }}>₹{(item.price_at_time || 0).toLocaleString()}</td>
                                                    <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600, color: '#111827' }}>₹{((item.price_at_time || 0) * item.quantity).toLocaleString()}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Total */}
                            <div style={{ padding: '2rem 3rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1.5rem', background: '#f9fafb', borderRadius: '0.75rem' }}>
                                    <div style={{ textAlign: 'right', width: '100%', maxWidth: '300px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#6b7280' }}>Subtotal:</span>
                                                <span style={{ fontWeight: 600 }}>₹{(selectedInvoice.subtotal || (selectedInvoice.total_amount - (selectedInvoice.tax_amount || 0) - (selectedInvoice.shipping_cost || 0))).toLocaleString()}</span>
                                            </div>
                                            {selectedInvoice.cgst > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#6b7280' }}>CGST (2.5%):</span>
                                                    <span style={{ fontWeight: 600 }}>₹{parseFloat(selectedInvoice.cgst).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedInvoice.sgst > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#6b7280' }}>SGST (2.5%):</span>
                                                    <span style={{ fontWeight: 600 }}>₹{parseFloat(selectedInvoice.sgst).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedInvoice.igst > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#6b7280' }}>IGST (5%):</span>
                                                    <span style={{ fontWeight: 600 }}>₹{parseFloat(selectedInvoice.igst).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {((!selectedInvoice.cgst && !selectedInvoice.sgst && !selectedInvoice.igst) && selectedInvoice.tax_amount > 0) && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#6b7280' }}>Tax:</span>
                                                    <span style={{ fontWeight: 600 }}>₹{parseFloat(selectedInvoice.tax_amount).toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#6b7280' }}>Shipping:</span>
                                                <span style={{ fontWeight: 600 }}>₹{(selectedInvoice.shipping_cost || 0).toLocaleString()}</span>
                                            </div>
                                            <div style={{ height: '1px', background: '#e5e7eb', margin: '0.5rem 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Grand Total:</span>
                                                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>₹{(selectedInvoice.total_amount || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Terms & Footer */}
                            <div style={{ padding: '0 3rem 4rem 3rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                                <div>
                                    {settings.bill_terms && (
                                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', fontSize: '0.8rem', color: '#6b7280' }}>
                                            <strong>Terms:</strong> {settings.bill_terms}
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#4b5563', margin: 0 }}>{settings.bill_footer}</p>
                                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>WhatsApp: +{settings.business_phone || '1 555 167 8232'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media print {
                    body * { visibility: hidden; }
                    #printable-invoice, #printable-invoice * { visibility: visible; }
                    #printable-invoice { 
                        position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; 
                        box-shadow: none !important; border-radius: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
