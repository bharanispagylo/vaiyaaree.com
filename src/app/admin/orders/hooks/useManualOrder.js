'use client';

import { useState } from 'react';

const INITIAL_MANUAL_ORDER = {
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
};

export function useManualOrder() {
    const [isAddingOrder, setIsAddingOrder] = useState(false);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [newOrder, setNewOrder] = useState(INITIAL_MANUAL_ORDER);

    const resetManualOrder = () => {
        setNewOrder(INITIAL_MANUAL_ORDER);
        setProductSearch('');
        setIsAddingOrder(false);
    };

    return {
        isAddingOrder,
        setIsAddingOrder,
        isCreatingOrder,
        setIsCreatingOrder,
        productSearch,
        setProductSearch,
        newOrder,
        setNewOrder,
        resetManualOrder
    };
}
