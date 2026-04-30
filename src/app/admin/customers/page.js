'use client';


import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';

import { Search, Loader2, MessageCircle, Phone, TrendingUp, Award, ArrowLeft, Edit2, Check, X, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, Filter, Users, ShoppingCart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from 'recharts';



function CustomersPage() {

    const [customers, setCustomers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');

    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [customerOrders, setCustomerOrders] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'analytics'
    const [timeRange, setTimeRange] = useState('ALL'); // DAILY, MONTHLY, QUARTERLY, ALL
    const [analyticsData, setAnalyticsData] = useState({
        tierData: [],
        growthData: [],
        repeatData: []
    });
    const [hasMounted, setHasMounted] = useState(false);
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [editedCustomer, setEditedCustomer] = useState({ name: '', phone: '', address: '' });
    const [notification, setNotification] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [editedOrderData, setEditedOrderData] = useState({ total_amount: 0, payment_method: '', status: '' });
    const [filterMode, setFilterMode] = useState('ALL'); // ALL, ORDERED, UNORDERED
    const [customersPage, setCustomersPage] = useState(1);
    const CUSTOMERS_PER_PAGE = 20;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [customersPage]);



    useEffect(() => {

        setHasMounted(true);





        fetchCustomers();

        const handleReset = () => {
            setSelectedCustomer(null);
            setIsEditingCustomer(false);
            setEditingOrderId(null);
        };
        window.addEventListener('resetAdminView', handleReset);

        return () => window.removeEventListener('resetAdminView', handleReset);

    }, [timeRange]); // Re-fetch on time range change
    
    // Reset to page 1 when filters or search change
    useEffect(() => { setCustomersPage(1); }, [searchTerm, filterMode]);



    const fetchCustomers = async () => {
        setLoading(true);
        try {
            // 1. Fetch all customers
            const { data: allCustomers, error: custError } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (custError) throw custError;

            // 2. Fetch all orders (except drafts) to aggregate stats
            let orderQuery = supabase.from('orders').select('*').neq('status', 'DRAFT');

            const now = new Date();
            if (timeRange === 'DAILY') {
                orderQuery = orderQuery.gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString());
            } else if (timeRange === 'MONTHLY') {
                orderQuery = orderQuery.gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
            } else if (timeRange === 'QUARTERLY') {
                const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
                orderQuery = orderQuery.gte('created_at', new Date(now.getFullYear(), qStartMonth, 1).toISOString());
            }

            const { data: allOrders, error: orderError } = await orderQuery.order('created_at', { ascending: false });

            if (orderError) throw orderError;

            // 3. Map orders to customers
            const customerMap = {};

            const normalizePhone = (p) => {
                if (!p) return '';
                const clean = p.replace(/\D/g, '');
                return clean.startsWith('91') ? clean : (clean.length === 10 ? `91${clean}` : clean);
            };

            (allCustomers || []).forEach(cust => {
                const normPhone = normalizePhone(cust.phone);
                if (normPhone) {
                    customerMap[normPhone] = {
                        phone: normPhone,
                        name: cust.name || 'WhatsApp Customer',
                        totalOrders: 0,
                        totalSpent: 0,
                        lastOrder: cust.created_at,
                        lastAddress: cust.address || '',
                        orders: []
                    };
                }
            });

            (allOrders || []).forEach(order => {
                const normPhone = normalizePhone(order.customer_phone);

                if (normPhone) {
                    if (!customerMap[normPhone]) {
                        customerMap[normPhone] = {
                            phone: normPhone,
                            name: order.customer_name || 'User',
                            totalOrders: 0,
                            totalSpent: 0,
                            lastOrder: order.created_at,
                            lastAddress: order.delivery_address || '',
                            orders: []
                        };
                    }

                    customerMap[normPhone].totalOrders++;
                    customerMap[normPhone].totalSpent += order.total_amount || 0;
                    customerMap[normPhone].orders.push(order);

                    // Use most recent order date for 'lastOrder' in terms of activity
                    if (new Date(order.created_at) > new Date(customerMap[normPhone].lastOrder)) {
                        customerMap[normPhone].lastOrder = order.created_at;
                    }

                    if (order.customer_name && order.customer_name !== 'WhatsApp Customer' && order.customer_name !== 'Website User') {
                        customerMap[normPhone].name = order.customer_name;
                    }
                    if (order.delivery_address && !customerMap[normPhone].lastAddress) {
                        customerMap[normPhone].lastAddress = order.delivery_address;
                    }
                }
            });

            const customerList = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);

            setCustomers(customerList);

            // --- Analytics Logic ---
            const tiers = { VIP: 0, Gold: 0, Silver: 0, Regular: 0 };
            customerList.forEach(c => {
                if (c.totalSpent >= 15000) tiers.VIP++;
                else if (c.totalSpent >= 7000) tiers.Gold++;
                else if (c.totalSpent >= 2000) tiers.Silver++;
                else if (c.totalSpent > 0) tiers.Regular++;
            });
            const tierData = [
                { name: 'VIP', value: tiers.VIP, color: '#f59e0b' },
                { name: 'Gold', value: tiers.Gold, color: '#fbbf24' },
                { name: 'Silver', value: tiers.Silver, color: '#94a3b8' },
                { name: 'Regular', value: tiers.Regular, color: '#cbd5e1' }
            ].filter(t => t.value > 0);

            const repeatCount = customerList.filter(c => c.totalOrders > 1).length;
            const activeCount = customerList.filter(c => c.totalOrders > 0).length;
            const repeatData = [
                { name: 'Repeat', value: repeatCount, color: 'hsl(var(--primary))' },
                { name: 'Single', value: activeCount - repeatCount, color: 'hsl(var(--accent))' }
            ];

            // 4. Growth Data (New Customers by month)
            const growthMap = new Map();
            customerList.forEach(c => {
                try {
                    // Use the earliest date we know for this customer (their first order or creation date)
                    let joinedDate = new Date(c.lastOrder); 
                    if (c.orders && c.orders.length > 0) {
                        c.orders.forEach(o => {
                            const oDate = new Date(o.created_at);
                            if (oDate < joinedDate) joinedDate = oDate;
                        });
                    }

                    const month = joinedDate.toLocaleString('en-US', { month: 'short' });
                    const year = joinedDate.getFullYear().toString().slice(-2);
                    const label = `${month} ${year}`;
                    growthMap.set(label, (growthMap.get(label) || 0) + 1);
                } catch (e) {
                    console.error('Growth data error:', e);
                }
            });

            const growthData = Array.from(growthMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const [mA, yA] = a.name.split(' ');
                    const [mB, yB] = b.name.split(' ');
                    if (yA !== yB) return parseInt(yA) - parseInt(yB);
                    return months.indexOf(mA) - months.indexOf(mB);
                });

            // Fallback for empty data
            if (growthData.length === 0) {
                growthData.push({ name: 'No Data', value: 0 });
            }

            setAnalyticsData({ tierData, repeatData, growthData });

            // Update selectedCustomer if it exists to reflect fresh data
            if (selectedCustomer) {
                const refreshed = customerList.find(c => c.phone === selectedCustomer.phone);
                if (refreshed) {
                    setSelectedCustomer(refreshed);
                    setCustomerOrders(refreshed.orders);
                }
            }
        } catch (err) {
            console.error('Customer Load Error:', err);
        } finally {
            setLoading(false);
        }
    };



    const openCustomerDetail = (customer) => {
        setSelectedCustomer(customer);
        setCustomerOrders(customer.orders);
        setEditedCustomer({
            name: customer.name,
            phone: customer.phone,
            address: customer.lastAddress || ''
        });
        setIsEditingCustomer(false);
    };

    const handleUpdateCustomer = async () => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    name: editedCustomer.name,
                    address: editedCustomer.address
                })
                .eq('phone', selectedCustomer.phone);

            if (error) throw error;

            setNotification({ message: 'Customer details updated successfully', type: 'success' });
            setIsEditingCustomer(false);
            await fetchCustomers();
        } catch (err) {
            console.error(err);
            setNotification({ message: 'Failed to update customer', type: 'error' });
        } finally {
            setIsUpdating(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            setNotification({ message: `Order #${orderId} status updated to ${newStatus}`, type: 'success' });
            await fetchCustomers();
        } catch (err) {
            console.error(err);
            setNotification({ message: 'Failed to update order status', type: 'error' });
        } finally {
            setIsUpdating(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const startEditingOrder = (order) => {
        setEditingOrderId(order.id);
        setEditedOrderData({
            total_amount: order.total_amount,
            payment_method: order.payment_method,
            status: order.status
        });
    };

    const handleUpdateOrder = async () => {
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    total_amount: Number(editedOrderData.total_amount),
                    payment_method: editedOrderData.payment_method,
                    status: editedOrderData.status
                })
                .eq('id', editingOrderId);

            if (error) throw error;

            setNotification({ message: `Order #${editingOrderId} updated successfully`, type: 'success' });
            setEditingOrderId(null);
            await fetchCustomers();
        } catch (err) {
            console.error(err);
            setNotification({ message: 'Failed to update order', type: 'error' });
        } finally {
            setIsUpdating(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };



    const getStatusReference = (status) => {

        switch (status) {

            case 'PLACED': return 'badge-placed';

            case 'CONFIRMED': return 'badge-confirmed';

            case 'SHIPPED': return 'badge-shipped';

            case 'DELIVERED': return 'badge-delivered';

            case 'CANCELLED': return 'badge-cancelled';

            default: return 'badge';

        }

    };



    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
        if (filterMode === 'ORDERED') return matchesSearch && c.totalOrders > 0;
        if (filterMode === 'UNORDERED') return matchesSearch && c.totalOrders === 0;
        return matchesSearch;
    });
    
    const totalCustomerPages = Math.ceil(filteredCustomers.length / CUSTOMERS_PER_PAGE);
    const paginatedCustomers = filteredCustomers.slice((customersPage - 1) * CUSTOMERS_PER_PAGE, customersPage * CUSTOMERS_PER_PAGE);



    const getTierBadge = (spent) => {

        if (spent >= 20000) return { label: 'VIP', className: 'badge badge-confirmed', style: { background: 'hsl(var(--primary))', color: 'white', border: 'none' } };

        if (spent >= 7000) return { label: 'Gold', className: 'badge badge-paid', style: { background: 'hsl(var(--success))', color: 'white', border: 'none' } };

        if (spent >= 2000) return { label: 'Silver', className: 'badge badge-shipped', style: { background: 'hsl(var(--warning))', color: 'white', border: 'none' } };

        return { label: 'Regular', className: 'badge badge-new', style: { background: 'hsl(var(--muted))', color: 'white', border: 'none' } };

    };



    return (

        <div className="animate-enter">

            {!hasMounted || loading ? (

                <div className="safe-loading">

                    <Loader2 size={24} className="animate-spin" /> Loading Customers...

                </div>

            ) : (

                <>

                    {/* Notification Toast */}
                    {notification && (
                        <div style={{
                            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000,
                            padding: '1rem 1.5rem', borderRadius: '12px', background: notification.type === 'success' ? '#059669' : '#dc2626',
                            color: 'white', fontWeight: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'slideUp 0.3s ease'
                        }}>
                            {notification.type === 'success' ? <Check size={18} /> : <X size={18} />}
                            {notification.message}
                        </div>
                    )}

                    {selectedCustomer ? (
                        <div className="animate-enter">
                            {/* Inline Detail/Edit View */}
                            <div className="admin-header-row" style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <button onClick={() => setSelectedCustomer(null)} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div>
                                        <h1 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {isEditingCustomer ? 'Editing Customer' : selectedCustomer.name}
                                            {!isEditingCustomer && <span className={getTierBadge(selectedCustomer.totalSpent).className} style={getTierBadge(selectedCustomer.totalSpent).style}>{getTierBadge(selectedCustomer.totalSpent).label}</span>}
                                        </h1>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} /> {selectedCustomer.phone}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    {isEditingCustomer ? (
                                        <>
                                            <button onClick={() => setIsEditingCustomer(false)} className="btn btn-secondary">Cancel</button>
                                            <button onClick={handleUpdateCustomer} disabled={isUpdating} className="btn btn-primary" style={{ background: 'hsl(var(--success))', border: 'none' }}>
                                                {isUpdating && <Loader2 size={16} className="animate-spin" />} Save Changes
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => setIsEditingCustomer(true)} className="btn btn-primary">
                                            <Edit2 size={16} /> Edit Customer
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="admin-grid-2" style={{ alignItems: 'start' }}>
                                {/* Left Side: Info */}
                                <div className="card shadow-premium" style={{ padding: '2rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Customer Profile</h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>FULL NAME</label>
                                            {isEditingCustomer ? (
                                                <input
                                                    type="text"
                                                    value={editedCustomer.name}
                                                    onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                                                    className="admin-input"
                                                    style={{ width: '100%', padding: '0.75rem', background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }}
                                                />
                                            ) : (
                                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{selectedCustomer.name}</div>
                                            )}
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>WHATSAPP PHONE</label>
                                            <div style={{ fontSize: '1rem', color: 'hsl(var(--text-muted))', padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {selectedCustomer.phone}
                                                <span style={{ fontSize: '0.65rem', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', padding: '4px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid hsl(var(--primary) / 0.2)' }}>NOT EDITABLE</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.5rem' }}>SHIPPING ADDRESS</label>
                                            {isEditingCustomer ? (
                                                <textarea
                                                    value={editedCustomer.address}
                                                    onChange={(e) => setEditedCustomer({ ...editedCustomer, address: e.target.value })}
                                                    className="admin-input"
                                                    rows={4}
                                                    style={{ width: '100%', padding: '0.75rem', background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontFamily: 'inherit' }}
                                                />
                                            ) : (
                                                <div style={{ fontSize: '0.95rem', background: 'hsl(var(--bg-panel) / 0.5)', padding: '1rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', lineHeight: 1.6 }}>
                                                    {selectedCustomer.lastAddress || 'No address saved.'}
                                                </div>
                                            )}
                                        </div>

                                        <div className="admin-grid-2" style={{ gap: '1rem', marginTop: '1rem' }}>
                                            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '12px' }}>
                                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>{selectedCustomer.totalOrders}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>ORDERS</div>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '12px' }}>
                                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--success))' }}>₹{selectedCustomer.totalSpent.toLocaleString()}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>REVENUE</div>
                                            </div>
                                        </div>

                                        <a href={`https://wa.me/${selectedCustomer.phone}`} target="_blank" rel="noreferrer" className="btn" style={{ background: 'hsl(var(--primary))', color: 'white', width: '100%', justifyContent: 'center', padding: '1rem', fontWeight: 700, fontSize: '1rem', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)', marginTop: '1rem' }}>
                                            <MessageCircle size={20} /> Chat with Customer
                                        </a>
                                    </div>
                                </div>

                                {/* Right Side: Orders */}
                                <div className="card shadow-premium" style={{ padding: '2rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Order History</h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '700px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                        {customerOrders.length === 0 ? (
                                            <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No orders placed yet.</div>
                                        ) : (
                                            customerOrders.map(order => (
                                                <div key={order.id} style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: '12px', border: editingOrderId === order.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))', transition: 'all 0.2s' }}>
                                                    {editingOrderId === order.id ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>Editing Order #{order.id}</div>
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    <button onClick={() => setEditingOrderId(null)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Cancel</button>
                                                                    <button onClick={handleUpdateOrder} disabled={isUpdating} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'hsl(var(--success))', border: 'none' }}>
                                                                        {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="admin-grid-2" style={{ gap: '1rem' }}>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem' }}>TOTAL AMOUNT (₹)</label>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            value={editedOrderData.total_amount}
                                                                            onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                                            onChange={(e) => setEditedOrderData({ ...editedOrderData, total_amount: e.target.value })}
                                                                            style={{ width: '100%', padding: '0.5rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', color: 'hsl(var(--text-main))' }}
                                                                        />
                                                                </div>
                                                                <div>
                                                                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem' }}>PAYMENT METHOD</label>
                                                                    <select
                                                                        value={editedOrderData.payment_method}
                                                                        onChange={(e) => setEditedOrderData({ ...editedOrderData, payment_method: e.target.value })}
                                                                        style={{ width: '100%', padding: '0.5rem', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '6px', color: 'hsl(var(--text-main))' }}
                                                                    >
                                                                        {['CASH ON DELIVERY', 'UPI', 'BANK TRANSFER', 'PREPAID'].map(m => <option key={m} value={m}>{m}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem' }}>ORDER STATUS</label>
                                                                <select
                                                                    value={editedOrderData.status}
                                                                    onChange={(e) => setEditedOrderData({ ...editedOrderData, status: e.target.value })}
                                                                    className={`badge ${getStatusReference(editedOrderData.status)}`}
                                                                    style={{ width: '100%', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}
                                                                >
                                                                    {['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
                                                                        <option key={s} value={s}>{s}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'hsl(var(--text-main))', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <a href={`/admin/orders?orderId=${order.id}`} style={{ color: 'hsl(var(--primary))', textDecoration: 'none', fontWeight: 700 }}>#{order.id}</a>
                                                                    <button onClick={(e) => { e.stopPropagation(); startEditingOrder(order); }} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }} title="Edit Order">
                                                                        <Edit2 size={12} />
                                                                    </button>
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{order.payment_method} • ₹{order.total_amount.toLocaleString()}</div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                <select
                                                                    value={order.status}
                                                                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                                                    className={`badge ${getStatusReference(order.status)}`}
                                                                    style={{ border: 'none', cursor: 'pointer', appearance: 'none', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.7rem', textAlignColor: 'inherit' }}
                                                                >
                                                                    {['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
                                                                        <option key={s} value={s}>{s}</option>
                                                                    ))}
                                                                </select>
                                                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                                    <RefreshCw size={10} /> Quick Status
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}

                            <div className="admin-header-row">

                                <div>
                                    <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Customers</h1>
                                    <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>All registered customers from Website & WhatsApp • {customers.length} total</p>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {/* Toolbar controls moved to the list card header for a more contextual experience */}
                                </div>
                            </div>

                            {/* ─── ANALYTICS VIEW ─── */}
                            {viewMode === 'analytics' && (
                                <div className="animate-enter" style={{ paddingBottom: '3rem' }}>
                                    {/* Analytics Header with Back Button */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                        <button onClick={() => setViewMode('list')} className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ArrowLeft size={18} />
                                        </button>
                                        <div>
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Customer Analytics</h2>
                                            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>Detailed insights into customer behavior and retention</p>
                                        </div>
                                    </div>

                                    {/* Time Filters */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', background: 'hsl(var(--bg-card))', padding: '4px', borderRadius: '12px', width: 'fit-content', border: '1px solid hsl(var(--border-subtle))' }}>
                                        {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                                            <button key={r} onClick={() => setTimeRange(r)} style={{
                                                padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                                background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                                                color: timeRange === r ? 'white' : 'hsl(var(--text-muted))'
                                            }}>{r}</button>
                                        ))}
                                    </div>

                                    <div className="admin-grid-2" style={{ marginBottom: '1.5rem' }}>
                                        {/* Tier Distribution */}
                                        <div className="card shadow-premium" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Award size={20} color="#f59e0b" /> Loyalty Segmentation
                                            </h3>
                                            <div style={{ height: '300px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={analyticsData.tierData}
                                                            innerRadius={70}
                                                            outerRadius={100}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {analyticsData.tierData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Repeat vs New */}
                                        <div className="card shadow-premium" style={{ padding: '2rem' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <TrendingUp size={20} color="hsl(var(--primary))" /> Repeat Purchase Rate
                                            </h3>
                                            <div style={{ height: '300px' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={analyticsData.repeatData}
                                                            innerRadius={70}
                                                            outerRadius={100}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {analyticsData.repeatData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Growth Chart */}
                                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <TrendingUp size={18} color="hsl(var(--success))" /> New Customer Acquisition
                                        </h3>
                                        <div style={{ height: '300px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analyticsData.growthData}>
                                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-muted))' }} />
                                                    <Tooltip
                                                        contentStyle={{ background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }}
                                                    />
                                                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={50} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {viewMode === 'list' && (
                                <>



                                    {/* Stats */}

                                    <div className="admin-grid-3">

                                        {[

                                            { label: 'Total Customers', value: customers.length, icon: '👥', color: 'hsl(var(--primary))' },

                                            { label: 'Average Spend', value: `₹${customers.length ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length).toLocaleString() : 0}`, icon: '💰', color: 'hsl(var(--success))' },

                                            { label: 'Repeat Customers', value: customers.filter(c => c.totalOrders > 1).length, icon: '🔄', color: 'hsl(var(--warning))' },

                                        ].map((stat, i) => (

                                            <div key={i} className="card" style={{

                                                padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'

                                            }}>

                                                <div>

                                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>

                                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', fontFamily: 'var(--font-heading)' }}>{stat.value}</div>

                                                </div>

                                                <div style={{

                                                    fontSize: '1.5rem', width: '48px', height: '48px', borderRadius: '50%',

                                                    background: `hsl(from ${stat.color} h s l / 0.1)`, color: stat.color,

                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'

                                                }}>{stat.icon}</div>

                                            </div>

                                        ))}

                                    </div>



                                    {/* Customer List */}
                                    <div className="card" style={{ padding: 0 }}>
                                        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                                                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                                <input
                                                    type="text" placeholder="Search by name or phone..."
                                                    value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCustomersPage(1); }}
                                                    className="admin-input"
                                                    style={{ paddingLeft: '2.75rem', width: '100%' }}
                                                />
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                {/* Status Filter Dropdown */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>Status:</span>
                                                    <div style={{ position: 'relative', minWidth: '180px' }}>
                                                        <Filter size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', pointerEvents: 'none' }} />
                                                        <select
                                                            value={filterMode}
                                                            onChange={(e) => { setFilterMode(e.target.value); setCustomersPage(1); }}
                                                            className="admin-input"
                                                            style={{ paddingLeft: '2.5rem', paddingRight: '2rem', width: '100%', height: '42px', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
                                                        >
                                                            <option value="ALL">All Customers ({customers.length})</option>
                                                            <option value="ORDERED">Ordered ({customers.filter(c => c.totalOrders > 0).length})</option>
                                                            <option value="UNORDERED">Unordered ({customers.filter(c => c.totalOrders === 0).length})</option>
                                                        </select>
                                                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', pointerEvents: 'none' }} />
                                                    </div>
                                                </div>

                                                {/* View Toggle */}
                                                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', borderRadius: '12px', padding: '4px', height: 'fit-content' }}>
                                                    <button
                                                        onClick={() => setViewMode('list')}
                                                        style={{
                                                            padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                            fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s',
                                                            background: viewMode === 'list' ? 'hsl(var(--primary))' : 'transparent',
                                                            color: viewMode === 'list' ? 'white' : 'hsl(var(--text-muted))',
                                                            display: 'flex', alignItems: 'center', gap: '8px'
                                                        }}><ShoppingCart size={16} /> List View</button>
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
                                        </div>

                                        <table style={{ margin: 0 }}>
                                            <thead>
                                                <tr>
                                                    <th>Customer</th>
                                                    <th>Phone</th>
                                                    <th style={{ textAlign: 'center' }}>Orders</th>
                                                    <th style={{ textAlign: 'right' }}>Total Spent</th>
                                                    <th style={{ textAlign: 'center' }}>Tier</th>
                                                    <th style={{ textAlign: 'left' }}>Last Order</th>
                                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCustomers.length === 0 ? (
                                                    <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No customers found.</td></tr>
                                                ) : (
                                                    paginatedCustomers.map((customer, i) => {
                                                        const tier = getTierBadge(customer.totalSpent);
                                                        return (
                                                            <tr key={customer.phone} onClick={() => openCustomerDetail(customer)}>
                                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                                    <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>{customer.name}</div>
                                                                </td>
                                                                <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>{customer.phone}</td>
                                                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{customer.totalOrders}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'hsl(var(--text-main))' }}>₹{customer.totalSpent.toLocaleString()}</td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <span className={tier.className} style={tier.style}>{tier.label}</span>
                                                                </td>
                                                                <td style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                                                    {new Date(customer.lastOrder).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                <td style={{ textAlign: 'right' }}>
                                                                    <a href={`https://wa.me/${customer.phone}`} target="_self"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="btn"
                                                                        style={{
                                                                            padding: '0.4rem 0.8rem', fontSize: '0.75rem',
                                                                            background: 'hsl(var(--success) / 0.1)', color: 'hsl(var(--success))',
                                                                            border: '1px solid hsl(var(--success) / 0.2)',
                                                                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                                                                        }}>
                                                                        <MessageCircle size={14} /> Chat
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

export default CustomersPage;

