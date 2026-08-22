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

const formatDisplayPhoneNumber = (phone) => {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        const part1 = cleaned.substring(2, 7);
        const part2 = cleaned.substring(7);
        return `+91 ${part1} ${part2}`;
    } else if (cleaned.length === 10) {
        const part1 = cleaned.substring(0, 5);
        const part2 = cleaned.substring(5);
        return `+91 ${part1} ${part2}`;
    } else if (cleaned.startsWith('91') && cleaned.length > 10) {
        return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
    } else if (cleaned.length > 5) {
        const part1 = cleaned.substring(0, 5);
        const part2 = cleaned.substring(5);
        return `+91 ${part1} ${part2}`;
    }
    return String(phone);
};

function filterInvoices(invoicesList, rawTerm) {
    if (!rawTerm || typeof rawTerm !== 'string') return invoicesList;
    const cleanTerm = rawTerm.trim().toLowerCase();
    if (!cleanTerm) return invoicesList;

    const strippedHash = cleanTerm.replace(/^#+/, '').trim();
    const normalizedTerm = cleanTerm.replace(/[\s\-_]+/g, '');
    const digitsOnly = cleanTerm.replace(/\D/g, '');
    const termNum = digitsOnly ? parseInt(digitsOnly, 10) : null;

    return invoicesList.filter(inv => {
        const invNo = (inv.invoice_no || '').toLowerCase();
        const normalizedInvNo = invNo.replace(/[\s\-_]+/g, '');
        const id = (inv.id || '').toLowerCase();
        const normalizedId = id.replace(/[\s\-_]+/g, '');
        const name = (inv.customer_name || '').toLowerCase();
        const phone = (inv.customer_phone || '').toLowerCase();
        const email = (inv.customer_email || '').toLowerCase();
        const billingEmail = (inv.billing_email || '').toLowerCase();
        const shippingEmail = (inv.shipping_email || '').toLowerCase();
        const billingPhone = (inv.billing_phone || '').toLowerCase();
        const shippingPhone = (inv.shipping_phone || '').toLowerCase();
        const payment = (inv.payment_method || '').toLowerCase();
        const status = (inv.status || '').toLowerCase();
        const address = (typeof inv.delivery_address === 'string' ? inv.delivery_address : JSON.stringify(inv.delivery_address || '')).toLowerCase();
        const shippingState = (inv.shipping_state || '').toLowerCase();

        // 1. Direct and normalized text search
        if (invNo.includes(cleanTerm) || (strippedHash && invNo.includes(strippedHash))) return true;
        if (normalizedInvNo.includes(normalizedTerm)) return true;
        if (id.includes(cleanTerm) || (strippedHash && id.includes(strippedHash))) return true;
        if (normalizedId.includes(normalizedTerm)) return true;

        if (name.includes(cleanTerm)) return true;
        if (phone.includes(cleanTerm)) return true;
        if (email.includes(cleanTerm)) return true;
        if (billingEmail.includes(cleanTerm)) return true;
        if (shippingEmail.includes(cleanTerm)) return true;
        if (billingPhone.includes(cleanTerm)) return true;
        if (shippingPhone.includes(cleanTerm)) return true;
        if (payment.includes(cleanTerm)) return true;
        if (status.includes(cleanTerm)) return true;
        if (address.includes(cleanTerm)) return true;
        if (shippingState.includes(cleanTerm)) return true;

        // 2. Numeric sequence match e.g. "37" or "0037" or "INV-37" matching INV-0037
        if (termNum !== null && !isNaN(termNum)) {
            const invDigits = invNo.replace(/\D/g, '');
            if (invDigits) {
                const invNum = parseInt(invDigits, 10);
                if (invNum === termNum) return true;
            }
            const formattedInvNo = `inv-${String(termNum).padStart(3, '0')}`;
            if (invNo === formattedInvNo || normalizedInvNo === `inv${termNum}`) return true;
        }

        if (digitsOnly.length > 0) {
            if (id.includes(digitsOnly) || phone.includes(digitsOnly) || billingPhone.includes(digitsOnly) || shippingPhone.includes(digitsOnly)) return true;
        }

        // 3. Multi-word customer name search (e.g. "Hari Pranesh")
        const words = cleanTerm.split(/\s+/).filter(w => w.length >= 2);
        if (words.length > 1 && words.every(w => name.includes(w))) {
            return true;
        }

        return false;
    });
}

export default function InvoicesPage() {
    const [allInvoices, setAllInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [notification, setNotification] = useState(null);
    const [invoicePage, setInvoicePage] = useState(1);
    const [stats, setStats] = useState({ totalRevenue: 0, paidTotal: 0, unpaidTotal: 0 });
    const INVOICES_PER_PAGE = 10;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [invoicePage]);
    const [settings, setSettings] = useState({
        shop_name: 'Vaiyaaree',
        shop_logo: '',
        shop_address: '16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.',
        shop_gstin: '8473939083',
        bill_terms: '',
        bill_footer: 'Thank you for shopping with Vaiyaaree!',
        business_phone: '+91 86677 93292',
        company_vat_tin: '33132028969',
        company_cst_no: '1091562',
        company_pan_no: 'AAIFG6568K',
        bank_name: 'STATE BANK INDIA',
        bank_account: '170902000000962',
        bank_ifsc: 'SBI0001709',
        bank_upi: 'vaiyaaree@upi'
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
                const { data, error } = await supabase
                    .from('orders')
                    .select('*')
                    .neq('status', 'DRAFT')
                    .order('created_at', { ascending: true });

                if (error) throw error;

                const enrichedData = (data || []).map((inv, idx) => ({
                    ...inv,
                    invoice_no: inv.invoice_no || (inv.id ? String(inv.id).replace(/^[A-Z]+-/, 'INV-') : `INV-${String(idx + 1).padStart(4, '0')}`)
                })).reverse();

                setAllInvoices(enrichedData);
            } catch (error) {
                console.error('Error fetching invoices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, []);

    useEffect(() => {
        setInvoicePage(1);
    }, [searchTerm]);

    const filteredInvoices = filterInvoices(allInvoices, searchTerm);
    const totalCount = filteredInvoices.length;
    const totalInvoicePages = Math.ceil(totalCount / INVOICES_PER_PAGE) || 1;
    const invoices = filteredInvoices.slice(
        (invoicePage - 1) * INVOICES_PER_PAGE,
        invoicePage * INVOICES_PER_PAGE
    );

    const formatAddress = (addr) => {
        if (!addr) return "";
        try {
            if (typeof addr === 'string') {
                if (addr.startsWith('{') && addr.endsWith('}')) {
                    const parsed = JSON.parse(addr);
                    const street = parsed.address || parsed.address_line || parsed.street || '';
                    const parts = [
                        street,
                        parsed.city,
                        parsed.state,
                        parsed.pincode
                    ].filter(Boolean);
                    return parts.length > 0 ? parts.join(', ') : (parsed.name || addr);
                }
                return addr;
            }
            if (typeof addr === 'object') {
                const street = addr.address || addr.address_line || addr.street || '';
                const parts = [
                    street,
                    addr.city,
                    addr.state,
                    addr.pincode
                ].filter(Boolean);
                return parts.length > 0 ? parts.join(', ') : (addr.name || '');
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
                        <p style={{ margin: '0.25rem 0 0 0', color: 'hsl(var(--text-muted))' }}>Manage and generate professional invoices for Vaiyaaree orders</p>
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
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <input
                                type="text" placeholder="Search invoices by INV#, name, phone, payment..."
                                value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); }}
                                className="admin-input"
                                style={{ paddingLeft: '2.75rem', paddingRight: searchTerm ? '2.5rem' : '1rem' }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    style={{
                                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))',
                                        padding: '2px', display: 'flex', alignItems: 'center'
                                    }}
                                    title="Clear search"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {searchTerm.trim() && (
                            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                                Found <span style={{ color: 'hsl(var(--primary))', fontWeight: 800 }}>{totalCount}</span> {totalCount === 1 ? 'invoice' : 'invoices'}
                            </div>
                        )}
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
                                invoices.map((inv) => {
                                    const raw = inv.invoice_no || (inv.id ? String(inv.id).replace(/^[A-Z]+-/, 'INV-') : 'INV-0001');
                                    const seqNum = `#${String(raw).replace(/^#+/, '')}`;

                                    return (
                                        <tr key={inv.id} onClick={() => openInvoice(inv)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--primary) / 0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{ fontWeight: 800, color: 'hsl(var(--primary))', fontSize: '0.95rem' }}>{seqNum}</span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>{inv.customer_name || 'WhatsApp Customer'}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(inv.customer_phone)}</div>
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
                                    );
                                })
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

            {/*  INVOICE VIEW (FULL PAGE)  */}
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
                                                alt="Logo" style={{ maxHeight: '75px', maxWidth: '160px', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ textAlign: 'center', width: '100%', paddingLeft: settings.shop_logo ? '160px' : '0', paddingRight: settings.shop_logo ? '160px' : '0' }}>
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
                                            <td style={{ padding: '6px 8px', width: '50%', borderBottom: '1px solid black', borderRight: '1px solid black', verticalAlign: 'top' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px' }}>
                                                    <div><strong>Invoice No:</strong></div><div>{selectedInvoice.invoice_no || (selectedInvoice.id ? String(selectedInvoice.id).replace(/^[A-Z]+-/, 'INV-') : 'INV-0001')}</div>
                                                    <div><strong>Invoice Date:</strong></div><div>{new Date(selectedInvoice.created_at).toLocaleDateString('en-IN')}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 8px', width: '50%', borderBottom: '1px solid black', verticalAlign: 'top' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px' }}>
                                                    <div><strong>Payment Method:</strong></div><div>{selectedInvoice.payment_method || 'COD'}</div>
                                                    <div><strong>Order Status:</strong></div><div>{selectedInvoice.status}</div>
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
                                                    <div><strong>Phone</strong></div><div>: {formatDisplayPhoneNumber(selectedInvoice.customer_phone)}</div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '5px', width: '50%', borderBottom: '1px solid black', verticalAlign: 'top' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '5px' }}>
                                                    <div><strong>Name</strong></div><div>: {selectedInvoice.customer_name}</div>
                                                    <div><strong>Address</strong></div><div>: {formatAddress(selectedInvoice.shipping_address || selectedInvoice.delivery_address || selectedInvoice.billing_address)}</div>
                                                    <div><strong>Phone</strong></div><div>: {formatDisplayPhoneNumber(selectedInvoice.customer_phone)}</div>
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
                                        {Array.from({ length: Math.max(0, 1 - invoiceItems.length) }).map((_, i) => (
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

                                {/* Company Address & Bank Details Section */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', borderBottom: '1px solid black' }}>
                                    <thead>
                                        <tr style={{ background: '#f0f0f0', borderBottom: '1px solid black' }}>
                                            <th style={{ borderRight: '1px solid black', padding: '4px 8px', width: '50%', textAlign: 'center', fontWeight: 'bold' }}>
                                                Company Address
                                            </th>
                                            <th style={{ padding: '4px 8px', width: '50%', textAlign: 'center', fontWeight: 'bold' }}>
                                                Bank Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ borderRight: '1px solid black', padding: '6px 8px', verticalAlign: 'top', width: '50%' }}>
                                                <div style={{ lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                                                    {settings.shop_address || '16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 8px', verticalAlign: 'top', width: '50%' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '130px 10px 1fr', gap: '2px', lineHeight: '1.6' }}>
                                                    <div><strong>Bank Name</strong></div><div>:</div><div>{settings.bank_name || 'STATE BANK INDIA'}</div>
                                                    <div><strong>Bank A/C</strong></div><div>:</div><div>{settings.bank_account || '170902000000962'}</div>
                                                    <div><strong>Branch & IFSC Code</strong></div><div>:</div><div>{settings.bank_ifsc || 'SBI0001709'}</div>
                                                    <div><strong>UPI ID</strong></div><div>:</div><div>{settings.bank_upi || 'vaiyaaree@upi'}</div>
                                                </div>
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
                        margin: 5mm;
                    }
                }
            `}</style>
        </div>
    );
}
