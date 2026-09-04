'use client';

import React from 'react';
import Link from 'next/link';
import { History, Eye, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { getOrderSourceBadge } from './profileHelpers';
import { formatOrderDate } from '@/lib/dateUtils';
import styles from '../profile.module.css';

export default function OrderHistoryTab({
    loadingOrders,
    pastOrders = [],
    paginatedHistoryOrders = [],
    historyOrdersPage,
    setHistoryOrdersPage,
    totalHistoryPages,
    ORDERS_PER_PAGE,
    setTrackSearchId,
    handleTabChange,
    handleTrackSearch
}) {
    return (
        <section className={styles.profileSection}>
            <div className={styles.sectionHeader}>
                <div>
                    <h3 className={styles.sectionTitle}><History size={20} /> Order History</h3>
                    <p className={styles.sectionSubtitle}>Your past delivered and completed orders</p>
                </div>
            </div>

            {loadingOrders ? (
                <div className={styles.loadingState}>Loading order history...</div>
            ) : pastOrders.length === 0 ? (
                <div className={styles.emptyState}>
                    <History size={48} style={{ opacity: 0.2 }} />
                    <p>No past order history</p>
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
                                {paginatedHistoryOrders.map(order => {
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
                                                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'hsl(var(--primary))', fontFamily: 'monospace, sans-serif', textDecoration: 'underline' }}>{displayInv}</div>
                                                </Link>
                                            </td>
                                            <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                {formatOrderDate(order.created_at, { includeTime: false })}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{totalItems} item(s)</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={firstItemName}>
                                                        {firstItemName}{itemsList.length > 1 ? ` +${itemsList.length - 1} more` : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 800, fontSize: '0.88rem', color: 'hsl(var(--text-main))', whiteSpace: 'nowrap' }}>
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
                                                        style={{ padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', background: '#faf5ff', borderColor: '#d8b4fe', color: '#7e22ce', textDecoration: 'none' }}
                                                    >
                                                        <Eye size={12} /> Details
                                                    </Link>
                                                    <button 
                                                        onClick={() => {
                                                            const inv = order.invoice_no ? order.invoice_no : String(order.id).replace(/^[A-Z]+-/, 'INV-');
                                                            setTrackSearchId(inv);
                                                            handleTabChange('track');
                                                            handleTrackSearch(order.id);
                                                        }}
                                                        className={styles.actionBtnOutline}
                                                        style={{ padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                                                    >
                                                        Track Order <ArrowRight size={13} />
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
                        {paginatedHistoryOrders.map(order => {
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
                            Showing <strong>{pastOrders.length === 0 ? 0 : (historyOrdersPage - 1) * ORDERS_PER_PAGE + 1}</strong> to <strong>{Math.min(historyOrdersPage * ORDERS_PER_PAGE, pastOrders.length)}</strong> of <strong>{pastOrders.length}</strong> orders
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={() => setHistoryOrdersPage(p => Math.max(1, p - 1))}
                                disabled={historyOrdersPage === 1}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', background: historyOrdersPage === 1 ? '#f1f5f9' : '#ffffff', color: historyOrdersPage === 1 ? '#94a3b8' : 'hsl(var(--text-main))', fontWeight: 700, fontSize: '0.82rem', cursor: historyOrdersPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                <ChevronLeft size={15} /> Previous
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                {Array.from({ length: Math.max(1, totalHistoryPages) }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setHistoryOrdersPage(p)}
                                        style={{ minWidth: '32px', height: '32px', borderRadius: '6px', border: historyOrdersPage === p ? 'none' : '1px solid hsl(var(--border-subtle, #e2e8f0))', background: historyOrdersPage === p ? 'hsl(var(--primary))' : '#ffffff', color: historyOrdersPage === p ? '#ffffff' : 'hsl(var(--text-main))', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setHistoryOrdersPage(p => Math.min(Math.max(1, totalHistoryPages), p + 1))}
                                disabled={historyOrdersPage >= Math.max(1, totalHistoryPages)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle, #e2e8f0))', background: historyOrdersPage >= Math.max(1, totalHistoryPages) ? '#f1f5f9' : '#ffffff', color: historyOrdersPage >= Math.max(1, totalHistoryPages) ? '#94a3b8' : 'hsl(var(--text-main))', fontWeight: 700, fontSize: '0.82rem', cursor: historyOrdersPage >= Math.max(1, totalHistoryPages) ? 'not-allowed' : 'pointer' }}
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
