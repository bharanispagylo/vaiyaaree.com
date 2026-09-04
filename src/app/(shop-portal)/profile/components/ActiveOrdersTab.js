'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Package, Eye, XCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { getOrderSourceBadge } from './profileHelpers';
import { formatOrderDate } from '@/lib/dateUtils';
import styles from '../profile.module.css';

export default function ActiveOrdersTab({
    loadingOrders,
    activeOrders = [],
    paginatedActiveOrders = [],
    activeOrdersPage,
    setActiveOrdersPage,
    totalActivePages,
    ORDERS_PER_PAGE,
    setCancelModalOrder,
    setCancelReason,
    setTrackSearchId,
    handleTabChange,
    handleTrackSearch
}) {
    return (
        <section className={styles.profileSection}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}><ShoppingBag size={20} /> Active Orders</h3>
                    <p className={styles.sectionSubtitle}>View and track your ongoing order status</p>
                </div>
            </div>

            {loadingOrders ? (
                <div className={styles.loadingState}>Loading active orders...</div>
            ) : activeOrders.length === 0 ? (
                <div className={styles.emptyState}>
                    <Package size={48} style={{ opacity: 0.2 }} />
                    <p>No active orders right now</p>
                    <span>When you place new orders, they will appear here.</span>
                    <Link href="/shop" className={styles.btnPrimary} style={{ marginTop: '1.5rem', width: 'auto' }}>
                        Explore Products
                    </Link>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    {/* Desktop Table View */}
                    <div className={styles.desktopTableView}>
                        <table className={styles.dataTable}>
                            <thead>
                                <tr>
                                    <th>INVOICE NO</th>
                                    <th>DATE</th>
                                    <th>ITEMS</th>
                                    <th>TOTAL</th>
                                    <th>SOURCE</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'right' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedActiveOrders.map(order => {
                                    const displayInv = order.invoice_no ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`) : `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}`;
                                    const itemsList = order.order_items || [];
                                    const firstItemName = itemsList[0]?.product_name || 'Item';
                                    const totalItems = itemsList.reduce((sum, item) => sum + (item.quantity || 1), 0);

                                    return (
                                        <tr key={order.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <Link
                                                    href={`/profile/orders/${order.id}`}
                                                    style={{ textDecoration: 'none' }}
                                                    title="View full order details"
                                                >
                                                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'hsl(var(--primary))', fontFamily: 'monospace, sans-serif', textDecoration: 'underline' }}>{displayInv}</div>
                                                </Link>
                                            </td>
                                            <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                                {formatOrderDate(order.created_at, { includeTime: false })}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{totalItems} item(s)</span>
                                                    <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={firstItemName}>
                                                        {firstItemName}{itemsList.length > 1 ? ` +${itemsList.length - 1} more` : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 800, fontSize: '0.85rem', color: 'hsl(var(--text-main))', whiteSpace: 'nowrap' }}>
                                                ₹{(order.total_amount || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                {getOrderSourceBadge(order)}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <span className={`${styles.orderStatusBadge} ${styles['status' + order.status]}`} style={{ padding: 0, background: 'transparent', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                                                    <Link
                                                        href={`/profile/orders/${order.id}`}
                                                        className={styles.actionBtnOutline}
                                                        style={{ padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', background: '#faf5ff', borderColor: '#d8b4fe', color: '#7e22ce', textDecoration: 'none' }}
                                                    >
                                                        <Eye size={12} /> Details
                                                    </Link>
                                                    {['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'].includes((order.status || '').toUpperCase()) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCancelModalOrder(order);
                                                                setCancelReason('Changed my mind');
                                                            }}
                                                            style={{
                                                                padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                                                whiteSpace: 'nowrap', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626',
                                                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
                                                            }}
                                                        >
                                                            <XCircle size={12} /> Cancel
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            const inv = order.invoice_no ? order.invoice_no : String(order.id).replace(/^[A-Z]+-/, 'INV-');
                                                            setTrackSearchId(inv);
                                                            handleTabChange('track');
                                                            handleTrackSearch(order.id);
                                                        }}
                                                        className={styles.actionBtnOutline}
                                                        style={{ padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                                                    >
                                                        Track Order <ArrowRight size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className={styles.mobileOrderCardsList}>
                        {paginatedActiveOrders.map(order => {
                            const displayInv = order.invoice_no ? (order.invoice_no.startsWith('#') ? order.invoice_no : `#${order.invoice_no}`) : `#${String(order.id).replace(/^[A-Z]+-/, 'INV-')}`;
                            const itemsList = order.order_items || [];
                            const firstItemName = itemsList[0]?.product_name || 'Item';
                            const totalItems = itemsList.reduce((sum, item) => sum + (item.quantity || 1), 0);

                            return (
                                <div key={order.id} className={styles.mobileOrderCard}>
                                    <div className={styles.mobileCardHeader}>
                                        <div>
                                            <Link href={`/profile/orders/${order.id}`} className={styles.mobileInvNo} style={{ color: 'hsl(var(--primary))', textDecoration: 'underline' }}>
                                                {displayInv}
                                            </Link>
                                            <div className={styles.mobileOrderDate}>
                                                {formatOrderDate(order.created_at, { includeTime: false })}
                                            </div>
                                        </div>
                                        <span className={`${styles.orderStatusBadge} ${styles['status' + order.status]}`} style={{ padding: 0, background: 'transparent', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className={styles.mobileCardBody}>
                                        <div className={styles.mobileItemSummary}>
                                            <span className={styles.mobileItemCount}>{totalItems} item(s)</span>
                                            <span className={styles.mobileItemName} title={firstItemName}>
                                                {firstItemName}{itemsList.length > 1 ? ` +${itemsList.length - 1} more` : ''}
                                            </span>
                                        </div>
                                        <div className={styles.mobilePriceSource}>
                                            <div className={styles.mobilePrice}>₹{(order.total_amount || 0).toLocaleString('en-IN')}</div>
                                            {getOrderSourceBadge(order)}
                                        </div>
                                    </div>

                                    <div className={styles.mobileCardActions}>
                                        <Link 
                                            href={`/profile/orders/${order.id}`}
                                            className={styles.mobileTrackBtn}
                                            style={{ background: '#faf5ff', borderColor: '#d8b4fe', color: '#7e22ce', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                        >
                                            <Eye size={13} /> Details
                                        </Link>
                                        {['PLACED', 'PAID', 'PENDING', 'AWAITING_PAYMENT'].includes((order.status || '').toUpperCase()) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCancelModalOrder(order);
                                                    setCancelReason('Changed my mind');
                                                }}
                                                className={styles.mobileCancelBtn}
                                            >
                                                <XCircle size={13} /> Cancel Order
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => {
                                                const inv = order.invoice_no ? order.invoice_no : String(order.id).replace(/^[A-Z]+-/, 'INV-');
                                                setTrackSearchId(inv);
                                                handleTabChange('track');
                                                handleTrackSearch(order.id);
                                            }}
                                            className={styles.mobileTrackBtn}
                                        >
                                            Track Order <ArrowRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle, #e2e8f0))', flexWrap: 'wrap', gap: '0.75rem', background: '#fafafa' }}>
                        <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                            Showing <strong>{activeOrders.length === 0 ? 0 : (activeOrdersPage - 1) * ORDERS_PER_PAGE + 1}</strong> to <strong>{Math.min(activeOrdersPage * ORDERS_PER_PAGE, activeOrders.length)}</strong> of <strong>{activeOrders.length}</strong> orders
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => setActiveOrdersPage(p => Math.max(1, p - 1))}
                                disabled={activeOrdersPage === 1}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', background: activeOrdersPage === 1 ? '#f1f5f9' : '#ffffff', color: activeOrdersPage === 1 ? '#94a3b8' : 'hsl(var(--text-main))', fontWeight: 700, fontSize: '0.82rem', cursor: activeOrdersPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                <ChevronLeft size={15} /> Previous
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {Array.from({ length: Math.max(1, totalActivePages) }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setActiveOrdersPage(p)}
                                        style={{ minWidth: '32px', height: '32px', borderRadius: '6px', border: activeOrdersPage === p ? 'none' : '1px solid hsl(var(--border-subtle, #e2e8f0))', background: activeOrdersPage === p ? 'hsl(var(--primary))' : '#ffffff', color: activeOrdersPage === p ? '#ffffff' : 'hsl(var(--text-main))', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setActiveOrdersPage(p => Math.min(Math.max(1, totalActivePages), p + 1))}
                                disabled={activeOrdersPage >= Math.max(1, totalActivePages)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', background: activeOrdersPage >= Math.max(1, totalActivePages) ? '#f1f5f9' : '#ffffff', color: activeOrdersPage >= Math.max(1, totalActivePages) ? '#94a3b8' : 'hsl(var(--text-main))', fontWeight: 700, fontSize: '0.82rem', cursor: activeOrdersPage >= Math.max(1, totalActivePages) ? 'not-allowed' : 'pointer' }}
                            >
                                Next <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
