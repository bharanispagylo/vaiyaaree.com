'use client';

import React from 'react';
import Link from 'next/link';
import { 
    Search, Plus, RefreshCw, TrendingUp, X, Loader2, 
    Truck, Send, Info, Trash2, ChevronLeft, ChevronRight 
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
    return (
        <div className="orders-list-section">
            {/* Header */}
            <div className="admin-header-row">
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Orders</h1>
                    <p>Manage and track all customer orders • {orders.length} total</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button 
                        type="button" 
                        onClick={() => setIsAddingOrder(true)} 
                        className="btn btn-primary" 
                        style={{ background: 'hsl(var(--primary))', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                    >
                        <Plus size={16} /> Add Manual Order
                    </button>
                    <button 
                        type="button" 
                        onClick={fetchOrders} 
                        className="btn btn-secondary"
                    >
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>
            </div>

            {/* Unified View Controls & Filters Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1.5rem', flexWrap: 'wrap', background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Status:</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                        >
                            {Object.entries(orderCounts).map(([status, count]) => (
                                <option key={status} value={status}>
                                    {status === 'ALL' ? 'All Orders' : status.replace(/_/g, ' ')} ({count})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ width: '1px', height: '24px', background: 'hsl(var(--border-subtle))' }} />

                    {/* Channel / Source Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>Channel:</label>
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            style={{ padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
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
                            padding: '0.6rem 1.25rem', borderRadius: '10px',
                            fontSize: '0.85rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '8px',
                            textDecoration: 'none'
                        }}
                    >
                        <TrendingUp size={16} color="hsl(var(--primary))" /> Order Analysis
                    </Link>
                </div>
            </div>

            {/* Search + Table Card */}
            <div className="card" style={{ padding: 0 }}>
                {/* Search Bar */}
                <div className="admin-search-container">
                    <div className="admin-search-input-wrapper" style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                        <input
                            type="text"
                            placeholder="Search by Order ID, Name or Phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: searchTerm ? '0.75rem 2.5rem 0.75rem 2.75rem' : '0.75rem 1rem 0.75rem 2.75rem',
                                background: '#f1f5f9',
                                border: '1px solid hsl(var(--border-subtle))',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border 0.2s',
                                color: 'hsl(var(--text-main))',
                                fontFamily: 'inherit'
                            }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px'
                                }}
                                title="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

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
                                                    {formatOrderInvoice(order)}
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
