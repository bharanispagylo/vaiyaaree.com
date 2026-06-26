'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Search, Loader2, FileText, Download, Eye, Printer, MessageCircle, Settings, MapPin, Hash, Info, X, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const numberToWords = (num) => {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str ? 'Rupees ' + str.trim() + ' Only' : 'Zero';
};

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
                            background: 'white', width: '210mm', minHeight: '297mm',
                            margin: '0 auto', color: 'black', fontFamily: 'Arial, sans-serif',
                            padding: '10mm', boxSizing: 'border-box'
                        }}>
                            <div style={{ border: '1px solid black' }}>
                                {/* Top Company Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', minHeight: '80px', position: 'relative' }}>
                                    {settings.shop_logo && (
                                        <div style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }}>
                                            <img src={typeof settings.shop_logo === 'string' && (settings.shop_logo.startsWith('http') || settings.shop_logo.startsWith('/')) ? settings.shop_logo : `/images/${settings.shop_logo}`}
                                                alt="Logo" style={{ maxHeight: '80px', maxWidth: '180px', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ textAlign: 'center', width: '100%', maxWidth: '60%' }}>
                                        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 'bold', letterSpacing: '1px' }}>{settings.shop_name}</h1>
                                        {settings.shop_address && <div style={{ fontSize: '12px', marginTop: '4px', whiteSpace: 'pre-line' }}>{settings.shop_address}</div>}
                                        <div style={{ fontSize: '12px', marginTop: '2px' }}>
                                            {settings.shop_gstin && <span><strong>GSTIN:</strong> {settings.shop_gstin}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* TAX INVOICE Bar */}
                                <div style={{ borderTop: '1px solid black', borderBottom: '1px solid black', background: '#f0f0f0', padding: '5px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px' }}>
                                    TAX INVOICE
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <tbody>
                                        {/* Info Row */}
                                        <tr>
                                            <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', borderRight: '1px solid black', verticalAlign: 'top' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '5px' }}>
                                                    <div><strong>Invoice No</strong></div><div>: {selectedInvoice.id}</div>
                                                    <div><strong>Invoice Date</strong></div><div>: {new Date(selectedInvoice.created_at).toLocaleDateString('en-IN')}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', verticalAlign: 'top' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '5px' }}>
                                                    <div><strong>Payment Method</strong></div><div>: {selectedInvoice.payment_method || 'N/A'}</div>
                                                    <div><strong>Order Status</strong></div><div>: {selectedInvoice.status}</div>
                                                </div>
                                            </td>
                                        </tr>
                                        
                                        {/* Details Headers */}
                                        <tr>
                                            <td style={{ padding: '3px 5px', width: '50%', borderBottom: '1px solid black', borderRight: '1px solid black', fontWeight: 'bold', background: '#f9f9f9' }}>
                                                Billing Address :
                                            </td>
                                            <td style={{ padding: '3px 5px', width: '50%', borderBottom: '1px solid black', fontWeight: 'bold', background: '#f9f9f9' }}>
                                                Shipping Address :
                                            </td>
                                        </tr>

                                        {/* Details Content */}
                                        <tr>
                                            <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', borderRight: '1px solid black', verticalAlign: 'top' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '5px' }}>
                                                    <div><strong>Name</strong></div><div>: {selectedInvoice.customer_name}</div>
                                                    <div><strong>Address</strong></div><div>: {formatAddress(selectedInvoice.billing_address || selectedInvoice.delivery_address || selectedInvoice.shipping_address)}</div>
                                                    <div><strong>Phone</strong></div><div>: {selectedInvoice.customer_phone}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', verticalAlign: 'top' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '5px' }}>
                                                    <div><strong>Name</strong></div><div>: {selectedInvoice.customer_name}</div>
                                                    <div><strong>Address</strong></div><div>: {formatAddress(selectedInvoice.shipping_address || selectedInvoice.delivery_address || selectedInvoice.billing_address)}</div>
                                                    <div><strong>Phone</strong></div><div>: {selectedInvoice.customer_phone}</div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Items Table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#f0f0f0' }}>
                                            <th style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px', width: '5%', textAlign: 'center' }}>S.No</th>
                                            <th style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px', width: '50%', textAlign: 'left' }}>Description</th>
                                            <th style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px', width: '15%', textAlign: 'right' }}>Price</th>
                                            <th style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '5px', width: '10%', textAlign: 'center' }}>Qty</th>
                                            <th style={{ borderBottom: '1px solid black', padding: '5px', width: '20%', textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Items */}
                                        {invoiceItems.map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center', verticalAlign: 'top' }}>{i + 1}</td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', verticalAlign: 'top' }}>
                                                    {item.product_name} {item.variant_name ? `(${item.variant_name})` : ''}
                                                </td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', verticalAlign: 'top' }}>{(item.price_at_time || 0).toFixed(2)}</td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center', verticalAlign: 'top' }}>{item.quantity}</td>
                                                <td style={{ padding: '5px', textAlign: 'right', verticalAlign: 'top' }}>{((item.price_at_time || 0) * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        ))}

                                        {/* Empty space filler */}
                                        {Array.from({ length: Math.max(0, 8 - invoiceItems.length) }).map((_, i) => (
                                            <tr key={`empty-${i}`}>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', color: 'transparent' }}>.</td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ padding: '5px' }}></td>
                                            </tr>
                                        ))}
                                        
                                        {/* Additional charges */}
                                        {selectedInvoice.shipping_cost > 0 && (
                                            <tr>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>Shipping Cost:</td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ padding: '5px', textAlign: 'right' }}>{parseFloat(selectedInvoice.shipping_cost).toFixed(2)}</td>
                                            </tr>
                                        )}
                                        {selectedInvoice.cgst > 0 && (
                                            <tr>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>CGST:</td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ padding: '5px', textAlign: 'right' }}>{parseFloat(selectedInvoice.cgst).toFixed(2)}</td>
                                            </tr>
                                        )}
                                        {selectedInvoice.sgst > 0 && (
                                            <tr>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>SGST:</td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ padding: '5px', textAlign: 'right' }}>{parseFloat(selectedInvoice.sgst).toFixed(2)}</td>
                                            </tr>
                                        )}
                                        {selectedInvoice.igst > 0 && (
                                            <tr>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>IGST:</td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ padding: '5px', textAlign: 'right' }}>{parseFloat(selectedInvoice.igst).toFixed(2)}</td>
                                            </tr>
                                        )}
                                        {((!selectedInvoice.cgst && !selectedInvoice.sgst && !selectedInvoice.igst) && selectedInvoice.tax_amount > 0) && (
                                            <tr>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>Tax:</td>
                                                <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                                <td style={{ padding: '5px', textAlign: 'right' }}>{parseFloat(selectedInvoice.tax_amount).toFixed(2)}</td>
                                            </tr>
                                        )}

                                        {/* Total Row */}
                                        <tr style={{ borderTop: '1px solid black', fontWeight: 'bold' }}>
                                            <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'right' }}>Total</td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px', textAlign: 'center' }}>
                                                {invoiceItems.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                                            </td>
                                            <td style={{ padding: '5px', textAlign: 'right' }}>
                                                {parseFloat(selectedInvoice.total_amount).toFixed(2)}
                                            </td>
                                        </tr>

                                        {/* Amount in words */}
                                        <tr style={{ borderBottom: '1px solid black' }}>
                                            <td colSpan={5} style={{ padding: '5px' }}>
                                                <strong>Amount Chargeable (in words): </strong> 
                                                {numberToWords(Math.round(selectedInvoice.total_amount || 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Footer sections */}
                                <div style={{ display: 'flex' }}>
                                    <div style={{ width: '50%', borderRight: '1px solid black', padding: '5px' }}>
                                        <div style={{ paddingBottom: '2px', marginBottom: '5px', fontWeight: 'bold' }}>
                                            Terms & Conditions / Declarations :
                                        </div>
                                        <div style={{ fontSize: '11px', whiteSpace: 'pre-line' }}>
                                            {settings.bill_terms || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."}
                                        </div>
                                    </div>
                                    <div style={{ width: '50%', padding: '5px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', textAlign: 'center' }}>
                                        <div style={{ fontWeight: 'bold', width: '100%', textAlign: 'right', paddingRight: '20px' }}>For {settings.shop_name}</div>
                                        <div style={{ marginTop: '50px', fontWeight: 'bold', width: '100%', textAlign: 'right', paddingRight: '20px' }}>Authorized Signatory</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#666' }}>
                                {settings.bill_footer}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
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
