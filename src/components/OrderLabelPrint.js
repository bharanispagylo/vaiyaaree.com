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

export default function OrderLabelPrint({ orders }) {
    if (!orders || orders.length === 0) return null;

    // chunk orders into groups of 6 (2x3 grid per page)
    const chunks = [];
    for (let i = 0; i < orders.length; i += 6) {
        chunks.push(orders.slice(i, i + 6));
    }

    return (
        <div className="label-print-container">
            {chunks.map((chunk, pageIdx) => (
                <div key={pageIdx} className="print-page">
                    <div className="label-grid">
                        {chunk.map((order) => (
                            <div key={order.id} className="label-card">

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
                            </div>
                        ))}

                        {/* Fill empty slots so grid stays 2x3 */}
                        {chunk.length < 6 && Array.from({ length: 6 - chunk.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="label-card label-card-empty" />
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
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: repeat(3, 1fr);
                    gap: 6mm;
                    width: 100%;
                    height: 100%;
                }

                .label-card {
                    border: 1.5px solid #111;
                    padding: 5mm;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    background: white;
                    overflow: hidden;
                    width: 100%;
                    min-height: 80mm;
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
                        margin: 6mm;
                    }

                    body * {
                        visibility: hidden;
                    }

                    .label-print-container,
                    .label-print-container * {
                        visibility: visible;
                    }

                    .label-print-container {
                        position: absolute;
                        inset: 0;
                        background: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }

                    .print-page {
                        width: 100%;
                        min-height: 297mm;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        page-break-after: always;
                    }

                    .label-grid {
                        width: 100%;
                        height: 100%;
                        gap: 4mm;
                    }

                    .label-card {
                        border: 1.5px solid #000 !important;
                        min-height: 80mm !important;
                        page-break-inside: avoid;
                        overflow: hidden;
                    }

                    .label-card-empty {
                        border: none !important;
                        background: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
