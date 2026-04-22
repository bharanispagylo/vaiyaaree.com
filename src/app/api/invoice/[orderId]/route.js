import { supabase } from '@/lib/supabaseClient';
import fs from 'fs';
import path from 'path';

function getLogoBase64() {
    const logoPaths = [
        path.join(process.cwd(), 'public', 'images', 'cp-logo.png'),
        path.join(process.cwd(), 'public', 'images', 'logo1.jpg'),
        path.join(process.cwd(), 'public', 'images', 'aiswarya-logo.png'),
    ];
    for (const p of logoPaths) {
        if (fs.existsSync(p)) {
            const buf = fs.readFileSync(p);
            const ext = path.extname(p).toLowerCase();
            const mime = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
            return `data:${mime};base64,${buf.toString('base64')}`;
        }
    }
    return null;
}

function formatAddress(addr) {
    if (!addr) return '—';
    try {
        if (typeof addr === 'string') {
            if (addr.startsWith('{')) {
                const parsed = JSON.parse(addr);
                return [parsed.name, parsed.address, parsed.city, parsed.state, parsed.pincode]
                    .filter(Boolean).join(', ');
            }
            return addr;
        }
        if (typeof addr === 'object') {
            return [addr.name, addr.address, addr.city, addr.state, addr.pincode]
                .filter(Boolean).join(', ');
        }
    } catch (e) { }
    return String(addr) || '—';
}

