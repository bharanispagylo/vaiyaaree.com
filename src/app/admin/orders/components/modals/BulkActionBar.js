'use client';

import React from 'react';
import { Download, Trash2 } from 'lucide-react';

export default function BulkActionBar({
    selectedOrderIds = [],
    setSelectedOrderIds,
    onPrintAddressLabels,
    onPrintIdLabels,
    onBulkDelete
}) {
    if (!selectedOrderIds || selectedOrderIds.length === 0) return null;

    return (
        <div className="animate-pop" style={{
            position: 'fixed',
            bottom: '2rem',
            width: '60%',
            left: 'calc(var(--sidebar-width, 280px) + (100% - var(--sidebar-width, 280px)) / 2)',
            transform: 'translateX(-50%)',
            background: '#1a1d21',
            padding: '1rem 2rem',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            zIndex: 1000,
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>
                {selectedOrderIds.length} Orders Selected
            </div>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={onPrintAddressLabels}
                    style={{
                        background: 'rgba(99,102,241,0.2)',
                        border: '1px solid rgba(99,102,241,0.5)',
                        color: '#818cf8',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Download size={16} /> Print Address Labels
                </button>
                <button
                    type="button"
                    onClick={onPrintIdLabels}
                    style={{
                        background: 'rgba(16,185,129,0.2)',
                        border: '1px solid rgba(16,185,129,0.5)',
                        color: '#10b981',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Download size={16} /> Print ID Labels
                </button>
                <button
                    type="button"
                    onClick={onBulkDelete}
                    style={{
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.5)',
                        color: '#f87171',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Trash2 size={16} /> Delete Selected
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedOrderIds([])}
                    style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
