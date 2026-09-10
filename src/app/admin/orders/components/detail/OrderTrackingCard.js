'use client';

import React from 'react';
import { Truck, ExternalLink } from 'lucide-react';

export default function OrderTrackingCard({ selectedOrder }) {
    if (!selectedOrder?.tracking_number && !selectedOrder?.courier_name) return null;

    return (
        <div className="card-sub" style={{
            padding: '1.25rem',
            background: 'hsl(var(--primary) / 0.04)',
            borderRadius: '16px',
            border: '1px dashed hsl(var(--primary) / 0.35)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
            <h4 style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '0.85rem', 
                color: 'hsl(var(--primary))', 
                margin: '0 0 1rem 0',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                <Truck size={17} /> Shipping & Tracking Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '3px', fontWeight: 700 }}>
                        Courier Partner
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        {selectedOrder.courier_name || 'Not specified'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '3px', fontWeight: 700 }}>
                        Tracking / AWB Number
                    </div>
                    <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.9rem', color: '#0f172a' }}>
                        {selectedOrder.tracking_number || '—'}
                    </div>
                </div>
            </div>
            {selectedOrder.tracking_url && (
                <a 
                    href={selectedOrder.tracking_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary" 
                    style={{ marginTop: '1rem', width: '100%', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                    <ExternalLink size={14} /> Track Package Live
                </a>
            )}
        </div>
    );
}
