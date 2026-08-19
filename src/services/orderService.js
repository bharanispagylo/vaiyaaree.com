
// @/services/orderService.js
/*
  BACKEND SERVICE: ORDER MANAGEMENT
  Handles business logic for creating, updating, and querying orders.
  This service interacts directly with Supabase.
*/

import { supabase } from '@/lib/supabaseClient';
import { getNextOrderId } from '@/lib/orderIdGenerator';

/**
 * Creates a new order in the database.
 * Typically called when a user checks out via WhatsApp or the web.
 * @param {Object} orderData - The order details.
 */
export async function createOrder(orderData) {
    // 1. Generate a unique ID if not provided
    const orderId = orderData.id || await getNextOrderId('ORD', supabase);

    // 2. Insert Order Logic
    const { data, error } = await supabase
        .from('orders')
        .insert([{
            id: orderId,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            total_amount: orderData.total_amount,
            status: 'PENDING',
            payment_method: orderData.payment_method,
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) {
        console.error('Error creating order:', error);
        throw error;
    }

    // 3. Insert Items (if any)
    if (orderData.items && orderData.items.length > 0) {
        const itemsToInsert = orderData.items.map(item => ({
            order_id: orderId,
            product_id: item.product_id, // Ensure this ID exists in 'products' table or is null
            product_name: item.name,
            quantity: item.quantity,
            price_at_time: item.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('Error adding items:', itemsError);
            // Depending on strictness, we might want to rollback here or flag the order.
        }
    }

    return data;
}

/**
 * Updates the status of an order.
 * @param {string} orderId 
 * @param {string} status 
 */
export async function updateOrderStatus(orderId, status) {
    const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Fetches all orders with their items.
 */
export async function getAllOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select(`
      *,
      order_items (
        product_name,
        quantity,
        price_at_time
      )
    `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}
