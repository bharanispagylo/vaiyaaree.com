'use client';

import React from 'react';
import OrderLabelPrint from '@/components/OrderLabelPrint';

export default function PrintPreviewModal({
    show,
    printingOrders = [],
    printMode = 'address',
    onClose
}) {
    if (!show) return null;

    return (
        <div className="print-preview-modal" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'white', overflow: 'auto' }}>
            <div className="no-print" style={{ position: 'sticky', top: 0, padding: '1rem 2rem', background: '#f8fafc', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                <h2 style={{ margin: 0 }}>Print Preview ({printingOrders.length} labels)</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary">Close Preview</button>
                    <button type="button" onClick={() => window.print()} className="btn btn-primary">Proceed to Print</button>
                </div>
            </div>
            <OrderLabelPrint orders={printingOrders} mode={printMode} />
        </div>
    );
}
