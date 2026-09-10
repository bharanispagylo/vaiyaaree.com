'use client';

import { useState, useEffect, useCallback } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { 
    ORDERS_PER_PAGE, 
    enrichOrderItems, 
    buildOrderSearchOrCondition, 
    prepareOrderForEditing 
} from '../utils/ordersHelpers';

export function useOrdersManager() {
    // List & Filter States
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [ordersPage, setOrdersPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [statusCounts, setStatusCounts] = useState({
        ALL: 0, PLACED: 0, AWAITING_PAYMENT: 0, PAID: 0, PACKING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0, REFUNDED: 0
    });

    // Selection State
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);

    // Active Selected Order
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [isEditingItems, setIsEditingItems] = useState(false);
    const [orderActivityLogs, setOrderActivityLogs] = useState([]);

    // Catalog & Shipping Cache
    const [allProducts, setAllProducts] = useState([]);
    const [shippingZones, setShippingZones] = useState([]);
    const [shippingMappings, setShippingMappings] = useState([]);

    // Global Notification
    const [notification, setNotification] = useState(null);

    // Auto-dismiss transient toast notifications (error & success)
    useEffect(() => {
        if (notification && notification.type !== 'info') {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Scroll to top on page change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [ordersPage]);

    // Reset to page 1 on filter/search change
    useEffect(() => { 
        setOrdersPage(1); 
    }, [debouncedSearchTerm, statusFilter, sourceFilter]);

    // Fetch counts and config
    const fetchOrderCounts = useCallback(async () => {
        try {
            const { data, error } = await mysqlClient
                .from('orders')
                .select('status')
                .neq('status', 'DRAFT');
            if (error) throw error;
            if (data) {
                const totalOrders = data.length;
                const pendingOrders = data.filter(o => ['PLACED', 'AWAITING_PAYMENT', 'PENDING', 'PENDING_VERIFICATION', 'PACKING'].includes(o.status)).length;
                const cancelledOrders = data.filter(o => o.status === 'CANCELLED').length;
                const returnOrders = data.filter(o => ['REFUNDED', 'REFUND_REQUESTED', 'RETURNED', 'PARTIAL_RETURN'].includes(o.status) || (o.status || '').toUpperCase().includes('RETURN') || (o.status || '').toUpperCase().includes('REFUND')).length;

                const counts = {
                    ALL: totalOrders,
                    TOTAL: totalOrders,
                    PENDING: pendingOrders,
                    PLACED: data.filter(o => o.status === 'PLACED').length,
                    'AWAITING_PAYMENT': data.filter(o => o.status === 'AWAITING_PAYMENT' || o.status === 'PENDING' || o.status === 'PENDING_VERIFICATION').length,
                    PAID: data.filter(o => o.status === 'PAID').length,
                    PACKING: data.filter(o => o.status === 'PACKING').length,
                    SHIPPED: data.filter(o => o.status === 'SHIPPED').length,
                    DELIVERED: data.filter(o => o.status === 'DELIVERED').length,
                    CANCELLED: cancelledOrders,
                    REFUNDED: returnOrders,
                    RETURNED: returnOrders,
                    RETURN_ORDERS: returnOrders,
                };
                setStatusCounts(counts);
            }
        } catch (err) {
            console.warn('Counts fetch warning:', err?.message || err?.details || err);
        }
    }, []);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const from = (ordersPage - 1) * ORDERS_PER_PAGE;
            const to = ordersPage * ORDERS_PER_PAGE - 1;

            let query = mysqlClient
                .from('orders')
                .select('*', { count: 'exact' })
                .neq('status', 'DRAFT');

            // 1. Status Filter
            if (statusFilter !== 'ALL' && statusFilter !== 'TOTAL') {
                if (statusFilter === 'AWAITING_PAYMENT') {
                    query = query.or('status.eq.AWAITING_PAYMENT,status.eq.PENDING,status.eq.PENDING_VERIFICATION');
                } else if (statusFilter === 'PENDING') {
                    query = query.or('status.eq.PLACED,status.eq.AWAITING_PAYMENT,status.eq.PENDING,status.eq.PENDING_VERIFICATION,status.eq.PACKING');
                } else if (statusFilter === 'REFUNDED' || statusFilter === 'RETURNED' || statusFilter === 'RETURN_ORDERS') {
                    query = query.or('status.eq.REFUNDED,status.eq.REFUND_REQUESTED,status.eq.RETURNED,status.eq.PARTIAL_RETURN');
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            // 2. Source Filter
            if (sourceFilter !== 'ALL') {
                if (sourceFilter === 'WEBSITE') {
                    query = query.or('source.eq.WEBSITE,source.eq.WEB,id.ilike.WEB-%');
                } else if (sourceFilter === 'MANUAL') {
                    query = query.or('source.eq.MANUAL,source.eq.MAN,id.ilike.MAN-%');
                } else if (sourceFilter === 'WHATSAPP') {
                    query = query.or('source.eq.WHATSAPP,source.eq.WA,source.is.null,id.ilike.ORD-%');
                }
            }

            // 3. Search Term
            if (debouncedSearchTerm.trim()) {
                const searchOrCond = buildOrderSearchOrCondition(debouncedSearchTerm);
                if (searchOrCond) {
                    query = query.or(searchOrCond);
                }
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            setOrders(data || []);
            setTotalCount(count || 0);

            // Dynamically refresh status counts
            fetchOrderCounts();
        } catch (error) {
            console.warn('Error fetching orders:', error?.message || error?.details || error);
        } finally {
            setLoading(false);
        }
    }, [ordersPage, debouncedSearchTerm, statusFilter, sourceFilter, fetchOrderCounts]);

    const fetchShippingConfig = useCallback(async () => {
        try {
            const [zonesRes, mappingsRes] = await Promise.all([
                mysqlClient.from('shipping_zones').select('*'),
                mysqlClient.from('shipping_zone_states').select('*')
            ]);
            if (zonesRes.data) setShippingZones(zonesRes.data);
            if (mappingsRes.data) setShippingMappings(mappingsRes.data);
        } catch (e) {
            console.warn('Shipping zones config warning:', e.message);
        }
    }, []);

    // Initial load and filter sync
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        fetchShippingConfig();
    }, [fetchShippingConfig]);

    // Open single order details and enrich items
    const openOrderDetail = useCallback(async (order) => {
        setNotification(null);
        setLoading(true);
        setSelectedOrder(order);
        prepareOrderForEditing(order);
        try {
            const [{ data: rawItems }, { data: logs }, { data: freshOrder }] = await Promise.all([
                mysqlClient.from('order_items').select('*').eq('order_id', order.id),
                mysqlClient.from('order_status_logs').select('*').eq('order_id', order.id).order('created_at', { ascending: true }),
                mysqlClient.from('orders').select('*').eq('id', order.id).single()
            ]);

            if (freshOrder) {
                setSelectedOrder(freshOrder);
            }

            const enriched = await enrichOrderItems(rawItems || [], allProducts, setAllProducts);
            setOrderItems(enriched);
            setOrderActivityLogs(logs || []);
        } catch (err) {
            console.error('openOrderDetail error:', err);
        } finally {
            setLoading(false);
        }
    }, [allProducts]);

    // Handle opening order from URL query param (?id=xxx or ?orderId=xxx)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const queryId = params.get('id') || params.get('orderId');
            if (queryId) {
                const numericId = parseInt(queryId, 10);
                if (!isNaN(numericId)) {
                    setSearchTerm(String(numericId));
                    mysqlClient
                        .from('orders')
                        .select('*, customers(name, email, phone)')
                        .eq('id', numericId)
                        .single()
                        .then(({ data, error }) => {
                            if (data && !error) {
                                openOrderDetail(data);
                            }
                        })
                        .catch(err => console.error('[OrdersPage] Error opening order from URL param:', err));
                }
            }
        }
    }, [openOrderDetail]);

    // Selection Handlers
    const toggleSelectItem = (id) => {
        setSelectedOrderIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedOrderIds.length === orders.length && orders.length > 0) {
            setSelectedOrderIds([]);
        } else {
            setSelectedOrderIds(orders.map(o => o.id));
        }
    };

    const totalOrderPages = Math.ceil(totalCount / ORDERS_PER_PAGE) || 1;

    return {
        orders,
        setOrders,
        loading,
        setLoading,
        searchTerm,
        setSearchTerm,
        debouncedSearchTerm,
        statusFilter,
        setStatusFilter,
        sourceFilter,
        setSourceFilter,
        ordersPage,
        setOrdersPage,
        totalCount,
        totalOrderPages,
        statusCounts,
        selectedOrderIds,
        setSelectedOrderIds,
        selectedOrder,
        setSelectedOrder,
        orderItems,
        setOrderItems,
        isEditingItems,
        setIsEditingItems,
        orderActivityLogs,
        setOrderActivityLogs,
        allProducts,
        setAllProducts,
        shippingZones,
        shippingMappings,
        notification,
        setNotification,
        fetchOrders,
        fetchOrderCounts,
        openOrderDetail,
        toggleSelectItem,
        toggleSelectAll
    };
}
