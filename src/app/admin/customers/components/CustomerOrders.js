'use client';
import { useState } from 'react';
import Link from 'next/link';
import { mysqlClient } from '@/lib/mysqlClient';
import { Edit2, Check, Loader2, RefreshCw, ShoppingBag } from 'lucide-react';

export default function CustomerOrders({ orders, onOrderUpdated }) {
    const [editingOrderId, setEditingOrderId] = useState(null);
    const [editedOrderData, setEditedOrderData] = useState({ total_amount: 0, payment_method: '', status: '' });
    const [isUpdating, setIsUpdating] = useState(false);

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

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        setIsUpdating(true);
        try {
            const { error } = await mysqlClient
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            if (onOrderUpdated) onOrderUpdated(`Order #${orderId} status updated to ${newStatus}`);
        } catch (err) {
            console.error('Order status update error:', err);
        } finally {
            setIsUpdating(false);
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

    const handleSaveOrder = async () => {
        setIsUpdating(true);
        try {
            const { error } = await mysqlClient
                .from('orders')
                .update({
                    total_amount: Number(editedOrderData.total_amount),
                    payment_method: editedOrderData.payment_method,
                    status: editedOrderData.status
                })
                .eq('id', editingOrderId);

            if (error) throw error;
            setEditingOrderId(null);
            if (onOrderUpdated) onOrderUpdated(`Order #${editingOrderId} updated successfully`);
        } catch (err) {
            console.error('Order update error:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="card shadow-premium" style={{ padding: '2rem', borderRadius: '16px', background: '#ffffff', border: '1px solid hsl(var(--border-subtle))' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'hsl(var(--primary))', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} /> Order History ({orders?.length || 0})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '680px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {!orders || orders.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                        No orders placed by this customer yet.
                    </div>
                ) : (
                    orders.map(order => (
                        <div 
                            key={order.id} 
                            style={{ 
                                padding: '1.25rem', 
                                background: '#f8fafc', 
                                borderRadius: '14px', 
                                border: editingOrderId === order.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))', 
                                transition: 'all 0.2s' 
                            }}
                        >
                            {editingOrderId === order.id ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 800, color: 'hsl(var(--primary))' }}>Editing Order #{order.id}</div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => setEditingOrderId(null)} 
                                                className="btn btn-secondary" 
                                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={handleSaveOrder} 
                                                disabled={isUpdating} 
                                                className="btn btn-primary" 
                                                style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', background: 'hsl(var(--success))', border: 'none' }}
                                            >
                                                {isUpdating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem' }}>
                                                TOTAL AMOUNT (₹)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editedOrderData.total_amount}
                                                onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                onChange={(e) => setEditedOrderData({ ...editedOrderData, total_amount: e.target.value })}
                                                className="admin-input"
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem' }}>
                                                PAYMENT METHOD
                                            </label>
                                            <select
                                                value={editedOrderData.payment_method}
                                                onChange={(e) => setEditedOrderData({ ...editedOrderData, payment_method: e.target.value })}
                                                className="admin-input"
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                                            >
                                                {['CASH ON DELIVERY', 'UPI', 'BANK TRANSFER', 'PREPAID', 'MANUAL'].map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '0.25rem' }}>
                                            ORDER STATUS
                                        </label>
                                        <select
                                            value={editedOrderData.status}
                                            onChange={(e) => setEditedOrderData({ ...editedOrderData, status: e.target.value })}
                                            className={`badge ${getStatusReference(editedOrderData.status)}`}
                                            style={{ width: '100%', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}
                                        >
                                            {['PLACED', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Link href={`/admin/orders?id=${order.id}`} style={{ color: 'hsl(var(--primary))', textDecoration: 'none', fontWeight: 800 }}>
                                                #{order.id}
                                            </Link>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); startEditingOrder(order); }} 
                                                style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }} 
                                                title="Edit Order"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                                            {order.payment_method || 'ONLINE'} • ₹{(order.total_amount || 0).toLocaleString()}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                            className={`badge ${getStatusReference(order.status)}`}
                                            style={{ border: 'none', cursor: 'pointer', appearance: 'none', padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 800 }}
                                        >
                                            {['PLACED', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                            <RefreshCw size={9} /> Quick Status
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
