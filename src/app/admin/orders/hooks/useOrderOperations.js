'use client';

import { useState, useEffect, useCallback } from 'react';
import { mysqlClient } from '@/lib/mysqlClient';
import { formatDisplayPhoneNumber, enrichOrderItems } from '../utils/ordersHelpers';

export function useOrderOperations({
    selectedOrder,
    setSelectedOrder,
    orderItems,
    setOrderItems,
    setIsEditingItems,
    setOrderActivityLogs,
    setNotification,
    fetchOrders,
    selectedOrderIds,
    setSelectedOrderIds,
    allProducts,
    setAllProducts,
    openOrderDetail
}) {
    // Status update states
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [statusConfirmModal, setStatusConfirmModal] = useState(null);

    // Courier & Shipping states
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

    // Notification states
    const [showSendNotificationModal, setShowSendNotificationModal] = useState(false);
    const [sendWhatsAppChecked, setSendWhatsAppChecked] = useState(true);
    const [sendEmailChecked, setSendEmailChecked] = useState(true);
    const [notificationPhone, setNotificationPhone] = useState('');
    const [notificationEmail, setNotificationEmail] = useState('');
    const [notificationSelection, setNotificationSelection] = useState(null);

    // Item return & cancellation states
    const [returningItem, setReturningItem] = useState(null);
    const [returnQty, setReturnQty] = useState(1);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    // Quick info & print states
    const [infoModalOrder, setInfoModalOrder] = useState(null);
    const [printingOrders, setPrintingOrders] = useState([]);
    const [printMode, setPrintMode] = useState('address');
    const [isPrintingLabels, setIsPrintingLabels] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    // Load active couriers
    useEffect(() => {
        const fetchCouriers = async () => {
            try {
                const { data } = await mysqlClient.from('couriers').select('*').eq('is_active', true).order('name');
                setCouriers(data || []);
            } catch (err) {
                console.error('Fetch couriers error:', err);
            }
        };
        fetchCouriers();
    }, []);

    // 1. Status Update
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
                const notifyMsg = data.refund?.message || `Order updated to ${newStatus}`;
                setNotification({
                    message: notifyMsg,
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

    // 2. Courier Assignment
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

        if (!selectedCourierId) {
            setCourierModalError('Please choose a courier partner.');
            setNotification({ message: 'Please select a courier partner first.', type: 'error' });
            setTimeout(() => setNotification(null), 3500);
            return;
        }

        if (selectedCourierId === 'CUSTOM' && !shippingForm.courier_name?.trim()) {
            setCourierModalError('Courier name is required.');
            setNotification({ message: 'Please enter the custom courier name.', type: 'error' });
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

    // 3. Notifications Dispatch
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
        try {
            const finalPhone = notificationPhone.trim();
            const finalEmail = notificationEmail.trim();

            if (sendWhatsAppChecked && !finalPhone) {
                setNotification({ message: 'No phone number selected for WhatsApp.', type: 'error' });
                return;
            }
            if (sendEmailChecked && !finalEmail) {
                setNotification({ message: 'No email address selected for Email.', type: 'error' });
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

        try {
            const res = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    sendEmail: true,
                    sendWhatsApp: false,
                    targetEmail
                })
            });

            if (res.ok) {
                setNotification({ message: `Email notification sent successfully to ${targetEmail}`, type: 'success' });
            } else {
                const data = await res.json();
                setNotification({ message: `Failed: ${data.message || data.error}`, type: 'error' });
            }
        } catch (err) {
            console.error('Resend Email Error:', err);
            setNotification({ message: 'Failed to resend email', type: 'error' });
        } finally {
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

        try {
            const res = await fetch('/api/admin/send-order-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: selectedOrder.id,
                    sendWhatsApp: true,
                    sendEmail: false,
                    targetPhone
                })
            });

            if (res.ok) {
                setNotification({ message: `WhatsApp notification sent to ${formatDisplayPhoneNumber(targetPhone)}`, type: 'success' });
            } else {
                const data = await res.json();
                setNotification({ message: `Failed: ${data.message || data.error}`, type: 'error' });
            }
        } catch (err) {
            console.error('Resend WhatsApp Error:', err);
            setNotification({ message: 'Failed to resend WhatsApp', type: 'error' });
        } finally {
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // 4. Order Item Updates & Edits
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
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // 5. Item Returns
    const handleReturnItem = async () => {
        if (!returningItem || returnQty < 1) return;

        const alreadyReturned = returningItem.returned_quantity || 0;
        const maxReturnable = returningItem.quantity - alreadyReturned;

        if (returnQty > maxReturnable) {
            setNotification({ message: `Cannot return more than ${maxReturnable} items.`, type: 'error' });
            return;
        }

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
            setTimeout(() => setNotification(null), 3000);
        }
    };

    // 6. Order Cancellation
    const handleCancelOrder = async () => {
        if (!selectedOrder || !cancelReason.trim() || isUpdatingStatus) return;

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
                    orderId: selectedOrder.id,
                    status: 'CANCELLED',
                    cancelReason: cancelReason.trim(),
                    adminNotes: `Order cancelled by admin on ${new Date().toLocaleString()}. Reason: ${cancelReason.trim()}`,
                    notes: `Order cancelled. Reason: ${cancelReason.trim()}`
                })
            });

            const resData = await res.json();
            if (!res.ok) {
                throw new Error(resData.error || 'Failed to cancel order');
            }

            const orderIdToSync = selectedOrder.id;
            const [{ data: freshOrder }, { data: updatedLogs }] = await Promise.all([
                mysqlClient.from('orders').select('*').eq('id', orderIdToSync).single(),
                mysqlClient.from('order_status_logs').select('*').eq('order_id', orderIdToSync).order('created_at', { ascending: true })
            ]);

            if (freshOrder) setSelectedOrder(freshOrder);
            if (updatedLogs) setOrderActivityLogs(updatedLogs);

            let cancelToast = 'Order cancelled successfully';
            if (resData.refund) {
                const rf = resData.refund;
                if (rf.gatewayRefunded) {
                    cancelToast = `Order cancelled! ₹${Number(rf.refundAmount).toLocaleString('en-IN')} automatically refunded via Razorpay (Refund ID: ${rf.razorpayRefundId})`;
                } else if (rf.isCodAdvance) {
                    cancelToast = `Order cancelled! COD advance refund of ₹${Number(rf.refundAmount).toLocaleString('en-IN')} ${rf.refundStatus === 'REFUNDED' ? 'refunded via Razorpay' : 'queued for admin processing'}`;
                } else if (rf.refundStatus === 'NOT_APPLICABLE') {
                    cancelToast = 'COD order cancelled successfully. No refund required.';
                } else if (rf.refundStatus === 'REFUND_REQUESTED') {
                    cancelToast = `Order cancelled. ₹${Number(rf.refundAmount).toLocaleString('en-IN')} queued for manual refund.`;
                }
            }

            setNotification({ message: cancelToast, type: 'success' });
            setShowCancelModal(false);
            setCancelReason('');
            fetchOrders();

        } catch (err) {
            console.error('Cancel Error:', err);
            setNotification({ message: `Failed to cancel order: ${err.message || 'Error'}`, type: 'error' });
        } finally {
            setIsUpdatingStatus(false);
            setTimeout(() => setNotification(null), 4000);
        }
    };

    // 7. Quick Info Modal Handler
    const handleOpenQuickInfo = async (order) => {
        setInfoModalOrder({ ...order, items: null });
        const { data: rawItems } = await mysqlClient.from('order_items').select('*').eq('order_id', order.id);
        const enriched = await enrichOrderItems(rawItems, allProducts, setAllProducts);
        setInfoModalOrder(prev => prev && prev.id === order.id ? { ...prev, items: enriched } : prev);
    };

    // 8. Label Printing
    const handlePrintLabels = async (mode = 'address') => {
        setPrintMode(mode);
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
        }
    };

    // 9. Bulk Delete Handlers
    const handleBulkDelete = (idsToUse = null) => {
        const ids = Array.isArray(idsToUse) ? idsToUse : selectedOrderIds;
        if (!ids || !ids.length) return;
        setConfirmDelete({ ids });
    };

    const handleDeleteOrderConfirmed = async () => {
        if (!confirmDelete) return;
        const { ids } = confirmDelete;
        setConfirmDelete(null);

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
        }
    };

    return {
        // Status updates
        isUpdatingStatus,
        statusConfirmModal,
        setStatusConfirmModal,
        updateOrderStatus,
        // Courier
        openCourierModal,
        handleSaveCourier,
        showShippingForm,
        setShowShippingForm,
        couriers,
        selectedCourierId,
        setSelectedCourierId,
        savingCourier,
        isCourierSaved,
        isCourierFromTable,
        setIsCourierFromTable,
        courierModalError,
        setCourierModalError,
        shippingForm,
        setShippingForm,
        // Notifications
        handleOpenSendInfo,
        handleSendManualNotifications,
        handleResendEmail,
        handleResendWhatsApp,
        showSendNotificationModal,
        setShowSendNotificationModal,
        sendWhatsAppChecked,
        setSendWhatsAppChecked,
        sendEmailChecked,
        setSendEmailChecked,
        notificationPhone,
        setNotificationPhone,
        notificationEmail,
        setNotificationEmail,
        notificationSelection,
        setNotificationSelection,
        // Item Edits
        handleUpdateItem,
        handleRemoveItem,
        saveOrderEdits,
        // Returns
        returningItem,
        setReturningItem,
        returnQty,
        setReturnQty,
        handleReturnItem,
        // Cancellation
        showCancelModal,
        setShowCancelModal,
        cancelReason,
        setCancelReason,
        handleCancelOrder,
        // Quick info
        infoModalOrder,
        setInfoModalOrder,
        handleOpenQuickInfo,
        // Print
        handlePrintLabels,
        printingOrders,
        printMode,
        isPrintingLabels,
        setIsPrintingLabels,
        // Bulk delete
        handleBulkDelete,
        handleDeleteOrderConfirmed,
        confirmDelete,
        setConfirmDelete
    };
}
