'use client';

import { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { FileText, Download, Calendar, MapPin, Tag, Filter, ChevronLeft, ChevronRight, Loader2, ArrowLeft, Search, RefreshCw, TrendingUp, IndianRupee, ShoppingCart, Printer, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

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

export default function InvoiceReportPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);

    // Filters
    const [timeframe, setTimeframe] = useState('MONTH'); // 7DAYS, MONTH, QUARTER, YEAR, ALL, CUSTOM
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('ALL');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [notification, setNotification] = useState(null); // { message, type }
    const [reportPage, setReportPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

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
                const { data } = await mysqlClient.from('app_settings').select('*');
                if (data) {
                    const mapped = {};
                    data.forEach(item => mapped[item.key] = item.value);
                    setSettings(prev => ({ ...prev, ...mapped }));
                }
            } catch (err) {
                console.error('Settings load error:', err);
            }
        };

        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch categories
                const { data: catData } = await mysqlClient.from('products').select('category').not('category', 'is', null);
                const uniqueCats = [...new Set((catData || []).map(p => p.category))].sort();
                setCategories(uniqueCats);

                // Fetch locations (states)
                const { data: locData } = await mysqlClient.from('orders').select('shipping_state').not('shipping_state', 'is', null);
                const uniqueLocs = [...new Set((locData || []).map(o => o.shipping_state))].sort();
                setLocations(uniqueLocs);

                await fetchReportData();
            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
        fetchInitialData();
    }, []);

    const openInvoice = async (order) => {
        setSelectedInvoice(order);
        try {
            const { data, error } = await mysqlClient
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

    const fetchReportData = async () => {
        setLoading(true);
        try {
            let query = mysqlClient.from('orders').select('*').neq('status', 'DRAFT');

            // Apply Timeframe Filter
            const now = new Date();
            let startDate = new Date();
            if (timeframe === '7DAYS') {
                startDate.setDate(now.getDate() - 7);
                query = query.gte('created_at', startDate.toISOString());
            } else if (timeframe === 'MONTH') {
                startDate.setMonth(now.getMonth() - 1);
                query = query.gte('created_at', startDate.toISOString());
            } else if (timeframe === 'QUARTER') {
                startDate.setMonth(now.getMonth() - 3);
                query = query.gte('created_at', startDate.toISOString());
            } else if (timeframe === 'YEAR') {
                startDate.setFullYear(now.getFullYear() - 1);
                query = query.gte('created_at', startDate.toISOString());
            } else if (timeframe === 'CUSTOM' && customStartDate && customEndDate) {
                query = query.gte('created_at', new Date(customStartDate).toISOString())
                    .lte('created_at', new Date(customEndDate).toISOString());
            }

            // Apply Location Filter
            if (selectedLocation !== 'ALL') {
                query = query.eq('shipping_state', selectedLocation);
            }

            const { data: orderData, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;

            let finalOrders = orderData || [];

            // Apply Category Filter (Needs to check order_items)
            if (selectedCategory !== 'ALL') {
                const { data: items } = await mysqlClient
                    .from('order_items')
                    .select('order_id, product_id, products(category)')
                    .eq('products.category', selectedCategory);

                const orderIdsWithCategory = [...new Set(items.filter(i => i.products).map(i => i.order_id))];
                finalOrders = finalOrders.filter(o => orderIdsWithCategory.includes(o.id));
            }

            const enrichedOrders = await Promise.all(finalOrders.map(async (o) => {
                if (o.invoice_no) return o;
                const { count: c } = await mysqlClient
                    .from('orders')
                    .select('id', { count: 'exact', head: true })
                    .neq('status', 'DRAFT')
                    .lte('created_at', o.created_at);

                return {
                    ...o,
                    invoice_no: o.invoice_no || (o.id ? String(o.id).replace(/^[A-Z]+-/, 'INV-') : `INV-${String(c || 1).padStart(4, '0')}`)
                };
            }));

            setOrders(enrichedOrders);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [timeframe, selectedLocation, selectedCategory, customStartDate, customEndDate]);

    useEffect(() => {
        setReportPage(1);
    }, [timeframe, selectedLocation, selectedCategory, reportStatusFilter, searchTerm, customStartDate, customEndDate]);

    const downloadReport = () => {
        // Summary Data
        const summaryData = [
            { 'Metric': 'Total Revenue', 'Value': `₹${metrics.totalRevenue.toLocaleString()}` },
            { 'Metric': 'Total Orders', 'Value': metrics.orderCount },
            { 'Metric': 'Average Order Value', 'Value': `₹${metrics.avgTicket.toFixed(2)}` },
            { 'Metric': '', 'Value': '' } // Spacer
        ];

        const reportData = orders.map((o, idx) => ({
            'Invoice No': o.invoice_no || (o.id ? String(o.id).replace(/^[A-Z]+-/, 'INV-') : `INV-${String(orders.length - idx).padStart(4, '0')}`),
            'Order ID': o.id,
            'Date': new Date(o.created_at).toLocaleDateString(),
            'Customer': o.customer_name,
            'Phone': formatDisplayPhoneNumber(o.customer_phone),
            'Location': o.shipping_state || 'N/A',
            'Amount': o.total_amount,
            'Status': o.status,
            'Payment': o.payment_method
        }));

        const ws = XLSX.utils.json_to_sheet([...summaryData, ...reportData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");
        XLSX.writeFile(wb, `Invoice_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handlePreviewAuditPDF = async () => {
        setPdfLoading(true);
        try {
            const { generateAuditPDF } = await import('@/lib/auditGenerator');

            // Fetch products for stock details
            const { data: products } = await mysqlClient.from('products').select('name, stock, price, category');

            const pdfBlob = await generateAuditPDF({
                timeframe,
                orders: filteredOrders,
                products: products || [],
                metrics: metrics
            });

            const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
            setPdfPreviewUrl(url);
        } catch (error) {
            console.error('Audit PDF Error:', error);
            setNotification({ message: 'Failed to generate Audit PDF preview. See console.', type: 'error' });
            setTimeout(() => setNotification(null), 3500);
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadFromPreview = () => {
        if (!pdfPreviewUrl) return;
        const link = document.createElement('a');
        link.href = pdfPreviewUrl;
        link.setAttribute('download', `Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleClosePreview = () => {
        if (pdfPreviewUrl) {
            window.URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null);
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesStatusFilter = reportStatusFilter === 'ALL' ? true : o.status === reportStatusFilter;
        if (['CANCELLED', 'REFUNDED'].includes(o.status) || !matchesStatusFilter) return false;

        if (!searchTerm || !searchTerm.trim()) return true;

        const cleanTerm = searchTerm.trim().toLowerCase();
        const strippedHash = cleanTerm.replace(/^#+/, '').trim();
        const digitsOnly = cleanTerm.replace(/\D/g, '');

        const invNo = (o.invoice_no || '').toLowerCase();
        const id = (o.id || '').toLowerCase();
        const name = (o.customer_name || '').toLowerCase();
        const phone = (o.customer_phone || '').toLowerCase();
        const email = (o.customer_email || '').toLowerCase();
        const payment = (o.payment_method || '').toLowerCase();
        const status = (o.status || '').toLowerCase();
        const state = (o.shipping_state || '').toLowerCase();

        if (invNo.includes(cleanTerm) || (strippedHash && invNo.includes(strippedHash))) return true;
        if (id.includes(cleanTerm) || (strippedHash && id.includes(strippedHash))) return true;
        if (name.includes(cleanTerm)) return true;
        if (phone.includes(cleanTerm)) return true;
        if (email.includes(cleanTerm)) return true;
        if (payment.includes(cleanTerm)) return true;
        if (status.includes(cleanTerm)) return true;
        if (state.includes(cleanTerm)) return true;

        if (digitsOnly.length > 0) {
            const seqNumNum = parseInt(digitsOnly, 10);
            if (!isNaN(seqNumNum)) {
                const formattedInvNo = `inv-${String(seqNumNum).padStart(3, '0')}`;
                if (invNo === formattedInvNo || invNo.includes(digitsOnly)) return true;
            }
            if (id.includes(digitsOnly) || phone.includes(digitsOnly)) return true;
        }

        return false;
    });

    const totalReportPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice((reportPage - 1) * ITEMS_PER_PAGE, reportPage * ITEMS_PER_PAGE);

    const metrics = {
        totalRevenue: filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        orderCount: filteredOrders.length,
        avgTicket: filteredOrders.length > 0 ? (filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / filteredOrders.length) : 0
    };

    if (selectedInvoice) {
        return (
            <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <button onClick={() => setSelectedInvoice(null)} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))' }}>
                            <ArrowLeft size={16} /> Back to Invoice Report
                        </button>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={printInvoice} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'hsl(var(--primary))', color: 'white', cursor: 'pointer' }}>
                                <Printer size={18} /> Print Invoice
                            </button>
                            <a href={`https://wa.me/${selectedInvoice.customer_phone}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', textDecoration: 'none', border: '1px solid hsl(var(--primary) / 0.3)' }}>
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

                                    {Array.from({ length: Math.max(0, 1 - invoiceItems.length) }).map((_, i) => (
                                        <tr key={`empty-${i}`}>
                                            <td style={{ borderRight: '1px solid black', padding: '5px', color: 'transparent' }}>.</td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                            <td style={{ borderRight: '1px solid black', padding: '5px' }}></td>
                                            <td style={{ padding: '5px' }}></td>
                                        </tr>
                                    ))}
                                    
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
                                        {settings.bill_terms || "Goods once sold will not be taken back or exchanged unless defective"}
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

                <style jsx>{`
                    @media print {
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        body * {
                            visibility: hidden !important;
                        }
                        #printable-invoice, #printable-invoice * {
                            visibility: visible !important;
                        }
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
                        .no-print, .sidebar, button, .btn {
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

    return (
        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <Link href="/admin/invoices" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'hsl(var(--text-muted))', textDecoration: 'none', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <ArrowLeft size={14} /> Back to Invoices
                    </Link>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Invoice Report</h1>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'hsl(var(--text-muted))' }}>Advanced filtering and data export for business intelligence</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handlePreviewAuditPDF}
                        disabled={filteredOrders.length === 0 || pdfLoading}
                        className="btn btn-secondary"
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, background: '#f1f5f9', color: 'hsl(var(--text-main))' }}
                    >
                        {pdfLoading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} Audit PDF
                    </button>
                    <button
                        onClick={downloadReport}
                        disabled={filteredOrders.length === 0 || loading}
                        className="btn btn-primary"
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, background: 'hsl(var(--primary))', color: 'white' }}
                    >
                        <Download size={18} /> Excel Report
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="card shadow-premium" style={{ padding: '1.5rem', borderLeft: '4px solid hsl(var(--primary))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Revenue</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>₹{metrics.totalRevenue.toLocaleString()}</div>
                        </div>
                        <div style={{ background: 'hsl(var(--primary) / 0.1)', padding: '10px', borderRadius: '10px', color: 'hsl(var(--primary))' }}>
                            <IndianRupee size={20} />
                        </div>
                    </div>
                </div>
                <div className="card shadow-premium" style={{ padding: '1.5rem', borderLeft: '4px solid hsl(var(--success))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Orders</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>{metrics.orderCount}</div>
                        </div>
                        <div style={{ background: 'hsl(var(--success) / 0.1)', padding: '10px', borderRadius: '10px', color: 'hsl(var(--success))' }}>
                            <ShoppingCart size={20} />
                        </div>
                    </div>
                </div>
                <div className="card shadow-premium" style={{ padding: '1.5rem', borderLeft: '4px solid hsl(var(--warning))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg. Order Value</div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>₹{metrics.avgTicket.toFixed(0).toLocaleString()}</div>
                        </div>
                        <div style={{ background: 'hsl(var(--warning) / 0.1)', padding: '10px', borderRadius: '10px', color: 'hsl(var(--warning))' }}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Card */}
            <div className="card shadow-premium" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'hsl(var(--primary))' }}>
                    <Filter size={18} />
                    <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Filter Report Data</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>TIMEFRAME</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value)}
                                className="admin-input-select"
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                            >
                                <option value="7DAYS">Last 7 Days</option>
                                <option value="MONTH">Last 30 Days</option>
                                <option value="QUARTER">Last Quarter</option>
                                <option value="YEAR">Last Year</option>
                                <option value="CUSTOM">Custom Range</option>
                                <option value="ALL">All Time</option>
                            </select>
                        </div>
                    </div>

                    {timeframe === 'CUSTOM' && (
                        <>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>START DATE</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="admin-input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>END DATE</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="admin-input"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </>
                    )}

                    <div style={{ gridColumn: timeframe === 'CUSTOM' ? 'span 1' : 'span 1' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>LOCATION (STATE)</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <select
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="admin-input-select"
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                            >
                                <option value="ALL">All Locations</option>
                                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>PRODUCT CATEGORY</label>
                        <div style={{ position: 'relative' }}>
                            <Tag size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="admin-input-select"
                                style={{ width: '100%', paddingLeft: '2.5rem' }}
                            >
                                <option value="ALL">All Categories</option>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>ORDER STATUS</label>
                        <select
                            value={reportStatusFilter}
                            onChange={(e) => setReportStatusFilter(e.target.value)}
                            className="admin-input-select"
                            style={{ width: '100%' }}
                        >
                            <option value="ALL">All Valid Orders</option>
                            <option value="DELIVERED">Delivered Only</option>
                            <option value="PAID">Paid Only</option>
                            <option value="SHIPPED">Shipped Only</option>
                            <option value="PLACED">Placed Only</option>
                        </select>
                    </div>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>QUICK SEARCH</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Invoice ID, Name, Phone..."
                                className="admin-input"
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="card shadow-premium" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#475569', textTransform: 'uppercase' }}>
                        Showing {filteredOrders.length === 0 ? 0 : (reportPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(reportPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} Results
                    </div>
                    {loading && <RefreshCw size={16} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid hsl(var(--border-subtle))' }}>
                                <th style={{ textAlign: 'left', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Invoice</th>
                                <th style={{ textAlign: 'left', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Customer</th>
                                <th style={{ textAlign: 'left', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Location</th>
                                <th style={{ textAlign: 'right', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Total</th>
                                <th style={{ textAlign: 'center', padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '4rem', textAlign: 'center' }}>
                                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: 'hsl(var(--primary))' }} />
                                        <div style={{ marginTop: '1rem', color: 'hsl(var(--text-muted))' }}>Generating report...</div>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                                        No data found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedOrders.map((o) => {
                                    const raw = o.invoice_no || (o.id ? String(o.id).replace(/^[A-Z]+-/, 'INV-') : 'INV-0001');
                                    const seqNum = `#${String(raw).replace(/^#+/, '')}`;

                                    return (
                                        <tr 
                                            key={o.id} 
                                            onClick={() => openInvoice(o)}
                                            style={{ borderBottom: '1px solid hsl(var(--border-subtle))', cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'hsl(var(--primary) / 0.04)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 800, color: 'hsl(var(--primary))', fontSize: '0.95rem' }}>{seqNum}</div>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                                            <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(o.customer_phone)}</div>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{o.shipping_state || 'N/A'}</td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap' }}>₹{(o.total_amount || 0).toLocaleString('en-IN')}</td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: 800, padding: '4px 12px', borderRadius: '20px',
                                                    display: 'inline-block', whiteSpace: 'nowrap',
                                                    background: o.status === 'DELIVERED' || o.status === 'PAID' ? 'hsl(var(--primary))' : '#f1f5f9',
                                                    color: o.status === 'DELIVERED' || o.status === 'PAID' ? 'white' : '#475569',
                                                    border: `1px solid ${o.status === 'DELIVERED' || o.status === 'PAID' ? 'transparent' : '#cbd5e1'}`
                                                }}>{o.status}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalReportPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap' }}>
                        <button onClick={() => setReportPage(p => Math.max(1, p - 1))} disabled={reportPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: reportPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {(() => {
                                const pages = [];
                                const range = 1;
                                pages.push(1);
                                if (reportPage > range + 2) pages.push('...');
                                for (let i = Math.max(2, reportPage - range); i <= Math.min(totalReportPages - 1, reportPage + range); i++) { pages.push(i); }
                                if (reportPage < totalReportPages - range - 1) pages.push('...');
                                if (totalReportPages > 1) pages.push(totalReportPages);
                                return pages.map((page, i) => (
                                    page === '...' ? (
                                        <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                    ) : (
                                        <button key={page} onClick={() => setReportPage(page)} className="btn" style={{ minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px', background: reportPage === page ? 'hsl(var(--primary))' : '#ffffff', color: reportPage === page ? 'white' : 'hsl(var(--text-main))', border: reportPage === page ? 'none' : '1px solid hsl(var(--border-subtle))', cursor: 'pointer', transition: 'all 0.2s' }}>{page}</button>
                                    )
                                ));
                            })()}
                        </div>
                        <button onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))} disabled={reportPage === totalReportPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: reportPage === totalReportPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .shadow-premium {
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
                }
            `}</style>
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 11000,
                    padding: '1.25rem 2.25rem', borderRadius: '18px',
                    background: notification.type === 'error' ? 'hsl(var(--danger))' : 'hsl(var(--success))',
                    color: 'white', fontWeight: 800, boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    {notification.message}
                </div>
            )}
            {/* Audit PDF Preview Modal */}
            {pdfPreviewUrl && (
                <div
                    onClick={(e) => { if (e.target === e.currentTarget) handleClosePreview(); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 10000,
                        background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem', animation: 'fadeIn 0.25s ease-out'
                    }}
                >
                    <div style={{
                        background: '#ffffff', width: '96vw', maxWidth: '1250px', height: '92vh',
                        maxHeight: '94vh',
                        borderRadius: '20px', display: 'flex', flexDirection: 'column',
                        overflow: 'hidden', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#f8fafc', flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '12px', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={22} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Audit Report Preview</h3>
                                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                                        Timeframe: {timeframe} | Total Orders: {filteredOrders.length}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <button
                                    onClick={() => window.open(pdfPreviewUrl, '_blank')}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.65rem 1.15rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                                    title="Open PDF in a new tab for printing or full view"
                                >
                                    <Printer size={16} /> Open / Print
                                </button>
                                <button
                                    onClick={handleDownloadFromPreview}
                                    className="btn btn-primary"
                                    style={{ padding: '0.65rem 1.35rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, background: 'hsl(var(--primary))', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px hsl(var(--primary)/0.2)' }}
                                >
                                    <Download size={16} /> Download PDF
                                </button>
                                <button
                                    onClick={handleClosePreview}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.65rem 1.15rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', background: '#e2e8f0', color: '#334155', border: 'none' }}
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>

                        {/* Modal Body (PDF Viewer) */}
                        <div style={{ flex: 1, background: '#525659', width: '100%', height: '100%', overflow: 'hidden' }}>
                            <iframe
                                src={`${pdfPreviewUrl}#view=FitH`}
                                title="Audit PDF Preview"
                                style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
