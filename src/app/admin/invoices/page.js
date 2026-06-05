'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Search, Loader2, FileText, Download, Eye, Printer, MessageCircle, Settings, MapPin, Hash, Info, X, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [notification, setNotification] = useState(null);
    const [invoicePage, setInvoicePage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ totalRevenue: 0, paidTotal: 0, unpaidTotal: 0 });
    const INVOICES_PER_PAGE = 10;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [invoicePage]);
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
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase.from('app_settings').select('*');
                if (error) throw error;
                if (data) {
                    const mapped = {};
                    data.forEach(item => mapped[item.key] = item.value);
                    setSettings(prev => ({ ...prev, ...mapped }));
                }
            } catch (err) {
                console.error('Settings load error:', err);
            }
        };

        const fetchStats = async () => {
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('total_amount, status')
                    .neq('status', 'DRAFT');
                if (error) throw error;
                if (data) {
                    const activeOrders = data.filter(o => o.status !== 'CANCELLED');
                    const totalRevenue = activeOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
                    const paidInvoices = data.filter(o => ['PAID', 'DELIVERED', 'SHIPPED'].includes(o.status));
                    const paidTotal = paidInvoices.reduce((s, o) => s + (o.total_amount || 0), 0);
                    const unpaidTotal = totalRevenue - paidTotal;
                    setStats({ totalRevenue, paidTotal, unpaidTotal });
                }
            } catch (err) {
                console.error('Stats load error:', err);
            }
        };

        fetchSettings();
        fetchStats();
    }, []);

    useEffect(() => {
        const fetchInvoices = async () => {
            setLoading(true);
            try {
                const from = (invoicePage - 1) * INVOICES_PER_PAGE;
                const to = invoicePage * INVOICES_PER_PAGE - 1;

                let query = supabase
                    .from('orders')
                    .select('*', { count: 'exact' })
                    .neq('status', 'DRAFT');

                if (debouncedSearchTerm.trim()) {
                    const term = debouncedSearchTerm.trim();
                    const isNumeric = /^\d+$/.test(term);
                    if (isNumeric) {
                        query = query.or(`id.eq.${term},customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
                    } else {
                        query = query.or(`customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
                    }
                }

                const { data, count, error } = await query
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;
                setInvoices(data || []);
                setTotalCount(count || 0);
            } catch (error) {
                console.error('Error fetching invoices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [invoicePage, debouncedSearchTerm]);

    useEffect(() => {
        setInvoicePage(1);
    }, [debouncedSearchTerm]);

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
        try {
            const { data, error } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', order.id);
            if (error) throw error;
            setInvoiceItems(data || []);
        } catch (error) {
            console.error('Error fetching invoice items:', error);
            setInvoiceItems([]);
        }
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

    const totalInvoicePages = Math.ceil(totalCount / INVOICES_PER_PAGE);

    // Top-level loading check removed so headers stay visible

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
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', fontFamily: 'var(--font-heading)', color: 'hsl(var(--text-main))' }}>₹{(stats.totalRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--success))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'hsl(var(--success))', fontFamily: 'var(--font-heading)' }}>₹{(stats.paidTotal || 0).toLocaleString()}</div>
                    </div>
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--warning))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unpaid (COD)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'hsl(var(--warning))', fontFamily: 'var(--font-heading)' }}>₹{(stats.unpaidTotal || 0).toLocaleString()}</div>
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
                                value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); }}
                                className="admin-input"
                                style={{ paddingLeft: '2.75rem' }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                            <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading Invoices...
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <table style={{ margin: 0, width: '100%' }}>
                                <thead>
                            <tr>
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
                             {invoices.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No invoices found.</td></tr>
                            ) : (
                                invoices.map(inv => (
                                    <tr key={inv.id} onClick={() => openInvoice(inv)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--primary) / 0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>INV-{inv.id}</span>
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
                                            <button onClick={(e) => { e.stopPropagation(); openInvoice(inv); }}
                                                className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }} title="View Invoice">
                                                <Eye size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalInvoicePages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap' }}>
                            <button onClick={() => setInvoicePage(p => Math.max(1, p - 1))} disabled={invoicePage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: invoicePage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Previous
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {(() => {
                                    const pages = [];
                                    const range = 1;
                                    pages.push(1);
                                    if (invoicePage > range + 2) pages.push('...');
                                    for (let i = Math.max(2, invoicePage - range); i <= Math.min(totalInvoicePages - 1, invoicePage + range); i++) { pages.push(i); }
                                    if (invoicePage < totalInvoicePages - range - 1) pages.push('...');
                                    if (totalInvoicePages > 1) pages.push(totalInvoicePages);
                                    return pages.map((page, i) => (
                                        page === '...' ? (
                                            <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                        ) : (
                                            <button key={page} onClick={() => setInvoicePage(page)} className="btn" style={{ minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px', background: invoicePage === page ? 'hsl(var(--primary))' : '#ffffff', color: invoicePage === page ? 'white' : 'hsl(var(--text-main))', border: invoicePage === page ? 'none' : '1px solid hsl(var(--border-subtle))', cursor: 'pointer', transition: 'all 0.2s' }}>{page}</button>
                                        )
                                    ));
                                })()}
                            </div>
                            <button onClick={() => setInvoicePage(p => Math.min(totalInvoicePages, p + 1))} disabled={invoicePage === totalInvoicePages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: invoicePage === totalInvoicePages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ────── INVOICE VIEW (FULL PAGE) ────── */}
            {selectedInvoice && (
                <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
                                            <img src={typeof settings.shop_logo === 'string' && (settings.shop_logo.startsWith('http') || settings.shop_logo.startsWith('/')) ? settings.shop_logo : `/images/${settings.shop_logo}`}
                                                alt="Logo"
                                                style={{ height: '40px', objectFit: 'contain' }}
                                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/cp-logo.png'; }}
                                            />
                                        ) : (
                                            <img src="/images/cp-logo.png"
                                                alt="Logo"
                                                style={{ height: '40px', objectFit: 'contain' }}
                                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/aiswarya-logo.png'; }}
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

                            {/* Customer & Address Details */}
                            <div style={{ padding: '2rem 3rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '3rem', marginBottom: '2.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Bill To</div>
                                        <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#111827' }}>{selectedInvoice.customer_name || 'WhatsApp Customer'}</div>
                                        <div style={{ fontSize: '1rem', color: '#4b5563', marginTop: '0.25rem', fontWeight: 500 }}>+ {selectedInvoice.customer_phone}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>Payment Info</div>
                                        <div style={{ fontSize: '0.95rem', color: '#374151' }}>Payment Method: <strong style={{ color: '#111827' }}>{selectedInvoice.payment_method || 'N/A'}</strong></div>
                                        <div style={{ fontSize: '0.95rem', marginTop: '0.4rem', color: '#374151' }}>
                                            Status: <span style={{
                                                padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                                                background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', textTransform: 'uppercase', marginLeft: '0.5rem'
                                            }}>{selectedInvoice.status}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: '#f9fafb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Billing Address</div>
                                        <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.6', fontWeight: 500, wordBreak: 'break-word' }}>
                                            {formatAddress(selectedInvoice.billing_address || selectedInvoice.delivery_address) || 'No billing address provided'}
                                        </div>
                                    </div>
                                    <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '1.5rem', overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Shipping Address</div>
                                        <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.6', fontWeight: 500, wordBreak: 'break-word' }}>
                                            {formatAddress(selectedInvoice.shipping_address || selectedInvoice.delivery_address) || 'No shipping address provided'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div style={{ padding: '0 3rem' }}>
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 800, fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase', width: '50px' }}>#</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 800, fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase' }}>Item Description</th>
                                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase', width: '80px' }}>Qty</th>
                                                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase', width: '120px' }}>Rate</th>
                                                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase', width: '140px' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceItems.length === 0 ? (
                                                <tr><td colSpan={5} style={{ padding: '3rem 0', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>No items found for this order</td></tr>
                                            ) : (
                                                invoiceItems.map((item, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fcfdfe' }}>
                                                        <td style={{ padding: '1rem', color: '#9ca3af', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ fontWeight: 700, color: '#111827' }}>{item.product_name}</div>
                                                            {item.variant_name && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.15rem' }}>Variant: {item.variant_name}</div>}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'center', color: '#374151', fontWeight: 600 }}>{item.quantity}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', color: '#374151', fontWeight: 500 }}>₹{(item.price_at_time || 0).toLocaleString()}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, color: '#111827' }}>₹{((item.price_at_time || 0) * item.quantity).toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Total */}
                            <div style={{ padding: '2rem 3rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1.5rem', background: '#f9fafb', borderRadius: '0.75rem' }}>
                                    <div style={{ textAlign: 'right', width: '100%', maxWidth: '300px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#6b7280' }}>Subtotal:</span>
                                                <span style={{ fontWeight: 600 }}>₹{(selectedInvoice.subtotal || ((selectedInvoice.total_amount || 0) - (selectedInvoice.tax_amount || 0) - (selectedInvoice.shipping_cost || 0))).toLocaleString()}</span>
                                            </div>
                                            {selectedInvoice.cgst > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#6b7280' }}>CGST (2.5%):</span>
                                                    <span style={{ fontWeight: 600 }}>₹{(parseFloat(selectedInvoice.cgst) || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedInvoice.sgst > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#6b7280' }}>SGST (2.5%):</span>
                                                    <span style={{ fontWeight: 600 }}>₹{(parseFloat(selectedInvoice.sgst) || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedInvoice.igst > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#6b7280' }}>IGST (5%):</span>
                                                    <span style={{ fontWeight: 600 }}>₹{(parseFloat(selectedInvoice.igst) || 0).toLocaleString()}</span>
                                                </div>
                                            )}
                                            {((!selectedInvoice.cgst && !selectedInvoice.sgst && !selectedInvoice.igst) && selectedInvoice.tax_amount > 0) && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#6b7280' }}>Tax:</span>
                                                    <span style={{ fontWeight: 600 }}>₹{(parseFloat(selectedInvoice.tax_amount) || 0).toLocaleString()}</span>
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
                    /* Hide everything */
                    body * {
                        visibility: hidden !important;
                    }
                    /* Show ONLY the invoice and all its children */
                    #printable-invoice, #printable-invoice * {
                        visibility: visible !important;
                    }
                    /* Ensure the invoice fills the top-left corner */
                    #printable-invoice {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Force hide dashboard UI to prevent space issues */
                    .no-print, .sidebar, .admin-layout > div:first-child, button, .btn {
                        display: none !important;
                    }

                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                }
            `}</style>
        </div>
    );
}
