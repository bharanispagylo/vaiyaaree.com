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

    // Build items table rows
    const tableBody = [
        // Header row
        [
            { text: '#', style: 'tableHeader' },
            { text: 'ITEM', style: 'tableHeader' },
            { text: 'QTY', style: 'tableHeader', alignment: 'center' },
            { text: 'PRICE', style: 'tableHeader', alignment: 'right' },
            { text: 'TOTAL', style: 'tableHeader', alignment: 'right' },
        ],
        ...items.map((item, i) => [
            { text: `${i + 1}`, color: '#9ca3af', fontSize: 9 },
            {
                stack: [
                    { text: item.product_name || 'Product', bold: true, fontSize: 10 },
                    ...(item.variant_name ? [{ text: item.variant_name, fontSize: 8, color: '#9ca3af' }] : [])
                ]
            },
            { text: String(item.quantity || 1), alignment: 'center', fontSize: 10 },
            { text: `₹${(item.price_at_time || 0).toLocaleString('en-IN')}`, alignment: 'right', fontSize: 10 },
            { text: `₹${((item.price_at_time || 0) * (item.quantity || 1)).toLocaleString('en-IN')}`, alignment: 'right', fontSize: 10, bold: true },
        ])
    ];

    // Totals rows
    const totalsTable = [
        ...(subtotal > 0 ? [[{ text: 'Subtotal', color: '#6b7280' }, { text: `₹${subtotal.toLocaleString('en-IN')}`, alignment: 'right', color: '#6b7280' }]] : []),
        ...(cgst > 0 ? [[{ text: 'CGST (2.5%)', color: '#6b7280' }, { text: `₹${cgst.toLocaleString('en-IN')}`, alignment: 'right', color: '#6b7280' }]] : []),
        ...(sgst > 0 ? [[{ text: 'SGST (2.5%)', color: '#6b7280' }, { text: `₹${sgst.toLocaleString('en-IN')}`, alignment: 'right', color: '#6b7280' }]] : []),
        ...(igst > 0 ? [[{ text: 'IGST (5%)', color: '#6b7280' }, { text: `₹${igst.toLocaleString('en-IN')}`, alignment: 'right', color: '#6b7280' }]] : []),
        [{ text: 'Shipping', color: '#6b7280' }, { text: shipping > 0 ? `₹${shipping.toLocaleString('en-IN')}` : 'FREE', alignment: 'right', color: '#6b7280' }],
    ];

    const headerRow = logoBase64
        ? {
            columns: [
                {
                    stack: [
                        { image: logoBase64, width: 50, height: 50 },
                    ],
                    width: 60
                },
                {
                    stack: [
                        { text: settings.shop_name, fontSize: 22, bold: true, color: '#111827' },
                        { text: settings.shop_address, fontSize: 9, color: '#6b7280', margin: [0, 2, 0, 0] },
                        { text: settings.shop_email, fontSize: 9, color: '#6b7280' },
                        ...(settings.shop_gstin ? [{ text: `GSTIN: ${settings.shop_gstin}`, fontSize: 9, color: '#6b7280' }] : []),
                    ]
                },
                {
                    stack: [
                        { text: 'INVOICE', fontSize: 26, bold: true, color: '#000', alignment: 'right' },
                        { text: `#${order.id}`, fontSize: 12, color: '#374151', alignment: 'right', margin: [0, 4, 0, 0] },
                        { text: dateStr, fontSize: 9, color: '#9ca3af', alignment: 'right' },
                    ]
                }
            ],
            columnGap: 10
        }
        : {
            columns: [
                {
                    stack: [
                        { text: settings.shop_name, fontSize: 22, bold: true, color: '#111827' },
                        { text: settings.shop_address, fontSize: 9, color: '#6b7280', margin: [0, 2, 0, 0] },
                        { text: settings.shop_email, fontSize: 9, color: '#6b7280' },
                        ...(settings.shop_gstin ? [{ text: `GSTIN: ${settings.shop_gstin}`, fontSize: 9, color: '#6b7280' }] : []),
                    ]
                },
                {
                    stack: [
                        { text: 'INVOICE', fontSize: 26, bold: true, color: '#000', alignment: 'right' },
                        { text: `#${order.id}`, fontSize: 12, color: '#374151', alignment: 'right', margin: [0, 4, 0, 0] },
                        { text: dateStr, fontSize: 9, color: '#9ca3af', alignment: 'right' },
                    ]
                }
            ],
            columnGap: 10
        };

    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60],
        content: [
            // Header
            headerRow,
            // Horizontal rule
            { canvas: [{ type: 'line', x1: 0, y1: 8, x2: 515, y2: 8, lineWidth: 1.5, lineColor: '#111827' }], margin: [0, 10, 0, 12] },

            // Parties row
            {
                columns: [
                    {
                        stack: [
                            { text: 'BILL TO', fontSize: 7.5, bold: true, color: '#9ca3af', characterSpacing: 1 },
                            { text: order.customer_name || 'Customer', fontSize: 13, bold: true, color: '#111827', margin: [0, 4, 0, 0] },
                            { text: order.customer_phone || '', fontSize: 9, color: '#6b7280' },
                            { text: order.customer_email || '', fontSize: 9, color: '#6b7280' },
                            
                            // Nested columns for Billing and Shipping
                            {
                                columns: [
                                    {
                                        stack: [
                                            { text: 'BILLING ADDRESS', fontSize: 7.5, bold: true, color: '#9ca3af', characterSpacing: 1, margin: [0, 16, 0, 4] },
                                            { text: formatAddress(order.billing_address || order.delivery_address), fontSize: 9, color: '#374151', lineHeight: 1.2 }
                                        ],
                                        width: '50%'
                                    },
                                    {
                                        stack: [
                                            { text: 'SHIPPING ADDRESS', fontSize: 7.5, bold: true, color: '#9ca3af', characterSpacing: 1, margin: [0, 16, 0, 4] },
                                            { text: formatAddress(order.shipping_address || order.delivery_address || order.billing_address), fontSize: 9, color: '#374151', lineHeight: 1.2 }
                                        ],
                                        width: '50%'
                                    }
                                ],
                                columnGap: 15
                            }
                        ],
                        width: '65%'
                    },
                    {
                        stack: [
                            { text: 'PAYMENT INFO', fontSize: 7.5, bold: true, color: '#9ca3af', characterSpacing: 1, alignment: 'right' },
                            { text: `Method: ${order.payment_method || 'N/A'}`, fontSize: 9, color: '#374151', margin: [0, 4, 0, 0], alignment: 'right' },
                            { text: `Status: ${order.status || 'PLACED'}`, fontSize: 9, color: '#374151', alignment: 'right' },
                            { text: `Source: ${order.source === 'WEBSITE' ? 'Website' : 'WhatsApp'}`, fontSize: 9, color: '#374151', alignment: 'right' },
                        ],
                        width: '35%'
                    }
                ],
                columnGap: 15,
                margin: [0, 0, 0, 16]
            },

            // Light divider
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 12] },

            // Items Table
            {
                table: {
                    headerRows: 1,
                    widths: [20, '*', 40, 75, 75],
                    body: tableBody
                },
                layout: {
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.5 : 0.3,
                    vLineWidth: () => 0,
                    hLineColor: (i) => i === 1 ? '#9ca3af' : '#f3f4f6',
                    paddingTop: () => 8,
                    paddingBottom: () => 8,
                }
            },

            // Totals section
            { text: '', margin: [0, 8, 0, 0] },
            {
                columns: [
                    { text: '', width: '*' },
                    {
                        stack: [
                            {
                                table: {
                                    widths: ['*', 100],
                                    body: [
                                        ...totalsTable,
                                        // Grand total
                                        [
                                            { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 200, y2: 4, lineWidth: 1.5, lineColor: '#111827' }], colSpan: 2 },
                                            {}
                                        ],
                                        [
                                            { text: 'Grand Total', bold: true, fontSize: 13, color: '#111827' },
                                            { text: `₹${total.toLocaleString('en-IN')}`, bold: true, fontSize: 13, color: '#111827', alignment: 'right' }
                                        ]
                                    ]
                                },
                                layout: 'noBorders'
                            }
                        ],
                        width: 220
                    }
                ]
            },

            // Footer
            { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 0.5, lineColor: '#e5e7eb' }], margin: [0, 20, 0, 10] },
            {
                columns: [
                    settings.bill_terms ? {
                        stack: [
                            { text: 'TERMS', fontSize: 7.5, bold: true, color: '#9ca3af', characterSpacing: 1 },
                            { text: settings.bill_terms, fontSize: 8.5, color: '#6b7280', margin: [0, 4, 0, 0] },
                        ],
                        width: '55%'
                    } : { text: '', width: '55%' },
                    {
                        stack: [
                            { text: settings.bill_footer, fontSize: 10, bold: true, color: '#374151', alignment: 'right' },
                            { text: `WhatsApp: +${settings.shop_phone}`, fontSize: 8, color: '#9ca3af', alignment: 'right' },
                        ],
                        width: '45%'
                    }
                ]
            }
        ],
        styles: {
            tableHeader: {
                fontSize: 8,
                bold: true,
                color: '#9ca3af',
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
