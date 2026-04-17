'use client';

import React from 'react';

const formatAddress = (addr) => {
    if (!addr) return "";
    try {
        if (typeof addr === 'string') {
            if (addr.startsWith('{') && addr.endsWith('}')) {
                const parsed = JSON.parse(addr);
                const parts = [
                    parsed.address,
                    parsed.city,
                    parsed.state,
                    parsed.pincode
                ].filter(Boolean);
                return parts.join(', ');
            }
            return addr;
        }
        if (typeof addr === 'object') {
            const parts = [
                addr.address,
                addr.city,
                addr.state,
                addr.pincode
            ].filter(Boolean);
            return parts.join(', ');
        }
    } catch (e) {
        return String(addr);
    }
    return String(addr);
};

const STORE_INFO = {
    name: "CAST PRINTZ / AISHWARYA SAREE",
    address: "123, Sample Street, Saree Market",
    city: "Salem, Tamil Nadu",
    pincode: "636001",
    phone: "+91 98765 43210"
};

export default function OrderLabelPrint({ orders, mode = 'address' }) {
    if (!orders || orders.length === 0) return null;

    // Determine grid density based on mode
    const isSmall = mode === 'id';
    const labelsPerPage = isSmall ? 65 : 6; // 65 labels (5x13) for ID only, 6 labels (2x3) for Address

    const chunks = [];
    for (let i = 0; i < orders.length; i += labelsPerPage) {
        chunks.push(orders.slice(i, i + labelsPerPage));
    }

    return (
        <div className="label-print-container">
            {chunks.map((chunk, pageIdx) => (
                <div key={pageIdx} className="print-page">
                    <div className="label-grid">
                        {chunk.map((order) => (
                            <div key={order.id} className="label-card">
                                {mode === 'id' ? (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                        <div style={{ fontSize: '7.5pt', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1mm' }}>
                                            Order ID :
                                        </div>
                                        <div style={{ fontSize: '14pt', fontWeight: 900, color: '#000', fontFamily: 'monospace', lineHeight: 1 }}>
                                            #{order.id?.toString().slice(-8)}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* HEADER: Payment badge + Order ID */}
                                        <div className="label-header">
                                            <div className={`payment-badge ${order.payment_method?.toUpperCase() === 'COD' ? 'badge-cod' : 'badge-prepaid'}`}>
                                                {order.payment_method?.toUpperCase() === 'COD' ? 'CASH ON DELIVERY' : 'PREPAID'}
                                            </div>
                                            <div className="order-no">#{order.id?.toString().slice(-8)}</div>
                                        </div>

                                        {/* FROM section */}
                                        <div className="label-section">
                                            <div className="section-label">FROM</div>
                                            <div className="from-name">{STORE_INFO.name}</div>
                                            <div className="from-details">{STORE_INFO.address}, {STORE_INFO.city} – {STORE_INFO.pincode}</div>
                                            <div className="from-details">{STORE_INFO.phone}</div>
                                        </div>

                                        <div className="divider-dashed" />

                                        {/* TO section */}
                                        <div className="label-section to-section">
                                            <div className="section-label">TO</div>
                                            <div className="to-name">{order.customer_name}</div>
                                            <div className="to-address">
                                                {formatAddress(order.shipping_address || order.delivery_address || order.billing_address)}
                                            </div>
                                            <div className="to-phone">
                                                {order.customer_phone}
                                            </div>
                                        </div>

                                        {/* FOOTER: Courier + AWB */}
                                        <div className="label-footer">
                                            <div className="footer-left">
                                                {order.courier_name && (
                                                    <div className="courier-name">{order.courier_name}</div>
                                                )}
                                                {order.tracking_number && (
                                                    <div className="awb-no">AWB: {order.tracking_number}</div>
                                                )}
                                            </div>
                                            <div className="footer-right">
                                                <div className="contents-label">CONTENTS</div>
                                                <div className="contents-value">Saree Package</div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {/* Fill empty slots */}
                        {chunk.length < labelsPerPage && Array.from({ length: labelsPerPage - chunk.length }).map((_, i) => (
                            <div key={`empty-${i}`} className={`label-card label-card-empty ${isSmall ? 'label-small' : ''}`} />
                        ))}
                    </div>
                </div>
            ))}

            <style jsx global>{`
                /* ── SCREEN PREVIEW ── */
                .label-print-container {
                    background: #e5e7eb;
                    min-height: 100vh;
                    padding: 24px;
                    box-sizing: border-box;
                    font-family: Arial, Helvetica, sans-serif;
                }

                .print-page {
                    background: white;
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto 32px;
                    padding: 8mm;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.15);
                    box-sizing: border-box;
                }

                .label-grid {
                    display: grid;
                    grid-template-columns: ${isSmall ? 'repeat(5, 1fr)' : '1fr 1fr'};
                    grid-template-rows: ${isSmall ? 'repeat(13, 1fr)' : 'repeat(3, 1fr)'};
                    gap: ${isSmall ? '1.5mm' : '6mm'};
                    width: 100%;
                    height: 100%;
                }

                .label-card {
                    border: 1.2px solid #111;
                    padding: ${isSmall ? '1.5mm' : '5mm'};
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    background: white;
                    overflow: hidden;
                    width: 100%;
                    min-height: ${isSmall ? '18mm' : '80mm'};
                }

                .label-card-empty {
                    border: 1.5px dashed #ccc;
                    background: #fafafa;
                }

                /* Header */
                .label-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3mm;
                    flex-shrink: 0;
                }

                .payment-badge {
                    font-size: 8pt;
                    font-weight: 900;
                    padding: 2px 8px;
                    border-radius: 3px;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                }
                .badge-cod {
                    background: #111;
                    color: #fff;
                }
                .badge-prepaid {
                    background: #166534;
                    color: #fff;
                }

                .order-no {
                    font-size: 7.5pt;
                    font-weight: 700;
                    color: #444;
                    font-family: monospace;
                }

                /* Sections */
                .label-section {
                    margin-bottom: 2.5mm;
                    flex-shrink: 0;
                }

                .section-label {
                    font-size: 6.5pt;
                    font-weight: 900;
                    letter-spacing: 1px;
                    color: #666;
                    text-transform: uppercase;
                    border-bottom: 0.5px solid #ccc;
                    padding-bottom: 1px;
                    margin-bottom: 1.5mm;
                }

                .from-name {
                    font-size: 8.5pt;
                    font-weight: 700;
                    color: #111;
                    line-height: 1.3;
                    word-break: break-word;
                }
                .from-details {
                    font-size: 8pt;
                    color: #333;
                    line-height: 1.3;
                    word-break: break-word;
                }

                /* Dashed divider */
                .divider-dashed {
                    border-top: 1px dashed #aaa;
                    margin: 2mm 0;
                    flex-shrink: 0;
                }

                /* TO section — larger text for delivery */
                .to-section {
                    overflow: hidden;
                    margin-bottom: 2mm;
                }

                .to-name {
                    font-size: 16pt;
                    font-weight: 700;
                    color: #000;
                    text-transform: uppercase;
                    line-height: 1.2;
                    word-break: break-word;
                    margin-bottom: 2mm;
                }

                .to-address {
                    font-size: 12pt;
                    font-weight: 600;
                    color: #111;
                    line-height: 1.4;
                    word-break: break-word;
                    margin-bottom: 2mm;
                }

                .to-phone {
                    font-size: 13pt;
                    font-weight: 600;
                    color: #000;
                    letter-spacing: 0.5px;
                }

                /* Footer */
                .label-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    padding-top: 2.5mm;
                    border-top: 1.5px solid #111;
                    flex-shrink: 0;
                    margin-top: 4mm;
                }

                .footer-left {
                    display: flex;
                    flex-direction: column;
                    gap: 1mm;
                    overflow: hidden;
                }

                .courier-name {
                    font-size: 9pt;
                    font-weight: 900;
                    text-transform: uppercase;
                    color: #111;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .awb-no {
                    font-size: 9pt;
                    font-weight: 900;
                    color: #000;
                    font-family: monospace;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .footer-right {
                    text-align: right;
                    flex-shrink: 0;
                    margin-left: 4mm;
                }

                .contents-label {
                    font-size: 6pt;
                    font-weight: 700;
                    color: #888;
                    letter-spacing: 0.5px;
                }
                .contents-value {
                    font-size: 7.5pt;
                    font-weight: 700;
                    color: #333;
                }

                /* ── PRINT STYLES ── */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }

                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        height: auto !important;
                    }

                    body * {
                        visibility: hidden;
                    }

                    .label-print-container,
                    .label-print-container * {
                        visibility: visible;
                    }

                    .label-print-container {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        display: block !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    .print-page:not(:last-child) {
                        page-break-after: always !important;
                    }

                    .print-page {
                        width: 210mm;
                        height: 297mm;
                        margin: 0 auto !important;
                        padding: 10mm !important;
                        box-sizing: border-box;
                        box-shadow: none !important;
                        position: relative;
                        overflow: hidden;
                        page-break-inside: avoid !important;
                    }

                    .print-page:last-child {
                        page-break-after: auto !important;
                        margin-bottom: 0 !important;
                    }

                    .label-grid {
                        display: grid;
                        grid-template-columns: ${isSmall ? 'repeat(5, 1fr)' : '1fr 1fr'};
                        grid-template-rows: ${isSmall ? 'repeat(13, 1fr)' : 'repeat(3, 1fr)'};
                        gap: ${isSmall ? '1.5mm' : '8mm'};
                        width: 100%;
                        height: 100%;
                    }

                    .label-card {
                        border: 1.2px solid #000 !important;
                        height: 100%;
                        page-break-inside: avoid;
                        padding: ${isSmall ? '1.5mm' : '6mm'};
                        box-sizing: border-box;
                    }

                    .label-card-empty {
                        border: none !important;
                        background: none !important;
                        visibility: hidden !important;
                    }
                }
            `}</style>
        </div>
    );
}
