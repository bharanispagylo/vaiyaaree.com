'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FileText, Download, Calendar, MapPin, Tag, Filter, ChevronLeft, Loader2, ArrowLeft, Search, RefreshCw, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

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
    const [viewInvoice, setViewInvoice] = useState(null);
    const [notification, setNotification] = useState(null); // { message, type }

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch categories
                const { data: catData } = await supabase.from('products').select('category').not('category', 'is', null);
                const uniqueCats = [...new Set(catData.map(p => p.category))].sort();
                setCategories(uniqueCats);

                // Fetch locations (states)
                const { data: locData } = await supabase.from('orders').select('shipping_state').not('shipping_state', 'is', null);
                const uniqueLocs = [...new Set(locData.map(o => o.shipping_state))].sort();
                setLocations(uniqueLocs);

                await fetchReportData();
            } catch (error) {
                console.error('Error fetching initial data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            let query = supabase.from('orders').select('*').neq('status', 'DRAFT');

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
                const { data: items } = await supabase
                    .from('order_items')
                    .select('order_id, product_id, products(category)')
                    .eq('products.category', selectedCategory);

                const orderIdsWithCategory = [...new Set(items.filter(i => i.products).map(i => i.order_id))];
                finalOrders = finalOrders.filter(o => orderIdsWithCategory.includes(o.id));
            }

            setOrders(finalOrders);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData();
    }, [timeframe, selectedLocation, selectedCategory, customStartDate, customEndDate]);

    const downloadReport = () => {
        // Summary Data
        const summaryData = [
            { 'Metric': 'Total Revenue', 'Value': `₹${metrics.totalRevenue.toLocaleString()}` },
            { 'Metric': 'Total Orders', 'Value': metrics.orderCount },
            { 'Metric': 'Average Order Value', 'Value': `₹${metrics.avgTicket.toFixed(2)}` },
            { 'Metric': '', 'Value': '' } // Spacer
        ];

        const reportData = orders.map(o => ({
            'Invoice ID': `INV-${o.id}`,
            'Date': new Date(o.created_at).toLocaleDateString(),
            'Customer': o.customer_name,
            'Phone': o.customer_phone,
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

    const handleDownloadAuditPDF = async () => {
        setLoading(true);
        try {
            const { generateAuditPDF } = await import('@/lib/auditGenerator');

            // Fetch products for stock details
            const { data: products } = await supabase.from('products').select('name, stock, price, category');

            const pdfBlob = await generateAuditPDF({
                timeframe,
                orders: filteredOrders,
                products: products || [],
                metrics: metrics
            });

            const url = window.URL.createObjectURL(new Blob([pdfBlob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Audit PDF Error:', error);
            setNotification({ message: 'Failed to generate Audit PDF. See console.', type: 'error' });
            setTimeout(() => setNotification(null), 3500);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesStatusFilter = reportStatusFilter === 'ALL' ? true : o.status === reportStatusFilter;
        return (
            (!['CANCELLED', 'REFUNDED'].includes(o.status)) &&
            matchesStatusFilter &&
            (o.id.toString().includes(searchTerm) ||
            o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customer_phone?.includes(searchTerm))
        );
    });

    const metrics = {
        totalRevenue: filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
        orderCount: filteredOrders.length,
        avgTicket: filteredOrders.length > 0 ? (filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) / filteredOrders.length) : 0
    };

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
                        onClick={handleDownloadAuditPDF}
                        disabled={filteredOrders.length === 0 || loading}
                        className="btn btn-secondary"
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, background: '#f1f5f9', color: 'hsl(var(--text-main))' }}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} Audit PDF
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
                            <DollarSign size={20} />
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
                        Showing {filteredOrders.length} Results
                    </div>
                    {loading && <RefreshCw size={16} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />}
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Invoice</th>
                                <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Customer</th>
                                <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Location</th>
                                <th style={{ textAlign: 'right', padding: '1rem 1.5rem' }}>Total</th>
                                <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>Status</th>
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
                                filteredOrders.map(o => (
                                    <tr key={o.id} style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>INV-{o.id}</td>
                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{o.customer_phone}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem' }}>{o.shipping_state || 'N/A'}</td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 800 }}>₹{o.total_amount.toLocaleString()}</td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: '99px',
                                                background: o.status === 'DELIVERED' || o.status === 'PAID' ? 'hsl(var(--primary))' : 'hsl(var(--bg-app))',
                                                color: o.status === 'DELIVERED' || o.status === 'PAID' ? 'white' : 'hsl(var(--text-main))',
                                                border: `1px solid ${o.status === 'DELIVERED' || o.status === 'PAID' ? 'transparent' : 'hsl(var(--border-subtle))'}`
                                            }}>{o.status}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
            <style jsx>{`
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}
