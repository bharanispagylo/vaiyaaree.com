'use client';

import React from 'react';
import QuickOrderInfoModal from './modals/QuickOrderInfoModal';
import CourierShippingModal from './modals/CourierShippingModal';
import SendNotificationModal from './modals/SendNotificationModal';
import ItemReturnModal from './modals/ItemReturnModal';
import DeleteConfirmModal from './modals/DeleteConfirmModal';
import BulkActionBar from './modals/BulkActionBar';
import PrintPreviewModal from './modals/PrintPreviewModal';

export default function OrderModalsContainer({
    infoModalOrder,
    setInfoModalOrder,
    allProducts,
    showShippingForm,
    setShowShippingForm,
    selectedOrder,
    setSelectedOrder,
    couriers,
    selectedCourierId,
    setSelectedCourierId,
    shippingForm,
    setShippingForm,
    courierModalError,
    setCourierModalError,
    savingCourier,
    isCourierSaved,
    isCourierFromTable,
    setIsCourierFromTable,
    handleSaveCourier,
    handleOpenSendInfo,
    setNotification,
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
    handleSendManualNotifications,
    loading,
    returningItem,
    setReturningItem,
    returnQty,
    setReturnQty,
    handleReturnItem,
    confirmDelete,
    setConfirmDelete,
    handleDeleteOrderConfirmed,
    selectedOrderIds,
    setSelectedOrderIds,
    handlePrintLabels,
    handleBulkDelete,
    isPrintingLabels,
    setIsPrintingLabels,
    printingOrders,
    printMode
}) {
    return (
        <>
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
                    if (isCourierFromTable && setSelectedOrder) setSelectedOrder(null);
                    if (setIsCourierFromTable) setIsCourierFromTable(false);
                    if (setCourierModalError) setCourierModalError('');
                    if (setNotification) setNotification(null);
                }}
                onClearNotification={() => setNotification && setNotification(null)}
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
                    if (isCourierFromTable && setSelectedOrder) setSelectedOrder(null);
                    if (setIsCourierFromTable) setIsCourierFromTable(false);
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
                    if (isCourierFromTable && setSelectedOrder) setSelectedOrder(null);
                    if (setIsCourierFromTable) setIsCourierFromTable(false);
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
        </>
    );
}
