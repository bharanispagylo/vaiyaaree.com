'use client';

import React from 'react';
import { History } from 'lucide-react';
import { toIST } from '../../utils/ordersHelpers';

export default function OrderActivityTimeline({ orderActivityLogs = [] }) {
    return (
        <div className="card-sub" style={{ 
            padding: '1.25rem', 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid hsl(var(--border-subtle))',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
            <h4 style={{ 
                fontSize: '0.8rem', 
                textTransform: 'uppercase', 
                color: 'hsl(var(--text-muted))', 
                marginBottom: '1rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}>
                <History size={16} /> Order Activity Log ({orderActivityLogs.length})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {orderActivityLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>
                        No status activity recorded yet
                    </div>
                ) : (
                    orderActivityLogs.map((log, idx) => {
                        const colors = {
                            PLACED: { bg: '#eff6ff', color: '#1d4ed8', border: '#3b82f6', cardBg: '#f8fafc' },
                            PAID: { bg: '#ecfdf5', color: '#047857', border: '#10b981', cardBg: '#f0fdf4' },
                            DELIVERED: { bg: '#f0fdf4', color: '#15803d', border: '#22c55e', cardBg: '#f0fdf4' },
                            PACKING: { bg: '#fffbeb', color: '#b45309', border: '#f59e0b', cardBg: '#fffdf5' },
                            SHIPPED: { bg: '#f0f9ff', color: '#0369a1', border: '#0284c7', cardBg: '#f5fbff' },
                            CANCELLED: { bg: '#fef2f2', color: '#b91c1c', border: '#ef4444', cardBg: '#fef5f5' }
                        };
                        const c = colors[log.status] || { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', cardBg: '#f8fafc' };

                        return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{ 
                                    width: '30px', 
                                    height: '30px', 
                                    borderRadius: '50%', 
                                    background: c.bg, 
                                    color: c.color, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    fontWeight: 800, 
                                    fontSize: '0.85rem', 
                                    flexShrink: 0,
                                    border: `1px solid ${c.border}`
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ 
                                    flex: 1, 
                                    padding: '0.75rem 1rem', 
                                    background: c.cardBg, 
                                    borderRadius: '10px', 
                                    borderLeft: `4px solid ${c.border}`, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '3px' 
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'hsl(var(--text-main))' }}>
                                            {log.status}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
                                            {toIST(log.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                    {log.notes && (
                                        <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-main))', fontWeight: 500, opacity: 0.9, marginTop: '2px', wordBreak: 'break-word' }}>
                                            {log.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
