'use client';

import { Trash2 } from 'lucide-react';

export default function ProductBulkActionBar({
    selectedCount = 0,
    onBulkDelete,
    onClearSelection
}) {
    if (selectedCount === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'hsl(var(--text-main))',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 1000,
            animation: 'slideUp 0.3s ease'
        }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {selectedCount} Products Selected
            </div>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ display: 'flex', gap: '1rem' }}>
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
                    onClick={onClearSelection}
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
