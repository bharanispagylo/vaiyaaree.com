'use client';

import React from 'react';
import Link from 'next/link';
import { 
    Search, Plus, RefreshCw, TrendingUp, X, Loader2, 
    Truck, Send, Info, Trash2, ChevronLeft, ChevronRight,
    ShoppingBag, Clock, XCircle, RotateCcw
} from 'lucide-react';
import { 
    formatOrderInvoice, 
    toIST, 
    getStatusReference, 
    formatDisplayPhoneNumber, 
    parseCourierDetails,
    SOURCE_FILTERS 
} from '../utils/ordersHelpers';

export default function OrdersListView({
    orders = [],
    loading = false,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    orderCounts = {},
    selectedOrder,
    selectedOrderIds = [],
    toggleSelectItem,
    toggleSelectAll,
    openOrderDetail,
    openCourierModal,
    onOpenSendInfo,
    onOpenQuickInfo,
    onDeleteOrder,
    ordersPage,
    setOrdersPage,
    totalOrderPages,
    setIsAddingOrder,
    fetchOrders
}) {
    const summaryCards = [
        {
            key: 'TOTAL',
            label: 'Total Orders',
            count: orderCounts.TOTAL ?? orderCounts.ALL ?? 0,
            icon: ShoppingBag,
            color: '#4f46e5',
            bgTint: 'rgba(79, 70, 229, 0.08)',
            isActive: statusFilter === 'ALL',
            onClick: () => setStatusFilter('ALL')
        },
        {
            key: 'PENDING',
            label: 'Pending Orders',
            count: orderCounts.PENDING ?? ((orderCounts.AWAITING_PAYMENT || 0) + (orderCounts.PLACED || 0) + (orderCounts.PACKING || 0)),
            icon: Clock,
            color: '#d97706',
            bgTint: 'rgba(217, 119, 6, 0.08)',
            isActive: statusFilter === 'PENDING' || statusFilter === 'AWAITING_PAYMENT' || statusFilter === 'PLACED' || statusFilter === 'PACKING',
            onClick: () => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')
        },
        {
            key: 'CANCELLED',
            label: 'Cancelled Orders',
            count: orderCounts.CANCELLED || 0,
            icon: XCircle,
            color: '#dc2626',
            bgTint: 'rgba(220, 38, 38, 0.08)',
            isActive: statusFilter === 'CANCELLED',
            onClick: () => setStatusFilter(statusFilter === 'CANCELLED' ? 'ALL' : 'CANCELLED')
        },
        {
            key: 'RETURN',
            label: 'Return Orders',
            count: orderCounts.RETURN_ORDERS ?? orderCounts.RETURNED ?? orderCounts.REFUNDED ?? 0,
            icon: RotateCcw,
            color: '#7c3aed',
            bgTint: 'rgba(124, 58, 237, 0.08)',
            isActive: statusFilter === 'REFUNDED' || statusFilter === 'RETURNED' || statusFilter === 'RETURN_ORDERS' || statusFilter === 'REFUND_REQUESTED',
            onClick: () => setStatusFilter(statusFilter === 'REFUNDED' ? 'ALL' : 'REFUNDED')
        }
    ];

    return (
        <div className="orders-list-section">
            {/* Header */}
            <div className="admin-header-row" style={{ marginBottom: '1.25rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.35rem', fontSize: '1.65rem', fontWeight: 800 }}>Orders</h1>
                    <p style={{ margin: 0, color: 'hsl(var(--text-muted))', fontSize: '0.88rem' }}>
                        Manage and track all customer orders • {orderCounts.ALL || orders.length} total
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button 
                        type="button" 
                        onClick={() => setIsAddingOrder(true)} 
                        className="btn btn-primary" 
                        style={{ background: 'hsl(var(--primary))', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '0.6rem 1.15rem', fontSize: '0.88rem', fontWeight: 700 }}
                    >
                        <Plus size={16} /> Add Manual Order
                    </button>
                    <button 
                        type="button" 
                        onClick={fetchOrders} 
                        className="btn btn-secondary"
                        style={{ padding: '0.6rem 1.15rem', fontSize: '0.88rem', fontWeight: 600 }}
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </div>

            {/* Small-Sized Order Count Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.85rem',
                marginBottom: '1.25rem'
            }}>
                {summaryCards.map((card) => (
                    <div
                        key={card.key}
                        onClick={card.onClick}
                        title={`Filter by ${card.label}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.85rem 1.1rem',
                            borderRadius: '14px',
                            backgroundColor: '#ffffff',
                            border: card.isActive ? `1.5px solid ${card.color}` : '1px solid hsl(var(--border-subtle))',
                            boxShadow: card.isActive ? `0 4px 14px ${card.color}22` : '0 2px 6px rgba(0,0,0,0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease-in-out',
                            userSelect: 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (!card.isActive) {
                                e.currentTarget.style.borderColor = `${card.color}80`;
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!card.isActive) {
                                e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        <div>
                            <div style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: 'hsl(var(--text-muted))',
                                marginBottom: '0.2rem'
                            }}>
                                {card.label}
                            </div>
                            <div style={{
                                fontSize: '1.38rem',
                                fontWeight: 800,
                                color: 'hsl(var(--text-main))',
                                lineHeight: 1.1
                            }}>
                                {Number(card.count || 0).toLocaleString()}
                            </div>
                        </div>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor: card.bgTint,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: card.color,
                            flexShrink: 0
                        }}>
                            <card.icon size={18} strokeWidth={2.4} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Unified View Controls & Filters Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap', background: '#ffffff', padding: '0.85rem 1.25rem', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle))' }}>
                {/* Left Controls: Status, Channel, Analysis */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '0.5rem 2rem 0.5rem 0.85rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                        >
                            {Object.entries(orderCounts).map(([status, count]) => (
                                <option key={status} value={status}>
                                    {status === 'ALL' ? 'All Orders' : status === 'PENDING' ? 'Pending (All)' : status === 'RETURN_ORDERS' ? 'Return Orders' : status.replace(/_/g, ' ')} ({count})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ width: '1px', height: '20px', background: 'hsl(var(--border-subtle))' }} />

                    {/* Channel / Source Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>Channel:</label>
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            style={{ padding: '0.5rem 2rem 0.5rem 0.85rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                        >
                            {SOURCE_FILTERS.map(src => (
                                <option key={src} value={src}>
                                    {src === 'ALL' ? 'All' : src === 'WEBSITE' ? 'Website (Web)' : src === 'MANUAL' ? 'Manual' : 'WhatsApp'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Link to Dedicated Orders Analysis Page */}
                    <Link
                        href="/admin/orders/analysis"
                        className="btn btn-secondary"
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '8px',
                            fontSize: '0.85rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '6px',
                            textDecoration: 'none'
                        }}
                    >
                        <TrendingUp size={15} color="hsl(var(--primary))" /> Order Analysis
                    </Link>
                </div>

                {/* Right Controls: Order Table Search (moved to top right) */}
                <div style={{ position: 'relative', width: '300px', maxWidth: '100%', minWidth: '220px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Search Order ID, Name, Phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: searchTerm ? '0.52rem 2.2rem 0.52rem 2.2rem' : '0.52rem 0.85rem 0.52rem 2.2rem',
                            background: 'hsl(var(--bg-app))',
                            border: '1px solid hsl(var(--border-subtle))',
                            borderRadius: '8px',
                            fontSize: '0.88rem',
                            outline: 'none',
                            transition: 'border 0.2s, box-shadow 0.2s',
                            color: 'hsl(var(--text-main))',
                            fontFamily: 'inherit'
                        }}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            style={{
                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px'
                            }}
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="card" style={{ padding: 0 }}>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                        <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ margin: 0, width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Invoice No</th>
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                                            onChange={toggleSelectAll}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                        />
                                    </th>
                                    <th>Customer</th>
                                    <th style={{ textAlign: 'center' }}>Source</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th style={{ textAlign: 'center' }}>Payment</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                    <th style={{ textAlign: 'center' }}>Logistics</th>
                                    <th style={{ textAlign: 'right', minWidth: '150px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                                            No orders found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map(order => {
                                        const src = order.source || (order.id?.startsWith('WEB-') ? 'WEBSITE' : order.id?.startsWith('MAN-') ? 'MANUAL' : 'WHATSAPP');
                                        const isSelected = selectedOrder?.id === order.id;
                                        const isChecked = selectedOrderIds.includes(order.id);

                                        return (
                                            <tr
                                                key={order.id}
                                                onClick={() => openOrderDetail(order)}
                                                style={{
                                                    cursor: 'pointer',
                                                    background: isSelected ? 'hsl(var(--primary) / 0.05)' :
                                                        isChecked ? 'hsl(var(--primary) / 0.02)' : 'transparent',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <td style={{ fontWeight: 600, color: isSelected ? 'hsl(var(--primary))' : 'inherit' }}>
                                                    <div style={{ fontWeight: 800 }}>{formatOrderInvoice(order)}</div>
                                                    <div style={{ fontSize: '0.74rem', color: 'hsl(var(--text-muted))', fontWeight: 500, marginTop: '2px' }}>
                                                        {toIST(order.created_at)}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); toggleSelectItem(order.id); }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => { }}
                                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))' }}>{order.customer_name || 'Guest'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{formatDisplayPhoneNumber(order.customer_phone)}</div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {(() => {
                                                        const badgeConfig = {
                                                            WEBSITE: { label: 'Web', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
                                                            MANUAL: { label: 'Manual', bg: '#f3e8ff', border: '#e9d5ff', color: '#6b21a8' },
                                                            WHATSAPP: { label: 'WhatsApp', bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' }
                                                        };
                                                        const config = badgeConfig[src] || badgeConfig.WHATSAPP;
                                                        return (
                                                            <span style={{
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: '6px',
                                                                fontSize: '0.72rem',
                                                                fontWeight: 800,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.04em',
                                                                background: config.bg,
                                                                border: `1px solid ${config.border}`,
                                                                color: config.color,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                                {config.label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 800 }}>
                                                    ₹{(order.total_amount || 0).toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-main))' }}>
                                                        {order.payment_method || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`badge ${getStatusReference(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'center' }}>
                                                        {(() => {
                                                            const courierInfo = parseCourierDetails(order);
                                                            if (courierInfo.name || courierInfo.trackingNumber) {
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openCourierModal(order, true);
                                                                        }}
                                                                        className="btn btn-secondary"
                                                                        style={{
                                                                            padding: '0.35rem 0.5rem',
                                                                            color: 'hsl(var(--primary))',
                                                                            borderColor: 'hsl(var(--primary) / 0.3)',
                                                                            fontSize: '0.72rem',
                                                                            fontWeight: 700,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            borderRadius: '6px',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                        title="Click to view/edit courier info"
                                                                    >
                                                                        <Truck size={14} color="hsl(var(--primary))" /> {courierInfo.name || 'Courier Info'}
                                                                    </button>
                                                                );
                                                            }
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openCourierModal(order, true);
                                                                    }}
                                                                    className="btn btn-secondary"
                                                                    style={{
                                                                        padding: '0.35rem 0.5rem',
                                                                        color: 'hsl(var(--success))',
                                                                        borderColor: 'hsl(var(--success) / 0.3)',
                                                                        fontSize: '0.72rem',
                                                                        fontWeight: 700,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        borderRadius: '6px',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                >
                                                                    <Truck size={14} /> + Courier
                                                                </button>
                                                            );
                                                        })()}

                                                        {(() => {
                                                            const statusUpper = (order.status || '').toUpperCase();
                                                            if (['CANCELLED', 'REFUNDED', 'REFUND_REQUESTED'].includes(statusUpper)) {
                                                                return null;
                                                            }
                                                            const courierInfo = parseCourierDetails(order);
                                                            if ((courierInfo.name || courierInfo.trackingNumber) && order.status !== 'CANCELLED') {
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onOpenSendInfo(order);
                                                                        }}
                                                                        className="btn btn-secondary"
                                                                        style={{
                                                                            padding: '0.35rem 0.5rem',
                                                                            color: 'hsl(var(--primary))',
                                                                            background: 'hsl(var(--primary) / 0.1)',
                                                                            fontSize: '0.72rem',
                                                                            fontWeight: 700,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            borderRadius: '6px',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                        title="Send shipping notification to customer"
                                                                    >
                                                                        <Send size={14} /> Send Info
                                                                    </button>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                onOpenQuickInfo(order);
                                                            }} 
                                                            className="btn btn-secondary" 
                                                            style={{ padding: '0.35rem 0.5rem', color: '#0ea5e9', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px', whiteSpace: 'nowrap' }}
                                                        >
                                                            <Info size={14} /> View Info
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                onDeleteOrder([order.id]); 
                                                            }} 
                                                            className="btn btn-secondary" 
                                                            style={{ padding: '0.4rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} 
                                                            title="Delete Order"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table Pagination */}
                {totalOrderPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap' }}>
                        <button 
                            type="button"
                            onClick={() => setOrdersPage(p => Math.max(1, p - 1))} 
                            disabled={ordersPage === 1} 
                            className="btn btn-secondary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: ordersPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {(() => {
                                const pages = [];
                                const range = 1;
                                pages.push(1);
                                if (ordersPage > range + 2) pages.push('...');
                                for (let i = Math.max(2, ordersPage - range); i <= Math.min(totalOrderPages - 1, ordersPage + range); i++) { pages.push(i); }
                                if (ordersPage < totalOrderPages - range - 1) pages.push('...');
                                if (totalOrderPages > 1) pages.push(totalOrderPages);
                                return pages.map((page, i) => (
                                    page === '...' ? (
                                        <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                    ) : (
                                        <button 
                                            key={page} 
                                            type="button"
                                            onClick={() => setOrdersPage(page)} 
                                            className="btn" 
                                            style={{ 
                                                minWidth: '38px', 
                                                height: '38px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                padding: '0', 
                                                fontSize: '0.9rem', 
                                                fontWeight: 700, 
                                                borderRadius: '10px', 
                                                background: ordersPage === page ? 'hsl(var(--primary))' : '#ffffff', 
                                                color: ordersPage === page ? 'white' : 'hsl(var(--text-main))', 
                                                border: ordersPage === page ? 'none' : '1px solid hsl(var(--border-subtle))', 
                                                cursor: 'pointer', 
                                                transition: 'all 0.2s' 
                                            }}
                                        >
                                            {page}
                                        </button>
                                    )
                                ));
                            })()}
                        </div>
                        <button 
                            type="button"
                            onClick={() => setOrdersPage(p => Math.min(totalOrderPages, p + 1))} 
                            disabled={ordersPage === totalOrderPages} 
                            className="btn btn-secondary" 
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: ordersPage === totalOrderPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
