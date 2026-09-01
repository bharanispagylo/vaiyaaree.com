'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';

export default function DeleteConfirmModal({
    confirmDelete,
    onClose,
    onConfirm
}) {
    if (!confirmDelete) return null;

    const count = confirmDelete.ids ? confirmDelete.ids.length : 1;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease' }}>
            <div className="card shadow-premium" style={{ maxWidth: '400px', width: '90%', padding: '2.5rem 2rem', textAlign: 'center', animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)', background: '#fff', border: '1px solid hsl(var(--border-subtle))', borderRadius: '24px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 20px rgba(239,68,68,0.1)' }}>
                    <Trash2 size={36} />
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontWeight: 800, fontSize: '1.5rem', color: 'hsl(var(--text-main))' }}>Confirm Delete?</h3>
                <p style={{ color: 'hsl(var(--text-muted))', marginBottom: '2.5rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    This action will permanently remove {count > 1 ? `${count} order records` : 'the order record'} and restore any associated stock. This cannot be undone.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '0.75rem', borderRadius: '12px' }}>Keep Order</button>
                    <button type="button" onClick={onConfirm} className="btn" style={{ background: '#ef4444', color: 'white', padding: '0.75rem', borderRadius: '12px', fontWeight: 700 }}>Delete Now</button>
                </div>
            </div>
        </div>
    );
}
