'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { prepareOrderForEditing } from './utils/ordersHelpers';

// Custom Hooks
import { useOrdersManager } from './hooks/useOrdersManager';
import { useOrderOperations } from './hooks/useOrderOperations';
import { useManualOrder } from './hooks/useManualOrder';

// Subcomponents & Views
import OrdersListView from './components/OrdersListView';
import OrderDetailView from './components/OrderDetailView';
import AddManualOrderView from './components/AddManualOrderView';
import OrderModalsContainer from './components/OrderModalsContainer';

export default function OrdersPage() {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    // 1. Core Orders State & List Management Hook
    const ordersManager = useOrdersManager();

    // 2. Manual Order Creation State Hook
    const manualOrder = useManualOrder();

    // 3. Order Operational Actions Hook
    const orderOps = useOrderOperations({
        selectedOrder: ordersManager.selectedOrder,
        setSelectedOrder: ordersManager.setSelectedOrder,
        orderItems: ordersManager.orderItems,
        setOrderItems: ordersManager.setOrderItems,
        setIsEditingItems: ordersManager.setIsEditingItems,
        setOrderActivityLogs: ordersManager.setOrderActivityLogs,
        setNotification: ordersManager.setNotification,
        fetchOrders: ordersManager.fetchOrders,
        selectedOrderIds: ordersManager.selectedOrderIds,
        setSelectedOrderIds: ordersManager.setSelectedOrderIds,
        allProducts: ordersManager.allProducts,
        setAllProducts: ordersManager.setAllProducts,
        openOrderDetail: ordersManager.openOrderDetail
    });

    if (!hasMounted) {
        return (
            <div className="animate-enter" style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1.5rem' }} />
                <p>Initializing orders portal...</p>
            </div>
        );
    }

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
                    {/* 1. Main Orders List View */}
                    {(!ordersManager.selectedOrder || orderOps.isCourierFromTable) && !manualOrder.isAddingOrder && (
                        <OrdersListView
                            orders={ordersManager.orders}
                            loading={ordersManager.loading}
                            searchTerm={ordersManager.searchTerm}
                            setSearchTerm={ordersManager.setSearchTerm}
                            statusFilter={ordersManager.statusFilter}
                            setStatusFilter={ordersManager.setStatusFilter}
                            sourceFilter={ordersManager.sourceFilter}
                            setSourceFilter={ordersManager.setSourceFilter}
                            orderCounts={ordersManager.statusCounts}
                            selectedOrder={ordersManager.selectedOrder}
                            selectedOrderIds={ordersManager.selectedOrderIds}
                            toggleSelectItem={ordersManager.toggleSelectItem}
                            toggleSelectAll={ordersManager.toggleSelectAll}
                            openOrderDetail={ordersManager.openOrderDetail}
                            openCourierModal={orderOps.openCourierModal}
                            onOpenSendInfo={orderOps.handleOpenSendInfo}
                            onOpenQuickInfo={orderOps.handleOpenQuickInfo}
                            onDeleteOrder={orderOps.handleBulkDelete}
                            ordersPage={ordersManager.ordersPage}
                            setOrdersPage={ordersManager.setOrdersPage}
                            totalOrderPages={ordersManager.totalOrderPages}
                            setIsAddingOrder={manualOrder.setIsAddingOrder}
                            fetchOrders={ordersManager.fetchOrders}
                        />
                    )}

                    {/* 2. Order Detail View (Modular 65% / 35% Layout) */}
                    {ordersManager.selectedOrder && !orderOps.isCourierFromTable && (
                        <OrderDetailView
                            selectedOrder={ordersManager.selectedOrder}
                            setSelectedOrder={ordersManager.setSelectedOrder}
                            orderItems={ordersManager.orderItems}
                            isEditingItems={ordersManager.isEditingItems}
                            setIsEditingItems={ordersManager.setIsEditingItems}
                            orderActivityLogs={ordersManager.orderActivityLogs}
                            loading={ordersManager.loading}
                            allProducts={ordersManager.allProducts}
                            onBack={() => { 
                                ordersManager.setSelectedOrder(null); 
                                ordersManager.setOrderItems([]); 
                                ordersManager.setIsEditingItems(false); 
                                ordersManager.setNotification(null); 
                            }}
                            onSaveEdits={orderOps.saveOrderEdits}
                            onCancelEdit={() => { 
                                ordersManager.setIsEditingItems(false); 
                                ordersManager.openOrderDetail(ordersManager.selectedOrder); 
                            }}
                            onPrepareEditing={() => prepareOrderForEditing(ordersManager.selectedOrder)}
                            onUpdateItem={orderOps.handleUpdateItem}
                            onRemoveItem={orderOps.handleRemoveItem}
                            onReturnItemClick={(item) => { 
                                orderOps.setReturningItem(item); 
                                orderOps.setReturnQty(1); 
                            }}
                            onUpdateStatus={orderOps.updateOrderStatus}
                            openCourierModal={orderOps.openCourierModal}
                            onOpenSendInfo={orderOps.handleOpenSendInfo}
                            onDeleteOrder={orderOps.handleBulkDelete}
                            onResendEmail={orderOps.handleResendEmail}
                            onResendWhatsApp={orderOps.handleResendWhatsApp}
                            statusConfirmModal={orderOps.statusConfirmModal}
                            setStatusConfirmModal={orderOps.setStatusConfirmModal}
                            showCancelModal={orderOps.showCancelModal}
                            setShowCancelModal={orderOps.setShowCancelModal}
                            cancelReason={orderOps.cancelReason}
                            setCancelReason={orderOps.setCancelReason}
                            handleCancelOrder={orderOps.handleCancelOrder}
                            notificationSelection={orderOps.notificationSelection}
                            setNotificationSelection={orderOps.setNotificationSelection}
                            notification={ordersManager.notification}
                            isUpdatingStatus={orderOps.isUpdatingStatus}
                        />
                    )}

                    {/* 3. Add Manual Order View */}
                    {manualOrder.isAddingOrder && (
                        <AddManualOrderView
                            isAddingOrder={manualOrder.isAddingOrder}
                            setIsAddingOrder={manualOrder.setIsAddingOrder}
                            newOrder={manualOrder.newOrder}
                            setNewOrder={manualOrder.setNewOrder}
                            allProducts={ordersManager.allProducts}
                            productSearch={manualOrder.productSearch}
                            setProductSearch={manualOrder.setProductSearch}
                            shippingZones={ordersManager.shippingZones}
                            shippingMappings={ordersManager.shippingMappings}
                            isCreatingOrder={manualOrder.isCreatingOrder}
                            setIsCreatingOrder={manualOrder.setIsCreatingOrder}
                            setNotification={ordersManager.setNotification}
                            fetchOrders={ordersManager.fetchOrders}
                        />
                    )}
                </div>
            </div>

            {/* Modals & Overlays Container */}
            <OrderModalsContainer
                infoModalOrder={orderOps.infoModalOrder}
                setInfoModalOrder={orderOps.setInfoModalOrder}
                allProducts={ordersManager.allProducts}
                showShippingForm={orderOps.showShippingForm}
                setShowShippingForm={orderOps.setShowShippingForm}
                selectedOrder={ordersManager.selectedOrder}
                setSelectedOrder={ordersManager.setSelectedOrder}
                couriers={orderOps.couriers}
                selectedCourierId={orderOps.selectedCourierId}
                setSelectedCourierId={orderOps.setSelectedCourierId}
                shippingForm={orderOps.shippingForm}
                setShippingForm={orderOps.setShippingForm}
                courierModalError={orderOps.courierModalError}
                setCourierModalError={orderOps.setCourierModalError}
                savingCourier={orderOps.savingCourier}
                isCourierSaved={orderOps.isCourierSaved}
                isCourierFromTable={orderOps.isCourierFromTable}
                setIsCourierFromTable={orderOps.setIsCourierFromTable}
                handleSaveCourier={orderOps.handleSaveCourier}
                handleOpenSendInfo={orderOps.handleOpenSendInfo}
                setNotification={ordersManager.setNotification}
                showSendNotificationModal={orderOps.showSendNotificationModal}
                setShowSendNotificationModal={orderOps.setShowSendNotificationModal}
                sendWhatsAppChecked={orderOps.sendWhatsAppChecked}
                setSendWhatsAppChecked={orderOps.setSendWhatsAppChecked}
                sendEmailChecked={orderOps.sendEmailChecked}
                setSendEmailChecked={orderOps.setSendEmailChecked}
                notificationPhone={orderOps.notificationPhone}
                setNotificationPhone={orderOps.setNotificationPhone}
                notificationEmail={orderOps.notificationEmail}
                setNotificationEmail={orderOps.setNotificationEmail}
                handleSendManualNotifications={orderOps.handleSendManualNotifications}
                loading={ordersManager.loading}
                returningItem={orderOps.returningItem}
                setReturningItem={orderOps.setReturningItem}
                returnQty={orderOps.returnQty}
                setReturnQty={orderOps.setReturnQty}
                handleReturnItem={orderOps.handleReturnItem}
                confirmDelete={orderOps.confirmDelete}
                setConfirmDelete={orderOps.setConfirmDelete}
                handleDeleteOrderConfirmed={orderOps.handleDeleteOrderConfirmed}
                selectedOrderIds={ordersManager.selectedOrderIds}
                setSelectedOrderIds={ordersManager.setSelectedOrderIds}
                handlePrintLabels={orderOps.handlePrintLabels}
                handleBulkDelete={orderOps.handleBulkDelete}
                isPrintingLabels={orderOps.isPrintingLabels}
                setIsPrintingLabels={orderOps.setIsPrintingLabels}
                printingOrders={orderOps.printingOrders}
                printMode={orderOps.printMode}
            />

            {/* Global Toast Notification */}
            {ordersManager.notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem', zIndex: 200000,
                    padding: '1rem 2.5rem', borderRadius: '15px',
                    background: (ordersManager.notification.type === 'success' || ordersManager.notification.type === 'info') ? 'hsl(142, 70%, 45%)' : 'hsl(0, 84%, 60%)',
                    color: 'white', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    animation: 'slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}>
                    <div className="animate-spin-slow">
                        {ordersManager.notification.type === 'info' && <Loader2 size={16} />}
                        {ordersManager.notification.type === 'success' && <CheckCircle size={16} />}
                        {ordersManager.notification.type === 'error' && <AlertCircle size={16} />}
                    </div>
                    <span style={{ flex: 1 }}>{ordersManager.notification.message}</span>
                    <button
                        type="button"
                        onClick={() => ordersManager.setNotification(null)}
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
                .card-sub { box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
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
