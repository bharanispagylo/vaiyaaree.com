'use client';

import React, { useState } from 'react';

// Subcomponents
import OrderDetailHeader from './detail/OrderDetailHeader';
import OrderMetricsStrip from './detail/OrderMetricsStrip';
import OrderItemsTable from './detail/OrderItemsTable';
import OrderPaymentCard from './detail/OrderPaymentCard';
import OrderTrackingCard from './detail/OrderTrackingCard';
import OrderActivityTimeline from './detail/OrderActivityTimeline';
import CustomerAddressCard from './detail/CustomerAddressCard';
import OrderSummaryCard from './detail/OrderSummaryCard';
import OrderActionsCard from './detail/OrderActionsCard';

export default function OrderDetailView({
    selectedOrder,
    setSelectedOrder,
    orderItems = [],
    isEditingItems,
    setIsEditingItems,
    orderActivityLogs = [],
    loading = false,
    allProducts = [],
    onBack,
    onSaveEdits,
    onCancelEdit,
    onPrepareEditing,
    onUpdateItem,
    onRemoveItem,
    onReturnItemClick,
    onUpdateStatus,
    openCourierModal,
    onOpenSendInfo,
    onDeleteOrder,
    onResendEmail,
    onResendWhatsApp,
    statusConfirmModal,
    setStatusConfirmModal,
    showCancelModal,
    setShowCancelModal,
    cancelReason,
    setCancelReason,
    handleCancelOrder,
    notificationSelection,
    setNotificationSelection,
    notification,
    isUpdatingStatus = false
}) {
    const [copiedField, setCopiedField] = useState(null);

    const handleCopyText = (text, fieldName) => {
        if (!text) return;
        try {
            navigator.clipboard.writeText(String(text));
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Clipboard copy failed:', err);
        }
    };

    if (!selectedOrder) return null;

    // Safely calculate items total
    const itemsTotal = Array.isArray(orderItems)
        ? orderItems.reduce((sum, item) => sum + ((Number(item.quantity || 0) - Number(item.returned_quantity || 0)) * Number(item.price_at_time || 0)), 0)
        : 0;

    // Resolve Razorpay payment details
    const razorpayPaymentId = selectedOrder.razorpay_payment_id || 
        selectedOrder.transaction_id || 
        (() => {
            if (Array.isArray(orderActivityLogs)) {
                for (const log of orderActivityLogs) {
                    const match = log.notes?.match(/Payment ID:\s*([a-zA-Z0-9_]+)/i);
                    if (match) return match[1];
                }
            }
            return null;
        })();

    const razorpayOrderId = selectedOrder.razorpay_order_id || 
        (() => {
            if (Array.isArray(orderActivityLogs)) {
                for (const log of orderActivityLogs) {
                    const match = log.notes?.match(/Razorpay Order ID:\s*([a-zA-Z0-9_]+)/i) || log.notes?.match(/Order ID:\s*(order_[a-zA-Z0-9_]+)/i);
                    if (match) return match[1];
                }
            }
            return null;
        })();

    const razorpaySignature = selectedOrder.razorpay_signature || null;
    const razorpayRefundId = selectedOrder.razorpay_refund_id || null;

    const paymentMethodText = String(selectedOrder.payment_method || '').trim();
    const isPaidOnline = Boolean(
        razorpayPaymentId || 
        razorpayOrderId || 
        ['RAZORPAY', 'ONLINE', 'UPI'].some(m => paymentMethodText.toUpperCase().includes(m)) ||
        (selectedOrder.status === 'PAID' && (selectedOrder.id?.startsWith('WEB-') || selectedOrder.source === 'WEBSITE'))
    );

    return (
        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
            <div className="card shadow-premium" style={{
                width: '100%', 
                maxWidth: '1500px', 
                margin: '0 auto', 
                display: 'flex', 
                flexDirection: 'column', 
                border: '1px solid hsl(var(--border-subtle))', 
                borderRadius: '24px', 
                background: '#ffffff', 
                overflow: 'hidden'
            }}>
                {/* 1. Header Bar */}
                <OrderDetailHeader
                    selectedOrder={selectedOrder}
                    orderItems={orderItems}
                    isEditingItems={isEditingItems}
                    setIsEditingItems={setIsEditingItems}
                    loading={loading}
                    isUpdatingStatus={isUpdatingStatus}
                    onBack={onBack}
                    onSaveEdits={onSaveEdits}
                    onCancelEdit={onCancelEdit}
                    onPrepareEditing={onPrepareEditing}
                    isPaidOnline={isPaidOnline}
                    razorpayPaymentId={razorpayPaymentId}
                />

                {/* 2. Top Metrics Overview Strip */}
                {!isEditingItems && (
                    <OrderMetricsStrip
                        selectedOrder={selectedOrder}
                        orderItems={orderItems}
                        isPaidOnline={isPaidOnline}
                        razorpayPaymentId={razorpayPaymentId}
                    />
                )}

                {/* 3. Main Content: 65% / 35% Two-Column Responsive Layout */}
                <div style={{
                    padding: '2rem',
                    display: 'grid',
                    gridTemplateColumns: isEditingItems ? '1fr' : 'minmax(0, 1.8fr) minmax(360px, 1.2fr)',
                    gap: '2rem',
                    alignItems: 'start'
                }}>
                    {/* Left Primary Column: Items, Payment Details, Shipping Tracking & Timeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', minWidth: 0 }}>
                        {/* Order Items Table */}
                        <OrderItemsTable
                            orderItems={orderItems}
                            isEditingItems={isEditingItems}
                            allProducts={allProducts}
                            onUpdateItem={onUpdateItem}
                            onRemoveItem={onRemoveItem}
                        />

                        {/* Razorpay Payment Information Card */}
                        {!isEditingItems && (
                            <OrderPaymentCard
                                selectedOrder={selectedOrder}
                                isPaidOnline={isPaidOnline}
                                razorpayPaymentId={razorpayPaymentId}
                                razorpayOrderId={razorpayOrderId}
                                razorpayRefundId={razorpayRefundId}
                                copiedField={copiedField}
                                onCopyText={handleCopyText}
                            />
                        )}

                        {/* Shipping & Courier Tracking Card */}
                        {!isEditingItems && (
                            <OrderTrackingCard
                                selectedOrder={selectedOrder}
                            />
                        )}

                        {/* Order Activity Timeline */}
                        {!isEditingItems && (
                            <OrderActivityTimeline
                                orderActivityLogs={orderActivityLogs}
                            />
                        )}
                    </div>

                    {/* Right Operations Column: Customer Info, Financial Summary & Order Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', minWidth: 0 }}>
                        {/* Customer & Address Details */}
                        <CustomerAddressCard
                            selectedOrder={selectedOrder}
                            setSelectedOrder={setSelectedOrder}
                            isEditingItems={isEditingItems}
                            copiedField={copiedField}
                            onCopyText={handleCopyText}
                        />

                        {/* Financial Breakdown Summary */}
                        <OrderSummaryCard
                            selectedOrder={selectedOrder}
                            itemsTotal={itemsTotal}
                        />

                        {/* Order Management Actions Card */}
                        {!isEditingItems && (
                            <OrderActionsCard
                                selectedOrder={selectedOrder}
                                loading={loading}
                                isUpdatingStatus={isUpdatingStatus}
                                onUpdateStatus={onUpdateStatus}
                                openCourierModal={openCourierModal}
                                onOpenSendInfo={onOpenSendInfo}
                                onDeleteOrder={onDeleteOrder}
                                onResendEmail={onResendEmail}
                                onResendWhatsApp={onResendWhatsApp}
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
                            />
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 1024px) {
                    div[style*="gridTemplateColumns: minmax(0, 1.8fr) minmax(360px, 1.2fr)"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
