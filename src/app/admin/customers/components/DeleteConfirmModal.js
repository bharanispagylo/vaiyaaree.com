'use client';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    loading, 
    customer, 
    selectedCount = 1 
}) {
    if (!isOpen) return null;

    const isBatch = selectedCount > 1;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease'
        }}>
            <div 
                className="card shadow-premium animate-enter" 
                style={{
                    width: '100%',
                    maxWidth: '460px',
                    padding: '2.25rem 2rem',
                    borderRadius: '24px',
                    background: '#ffffff',
                    position: 'relative',
                    textAlign: 'center',
                    border: '1px solid #fee2e2'
                }}
            >
                <button
                    onClick={onClose}
                    disabled={loading}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'hsl(var(--text-muted))',
                        padding: '4px'
                    }}
                >
                    <X size={20} />
                </button>

                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#fef2f2',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                    border: '1px solid #fecaca'
                }}>
                    <AlertTriangle size={32} />
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                    {isBatch ? `Delete ${selectedCount} Customers?` : 'Delete Customer Account?'}
                </h3>

                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                    {isBatch ? (
                        <>
                            Are you sure you want to permanently delete <strong>{selectedCount} selected customers</strong>? This will remove their accounts and saved addresses.
                        </>
                    ) : (
                        <>
                            Are you sure you want to permanently delete customer <strong>{customer?.name || 'this customer'}</strong> ({customer?.phone})?
                        </>
                    )}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.85rem 1.25rem', borderRadius: '12px', fontWeight: 700 }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '0.85rem 1.25rem',
                            background: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 800,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)'
                        }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {loading ? 'Deleting...' : isBatch ? `Delete All (${selectedCount})` : 'Confirm Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
