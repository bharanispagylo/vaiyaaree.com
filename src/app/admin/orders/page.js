'use client';



import React, { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';

import {
    Search, Eye, ChevronDown,
    Loader2, MessageCircle, Truck, RefreshCw, Plus, Trash2, Download, ExternalLink, Package
} from 'lucide-react';
import { generateInvoicePDF } from '@/lib/invoiceGenerator';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Trophy, TrendingUp, ShoppingCart, CreditCard, IndianRupee } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const STATUS_OPTIONS = ['PLACED', 'PAID', 'PACKING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const SOURCE_FILTERS = ['ALL', 'WEBSITE', 'WHATSAPP'];



const getStatusReference = (status) => {

    switch (status) {

        case 'PLACED': return 'badge-placed';

        case 'PENDING': return 'badge-placed';

        case 'PAID': return 'badge-paid';

        case 'PACKING': return 'badge-placed'; // Use placed/pending style for packing

        case 'SHIPPED': return 'badge-shipped';

        case 'DELIVERED': return 'badge-delivered';

        case 'CANCELLED': return 'badge-cancelled';

        default: return 'badge';

    }

};



export default function OrdersPage() {

    const [orders, setOrders] = useState([]);

    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');

    const [statusFilter, setStatusFilter] = useState('ALL');

    const [sourceFilter, setSourceFilter] = useState('ALL');

    const [selectedOrder, setSelectedOrder] = useState(null);

    const [orderItems, setOrderItems] = useState([]);
    const [isEditingItems, setIsEditingItems] = useState(false);
    const [notification, setNotification] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(null);
    const [shippingForm, setShippingForm] = useState({
        courier_name: '',
        tracking_number: '',
        tracking_url: ''
    });
    const [isAddingOrder, setIsAddingOrder] = useState(false);
    const [showShippingForm, setShowShippingForm] = useState(false);
    const [newOrder, setNewOrder] = useState({
        customer_name: '',
        customer_phone: '',
        delivery_address: '',
        shipping_state: 'Tamil Nadu',
        payment_method: 'UPI',
        items: [] // {product_id, product_name, quantity, price}
    });
    const [allProducts, setAllProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [ordersPage, setOrdersPage] = useState(1);
    const ORDERS_PER_PAGE = 20;
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'analytics'
    const [analyticsData, setAnalyticsData] = useState({
        revenueTrend: [],
        channelData: [],
        statusData: [],
        courierData: [],
        topProducts: []
    });
    const [timeRange, setTimeRange] = useState('MONTHLY'); // DAILY, MONTHLY, QUARTERLY, ALL



    const fetchAnalytics = async (allOrders) => {
        try {
            const now = new Date();
            let filteredOrders = allOrders;

            // 1. Time Filtering Logic
            if (timeRange === 'DAILY') {
                filteredOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
            } else if (timeRange === 'MONTHLY') {
                filteredOrders = allOrders.filter(o => {
                    const d = new Date(o.created_at);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
            } else if (timeRange === 'QUARTERLY') {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                filteredOrders = allOrders.filter(o => {
                    const d = new Date(o.created_at);
                    return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === now.getFullYear();
                });
            }

            // 2. Revenue Trend (Last 7 intervals)
            const trendMap = {};
            if (timeRange === 'DAILY') {
                for (let i = 0; i < 24; i++) trendMap[`${i}:00`] = 0;
                filteredOrders.forEach(o => {
                    if (o.status !== 'CANCELLED') trendMap[`${new Date(o.created_at).getHours()}:00`] += (o.total_amount || 0);
                });
            } else {
                // Group by day for other views
                const daysToFetch = timeRange === 'MONTHLY' ? 30 : timeRange === 'QUARTERLY' ? 90 : 365;
                for (let i = daysToFetch; i >= 0; i--) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    trendMap[d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })] = 0;
                }
                allOrders.forEach(o => {
                    if (o.status === 'CANCELLED') return;
                    const ds = new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    if (trendMap[ds] !== undefined) trendMap[ds] += (o.total_amount || 0);
                });
            }
            const revenueTrend = Object.entries(trendMap).map(([date, amount]) => ({ date, amount }));

            // 3. Channel Data (from filtered set)
            const channels = { WEBSITE: 0, WHATSAPP: 0 };
            filteredOrders.forEach(o => {
                const src = o.source || (o.id?.startsWith('WEB-') ? 'WEBSITE' : 'WHATSAPP');
                channels[src] = (channels[src] || 0) + 1;
            });
            const channelData = [
                { name: 'Website', value: channels.WEBSITE, color: 'hsl(195 85% 45%)' },
                { name: 'WhatsApp', value: channels.WHATSAPP, color: 'hsl(var(--primary))' }
            ];

            // 4. Status Data (from filtered set)
            const stats = {};
            filteredOrders.forEach(o => { stats[o.status] = (stats[o.status] || 0) + 1; });
            const statusData = Object.entries(stats).map(([name, value]) => ({ name, value }));

            // 5. Courier Analysis
            const couriers = {};
            filteredOrders.forEach(o => {
                if (o.courier_name) couriers[o.courier_name] = (couriers[o.courier_name] || 0) + 1;
            });
            const courierData = Object.entries(couriers).map(([name, value]) => ({ name, value }));

            // 6. Top Products (Fetch order items for filtered orders)
            const orderIds = filteredOrders.map(o => o.id);
            const { data: items } = await supabase.from('order_items').select('product_name, quantity').in('order_id', orderIds);
            const prodMap = {};
            items?.forEach(i => { prodMap[i.product_name] = (prodMap[i.product_name] || 0) + i.quantity; });
            const topProducts = Object.entries(prodMap).map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value).slice(0, 5);

            setAnalyticsData({ revenueTrend, channelData, statusData, courierData, topProducts });
        } catch (err) {
            console.error('Orders Analytics Error:', err);
        }
    };

    const fetchOrders = async () => {

        setLoading(true);

        try {

            let query = supabase

                .from('orders')

                .select('*')

                .neq('status', 'DRAFT')

                .order('created_at', { ascending: false });



            const { data } = await query;

            setOrders(data || []);
            fetchAnalytics(data || []);

        } catch (error) {

            console.error('Error fetching orders:', error);

        } finally {

            setLoading(false);

        }

    };



    useEffect(() => {
        setHasMounted(true);
        fetchOrders(); // Re-fetch analytics when time range changes
        const channel = supabase
            .channel('orders_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .subscribe();

        return () => supabase.removeChannel(channel);

    }, []);

    // Reset to page 1 when filters change
    useEffect(() => { setOrdersPage(1); }, [searchTerm, statusFilter, sourceFilter]);



    const fetchAllProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('name');
        setAllProducts(data || []);
    };

    useEffect(() => {
        if (isAddingOrder) fetchAllProducts();
    }, [isAddingOrder]);

    const openOrderDetail = async (order) => {
        setLoading(true);
        setSelectedOrder(order);
        try {
            const { data } = await supabase
                .from('order_items')
                .select('*, products(image_url)')
                .eq('order_id', order.id);
            setOrderItems(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!hasMounted) {
        return (
            <div className="animate-enter" style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1.5rem' }} />
                <p>Initializing orders portal...</p>
            </div>
        );
    }

    const sendWhatsAppNotification = (order, newStatus, shippingData = {}) => {
        if (!order || !order.customer_phone) return;

        const phone = order.customer_phone.replace(/\D/g, '');
        // NOOP — We now rely on the automated bot notification from the backend.
        // This avoids browser 'popup blocked' issues during async status updates.
    };

    const updateOrderStatus = async (orderId, newStatus, shippingData = {}) => {
        try {
            const res = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status: newStatus, ...shippingData })
            });

            const data = await res.json();
            if (res.ok) {
                // Map camelCase from shippingData back to snake_case for the UI state
                const mappedShipping = {};
                if (shippingData.courierName) mappedShipping.courier_name = shippingData.courierName;
                if (shippingData.trackingNumber) mappedShipping.tracking_number = shippingData.trackingNumber;
                if (shippingData.trackingUrl) mappedShipping.tracking_url = shippingData.trackingUrl;

                setSelectedOrder(prev => prev ? {
                    ...prev,
                    status: newStatus,
                    ...mappedShipping
                } : null);

                fetchOrders();
                setNotification({
                    message: `✅ Order updated to ${newStatus}`,
                    type: 'success'
                });

                // NO MANUAL WHATSAPP TRIGGER — The backend API /api/orders/update-status 
                // already sends the official notification via the WhatsApp Business API.
            } else {
                setNotification({ message: `❌ Failed: ${data.error}`, type: 'error' });
            }
        } catch (error) {
            setNotification({ message: '❌ Error updating status', type: 'error' });
        }
        setTimeout(() => setNotification(null), 4000);
    };

    const handleUpdateItem = (index, field, value) => {
        const newItems = [...orderItems];
        newItems[index][field] = value;
        setOrderItems(newItems);
    };

    const handleRemoveItem = (index) => {
        const newItems = orderItems.filter((_, i) => i !== index);
        setOrderItems(newItems);
    };


    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to PERMANENTLY delete this order? This cannot be undone.')) return;

        setLoading(true);
        try {
            // 1. Delete order items first (cascading delete should ideally be in DB, but being safe)
            const { error: itemsError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', orderId);

            if (itemsError) throw itemsError;

            // 2. Delete the order
            const { error: orderError } = await supabase
                .from('orders')
                .delete()
                .eq('id', orderId);

            if (orderError) throw orderError;

            setNotification({
                message: '✅ Order deleted successfully',
                type: 'success'
            });
            setSelectedOrder(null);
            fetchOrders();
        } catch (err) {
            console.error('Delete Error:', err);
            setNotification({
                message: '❌ Failed to delete order',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const saveOrderEdits = async () => {
        try {
            setLoading(true);
            const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.price_at_time), 0);

            // Calculate taxes based on selectedOrder's state
            const state = selectedOrder.shipping_state || 'Tamil Nadu';
            const gstRate = 0.05; // 5%
            const tax = subtotal * gstRate;
            const shipping = selectedOrder.shipping_cost || 100;
            const total = subtotal + tax + shipping;

            let taxDetails = {};
            if (state === 'Tamil Nadu') {
                taxDetails = { cgst: tax / 2, sgst: tax / 2, igst: 0 };
            } else {
                taxDetails = { cgst: 0, sgst: 0, igst: tax };
            }

            // 1. Update Order record (items + customer info)
            const { error: orderError } = await supabase.from('orders').update({
                customer_name: selectedOrder.customer_name,
                customer_phone: selectedOrder.customer_phone,
                delivery_address: selectedOrder.delivery_address,
                shipping_state: selectedOrder.shipping_state,
                subtotal,
                tax_amount: tax,
                total_amount: total,
                ...taxDetails
            }).eq('id', selectedOrder.id);

            if (orderError) throw orderError;

            // 2. Refresh Items (simplest: delete all and re-insert)
            await supabase.from('order_items').delete().eq('order_id', selectedOrder.id);
            const { error: itemsError } = await supabase.from('order_items').insert(
                orderItems.map(item => ({
                    order_id: selectedOrder.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price_at_time: item.price_at_time,
                    variant_id: item.variant_id,
                    variant_name: item.variant_name
                }))
            );

            if (itemsError) throw itemsError;

            setNotification({ message: '✅ Order items updated and totals recalculated', type: 'success' });
            setIsEditingItems(false);
            fetchOrders();
            // Refresh local selectedOrder
            const { data: updatedOrder } = await supabase.from('orders').select('*').eq('id', selectedOrder.id).single();
            setSelectedOrder(updatedOrder);

        } catch (error) {
            console.error(error);
            setNotification({ message: '❌ Failed to save edits', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };



    const filteredOrders = orders.filter(o => {

        const term = searchTerm.toLowerCase();

        const matchesSearch = (o.id || '').toLowerCase().includes(term) ||

            (o.customer_name || '').toLowerCase().includes(term) ||

            (o.customer_phone || '').toLowerCase().includes(term);

        const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;

        const orderSource = o.source || (o.id?.startsWith('WEB-') ? 'WEBSITE' : 'WHATSAPP');

        const matchesSource = sourceFilter === 'ALL' || orderSource === sourceFilter;

        return matchesSearch && matchesStatus && matchesSource;

    });

    const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE);

    const orderCounts = {

        ALL: orders.length,

        PLACED: orders.filter(o => o.status === 'PLACED').length,

        PAID: orders.filter(o => o.status === 'PAID').length,

        SHIPPED: orders.filter(o => o.status === 'SHIPPED').length,

        DELIVERED: orders.filter(o => o.status === 'DELIVERED').length,

    };



    return (

        <div className="animate-enter">

            {loading ? (

                <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>

                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1.5rem' }} />

                    <p>Loading orders collection...</p>

                </div>

            ) : (

                <>
                    {/* ─── MAIN LIST VIEW ─── */}
                    {!selectedOrder && !isAddingOrder && (
                        <>
                            {/* Header */}
                            <div className="admin-header-row">
                                <div>
                                    <h1 style={{ marginBottom: '0.5rem' }}>Orders</h1>
                                    <p>Manage and track all customer orders • {orders.length} total</p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button onClick={() => setIsAddingOrder(true)} className="btn btn-primary" style={{ background: 'hsl(var(--primary))', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                        <Plus size={16} /> Add Manual Order
                                    </button>
                                    <button onClick={fetchOrders} className="btn btn-secondary">
                                        <RefreshCw size={16} /> Refresh
                                    </button>
                                </div>
                            </div>

                            {/* Unified View Controls & Filters Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', gap: '2rem', flexWrap: 'wrap' }}>
                                <div>
                                    {viewMode === 'list' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {/* Status Filters */}
                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                {Object.entries(orderCounts).map(([status, count]) => (
                                                    <button key={status} onClick={() => setStatusFilter(status)} style={{
                                                        padding: '0.6rem 1.25rem', borderRadius: '9999px', fontSize: '0.85rem',
                                                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                                        background: statusFilter === status ? 'hsl(var(--primary))' : '#ffffff',
                                                        color: statusFilter === status ? 'white' : 'hsl(var(--text-muted))',
                                                        border: statusFilter === status ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))',
                                                        boxShadow: statusFilter === status ? '0 4px 12px hsl(var(--primary) / 0.3)' : 'none'
                                                    }}>
                                                        {status === 'ALL' ? 'All Orders' : status} <span style={{ opacity: 0.7, marginLeft: '4px' }}>({count})</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Source Filter */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Channel:</span>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {SOURCE_FILTERS.map(src => (
                                                        <button key={src} onClick={() => setSourceFilter(src)} style={{
                                                            padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.8rem',
                                                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                                            background: sourceFilter === src
                                                                ? src === 'WEBSITE' ? 'hsl(195 85% 40%)' : src === 'WHATSAPP' ? 'hsl(var(--primary))' : '#f1f5f9'
                                                                : '#ffffff',
                                                            color: sourceFilter === src ? '#fff' : 'hsl(var(--text-muted))',
                                                            border: '1px solid hsl(var(--border-subtle))'
                                                        }}>
                                                            {src === 'ALL' ? '🌐 All' : src === 'WEBSITE' ? '🌐 Website' : '💬 WhatsApp'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Analytics Range:</span>
                                            <div style={{ display: 'flex', gap: '4px', background: '#ffffff', padding: '4px', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                                                    <button key={r} onClick={() => setTimeRange(r)} style={{
                                                        padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s',
                                                        background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                                                        color: timeRange === r ? 'white' : 'hsl(var(--text-muted))'
                                                    }}>{r}</button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* View Switcher Toggle - Now on the right of filters */}
                                <div style={{ display: 'flex', gap: '0.25rem', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '12px', padding: '4px', height: 'fit-content' }}>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        style={{
                                            padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                            fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s',
                                            background: viewMode === 'list' ? 'hsl(var(--primary))' : 'transparent',
                                            color: viewMode === 'list' ? 'white' : 'hsl(var(--text-muted))',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}><Eye size={16} /> List View</button>
                                    <button
                                        onClick={() => setViewMode('analytics')}
                                        style={{
                                            padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                            fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s',
                                            background: viewMode === 'analytics' ? 'hsl(var(--primary))' : 'transparent',
                                            color: viewMode === 'analytics' ? 'white' : 'hsl(var(--text-muted))',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}><TrendingUp size={16} /> Analysis</button>
                                </div>
                            </div>

                            {viewMode === 'analytics' && (
                                <div className="animate-enter">
                                    <div className="admin-grid-2" style={{ marginBottom: '1.5rem' }}>
                                        {/* Revenue Title updated dynamically */}
                                        <div className="card" style={{ padding: '1.5rem' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <IndianRupee size={18} color="hsl(var(--success))" /> {timeRange} Revenue Trend
                                            </h3>
                                            <div style={{ height: '300px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={analyticsData.revenueTrend}>
                                                        <defs>
                                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
                                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                                                        <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }} />
                                                        <Area type="monotone" dataKey="amount" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="card" style={{ padding: '1.5rem' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Trophy size={18} color="#f59e0b" /> Best Selling Products ({timeRange})
                                            </h3>
                                            <div style={{ height: '300px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart layout="vertical" data={analyticsData.topProducts}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border-subtle))" />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="admin-grid-3">
                                        {/* Courier Distribution */}
                                        <div className="card" style={{ padding: '1.5rem' }}>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Truck size={18} color="#10b981" /> Courier Partners
                                            </h3>
                                            <div style={{ height: '250px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={analyticsData.courierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={5}>
                                                            {analyticsData.courierData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Channel Distribution */}
                                        <div className="card" style={{ padding: '1.5rem' }}>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <ShoppingCart size={18} color="hsl(var(--primary))" /> Order Sources
                                            </h3>
                                            <div style={{ height: '250px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={analyticsData.channelData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                                            {analyticsData.channelData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Status Distribution */}
                                        <div className="card" style={{ padding: '1.5rem' }}>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Package size={18} color="hsl(var(--accent))" /> Status Breakdown
                                            </h3>
                                            <div style={{ height: '250px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={analyticsData.statusData}>
                                                        <XAxis dataKey="name" hide />
                                                        <YAxis hide />
                                                        <Tooltip />
                                                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {viewMode === 'list' && (
                                <>

                                    {/* Search + Table Card */}

                                    <div className="card" style={{ padding: 0 }}>

                                        {/* Search Bar */}

                                        <div className="admin-search-container">

                                            <div className="admin-search-input-wrapper">

                                                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />

                                                <input

                                                    type="text"

                                                    placeholder="Search by Order ID, Name or Phone..."

                                                    value={searchTerm}

                                                    onChange={(e) => setSearchTerm(e.target.value)}

                                                    style={{

                                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',

                                                        background: '#f1f5f9',

                                                        border: '1px solid hsl(var(--border-subtle))',

                                                        borderRadius: 'var(--radius-sm)',

                                                        fontSize: '0.9rem', outline: 'none', transition: 'border 0.2s',

                                                        color: 'hsl(var(--text-main))', fontFamily: 'inherit'

                                                    }}

                                                />

                                            </div>

                                        </div>



                                        {/* Table */}

                                        {loading ? (

                                            <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>

                                                <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading...

                                            </div>

                                        ) : (

                                            <table style={{ margin: 0 }}>

                                                <thead style={{ background: '#f1f5f9' }}>
                                                    <tr style={{ color: '#475569', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>

                                                        <th>Order ID</th>
                                                        <th>Customer</th>
                                                        <th style={{ textAlign: 'left' }}>Region</th>
                                                        <th style={{ textAlign: 'center' }}>Source</th>
                                                        <th style={{ textAlign: 'right' }}>Amount</th>

                                                        <th style={{ textAlign: 'center' }}>Payment</th>

                                                        <th style={{ textAlign: 'center' }}>Status</th>

                                                        <th style={{ textAlign: 'left' }}>Date</th>

                                                        <th style={{ textAlign: 'right' }}>Actions</th>

                                                    </tr>

                                                </thead>

                                                <tbody>

                                                    {filteredOrders.length === 0 ? (
                                                        <tr><td colSpan={10} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No orders found matching your criteria.</td></tr>
                                                    ) : (
                                                        paginatedOrders.map(order => {
                                                            const src = order.source || (order.id?.startsWith('WEB-') ? 'WEBSITE' : 'WHATSAPP');
                                                            const isExpanded = selectedOrder?.id === order.id;

                                                            return (
                                                                <React.Fragment key={order.id}>
                                                                    <tr
                                                                        onClick={() => openOrderDetail(order)}
                                                                        style={{
                                                                            cursor: 'pointer',
                                                                            background: selectedOrder?.id === order.id ? 'hsl(var(--primary) / 0.05)' : 'transparent',
                                                                            transition: 'background 0.2s'
                                                                        }}
                                                                    >
                                                                        <td style={{ fontWeight: 600, color: selectedOrder?.id === order.id ? 'hsl(var(--primary))' : 'inherit' }}>#{order.id}</td>
                                                                        <td>
                                                                            <div style={{ fontWeight: 500, color: 'hsl(var(--text-main))' }}>{order.customer_name || 'Guest'}</div>
                                                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{order.customer_phone}</div>
                                                                        </td>
                                                                        <td style={{ textAlign: 'left' }}>
                                                                            <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{order.shipping_state || '—'}</div>
                                                                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>India</div>
                                                                        </td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <span style={{
                                                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                                                padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                                                                                background: src === 'WEBSITE' ? 'hsl(195 85% 40% / 0.15)' : 'rgba(37,211,102,0.12)',
                                                                                color: src === 'WEBSITE' ? 'hsl(195 85% 55%)' : 'hsl(var(--primary))',
                                                                                border: src === 'WEBSITE' ? '1px solid hsl(195 85% 40% / 0.3)' : '1px solid rgba(37,211,102,0.3)'
                                                                            }}>
                                                                                {src === 'WEBSITE' ? '🌐' : '💬'} {src === 'WEBSITE' ? 'Web' : 'WhatsApp'}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'hsl(var(--text-main))' }}>₹{(order.total_amount || 0).toLocaleString()}</td>
                                                                        <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{order.payment_method || '—'}</td>
                                                                        <td style={{ textAlign: 'center' }}>
                                                                            <span className={`badge ${getStatusReference(order.status)}`}>{order.status}</span>
                                                                        </td>
                                                                        <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                                                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                                        </td>
                                                                        <td style={{ textAlign: 'right' }}>
                                                                            <button onClick={(e) => { e.stopPropagation(); openOrderDetail(order); }} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                                <Eye size={14} /> View
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                </React.Fragment>
                                                            );
                                                        })
                                                    )}

                                                </tbody>

                                            </table>

                                        )}

                                        {/* ── Pagination ── */}
                                        {totalOrderPages > 1 && (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.25rem', borderTop: '1px solid hsl(var(--border-subtle))' }}>
                                                <button
                                                    onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                                                    disabled={ordersPage === 1}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: ordersPage === 1 ? 0.4 : 1 }}
                                                >← Prev</button>
                                                <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                                                    Page {ordersPage} of {totalOrderPages} &nbsp;·&nbsp; {filteredOrders.length} orders
                                                </span>
                                                <button
                                                    onClick={() => setOrdersPage(p => Math.min(totalOrderPages, p + 1))}
                                                    disabled={ordersPage === totalOrderPages}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: ordersPage === totalOrderPages ? 0.4 : 1 }}
                                                >Next →</button>
                                            </div>
                                        )}

                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* ─── ORDER DETAILS PAGE ─── */}
                    {selectedOrder && (
                        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                            <div className="card shadow-premium" style={{
                                width: '100%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px', background: '#ffffff', overflow: 'hidden'
                            }}>
                                <div style={{ padding: '1.5rem 2rem', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Order Details #{selectedOrder.id}</h2>
                                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <button onClick={() => { setSelectedOrder(null); setOrderItems([]); setIsEditingItems(false); }} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Orders</button>
                                        {!isEditingItems ? (
                                            <button onClick={() => setIsEditingItems(true)} className="btn btn-primary" style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                                ✏️ Edit Order
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => { setIsEditingItems(false); openOrderDetail(selectedOrder); }} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>✕ Cancel</button>
                                                <button onClick={saveOrderEdits} disabled={loading} className="btn btn-primary" style={{ fontSize: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                                    {loading ? <Loader2 size={14} className="animate-spin" /> : '💾 Save Changes'}
                                                </button>
                                            </>
                                        )}
                                        <button onClick={async () => {
                                            const buf = await generateInvoicePDF({ ...selectedOrder, order_items: orderItems });
                                            const blob = new Blob([buf], { type: 'application/pdf' });
                                            const url = URL.createObjectURL(blob);
                                            window.open(url, '_blank');
                                        }} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                            <ExternalLink size={14} /> View Invoice
                                        </button>
                                        <button onClick={async () => {
                                            const buf = await generateInvoicePDF({ ...selectedOrder, order_items: orderItems });
                                            const blob = new Blob([buf], { type: 'application/pdf' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `Invoice_${selectedOrder.id}.pdf`;
                                            a.click();
                                        }} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                                            <Download size={14} /> Download
                                        </button>
                                    </div>
                                </div>

                                <div style={{ flex: 1, padding: '2rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '2rem' }}>

                                    {/* Left: Items */}
                                    <div>
                                        <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }}>🛒 Order Items</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {orderItems.map((item, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '1.5rem', background: '#ffffff', padding: '1rem', borderRadius: '12px', border: `1px solid ${isEditingItems ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border-subtle))'}` }}>
                                                    <div style={{ width: '100px', height: '130px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))' }}>
                                                        <img src={item.products?.image_url || 'https://via.placeholder.com/100x130?text=Saree'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-main))' }}>{item.product_name}</div>
                                                        <div style={{ fontSize: '0.82rem', color: 'hsl(var(--primary))', fontWeight: 600 }}>{item.variant_name || 'Standard Unit'}</div>
                                                        {isEditingItems ? (
                                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginBottom: '3px' }}>Qty</div>
                                                                    <input type="number" min="1" value={item.quantity}
                                                                        onChange={e => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                                                        style={{ width: '70px', padding: '0.4rem 0.6rem', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', color: 'hsl(var(--text-main))', textAlign: 'center', fontSize: '0.9rem' }} />
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginBottom: '3px' }}>Price (₹)</div>
                                                                    <input type="number" min="0" value={item.price_at_time}
                                                                        onChange={e => handleUpdateItem(idx, 'price_at_time', parseFloat(e.target.value) || 0)}
                                                                        style={{ width: '110px', padding: '0.4rem 0.6rem', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', color: 'hsl(var(--text-main))', textAlign: 'center', fontSize: '0.9rem' }} />
                                                                </div>
                                                                <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--success))' }}>₹{((item.quantity * item.price_at_time) || 0).toLocaleString()}</div>
                                                                <button onClick={() => handleRemoveItem(idx)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '0.4rem 0.6rem', cursor: 'pointer' }}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))' }}>{item.quantity} x ₹{(item.price_at_time || 0).toLocaleString()}</div>
                                                                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'hsl(var(--success))' }}>₹{((item.quantity * item.price_at_time) || 0).toLocaleString()}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {selectedOrder.tracking_number && (
                                            <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'hsl(var(--primary) / 0.05)', borderRadius: '15px', border: '1px dashed hsl(var(--primary) / 0.3)' }}>
                                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'hsl(var(--primary))', marginBottom: '1rem' }}>
                                                    <Truck size={18} /> Shipping & Tracking Information
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>Courier Partner</div>
                                                        <div style={{ fontWeight: 700 }}>{selectedOrder.courier_name}</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '4px' }}>Tracking Number</div>
                                                        <div style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>{selectedOrder.tracking_number}</div>
                                                    </div>
                                                </div>
                                                {selectedOrder.tracking_url && (
                                                    <a href={selectedOrder.tracking_url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%', fontSize: '0.8rem' }}>
                                                        <ExternalLink size={14} /> Track Package Real-time
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Summary & Customer */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: `1px solid ${isEditingItems ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border-subtle))'}` }}>
                                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>📍 Customer Info</h4>
                                            {isEditingItems ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                    <input
                                                        placeholder="Customer Name"
                                                        value={selectedOrder.customer_name || ''}
                                                        onChange={e => setSelectedOrder({ ...selectedOrder, customer_name: e.target.value })}
                                                        style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f1f5f9', border: '1px solid hsl(var(--primary) / 0.5)', borderRadius: '7px', color: 'hsl(var(--text-main))', fontSize: '0.85rem' }}
                                                    />
                                                    <input
                                                        placeholder="Phone"
                                                        value={selectedOrder.customer_phone || ''}
                                                        onChange={e => setSelectedOrder({ ...selectedOrder, customer_phone: e.target.value })}
                                                        style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f1f5f9', border: '1px solid hsl(var(--primary) / 0.5)', borderRadius: '7px', color: 'hsl(var(--text-main))', fontSize: '0.85rem' }}
                                                    />
                                                    <textarea
                                                        rows={2}
                                                        placeholder="Delivery Address"
                                                        value={selectedOrder.delivery_address || ''}
                                                        onChange={e => setSelectedOrder({ ...selectedOrder, delivery_address: e.target.value })}
                                                        style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f1f5f9', border: '1px solid hsl(var(--primary) / 0.5)', borderRadius: '7px', color: 'hsl(var(--text-main))', fontSize: '0.85rem', resize: 'none' }}
                                                    />
                                                    <select
                                                        value={selectedOrder.shipping_state || 'Tamil Nadu'}
                                                        onChange={e => setSelectedOrder({ ...selectedOrder, shipping_state: e.target.value })}
                                                        style={{ width: '100%', padding: '0.55rem 0.75rem', background: '#f1f5f9', border: '1px solid hsl(var(--primary) / 0.5)', borderRadius: '7px', color: 'hsl(var(--text-main))', fontSize: '0.85rem' }}
                                                    >
                                                        {['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi', 'Gujarat', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ fontWeight: 700 }}>{selectedOrder.customer_name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{selectedOrder.customer_phone}</div>
                                                    <div style={{ marginTop: '1rem', fontSize: '0.85rem', lineHeight: 1.5, color: 'hsl(var(--text-main))' }}>{selectedOrder.delivery_address}</div>
                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>{selectedOrder.shipping_state}</div>
                                                </>
                                            )}
                                        </div>

                                        <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>💰 Order Summary</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: 'hsl(var(--text-main))' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Subtotal:</span>
                                                    <span style={{ fontWeight: 600 }}>₹{(selectedOrder.subtotal || (selectedOrder.total_amount - (selectedOrder.tax_amount || 0) - (selectedOrder.shipping_cost || 0))).toLocaleString()}</span>
                                                </div>

                                                {selectedOrder.cgst > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                        <span>CGST (2.5%):</span>
                                                        <span>₹{parseFloat(selectedOrder.cgst).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {selectedOrder.sgst > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                        <span>SGST (2.5%):</span>
                                                        <span>₹{parseFloat(selectedOrder.sgst).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {selectedOrder.igst > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                        <span>IGST (5%):</span>
                                                        <span>₹{parseFloat(selectedOrder.igst).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {(!selectedOrder.cgst && !selectedOrder.sgst && !selectedOrder.igst && selectedOrder.tax_amount > 0) && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--text-muted))' }}>
                                                        <span>Tax (Aggregate):</span>
                                                        <span>₹{parseFloat(selectedOrder.tax_amount).toLocaleString()}</span>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'hsl(var(--text-muted))' }}>
                                                    <span>Shipping:</span>
                                                    <span>₹{(selectedOrder.shipping_cost || 0).toLocaleString()}</span>
                                                </div>
                                                <div style={{ height: '1px', background: 'hsl(var(--border-subtle))', margin: '0.5rem 0' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                                                    <span>Total:</span>
                                                    <span>₹{(selectedOrder.total_amount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card-sub" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>⚙️ Actions</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                                <select
                                                    value={selectedOrder.status}
                                                    onChange={(e) => {
                                                        const newStatus = e.target.value;
                                                        if (newStatus === 'SHIPPED') {
                                                            setShowShippingForm(true);
                                                        } else {
                                                            updateOrderStatus(selectedOrder.id, newStatus);
                                                        }
                                                    }}
                                                    style={{ padding: '0.75rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }}
                                                >
                                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>

                                                {/* Inline Shipping Form — appears when SHIPPED is selected */}
                                                {showShippingForm && (
                                                    <div className="animate-enter" style={{ marginTop: '0.75rem', padding: '1rem', background: '#f1f5f9', borderRadius: '10px', border: '1px solid hsl(var(--primary) / 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--primary))', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Truck size={14} /> Shipping Details
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Courier (e.g. Delhivery)"
                                                            value={shippingForm.courier_name}
                                                            onChange={e => setShippingForm({ ...shippingForm, courier_name: e.target.value })}
                                                            style={{ width: '100%', padding: '0.65rem', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Tracking / AWB Number"
                                                            value={shippingForm.tracking_number}
                                                            onChange={e => setShippingForm({ ...shippingForm, tracking_number: e.target.value })}
                                                            style={{ width: '100%', padding: '0.65rem', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem' }}
                                                        />
                                                        <input
                                                            type="url"
                                                            placeholder="Tracking URL (optional)"
                                                            value={shippingForm.tracking_url}
                                                            onChange={e => setShippingForm({ ...shippingForm, tracking_url: e.target.value })}
                                                            style={{ width: '100%', padding: '0.65rem', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '8px', color: 'hsl(var(--text-main))', fontSize: '0.85rem' }}
                                                        />
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                            <button onClick={() => { setShowShippingForm(false); setShippingForm({ courier_name: '', tracking_number: '', tracking_url: '' }); }} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>Cancel</button>
                                                            <button
                                                                onClick={() => {
                                                                    updateOrderStatus(selectedOrder.id, 'SHIPPED', {
                                                                        courierName: shippingForm.courier_name,
                                                                        trackingNumber: shippingForm.tracking_number,
                                                                        trackingUrl: shippingForm.tracking_url
                                                                    });
                                                                    setShowShippingForm(false);
                                                                    setShippingForm({ courier_name: '', tracking_number: '', tracking_url: '' });
                                                                }}
                                                                disabled={!shippingForm.courier_name || !shippingForm.tracking_number}
                                                                className="btn btn-primary"
                                                                style={{ fontSize: '0.8rem' }}
                                                            >Confirm Ship</button>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedOrder.status === 'PLACED' && (
                                                    <button onClick={() => setShowShippingForm(true)} className="btn btn-primary" style={{ width: '100%' }}>
                                                        <Truck size={16} /> Update Tracking Info
                                                    </button>
                                                )}
                                                <a href={`https://wa.me/${selectedOrder.customer_phone}`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}>
                                                    <MessageCircle size={14} /> Contact via WhatsApp
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteOrder(selectedOrder.id)}
                                                    className="btn"
                                                    style={{
                                                        width: '100%',
                                                        marginTop: '0.5rem',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        color: '#f87171',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    <Trash2 size={14} /> Delete Order
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── ADD MANUAL ORDER PAGE ─── */}
                    {isAddingOrder && (
                        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                            <div className="card shadow-premium" style={{
                                width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px', background: '#ffffff'
                            }}>
                                <div style={{ padding: '1.5rem 2rem', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Package size={24} color="hsl(var(--primary))" /> Manual Order Creation
                                    </h2>
                                    <button onClick={() => setIsAddingOrder(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Orders</button>
                                </div>

                                <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Customer Name</label>
                                            <input type="text" placeholder="John Doe" value={newOrder.customer_name} onChange={e => setNewOrder({ ...newOrder, customer_name: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>WhatsApp Phone</label>
                                            <input type="tel" placeholder="91..." value={newOrder.customer_phone} onChange={e => setNewOrder({ ...newOrder, customer_phone: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                        </div>
                                        <div style={{ gridColumn: 'span 1' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Delivery Address</label>
                                            <textarea rows={1} placeholder="Full address..." value={newOrder.delivery_address} onChange={e => setNewOrder({ ...newOrder, delivery_address: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', resize: 'none' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping State</label>
                                            <select value={newOrder.shipping_state} onChange={e => setNewOrder({ ...newOrder, shipping_state: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }}>
                                                <option value="Tamil Nadu">Tamil Nadu</option>
                                                <option value="Kerala">Kerala</option>
                                                <option value="Karnataka">Karnataka</option>
                                                <option value="Andhra Pradesh">Andhra Pradesh</option>
                                                <option value="Telangana">Telangana</option>
                                                <option value="Other">Other State</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Item Selection */}
                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Add Products</label>
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                                <input
                                                    type="text"
                                                    placeholder="Search product..."
                                                    value={productSearch}
                                                    onChange={e => setProductSearch(e.target.value)}
                                                    style={{ width: '100%', padding: '0.85rem 0.85rem 0.85rem 2.5rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }}
                                                />
                                                {productSearch && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '10px', marginTop: '5px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                                                        {allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                                            <div key={p.id} onClick={() => {
                                                                const exists = newOrder.items.find(i => i.product_id === p.id);
                                                                if (exists) {
                                                                    setNewOrder({ ...newOrder, items: newOrder.items.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i) });
                                                                } else {
                                                                    setNewOrder({ ...newOrder, items: [...newOrder.items, { product_id: p.id, product_name: p.name, quantity: 1, price: p.price }] });
                                                                }
                                                                setProductSearch('');
                                                            }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: 'hsl(var(--text-main))' }}>{p.name}</span>
                                                                <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>₹{p.price.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {newOrder.items.map((item, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                    <div style={{ flex: 1, fontWeight: 700 }}>{item.product_name}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <input type="number" min="1" value={item.quantity} onChange={e => {
                                                            const val = parseInt(e.target.value);
                                                            setNewOrder({ ...newOrder, items: newOrder.items.map((it, i) => i === idx ? { ...it, quantity: val } : it) });
                                                        }} style={{ width: '60px', padding: '0.5rem', borderRadius: '5px', background: '#f1f5f9', border: '1px solid gray', color: 'hsl(var(--text-main))', textAlign: 'center' }} />
                                                    </div>
                                                    <div style={{ width: '100px', textAlign: 'right', fontWeight: 800 }}>₹{(item.price * item.quantity).toLocaleString()}</div>
                                                    <button onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                            ))}
                                            {newOrder.items.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed hsl(var(--border-subtle))', borderRadius: '12px', color: 'gray' }}>No items added. Search above to add products.</div>}
                                        </div>
                                    </div>

                                    {/* Summary & Save */}
                                    <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '15px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                                        {(() => {
                                            const subtotal = newOrder.items.reduce((s, i) => s + (i.price * i.quantity), 0);
                                            const shipping = 100;

                                            let cgst = 0, sgst = 0, igst = 0;
                                            if (newOrder.shipping_state === 'Tamil Nadu') {
                                                cgst = Math.round(subtotal * 0.025);
                                                sgst = Math.round(subtotal * 0.025);
                                            } else {
                                                igst = Math.round(subtotal * 0.05);
                                            }
                                            const tax = cgst + sgst + igst;
                                            const total = subtotal + tax + shipping;

                                            return (
                                                <>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>Subtotal:</span><span>₹{subtotal.toLocaleString()}</span></div>
                                                        {cgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>CGST (2.5%):</span><span>₹{cgst.toLocaleString()}</span></div>}
                                                        {sgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>SGST (2.5%):</span><span>₹{sgst.toLocaleString()}</span></div>}
                                                        {igst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>IGST (5%):</span><span>₹{igst.toLocaleString()}</span></div>}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>Shipping:</span><span>₹{shipping.toLocaleString()}</span></div>
                                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--primary))' }}><span>Total:</span><span>₹{total.toLocaleString()}</span></div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (!newOrder.customer_name || !newOrder.customer_phone || newOrder.items.length === 0) {
                                                                alert('Please fill all details and add items.'); return;
                                                            }
                                                            setLoading(true);
                                                            try {
                                                                const orderId = `MAN-${Date.now().toString().slice(-6)}`;

                                                                // ────── NORMALISE PHONE & SYNC CUSTOMER ──────
                                                                const cleanPhone = newOrder.customer_phone.replace(/\D/g, '');
                                                                const normalizedPhone = cleanPhone.startsWith('91') ? cleanPhone : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

                                                                const { data: existingCusts, error: lookupError } = await supabase.from('customers').select('id, name').eq('phone', normalizedPhone);

                                                                if (!existingCusts || existingCusts.length === 0) {
                                                                    const { error: custErr } = await supabase.from('customers').insert({
                                                                        phone: normalizedPhone,
                                                                        name: newOrder.customer_name || 'Website User',
                                                                        address: newOrder.delivery_address,
                                                                        state: newOrder.shipping_state,
                                                                        role: 'user'
                                                                    });
                                                                    if (custErr) console.error('Failed to auto-create customer profile:', custErr);
                                                                } else {
                                                                    // Update existing customer with new latest details
                                                                    await supabase.from('customers').update({
                                                                        name: newOrder.customer_name || existingCusts[0].name,
                                                                        address: newOrder.delivery_address,
                                                                        state: newOrder.shipping_state
                                                                    }).eq('id', existingCusts[0].id);
                                                                }

                                                                const { error: ordErr } = await supabase.from('orders').insert({
                                                                    id: orderId,
                                                                    customer_name: newOrder.customer_name,
                                                                    customer_phone: normalizedPhone, // Ensures sync with Customers page aggregation
                                                                    delivery_address: newOrder.delivery_address,
                                                                    shipping_state: newOrder.shipping_state,
                                                                    total_amount: total,
                                                                    tax_amount: tax,
                                                                    cgst: cgst,
                                                                    sgst: sgst,
                                                                    igst: igst,
                                                                    shipping_cost: shipping,
                                                                    status: 'PLACED',
                                                                    source: 'WHATSAPP',
                                                                    payment_method: newOrder.payment_method
                                                                });
                                                                if (ordErr) throw ordErr;
                                                                const { error: itemErr } = await supabase.from('order_items').insert(newOrder.items.map(it => ({
                                                                    order_id: orderId,
                                                                    product_id: it.product_id,
                                                                    product_name: it.product_name,
                                                                    quantity: it.quantity,
                                                                    price_at_time: it.price
                                                                })));
                                                                if (itemErr) throw itemErr;

                                                                // ────── DEDUCT STOCK & LOG HISTORY ──────
                                                                for (const item of newOrder.items) {
                                                                    const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                                                                    if (prod) {
                                                                        const newStock = Math.max(0, prod.stock - item.quantity);
                                                                        await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);

                                                                        await supabase.from('product_history').insert({
                                                                            product_id: item.product_id,
                                                                            change_type: 'SALE',
                                                                            quantity_change: -item.quantity,
                                                                            new_stock: newStock,
                                                                            reason: `Admin Manual Order #${orderId}`
                                                                        });

                                                                        await supabase.rpc('increment_total_sold', { prod_id: item.product_id, qty: item.quantity });
                                                                    }
                                                                }

                                                                setNotification({ message: '✅ Manual Order Created Successfully! Stock updated.', type: 'success' });
                                                                setIsAddingOrder(false);
                                                                setNewOrder({ customer_name: '', customer_phone: '', delivery_address: '', shipping_state: 'Tamil Nadu', payment_method: 'UPI', items: [] });
                                                                fetchOrders();
                                                            } catch (err) {
                                                                console.error('Manual Order Error:', err);
                                                                setNotification({ message: `❌ Failed to create order: ${err.message || 'Unknown error'}`, type: 'error' });
                                                            } finally {
                                                                setLoading(false);
                                                                setTimeout(() => setNotification(null), 3000);
                                                            }
                                                        }}
                                                        disabled={loading}
                                                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(168, 85, 247, 0.3)' }}
                                                    >
                                                        {loading ? <Loader2 className="animate-spin" /> : 'Confirm & Place Order'}
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* Notification */}

                    {notification && (

                        <div style={{

                            position: 'fixed', top: '2rem', right: '2rem', zIndex: 3000,

                            padding: '1rem 1.5rem', borderRadius: 'var(--radius)',

                            background: notification.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--danger))',

                            color: 'white', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.3)',

                            animation: 'slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'

                        }}>

                            {notification.message}

                        </div>

                    )}


                    <style jsx>{`
                @keyframes expand { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }
                .animate-expand { animation: expand 0.4s ease-out; overflow: hidden; }
                .card-sub { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .btn-wa-link { 
                    display: inline-flex; align-items: center; gap: 0.5rem; 
                    padding: 0.6rem 1rem; background: hsl(var(--primary))15; color: hsl(var(--primary)); 
                    border: 1px solid hsl(var(--primary))30; border-radius: 8px; font-weight: 700; 
                    font-size: 0.85rem; text-decoration: none; transition: 0.2s;
                }
                .btn-wa-link:hover { background: hsl(var(--primary))25; transform: translateY(-1px); }
                .badge-btn { 
                    padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.75rem; 
                    font-weight: 700; cursor: pointer; border: none; transition: 0.2s;
                    margin-right: 0.5rem; margin-bottom: 0.5rem;
                }
                .badge-inactive { background: hsl(var(--bg-app)); color: hsl(var(--text-muted)); border: 1px solid hsl(var(--border-subtle)); }
                .btn-save-sm { 
                    width: 100%; margin-top: 1rem; padding: 0.6rem; 
                    background: hsl(var(--primary)); color: white; border: none; 
                    border-radius: 8px; font-weight: 700; cursor: pointer;
                }
                @media (max-width: 768px) {
                    .admin-header-row { flex-direction: column; align-items: stretch !important; gap: 1rem; }
                    .admin-filter-row { overflow-x: auto; white-space: nowrap; padding-bottom: 0.5rem; }
                    .admin-filter-row::-webkit-scrollbar { display: none; }
                    .card { overflow: visible !important; }
                    table { min-width: 800px; }
                }
            `}</style>
                </>
            )}
        </div>
    );
}

