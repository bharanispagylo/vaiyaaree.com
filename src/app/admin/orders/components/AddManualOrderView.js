'use client';

import React from 'react';
import { Package, Search, Trash2, Loader2 } from 'lucide-react';

export default function AddManualOrderView({
    isAddingOrder,
    setIsAddingOrder,
    newOrder,
    setNewOrder,
    allProducts = [],
    productSearch,
    setProductSearch,
    shippingZones = [],
    shippingMappings = [],
    isCreatingOrder,
    setIsCreatingOrder,
    setNotification,
    fetchOrders
}) {
    if (!isAddingOrder) return null;

    const subtotal = newOrder.is_replacement ? 0 : newOrder.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    
    const shipping = (() => {
        if (newOrder.manual_shipping_cost !== '') return parseFloat(newOrder.manual_shipping_cost) || 0;
        if (newOrder.is_replacement) return 0;
        if (subtotal === 0) return 0;
        const state = newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state;
        const mapping = shippingMappings.find(m => m.state_name === state);
        const zoneId = mapping ? mapping.zone_id : (shippingZones.find(z => z.name.toLowerCase().includes('default'))?.id || shippingZones[0]?.id);
        const zone = shippingZones.find(z => z.id === zoneId);
        
        if (!zone) return 100;
        if (subtotal >= zone.free_threshold) return 0;
        return zone.rate || 0;
    })();

    const effectiveState = newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state;
    let cgst = 0, sgst = 0, igst = 0;
    if (effectiveState === 'Tamil Nadu') {
        cgst = Math.round(subtotal * 0.025);
        sgst = Math.round(subtotal * 0.025);
    } else {
        igst = Math.round(subtotal * 0.05);
    }
    const tax = cgst + sgst + igst;
    const total = subtotal + tax + shipping;

    const handleCreateOrder = async () => {
        if (!newOrder.customer_name || !newOrder.billing_phone || newOrder.items.length === 0) {
            setNotification({ message: 'Please fill all customer details and add at least one item.', type: 'error' });
            return;
        }
        setNotification({ message: 'Creating order with ACID transaction guarantee...', type: 'info' });
        setIsCreatingOrder(true);
        try {
            const cleanPhone = newOrder.billing_phone.replace(/\D/g, '');
            const normalizedPhone = cleanPhone.startsWith('91') ? cleanPhone : (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone);

            const orderPayload = {
                source: 'MANUAL',
                customerName: newOrder.customer_name,
                customerPhone: normalizedPhone,
                customerEmail: newOrder.billing_email || null,
                paymentMethod: newOrder.payment_method || 'COD',
                billingAddress: {
                    name: newOrder.customer_name,
                    phone: normalizedPhone,
                    email: newOrder.billing_email || null,
                    address: newOrder.billing_address,
                    city: newOrder.billing_city,
                    pincode: newOrder.billing_pincode,
                    state: newOrder.billing_state
                },
                shippingAddress: newOrder.same_as_billing ? {
                    name: newOrder.customer_name,
                    phone: normalizedPhone,
                    email: newOrder.billing_email || null,
                    address: newOrder.billing_address,
                    city: newOrder.billing_city,
                    pincode: newOrder.billing_pincode,
                    state: newOrder.billing_state
                } : {
                    name: newOrder.customer_name,
                    phone: newOrder.shipping_phone || normalizedPhone,
                    email: newOrder.shipping_email || newOrder.billing_email || null,
                    address: newOrder.shipping_address,
                    city: newOrder.shipping_city,
                    pincode: newOrder.shipping_pincode,
                    state: newOrder.shipping_state
                },
                shippingState: newOrder.same_as_billing ? newOrder.billing_state : newOrder.shipping_state,
                shippingCost: shipping,
                cart: newOrder.items.map(it => ({
                    id: it.product_id,
                    qty: it.quantity,
                    name: it.product_name,
                    variantId: it.variant_id || null
                })),
                adminNotes: 'Manual order created from admin panel'
            };

            const res = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });

            const resData = await res.json();
            if (!res.ok || resData.error) {
                throw new Error(resData.error || 'Failed to create manual order');
            }

            const createdOrderId = resData.orderId;

            // Send custom notifications if selected
            if (newOrder.send_notifications !== 'none') {
                try {
                    await fetch('/api/admin/send-order-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: createdOrderId,
                            sendWhatsApp: newOrder.send_notifications === 'both' || newOrder.send_notifications === 'whatsapp',
                            sendEmail: newOrder.send_notifications === 'both' || newOrder.send_notifications === 'email'
                        })
                    });
                } catch (notifErr) {
                    console.error('Error sending notifications:', notifErr);
                }
            }

            setNotification({ message: `Manual Order #${createdOrderId} Created Successfully with ACID transaction guarantee!`, type: 'success' });
            setIsAddingOrder(false);
            setNewOrder({
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
            fetchOrders();
        } catch (err) {
            console.error('Manual Order Error:', err);
            setNotification({ message: `Failed to create order: ${err.message || 'Unknown error'}`, type: 'error' });
        } finally {
            setIsCreatingOrder(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    return (
        <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
            <div className="card shadow-premium" style={{
                width: '100%', maxWidth: '1500px', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px', background: '#ffffff', overflow: 'hidden'
            }}>
                <div style={{ padding: '1.5rem 2rem', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Package size={24} color="hsl(var(--primary))" /> Manual Order Creation
                    </h2>
                    <button type="button" onClick={() => setIsAddingOrder(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Orders</button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ gridColumn: 'span 2', borderBottom: '1px solid hsl(var(--border-subtle))', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))' }}>Billing Details</h3>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Customer Name *</label>
                            <input type="text" placeholder="John Doe" value={newOrder.customer_name} onChange={e => setNewOrder({ ...newOrder, customer_name: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Email *</label>
                            <input type="email" placeholder="billing@email.com" value={newOrder.billing_email || ''} onChange={e => setNewOrder({ ...newOrder, billing_email: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Phone *</label>
                            <input type="tel" placeholder="91..." value={newOrder.billing_phone} onChange={e => setNewOrder({ ...newOrder, billing_phone: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Address *</label>
                            <textarea rows={1} placeholder="Full billing address..." value={newOrder.billing_address} onChange={e => setNewOrder({ ...newOrder, billing_address: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', resize: 'none' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing City *</label>
                            <input type="text" placeholder="City" value={newOrder.billing_city} onChange={e => setNewOrder({ ...newOrder, billing_city: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing Pincode *</label>
                            <input type="text" placeholder="600001" value={newOrder.billing_pincode} onChange={e => setNewOrder({ ...newOrder, billing_pincode: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Billing State</label>
                            <select value={newOrder.billing_state} onChange={e => setNewOrder({ ...newOrder, billing_state: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                {["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'hsl(var(--primary))' }}>Shipping Details</h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                                <input type="checkbox" checked={newOrder.same_as_billing} onChange={e => setNewOrder({ ...newOrder, same_as_billing: e.target.checked })} />
                                Same as Billing
                            </label>
                        </div>

                        {!newOrder.same_as_billing && (
                            <>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Address *</label>
                                    <textarea rows={1} placeholder="Full shipping address..." value={newOrder.shipping_address} onChange={e => setNewOrder({ ...newOrder, shipping_address: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', resize: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping City *</label>
                                    <input type="text" placeholder="City" value={newOrder.shipping_city} onChange={e => setNewOrder({ ...newOrder, shipping_city: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Pincode *</label>
                                    <input type="text" placeholder="600001" value={newOrder.shipping_pincode} onChange={e => setNewOrder({ ...newOrder, shipping_pincode: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping State</label>
                                    <select value={newOrder.shipping_state} onChange={e => setNewOrder({ ...newOrder, shipping_state: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                        {["Tamil Nadu", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Shipping Phone</label>
                                    <input type="tel" placeholder="91..." value={newOrder.shipping_phone} onChange={e => setNewOrder({ ...newOrder, shipping_phone: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} />
                                </div>
                            </>
                        )}

                        <div style={{ gridColumn: 'span 2', marginTop: '1rem', borderTop: '1px solid hsl(var(--border-subtle))', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'hsl(var(--primary))' }}>Order Options</h3>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Send Notifications</label>
                            <select value={newOrder.send_notifications || 'both'} onChange={e => setNewOrder({ ...newOrder, send_notifications: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                <option value="both">WhatsApp & Email</option>
                                <option value="whatsapp">Only WhatsApp</option>
                                <option value="email">Only Email</option>
                                <option value="none">No Notifications</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Payment Method</label>
                            <select value={newOrder.payment_method} onChange={e => setNewOrder({ ...newOrder, payment_method: e.target.value })} style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', cursor: 'pointer' }}>
                                <option value="UPI">UPI / Online</option>
                                <option value="COD">Cash on Delivery</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <input 
                                type="checkbox" 
                                id="is_replacement"
                                checked={newOrder.is_replacement} 
                                onChange={e => setNewOrder({ ...newOrder, is_replacement: e.target.checked })} 
                            />
                            <label htmlFor="is_replacement" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Replacement Order (Zero Billing)</label>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Manual Shipping Rate (Optional)</label>
                            <input 
                                type="number" 
                                placeholder="Calculate Automatically" 
                                value={newOrder.manual_shipping_cost} 
                                onChange={e => setNewOrder({ ...newOrder, manual_shipping_cost: e.target.value })} 
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }} 
                            />
                        </div>
                    </div>

                    {/* Item Selection */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '1rem', display: 'block' }}>Add Products</label>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }} />
                                <input
                                    type="text"
                                    placeholder="Search product..."
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    style={{ width: '100%', padding: '0.85rem 0.85rem 0.85rem 2.5rem', borderRadius: '10px', background: '#f1f5f9', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))' }}
                                />
                                {productSearch && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#ffffff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '10px', marginTop: '5px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                                        {allProducts.filter(p =>
                                            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                                            (p.product_catalog_image_id && p.product_catalog_image_id.toLowerCase().includes(productSearch.toLowerCase()))
                                        ).map(p => (
                                            <div key={p.id} onClick={() => {
                                                const exists = newOrder.items.find(i => i.product_id === p.id);
                                                if (exists) {
                                                    setNewOrder({ ...newOrder, items: newOrder.items.map(i => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i) });
                                                } else {
                                                    setNewOrder({ ...newOrder, items: [...newOrder.items, { product_id: p.id, product_name: p.name, quantity: 1, price: p.price }] });
                                                }
                                                setProductSearch('');
                                            }} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'hsl(var(--text-main))' }}>{p.name}</span>
                                                <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>₹{p.price.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {newOrder.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <div style={{ flex: 1, fontWeight: 700 }}>{item.product_name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="number" min="1" value={item.quantity} onChange={e => {
                                            const val = parseInt(e.target.value);
                                            setNewOrder({ ...newOrder, items: newOrder.items.map((it, i) => i === idx ? { ...it, quantity: val } : it) });
                                        }} style={{ width: '60px', padding: '0.5rem', borderRadius: '5px', background: '#f1f5f9', border: '1px solid gray', color: 'hsl(var(--text-main))', textAlign: 'center' }} />
                                    </div>
                                    <div style={{ width: '100px', textAlign: 'right', fontWeight: 800 }}>₹{(item.price * item.quantity).toLocaleString()}</div>
                                    <button type="button" onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter((_, i) => i !== idx) })} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>
                            ))}
                            {newOrder.items.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed hsl(var(--border-subtle))', borderRadius: '12px', color: 'gray' }}>No items added. Search above to add products.</div>}
                        </div>
                    </div>

                    {/* Summary & Save */}
                    <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '15px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>Subtotal:</span><span>₹{subtotal.toLocaleString()}</span></div>
                            {cgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>CGST (2.5%):</span><span>₹{cgst.toLocaleString()}</span></div>}
                            {sgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>SGST (2.5%):</span><span>₹{sgst.toLocaleString()}</span></div>}
                            {igst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>IGST (5%):</span><span>₹{igst.toLocaleString()}</span></div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'gray' }}><span>Shipping:</span><span>₹{shipping.toLocaleString()}</span></div>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--primary))' }}><span>Total:</span><span>₹{total.toLocaleString()}</span></div>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateOrder}
                            disabled={isCreatingOrder}
                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 10px 20px hsl(var(--primary) / 0.2)' }}
                        >
                            {isCreatingOrder ? <><Loader2 className="animate-spin" /> Placing Order...</> : 'Confirm & Place Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
