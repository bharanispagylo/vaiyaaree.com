'use client';

import React, { useState, useEffect } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';

// Helpers & Constants
import { 
    ORDERS_PER_PAGE,
    formatDisplayPhoneNumber, 
    parseStructuredAddress, 
    prepareOrderForEditing, 
    enrichOrderItems,
    buildOrderSearchOrCondition
} from './utils/ordersHelpers';

// Subcomponents & Views
import OrdersListView from './components/OrdersListView';
import OrderDetailView from './components/OrderDetailView';
import AddManualOrderView from './components/AddManualOrderView';

// Modals
import QuickOrderInfoModal from './components/modals/QuickOrderInfoModal';
import CourierShippingModal from './components/modals/CourierShippingModal';
import SendNotificationModal from './components/modals/SendNotificationModal';
import ItemReturnModal from './components/modals/ItemReturnModal';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';
import BulkActionBar from './components/modals/BulkActionBar';
import PrintPreviewModal from './components/modals/PrintPreviewModal';

export default function OrdersPage() {
    // Core List State
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

    // Selection & Bulk Actions
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [printingOrders, setPrintingOrders] = useState([]);
    const [printMode, setPrintMode] = useState('address');
    const [isPrintingLabels, setIsPrintingLabels] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    // Selected Order Detail View
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [isEditingItems, setIsEditingItems] = useState(false);
    const [orderActivityLogs, setOrderActivityLogs] = useState([]);
    const [statusConfirmModal, setStatusConfirmModal] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [returningItem, setReturningItem] = useState(null);
    const [returnQty, setReturnQty] = useState(1);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Courier & Shipping Modals
    const [showShippingForm, setShowShippingForm] = useState(false);
    const [couriers, setCouriers] = useState([]);
    const [selectedCourierId, setSelectedCourierId] = useState('');
    const [savingCourier, setSavingCourier] = useState(false);
    const [isCourierSaved, setIsCourierSaved] = useState(false);
    const [isCourierFromTable, setIsCourierFromTable] = useState(false);
    const [courierModalError, setCourierModalError] = useState('');
    const [shippingForm, setShippingForm] = useState({
        courier_name: '',
        tracking_number: '',
        tracking_url: ''
    });

    // Notification Dispatch Modals
    const [showSendNotificationModal, setShowSendNotificationModal] = useState(false);
    const [sendWhatsAppChecked, setSendWhatsAppChecked] = useState(true);
    const [sendEmailChecked, setSendEmailChecked] = useState(true);
    const [notificationPhone, setNotificationPhone] = useState('');
    const [notificationEmail, setNotificationEmail] = useState('');
    const [notificationSelection, setNotificationSelection] = useState(null);

    // Quick Info Modal
    const [infoModalOrder, setInfoModalOrder] = useState(null);

    // Manual Order Creation View
    const [isAddingOrder, setIsAddingOrder] = useState(false);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [allProducts, setAllProducts] = useState([]);
    const [shippingZones, setShippingZones] = useState([]);
    const [shippingMappings, setShippingMappings] = useState([]);
    const [newOrder, setNewOrder] = useState({
        customer_name: '',
        billing_email: '',
        billing_phone: '',
        billing_address: '',
        billing_city: '',
        billing_pincode: '',
        billing_state: 'Tamil Nadu',
        shipping_email: '',
        shipping_phone: '',
        shipping_address: '',
        shipping_city: '',
        shipping_pincode: '',
        shipping_state: 'Tamil Nadu',
        same_as_billing: true,
        payment_method: 'UPI',
        send_notifications: 'both',
        items: [],
        is_replacement: false,
        manual_shipping_cost: ''
    });

    // Toast Notification & App Init
    const [notification, setNotification] = useState(null);
    const [hasMounted, setHasMounted] = useState(false);

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [ordersPage]);

    // Reset to page 1 on filter/search change
    useEffect(() => { 
        setOrdersPage(1); 
    }, [debouncedSearchTerm, statusFilter, sourceFilter]);

    // Fetch counts and config
    const fetchOrderCounts = async () => {
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
    };

    const fetchOrders = async () => {
        setNotification(null);
        setCourierModalError('');
        setLoading(true);
        try {
            const from = (ordersPage - 1) * ORDERS_PER_PAGE;
            const to = ordersPage * ORDERS_PER_PAGE - 1;

            let query = mysqlClient
                .from('orders')
                .select('*', { count: 'exact' })
                .neq('status', 'DRAFT');

            // 1. Status Filter
            if (statusFilter !== 'ALL') {
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

            // Fetch total status counts dynamically
            fetchOrderCounts();
        } catch (error) {
            console.warn('Error fetching orders:', error?.message || error?.details || error);
        } finally {
            setLoading(false);
        }
    };

    const fetchShippingConfig = async () => {
        try {
            const [zonesRes, mappingsRes] = await Promise.all([
                mysqlClient.from('shipping_zones').select('*'),
                mysqlClient.from('shipping_zone_states').select('*')
            ]);
            setShippingZones(zonesRes.data || []);
            setShippingMappings(mappingsRes.data || []);
        } catch (err) {
            console.error('Failed to fetch shipping config:', err);
        }
    };

    const fetchAllProducts = async () => {
        const { data } = await mysqlClient.from('products').select('*').order('name');
        setAllProducts(data || []);
    };

    const fetchCouriers = async () => {
        try {
            const { data } = await mysqlClient.from('couriers').select('*').eq('is_active', true).order('name');
            setCouriers(data || []);
        } catch (err) {
            console.error('Fetch couriers error:', err);
        }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchShippingConfig();
        fetchAllProducts();
        fetchCouriers();

        const channel = mysqlClient
            .channel('orders_page')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
            .subscribe();

        const handleReset = () => {
            setSelectedOrder(null);
            setIsAddingOrder(false);
            setShowShippingForm(false);
            setIsEditingItems(false);
        };
        window.addEventListener('resetAdminView', handleReset);
        return () => {
            mysqlClient.removeChannel(channel);
            window.removeEventListener('resetAdminView', handleReset);
        };
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [ordersPage, debouncedSearchTerm, statusFilter, sourceFilter]);

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
    }, []);

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

    // Bulk Delete
    const handleBulkDelete = (idsToUse = null) => {
        const ids = Array.isArray(idsToUse) ? idsToUse : selectedOrderIds;
        if (!ids || !ids.length) return;
        setConfirmDelete({ ids });
    };

    const handleDeleteOrderConfirmed = async () => {
        if (!confirmDelete) return;
        const { ids } = confirmDelete;
        setConfirmDelete(null);

        setLoading(true);
        try {
            await mysqlClient.from('order_items').delete().in('order_id', ids);
            await mysqlClient.from('order_status_logs').delete().in('order_id', ids);

            const { error } = await mysqlClient
                .from('orders')
                .delete()
                .in('id', ids);

            if (error) throw error;

            setNotification({ type: 'success', message: `${ids.length} order(s) deleted successfully` });
            setSelectedOrderIds(prev => prev.filter(id => !ids.includes(id)));
            fetchOrders();
            setSelectedOrder(null);
        } catch (err) {
            console.error('Delete Error:', err);
            setNotification({ type: 'error', message: `Failed to delete order(s): ${err.message || 'Database error'}` });
        } finally {
            setLoading(false);
        }
    };

    // Order Detail & Quick Info Handlers
    const openOrderDetail = async (order) => {
        setNotification(null);
        setCourierModalError('');
        setLoading(true);
        setSelectedOrder(order);
        prepareOrderForEditing(order);
        try {
            const [{ data: rawItems }, { data: logs }] = await Promise.all([
                mysqlClient.from('order_items').select('*').eq('order_id', order.id),
                mysqlClient.from('order_status_logs').select('*').eq('order_id', order.id).order('created_at', { ascending: true })
            ]);

            const enriched = await enrichOrderItems(rawItems, allProducts, setAllProducts);
            setOrderItems(enriched);
            setOrderActivityLogs(logs || []);
        } catch (err) {
            console.error('openOrderDetail error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenQuickInfo = async (order) => {
        setInfoModalOrder({ ...order, items: null });
        const { data: rawItems } = await mysqlClient.from('order_items').select('*').eq('order_id', order.id);
        const enriched = await enrichOrderItems(rawItems, allProducts, setAllProducts);
        setInfoModalOrder(prev => prev && prev.id === order.id ? { ...prev, items: enriched } : prev);
    };

    // Courier Assignment Modal Handlers
    const openCourierModal = (order, fromTable = false) => {
        if (!order || ['CANCELLED', 'REFUNDED', 'REFUND_REQUESTED'].includes((order.status || '').toUpperCase())) {
            return;
        }
        setSelectedOrder(order);
        setIsCourierFromTable(fromTable);
        setIsCourierSaved(false);
        setCourierModalError('');
        setNotification(null);
        setShippingForm({
            courier_name: order.courier_name || '',
            tracking_number: order.tracking_number || '',
            tracking_url: order.tracking_url || ''
        });
        const matched = couriers.find(c => c.name === order.courier_name);
        setSelectedCourierId(matched ? matched.id : (order.courier_name ? 'CUSTOM' : ''));
        setShowShippingForm(true);
    };

    const handleSaveCourier = async () => {
        if (!selectedOrder) return;

        if (!selectedCourierId || !shippingForm.courier_name?.trim()) {
            setCourierModalError('Please choose a courier partner.');
            setNotification({ message: 'Please select a courier partner first.', type: 'error' });
            setTimeout(() => setNotification(null), 3500);
            return;
        }

        if (!shippingForm.tracking_number || !shippingForm.tracking_number.trim()) {
            setCourierModalError('AWB / Tracking ID is required.');
            setNotification({ message: 'AWB / Tracking ID is required. Please fill in the Tracking ID.', type: 'error' });
            setTimeout(() => setNotification(null), 3500);
            return;
        }

        setCourierModalError('');
        setSavingCourier(true);
        setNotification({ message: 'Saving courier details & updating order status...', type: 'info' });

        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const response = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    status: 'SHIPPED',
                    courierName: shippingForm.courier_name.trim(),
                    trackingNumber: shippingForm.tracking_number.trim(),
                    trackingUrl: shippingForm.tracking_url,
                    notes: `Shipped via ${shippingForm.courier_name.trim()}`
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to update status');
            }

            // Fetch fresh order & fresh status logs from DB
            const orderIdToSync = selectedOrder.id;
            const [{ data: freshOrder }, { data: updatedLogs }] = await Promise.all([
                mysqlClient.from('orders').select('*').eq('id', orderIdToSync).single(),
                mysqlClient.from('order_status_logs').select('*').eq('order_id', orderIdToSync).order('created_at', { ascending: true })
            ]);

            if (freshOrder) {
                setSelectedOrder(freshOrder);
            } else {
                setSelectedOrder(prev => ({
                    ...prev,
                    courier_name: shippingForm.courier_name.trim(),
                    tracking_number: shippingForm.tracking_number.trim(),
                    tracking_url: shippingForm.tracking_url,
                    status: 'SHIPPED'
                }));
            }

            if (updatedLogs) {
                setOrderActivityLogs(updatedLogs);
            }

            setNotification({ message: 'Tracking ID saved & Order status updated to SHIPPED successfully!', type: 'success' });
            setIsCourierSaved(true);
            fetchOrders();
        } catch (err) {
            console.error('Courier save error:', err);
            setNotification({ message: `Save failed: ${err.message || 'Unknown error'}`, type: 'error' });
        } finally {
            setSavingCourier(false);
            setTimeout(() => setNotification(null), 4000);
        }
    };

    // Open Send Notification Helper
    const handleOpenSendInfo = (order, fromTable = true) => {
        setSelectedOrder(order);
        setIsCourierFromTable(fromTable);
        const phoneToUse = order.customer_phone || (typeof order.billing_address === 'object' ? order.billing_address?.phone : null) || '';
        const bEmail = order.billing_email || (typeof order.billing_address === 'object' ? order.billing_address?.email : null) || order.customer_email || '';
        const sEmail = order.shipping_email || (typeof order.shipping_address === 'object' ? order.shipping_address?.email : null) || '';
        const emailToUse = bEmail || sEmail;
        
        setNotificationPhone(formatDisplayPhoneNumber(phoneToUse));
        setNotificationEmail(emailToUse);
        setSendWhatsAppChecked(true);
        setSendEmailChecked(true);
        setShowSendNotificationModal(true);
    };

    const handleSendManualNotifications = async () => {
        if (!selectedOrder) return;
        setLoading(true);
        try {
            const finalPhone = notificationPhone.trim();
            const finalEmail = notificationEmail.trim();

            if (sendWhatsAppChecked && !finalPhone) {
                setNotification({ message: 'No phone number selected for WhatsApp.', type: 'error' });
                setLoading(false);
                return;
            }
            if (sendEmailChecked && !finalEmail) {
                setNotification({ message: 'No email address selected for Email.', type: 'error' });
                setLoading(false);
                return;
            }

            const res = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    sendWhatsApp: sendWhatsAppChecked,
                    sendEmail: sendEmailChecked,
                    targetPhone: sendWhatsAppChecked ? finalPhone : undefined,
                    targetEmail: sendEmailChecked ? finalEmail : undefined
                })
            });

            if (res.ok) {
                const sentList = [];
                if (sendWhatsAppChecked) sentList.push('WhatsApp');
                if (sendEmailChecked) sentList.push('Email');
                
                let toastMsg = 'Notifications sent successfully';
                if (sentList.length === 2) {
                    toastMsg = 'Notification sent to WhatsApp and Email';
                } else if (sentList.length === 1) {
                    toastMsg = `Notification sent to ${sentList[0]}`;
                }
                
                setNotification({ message: toastMsg, type: 'success' });
                setShowSendNotificationModal(false);
            } else {
                const data = await res.json();
                setNotification({ message: `Failed: ${data.message || data.error}`, type: 'error' });
            }
        } catch (err) {
            console.error('Send Notifications Error:', err);
            setNotification({ message: 'Failed to send notifications', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleResendEmail = async (targetEmail = null) => {
        if (!selectedOrder) return;

        if (!targetEmail) {
            const bEmail = selectedOrder.billing_email || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.email : null) || selectedOrder.customer_email;
            const sEmail = selectedOrder.shipping_email || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.email : null);

            if (bEmail && sEmail && bEmail !== sEmail) {
                setNotificationSelection({ type: 'email', billing: bEmail, shipping: sEmail, orderId: selectedOrder.id });
                return;
            }
            targetEmail = bEmail || sEmail;
        }

        if (!targetEmail) {
            setNotification({ message: 'No email address found for this order.', type: 'error' });
            return;
        }

        setLoading(true);
        setNotificationSelection(null);
        try {
            const res = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: selectedOrder.id, sendEmail: true, targetEmail: targetEmail })
            });

            if (res.ok) {
                setNotification({ message: `Order confirmation email resent to ${targetEmail}`, type: 'success' });
            } else {
                const data = await res.json();
                setNotification({ message: `Failed: ${data.message || data.error}`, type: 'error' });
            }
        } catch (err) {
            console.error('Resend Email Error:', err);
            setNotification({ message: 'Failed to resend email', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleResendWhatsApp = async (targetPhone = null) => {
        if (!selectedOrder) return;

        if (!targetPhone) {
            const bPhone = selectedOrder.billing_phone || (typeof selectedOrder.billing_address === 'object' ? selectedOrder.billing_address?.phone : null) || selectedOrder.customer_phone;
            const sPhone = selectedOrder.shipping_phone || (typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.phone : null);

            if (bPhone && sPhone && bPhone !== sPhone) {
                setNotificationSelection({ type: 'whatsapp', billing: bPhone, shipping: sPhone, orderId: selectedOrder.id });
                return;
            }
            targetPhone = bPhone || sPhone;
        }

        if (!targetPhone) {
            setNotification({ message: 'No phone number found for this order.', type: 'error' });
            return;
        }

        setLoading(true);
        setNotificationSelection(null);
        try {
            const res = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: selectedOrder.id, sendWhatsApp: true, targetPhone: targetPhone })
            });

            if (res.ok) {
                setNotification({ message: `WhatsApp notification resent to ${targetPhone}`, type: 'success' });
            } else {
                const data = await res.json();
                setNotification({ message: `Failed: ${data.message || data.error}`, type: 'error' });
            }
        } catch (err) {
            console.error('Resend WhatsApp Error:', err);
            setNotification({ message: 'Failed to resend WhatsApp', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // Update Status Handler
    const updateOrderStatus = async (orderId, newStatus, shippingData = {}, targetPhone = null, extraNotes = null) => {
        if (isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId,
                    status: newStatus,
                    targetPhone,
                    notes: extraNotes || shippingData.notes,
                    ...shippingData
                })
            });

            const data = await res.json();
            if (res.ok) {
                // Fetch fresh order & fresh status logs from DB (server inserted log via NOW() in exact IST)
                const [{ data: freshOrder }, { data: updatedLogs }] = await Promise.all([
                    mysqlClient.from('orders').select('*').eq('id', orderId).single(),
                    mysqlClient.from('order_status_logs').select('*').eq('order_id', orderId).order('created_at', { ascending: true })
                ]);

                if (freshOrder) {
                    setSelectedOrder(freshOrder);
                } else {
                    const mappedShipping = {};
                    if (shippingData.courierName) mappedShipping.courier_name = shippingData.courierName;
                    if (shippingData.trackingNumber) mappedShipping.tracking_number = shippingData.trackingNumber;
                    if (shippingData.trackingUrl) mappedShipping.tracking_url = shippingData.trackingUrl;
                    setSelectedOrder(prev => prev ? {
                        ...prev,
                        status: newStatus,
                        ...mappedShipping
                    } : null);
                }

                if (updatedLogs) {
                    setOrderActivityLogs(updatedLogs);
                }

                fetchOrders();
                setNotification({
                    message: `Order updated to ${newStatus}`,
                    type: 'success'
                });
            } else {
                setNotification({ message: `Failed: ${data.error || data.message || 'Status update failed'}`, type: 'error' });
            }
        } catch (error) {
            console.error('[STATUS-UPDATE-ERROR]', error);
            setNotification({ message: 'Error updating status', type: 'error' });
        } finally {
            setIsUpdatingStatus(false);
            setTimeout(() => setNotification(null), 4000);
        }
    };

    // Item Edit Handlers
    const handleUpdateItem = (index, field, value) => {
        const newItems = [...orderItems];
        newItems[index][field] = value;
        setOrderItems(newItems);
    };

    const handleRemoveItem = (index) => {
        const newItems = orderItems.filter((_, i) => i !== index);
        setOrderItems(newItems);
    };

    const saveOrderEdits = async () => {
        try {
            setLoading(true);
            const subtotal = orderItems.reduce((sum, item) => sum + (item.quantity * item.price_at_time), 0);

            const shipObj = {
                name: selectedOrder.shipping_name || selectedOrder.customer_name || '',
                phone: selectedOrder.shipping_phone || selectedOrder.customer_phone || '',
                address: selectedOrder.shipping_address_line || '',
                city: selectedOrder.shipping_city || '',
                pincode: selectedOrder.shipping_pincode || '',
                state: selectedOrder.shipping_state || 'Tamil Nadu'
            };

            const billObj = {
                name: selectedOrder.billing_name || selectedOrder.customer_name || '',
                phone: selectedOrder.billing_phone || selectedOrder.customer_phone || '',
                address: selectedOrder.billing_address_line || '',
                city: selectedOrder.billing_city || '',
                pincode: selectedOrder.billing_pincode || '',
                state: selectedOrder.billing_state || selectedOrder.shipping_state || 'Tamil Nadu'
            };

            const formattedShipStr = [shipObj.name, shipObj.phone, shipObj.address, shipObj.city, shipObj.state, shipObj.pincode].filter(Boolean).join(', ');
            const formattedBillStr = [billObj.name, billObj.phone, billObj.address, billObj.city, billObj.state, billObj.pincode].filter(Boolean).join(', ');

            const state = selectedOrder.shipping_state || 'Tamil Nadu';
            const gstRate = 0.05;
            const tax = subtotal * gstRate;
            const shipping = selectedOrder.shipping_cost || 100;
            const total = subtotal + tax + shipping;

            let taxDetails = {};
            if (state === 'Tamil Nadu') {
                taxDetails = { cgst: tax / 2, sgst: tax / 2, igst: 0 };
            } else {
                taxDetails = { cgst: 0, sgst: 0, igst: tax };
            }

            const { error: orderError } = await mysqlClient.from('orders').update({
                customer_name: shipObj.name || selectedOrder.customer_name,
                customer_phone: shipObj.phone || selectedOrder.customer_phone,
                customer_email: selectedOrder.customer_email,
                billing_email: selectedOrder.customer_email,
                shipping_email: selectedOrder.customer_email,
                delivery_address: formattedShipStr || formattedBillStr,
                billing_address: billObj,
                shipping_address: shipObj,
                shipping_state: shipObj.state,
                subtotal,
                tax_amount: tax,
                total_amount: total,
                ...taxDetails
            }).eq('id', selectedOrder.id);

            if (orderError) throw orderError;

            await mysqlClient.from('order_items').delete().eq('order_id', selectedOrder.id);
            const { error: itemsError } = await mysqlClient.from('order_items').insert(
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

            setNotification({ message: 'Order items updated and totals recalculated', type: 'success' });
            setIsEditingItems(false);
            fetchOrders();
            const { data: updatedOrder } = await mysqlClient.from('orders').select('*').eq('id', selectedOrder.id).single();
            setSelectedOrder(updatedOrder);

        } catch (error) {
            console.error(error);
            setNotification({ message: 'Failed to save edits', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // Item Return & Cancel Handlers
    const handleReturnItem = async () => {
        if (!returningItem || returnQty < 1) return;

        const alreadyReturned = returningItem.returned_quantity || 0;
        const maxReturnable = returningItem.quantity - alreadyReturned;

        if (returnQty > maxReturnable) {
            setNotification({ message: `Cannot return more than ${maxReturnable} items.`, type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const matchCriteria = { order_id: selectedOrder.id, product_id: returningItem.product_id };
            if (returningItem.variant_id) matchCriteria.variant_id = returningItem.variant_id;

            const { error: itemError } = await mysqlClient
                .from('order_items')
                .update({ returned_quantity: alreadyReturned + returnQty })
                .match(matchCriteria);

            if (itemError) throw itemError;

            if (returningItem.variant_id) {
                const { data: variant } = await mysqlClient
                    .from('product_variants')
                    .select('stock')
                    .eq('id', returningItem.variant_id)
                    .single();
                if (variant) {
                    await mysqlClient
                        .from('product_variants')
                        .update({ stock: variant.stock + returnQty })
                        .eq('id', returningItem.variant_id);
                }
            } else {
                const { data: product } = await mysqlClient
                    .from('products')
                    .select('stock')
                    .eq('id', returningItem.product_id)
                    .single();
                if (product) {
                    await mysqlClient
                        .from('products')
                        .update({ stock: product.stock + returnQty })
                        .eq('id', returningItem.product_id);
                }
            }

            await mysqlClient.from('product_history').insert({
                product_id: returningItem.product_id,
                change_type: 'STOCK_IN',
                quantity_change: returnQty,
                reason: `Item Returned from Order #${selectedOrder.id}`
            });

            await mysqlClient.from('order_status_logs').insert({
                order_id: selectedOrder.id,
                status: 'PARTIAL_RETURN',
                notes: `Returned ${returnQty}x ${returningItem.product_name}`,
                created_at: new Date().toISOString()
            });

            await mysqlClient.from('refunds').insert({
                order_id: selectedOrder.id,
                amount: (returningItem.price_at_time || 0) * returnQty,
                reason: `Product Return: ${returningItem.product_name} (x${returnQty})`,
                status: 'REQUESTED'
            });

            setNotification({ message: 'Item return processed successfully.', type: 'success' });
            setReturningItem(null);
            setReturnQty(1);

            openOrderDetail(selectedOrder);
            fetchOrders();

        } catch (err) {
            console.error('Return Error:', err);
            setNotification({ message: 'Failed to process return', type: 'error' });
        } finally {
            setLoading(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedOrder || !cancelReason.trim() || isUpdatingStatus) return;

        setIsUpdatingStatus(true);
        setLoading(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch('/api/orders/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    status: 'CANCELLED',
                    cancelReason: cancelReason.trim(),
                    adminNotes: `Order cancelled by admin on ${new Date().toLocaleString()}. Reason: ${cancelReason.trim()}`,
                    notes: `Order cancelled. Reason: ${cancelReason.trim()}`
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to cancel order');
            }

            const { error: refundError } = await mysqlClient.from('refunds').insert({
                order_id: selectedOrder.id,
                amount: selectedOrder.total_amount || 0,
                reason: `Order Cancelled: ${cancelReason.trim()}`,
                status: 'REQUESTED'
            });

            if (refundError) {
                console.error('Refund tracking error:', refundError);
            }

            // Sync fresh order & fresh status logs from DB
            const orderIdToSync = selectedOrder.id;
            const [{ data: freshOrder }, { data: updatedLogs }] = await Promise.all([
                mysqlClient.from('orders').select('*').eq('id', orderIdToSync).single(),
                mysqlClient.from('order_status_logs').select('*').eq('order_id', orderIdToSync).order('created_at', { ascending: true })
            ]);

            if (freshOrder) setSelectedOrder(freshOrder);
            if (updatedLogs) setOrderActivityLogs(updatedLogs);

            setNotification({ message: 'Order cancelled and successfully updated', type: 'success' });
            setShowCancelModal(false);
            setCancelReason('');
            fetchOrders();

        } catch (err) {
            console.error('Cancel Error:', err);
            setNotification({ message: `Failed to cancel order: ${err.message || 'Error'}`, type: 'error' });
        } finally {
            setIsUpdatingStatus(false);
            setLoading(false);
            setTimeout(() => setNotification(null), 4000);
        }
    };

    // Label Print Handlers
    const handlePrintLabels = async (mode = 'address') => {
        setPrintMode(mode);
        setLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('orders')
                .select('*')
                .in('id', selectedOrderIds);
            if (error) throw error;
            setPrintingOrders(data || []);
            setIsPrintingLabels(true);
        } catch (err) {
            setNotification({ type: 'error', message: 'Failed to load orders for print' });
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

    const totalOrderPages = Math.ceil(totalCount / ORDERS_PER_PAGE);

    return (
        <>
            <div className="animate-enter" style={{
                width: '100%',
                maxWidth: '1500px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid hsl(var(--border-subtle))',
                borderRadius: '24px',
                background: '#ffffff',
                overflow: 'hidden',
                padding: '2rem'
            }}>
                <div className="no-print">
                    {/* 1. Main List View */}
                    {(!selectedOrder || isCourierFromTable) && !isAddingOrder && (
                        <OrdersListView
                            orders={orders}
                            loading={loading}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            sourceFilter={sourceFilter}
                            setSourceFilter={setSourceFilter}
                            orderCounts={statusCounts}
                            selectedOrder={selectedOrder}
                            selectedOrderIds={selectedOrderIds}
                            toggleSelectItem={toggleSelectItem}
                            toggleSelectAll={toggleSelectAll}
                            openOrderDetail={openOrderDetail}
                            openCourierModal={openCourierModal}
                            onOpenSendInfo={handleOpenSendInfo}
                            onOpenQuickInfo={handleOpenQuickInfo}
                            onDeleteOrder={handleBulkDelete}
                            ordersPage={ordersPage}
                            setOrdersPage={setOrdersPage}
                            totalOrderPages={totalOrderPages}
                            setIsAddingOrder={setIsAddingOrder}
                            fetchOrders={fetchOrders}
                        />
                    )}

                    {/* 2. Order Detail View */}
                    {selectedOrder && !isCourierFromTable && (
                        <OrderDetailView
                            selectedOrder={selectedOrder}
                            setSelectedOrder={setSelectedOrder}
                            orderItems={orderItems}
                            setOrderItems={setOrderItems}
                            isEditingItems={isEditingItems}
                            setIsEditingItems={setIsEditingItems}
                            orderActivityLogs={orderActivityLogs}
                            loading={loading}
                            allProducts={allProducts}
                            onBack={() => { setSelectedOrder(null); setOrderItems([]); setIsEditingItems(false); setNotification(null); }}
                            onSaveEdits={saveOrderEdits}
                            onCancelEdit={() => { setIsEditingItems(false); openOrderDetail(selectedOrder); }}
                            onPrepareEditing={() => prepareOrderForEditing(selectedOrder)}
                            onUpdateItem={handleUpdateItem}
                            onRemoveItem={handleRemoveItem}
                            onReturnItemClick={(item) => { setReturningItem(item); setReturnQty(1); }}
                            onUpdateStatus={updateOrderStatus}
                            openCourierModal={openCourierModal}
                            onOpenSendInfo={handleOpenSendInfo}
                            onDeleteOrder={handleBulkDelete}
                            onResendEmail={handleResendEmail}
                            onResendWhatsApp={handleResendWhatsApp}
                            statusConfirmModal={statusConfirmModal}
                            setStatusConfirmModal={setStatusConfirmModal}
                            showCancelModal={showCancelModal}
                            setShowCancelModal={setShowCancelModal}
                            cancelReason={cancelReason}
                            setCancelReason={setCancelReason}
                            handleCancelOrder={handleCancelOrder}
                            notificationSelection={notificationSelection}
                            setNotificationSelection={setNotificationSelection}
                            notification={notification}
                            isUpdatingStatus={isUpdatingStatus}
                        />
                    )}

                    {/* 3. Add Manual Order View */}
                    {isAddingOrder && (
                        <AddManualOrderView
                            isAddingOrder={isAddingOrder}
                            setIsAddingOrder={setIsAddingOrder}
                            newOrder={newOrder}
                            setNewOrder={setNewOrder}
                            allProducts={allProducts}
                            productSearch={productSearch}
                            setProductSearch={setProductSearch}
                            shippingZones={shippingZones}
                            shippingMappings={shippingMappings}
                            isCreatingOrder={isCreatingOrder}
                            setIsCreatingOrder={setIsCreatingOrder}
                            setNotification={setNotification}
                            fetchOrders={fetchOrders}
                        />
                    )}
                </div>
            </div>

            {/* Modals & Overlays */}
            <QuickOrderInfoModal
                infoModalOrder={infoModalOrder}
                onClose={() => setInfoModalOrder(null)}
                allProducts={allProducts}
            />

            <CourierShippingModal
                show={showShippingForm}
                selectedOrder={selectedOrder}
                couriers={couriers}
                selectedCourierId={selectedCourierId}
                setSelectedCourierId={setSelectedCourierId}
                shippingForm={shippingForm}
                setShippingForm={setShippingForm}
                courierModalError={courierModalError}
                setCourierModalError={setCourierModalError}
                savingCourier={savingCourier}
                isCourierSaved={isCourierSaved}
                onClose={() => {
                    setShowShippingForm(false);
                    if (isCourierFromTable) setSelectedOrder(null);
                    setIsCourierFromTable(false);
                    setCourierModalError('');
                    setNotification(null);
                }}
                onClearNotification={() => setNotification(null)}
                onSaveCourier={handleSaveCourier}
                onSendInfoClick={() => {
                    setShowShippingForm(false);
                    handleOpenSendInfo(selectedOrder, false);
                }}
            />

            <SendNotificationModal
                show={showSendNotificationModal}
                onClose={() => {
                    setShowSendNotificationModal(false);
                    if (isCourierFromTable) setSelectedOrder(null);
                    setIsCourierFromTable(false);
                }}
                sendWhatsAppChecked={sendWhatsAppChecked}
                setSendWhatsAppChecked={setSendWhatsAppChecked}
                sendEmailChecked={sendEmailChecked}
                setSendEmailChecked={setSendEmailChecked}
                notificationPhone={notificationPhone}
                setNotificationPhone={setNotificationPhone}
                notificationEmail={notificationEmail}
                setNotificationEmail={setNotificationEmail}
                onSendNotifications={async () => {
                    await handleSendManualNotifications();
                    if (isCourierFromTable) setSelectedOrder(null);
                    setIsCourierFromTable(false);
                }}
                loading={loading}
            />

            <ItemReturnModal
                returningItem={returningItem}
                setReturningItem={setReturningItem}
                returnQty={returnQty}
                setReturnQty={setReturnQty}
                onConfirmReturn={handleReturnItem}
            />

            <DeleteConfirmModal
                confirmDelete={confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDeleteOrderConfirmed}
            />

            <BulkActionBar
                selectedOrderIds={selectedOrderIds}
                setSelectedOrderIds={setSelectedOrderIds}
                onPrintAddressLabels={() => handlePrintLabels('address')}
                onPrintIdLabels={() => handlePrintLabels('id')}
                onBulkDelete={handleBulkDelete}
            />

            <PrintPreviewModal
                show={isPrintingLabels}
                printingOrders={printingOrders}
                printMode={printMode}
                onClose={() => setIsPrintingLabels(false)}
            />

            {/* Global Toast Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem', zIndex: 200000,
                    padding: '1rem 2.5rem', borderRadius: '15px',
                    background: (notification.type === 'success' || notification.type === 'info') ? 'hsl(142, 70%, 45%)' : 'hsl(0, 84%, 60%)',
                    color: 'white', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    animation: 'slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}>
                    <div className="animate-spin-slow">
                        {notification.type === 'info' && <Loader2 size={16} />}
                        {notification.type === 'success' && <CheckCircle size={16} />}
                        {notification.type === 'error' && <AlertCircle size={16} />}
                    </div>
                    <span style={{ flex: 1 }}>{notification.message}</span>
                    <button
                        type="button"
                        onClick={() => setNotification(null)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            marginLeft: '8px'
                        }}
                        title="Dismiss"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
                @media print {
                    .no-print { display: none !important; }
                    html, body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    .print-preview-modal { 
                        position: static !important; 
                        display: block !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    .admin-layout, .main-content, .animate-enter, .admin-layout > div {
                        display: block !important;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        position: static !important;
                    }
                }
            `}</style>
        </>
    );
}