export async function generateOrderPDFBuffer(order, settings) {
    const pdfmake = (await import('pdfmake')).default;
    const vfsModule = await import('pdfmake/build/vfs_fonts.js');
    const vfs = vfsModule.default || vfsModule;

    // Manually push font buffers into the virtual file system
    // This avoids the pdfmake 0.3.x bug where it tries to call .toLowerCase() on font objects
    if (vfs) {
        Object.keys(vfs).forEach(key => {
            const fontData = vfs[key];
            if (typeof fontData === 'string') {
                pdfmake.virtualfs.writeFileSync(key, Buffer.from(fontData, 'base64'));
            } else {
                pdfmake.virtualfs.writeFileSync(key, fontData);
            }
        });
    }

    const fonts = {
        Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
        }
    };

    const items = order.order_items || [];
    const subtotal = items.reduce((s, i) => s + ((i.price_at_time || 0) * (i.quantity || 1)), 0);
    const cgst = order.cgst || 0;
    const sgst = order.sgst || 0;
    const igst = order.igst || 0;
    const shipping = order.shipping_cost || 0;
    const total = order.total_amount || (subtotal + cgst + sgst + igst + shipping);
    const dateStr = new Date(order.created_at).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const logoBase64 = getLogoBase64();

    // Table Styles
    const tableHeaderStyle = { fillColor: '#f8fafc', color: '#475569', bold: true, fontSize: 8, margin: [0, 5, 0, 5] };

    // Build items table rows
    const tableBody = [
        // Header row
        [
            { text: '#', style: 'tableHeader', ...tableHeaderStyle },
            { text: 'ITEM DESCRIPTION', style: 'tableHeader', ...tableHeaderStyle },
            { text: 'QTY', style: 'tableHeader', alignment: 'center', ...tableHeaderStyle },
            { text: 'RATE', style: 'tableHeader', alignment: 'right', ...tableHeaderStyle },
            { text: 'AMOUNT', style: 'tableHeader', alignment: 'right', ...tableHeaderStyle },
        ],
        ...items.map((item, i) => [
            { text: `${i + 1}`, color: '#94a3b8', fontSize: 9, margin: [0, 8, 0, 8] },
            {
                stack: [
                    { text: item.product_name || 'Product', bold: true, fontSize: 10 },
                    ...(item.variant_name ? [{ text: item.variant_name, fontSize: 8, color: '#94a3b8' }] : [])
                ],
                margin: [0, 8, 0, 8]
            },
            { text: String(item.quantity || 1), alignment: 'center', fontSize: 10, margin: [0, 8, 0, 8] },
            { text: `₹${(item.price_at_time || 0).toLocaleString('en-IN')}`, alignment: 'right', fontSize: 10, margin: [0, 8, 0, 8] },
            { text: `₹${((item.price_at_time || 0) * (item.quantity || 1)).toLocaleString('en-IN')}`, alignment: 'right', fontSize: 10, bold: true, margin: [0, 8, 0, 8] },
        ])
    ];

    const header = {
        columns: [
            {
                stack: [
                    logoBase64 ? { image: logoBase64, width: 45, height: 45, margin: [0, 0, 0, 10] } : null,
                    { text: settings.shop_name, fontSize: 24, bold: true, color: '#0f172a' },
                    { text: settings.shop_address || 'Premium Textiles', fontSize: 9, color: '#64748b', margin: [0, 4, 0, 0] },
                ].filter(Boolean)
            },
            {
                stack: [
                    { text: 'INVOICE', fontSize: 26, bold: true, color: '#0f172a', alignment: 'right' },
                    { text: `#${order.id}`, fontSize: 13, bold: true, color: '#334155', alignment: 'right', margin: [0, 5, 0, 0] },
                    { text: dateStr, fontSize: 10, color: '#64748b', alignment: 'right' },
                ]
            }
        ],
        margin: [0, 0, 0, 20]
    };

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60],
        content: [
            header,
            // Horizontal rule
            { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1.5, lineColor: '#1e293b' }], margin: [0, 0, 0, 30] },

            // Bill To / Payment Info Row
            {
                columns: [
                    {
                        stack: [
                            { text: 'BILL TO', fontSize: 7, bold: true, color: '#94a3b8', characterSpacing: 1 },
                            { text: order.customer_name || 'Customer', fontSize: 14, bold: true, color: '#1e293b', margin: [0, 8, 0, 4] },
                            { text: `+ ${order.customer_phone || ''}`, fontSize: 10, color: '#475569' },
                        ]
                    },
                    {
                        stack: [
                            { text: 'PAYMENT INFO', fontSize: 7, bold: true, color: '#94a3b8', characterSpacing: 1, alignment: 'right' },
                            {
                                text: [
                                    { text: 'Payment Method: ', color: '#64748b' },
                                    { text: order.payment_method || 'N/A', bold: true, color: '#1e293b' }
                                ],
                                alignment: 'right', fontSize: 10, margin: [0, 8, 0, 4]
                            },
                            {
                                columns: [
                                    { text: '', width: '*' },
                                    {
                                        text: [
                                            { text: 'Status: ', color: '#64748b', fontSize: 10 },
                                            { text: `  ${order.status || 'PLACED'}  `, bold: true, color: '#1e293b', background: '#f1f5f9', fontSize: 9 }
                                        ],
                                        width: 'auto'
                                    }
                                ]
                            }
                        ]
                    }
                ],
                margin: [0, 0, 0, 25]
            },

            // Address Box
            {
                table: {
                    widths: ['*', '*'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: 'BILLING ADDRESS', fontSize: 7, bold: true, color: '#94a3b8', characterSpacing: 0.5, margin: [0, 0, 0, 8] },
                                    { text: formatAddress(order.billing_address || order.delivery_address), fontSize: 9, color: '#334155', lineHeight: 1.3 }
                                ],
                                padding: [15, 15, 15, 15],
                                border: [false, false, true, false]
                            },
                            {
                                stack: [
                                    { text: 'SHIPPING ADDRESS', fontSize: 7, bold: true, color: '#94a3b8', characterSpacing: 0.5, margin: [0, 0, 0, 8] },
                                    { text: formatAddress(order.shipping_address || order.delivery_address || order.billing_address), fontSize: 9, color: '#334155', lineHeight: 1.3 }
                                ],
                                padding: [15, 15, 15, 15],
                                border: [false, false, false, false]
                            }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: () => 0,
                    vLineWidth: (i) => i === 1 ? 0.5 : 0,
                    vLineColor: () => '#e2e8f0',
                    fillColor: '#f8fafc'
                },
                margin: [0, 0, 0, 30]
            },

            // Items Table
            {
                table: {
                    headerRows: 1,
                    widths: [30, '*', 40, 80, 80],
                    body: tableBody
                },
                layout: {
                    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => '#f1f5f9',
                    paddingTop: () => 8,
                    paddingBottom: () => 8,
                    fillColor: (i) => (i > 0 && i % 2 === 0) ? '#f8fafc' : null
                }
            },

            // Summary Block
            {
                columns: [
                    { text: '', width: '*' },
                    {
                        stack: [
                            {
                                table: {
                                    widths: ['*', 100],
                                    body: [
                                        [
                                            { text: 'Subtotal:', color: '#64748b', margin: [0, 5, 0, 5] },
                                            { text: `₹${subtotal.toLocaleString('en-IN')}`, alignment: 'right', bold: true, color: '#1e293b', margin: [0, 5, 0, 5] }
                                        ],
                                        ...(cgst > 0 ? [[{ text: 'CGST (2.5%):', color: '#64748b', margin: [0, 5, 0, 5] }, { text: `₹${cgst.toLocaleString('en-IN')}`, alignment: 'right', bold: true, color: '#1e293b', margin: [0, 5, 0, 5] }]] : []),
                                        ...(sgst > 0 ? [[{ text: 'SGST (2.5%):', color: '#64748b', margin: [0, 5, 0, 5] }, { text: `₹${sgst.toLocaleString('en-IN')}`, alignment: 'right', bold: true, color: '#1e293b', margin: [0, 5, 0, 5] }]] : []),
                                        ...(igst > 0 ? [[{ text: 'IGST (5%):', color: '#64748b', margin: [0, 5, 0, 5] }, { text: `₹${igst.toLocaleString('en-IN')}`, alignment: 'right', bold: true, color: '#1e293b', margin: [0, 5, 0, 5] }]] : []),
                                        [
                                            { text: 'Shipping:', color: '#64748b', border: [false, false, false, true], borderColor: '#e2e8f0', margin: [0, 5, 0, 10] },
                                            { text: `₹${shipping.toLocaleString('en-IN')}`, alignment: 'right', bold: true, color: '#1e293b', border: [false, false, false, true], borderColor: '#e2e8f0', margin: [0, 5, 0, 10] }
                                        ],
                                        [
                                            { text: 'Grand Total:', bold: true, fontSize: 13, color: '#0f172a', margin: [0, 20, 0, 0] },
                                            { text: `₹${total.toLocaleString('en-IN')}`, bold: true, fontSize: 22, color: '#0f172a', alignment: 'right', margin: [0, 15, 0, 0] }
                                        ]
                                    ]
                                },
                                layout: 'noBorders',
                                fillColor: '#f8fafc',
                                padding: [20, 20, 20, 20]
                            }
                        ],
                        width: 250,
                        margin: [0, 20, 0, 0]
                    }
                ]
            },

            // Footer
            {
                stack: [
                    { text: 'Thank you for shopping with us!', fontSize: 11, bold: true, color: '#475569', alignment: 'right', margin: [0, 50, 0, 5] },
                    { text: `WhatsApp Support: +${settings.shop_phone}`, fontSize: 8, color: '#94a3b8', alignment: 'right' },
                ]
            }
        ],
        styles: {
            tableHeader: {
                fontSize: 8,
                bold: true,
                color: '#475569',
                characterSpacing: 0.5
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    pdfmake.setFonts(fonts);
    const pdfDoc = pdfmake.createPdf(docDefinition, {});
    return await pdfDoc.getBuffer();
}

export async function GET(request, { params }) {
    try {
        const { orderId } = await params;

        if (!orderId) {
            return new Response('Order ID is required', { status: 400 });
        }

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId.toUpperCase())
            .single();

        if (orderError || !order) {
            console.error('[INVOICE] Order not found:', orderId, orderError?.message);
            return new Response('Order not found', { status: 404 });
        }

        let settings = {
            shop_name: 'Cast Printz',
            shop_phone: '7558189732',
            shop_email: 'castprintzofficial@gmail.com',
            shop_address: 'Premium Saree Collections',
            shop_gstin: '',
            bill_terms: 'All sales are final. Returns accepted within 7 days of delivery.',
            bill_footer: 'Thank you for shopping with Cast Printz!'
        };

        try {
            const { data: settingsData } = await supabase.from('app_settings').select('*');
            if (settingsData) {
                settingsData.forEach(item => {
                    if (item.key === 'shop_name') settings.shop_name = item.value;
                    if (item.key === 'business_phone' || item.key === 'shop_phone') settings.shop_phone = item.value;
                    if (item.key === 'shop_email') settings.shop_email = item.value;
                    if (item.key === 'shop_address') settings.shop_address = item.value;
                    if (item.key === 'shop_gstin') settings.shop_gstin = item.value;
                    if (item.key === 'bill_terms') settings.bill_terms = item.value;
                    if (item.key === 'bill_footer') settings.bill_footer = item.value;
                });
            }
        } catch (err) {
            console.error('[INVOICE] Settings fetch error:', err);
        }

        const pdfBuffer = await generateOrderPDFBuffer(order, settings);

        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="invoice-${orderId}.pdf"`,
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('[INVOICE] Error generating invoice:', error);
        return new Response(`Invoice generation failed: ${error.message}`, { status: 500 });
    }
}
