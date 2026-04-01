import { jsPDF } from "jspdf";
import { supabase } from '@/lib/supabaseClient';

// Helper to read local logo file as base64
async function getLocalLogoAsBase64() {
    try {
        const fs = await import('fs');
        const path = await import('path');
        
        // Try multiple possible logo paths
        const possiblePaths = [
            path.join(process.cwd(), 'public', 'logo.png'),
            path.join(process.cwd(), 'public', 'logo1.jpg'),
            path.join(process.cwd(), 'public', 'logo.jpg'),
            path.join(process.cwd(), 'public', 'logo.jpeg'),
            path.join(process.cwd(), 'public', 'images', 'logo.png'),
            path.join(process.cwd(), 'public', 'images', 'logo1.jpg'),
            path.join(process.cwd(), 'public', 'images', 'logo.jpg'),
        ];
        
        for (const logoPath of possiblePaths) {
            if (fs.existsSync(logoPath)) {
                console.log(`[INVOICE] Found local logo at: ${logoPath}`);
                const buffer = fs.readFileSync(logoPath);
                const ext = path.extname(logoPath).toLowerCase();
                let mimeType = 'image/png';
                if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                if (ext === '.webp') mimeType = 'image/webp';
                
                const base64 = buffer.toString('base64');
                console.log(`[INVOICE] Local logo loaded, size: ${base64.length} bytes`);
                return `data:${mimeType};base64,${base64}`;
            }
        }
        
        console.log('[INVOICE] No local logo file found');
        return null;
    } catch (error) {
        console.error('[INVOICE] Error reading local logo:', error.message);
        return null;
    }
}

async function generateInvoicePDF(order) {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;

        // Fetch branding from settings
        let settings = {
            shop_name: 'Cast Printz',
            shop_phone: '15551678232',
            shop_email: 'castprintzofficial@gmail.com',
            shop_address: 'Premium Textiles',
            shop_logo: null,
            shop_gstin: '',
            bill_terms: '',
            bill_footer: 'Thank you for shopping with us!'
        };

        try {
            const { data: settingsData } = await supabase.from('app_settings').select('*');
            if (settingsData) {
                settingsData.forEach(item => {
                    if (item.key === 'shop_name') settings.shop_name = item.value;
                    if (item.key === 'business_phone' || item.key === 'shop_phone') settings.shop_phone = item.value;
                    if (item.key === 'shop_email') settings.shop_email = item.value;
                    if (item.key === 'shop_address') settings.shop_address = item.value;
                    if (item.key === 'shop_logo') settings.shop_logo = item.value;
                    if (item.key === 'shop_gstin') settings.shop_gstin = item.value;
                    if (item.key === 'bill_terms') settings.bill_terms = item.value;
                    if (item.key === 'bill_footer') settings.bill_footer = item.value;
                });
            }
        } catch (err) {
            console.error('[INVOICE] Error fetching settings:', err);
        }

        // Helper functions
        const formatAddress = (addr) => {
            if (!addr) return "—";
            try {
                if (typeof addr === 'string') {
                    if (addr.startsWith('{') && addr.endsWith('}')) {
                        const parsed = JSON.parse(addr);
                        return [parsed.name, parsed.address, parsed.city, parsed.state, parsed.pincode].filter(Boolean).join(', ');
                    }
                    return addr;
                }
                if (typeof addr === 'object') {
                    return [addr.name, addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
                }
            } catch (e) {
                return String(addr);
            }
            return String(addr);
        };

        // Header
        let currentY = 25;
        
        // Logo and shop name
        let logoDataUrl = null;
        if (settings.shop_logo) {
            if (settings.shop_logo.startsWith('http')) {
                logoDataUrl = settings.shop_logo;
            } else {
                logoDataUrl = await getLocalLogoAsBase64();
            }
        }

        let nameStartX = margin;
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', margin, currentY - 8, 12, 12);
                nameStartX += 16;
            } catch (imgErr) {
                console.error('[INVOICE] Failed to add logo to PDF:', imgErr);
            }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(17, 24, 39); // #111827
        doc.text(settings.shop_name, nameStartX, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // #6b7280
        doc.text(settings.shop_address, margin, currentY + 8);
        if (settings.shop_gstin) {
            doc.setFontSize(9);
            doc.text(`GSTIN: ${settings.shop_gstin}`, margin, currentY + 13);
        }

        // Invoice Text Right
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text('INVOICE', pageWidth - margin, currentY - 2, { align: 'right' });
        
        doc.setFontSize(11);
        doc.setTextColor(55, 65, 81);
        doc.text(`#${order.id}`, pageWidth - margin, currentY + 4, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin, currentY + 9, { align: 'right' });

        // Divider
        currentY += 20;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        
        // Bill To & Payment Info
        currentY += 15;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); // gray-400
        doc.text('BILL TO', margin, currentY);
        
        doc.text('PAYMENT INFO', pageWidth - margin, currentY, { align: 'right' });

        currentY += 6;
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39);
        doc.text(order.customer_name || 'Customer', margin, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        doc.text(`Method: `, pageWidth - margin - 25, currentY, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(order.payment_method || 'N/A', pageWidth - margin, currentY, { align: 'right' });

        currentY += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(order.customer_phone || '', margin, currentY);

        doc.text(`Status: `, pageWidth - margin - 25, currentY, { align: 'right' });
        
        // Draw status badge-like
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(229, 231, 235);
        const statusText = order.status || 'UNKNOWN';
        const statWidth = doc.getTextWidth(statusText) + 6;
        doc.rect(pageWidth - margin - statWidth, currentY - 4, statWidth, 6, 'FD');
        doc.setTextColor(55, 65, 81);
        doc.text(statusText, pageWidth - margin - 3, currentY + 0.5, { align: 'right' });

        currentY += 15;
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text('BILLING ADDRESS', margin, currentY);
        doc.text('SHIPPING ADDRESS', margin + 85, currentY);

        currentY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        
        const billAddr = doc.splitTextToSize(formatAddress(order.billing_address || order.delivery_address), 75);
        const shipAddr = doc.splitTextToSize(formatAddress(order.shipping_address || order.delivery_address), 75);
        
        doc.text(billAddr, margin, currentY);
        doc.text(shipAddr, margin + 85, currentY);

        currentY += Math.max(billAddr.length, shipAddr.length) * 5 + 15;

        // Table Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        
        doc.text('#', margin, currentY);
        doc.text('ITEM', margin + 10, currentY);
        doc.text('QTY', margin + 105, currentY, { align: 'center' });
        doc.text('PRICE', margin + 135, currentY, { align: 'right' });
        doc.text('TOTAL', pageWidth - margin, currentY, { align: 'right' });

        currentY += 3;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        
        currentY += 8;

        // Table Body
        if (order.order_items && order.order_items.length > 0) {
            order.order_items.forEach((item, index) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                
                doc.setTextColor(156, 163, 175);
                doc.text(`${index + 1}`, margin, currentY);
                
                doc.setTextColor(17, 24, 39);
                doc.setFont('helvetica', 'bold');
                const itemName = doc.splitTextToSize(item.product_name || 'Product', 85);
                doc.text(itemName, margin + 10, currentY);
                
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(55, 65, 81);
                doc.text(item.quantity.toString(), margin + 105, currentY, { align: 'center' });
                
                const itemPrice = item.price_at_time || item.price || 0;
                doc.text(`Rs. ${itemPrice.toLocaleString()}`, margin + 135, currentY, { align: 'right' });
                
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(17, 24, 39);
                doc.text(`Rs. ${(itemPrice * item.quantity).toLocaleString()}`, pageWidth - margin, currentY, { align: 'right' });
                
                currentY += itemName.length * 5 + 3;
                doc.setDrawColor(243, 244, 246);
                doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
                currentY += 5;
            });
        }

        // Totals aligned to right
        currentY += 10;
        const totXStart = 120;
        const totXEnd = pageWidth - margin;
        
        doc.setFillColor(249, 250, 251);
        doc.rect(totXStart - 5, currentY - 5, totXEnd - totXStart + 10, 60, 'F');
        
        doc.setFontSize(10);
        
        const drawTotRow = (label, val, isBold = false) => {
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.setTextColor(isBold ? 17 : 107, isBold ? 24 : 114, isBold ? 39 : 128);
            doc.text(label, totXStart, currentY);
            doc.text(`Rs. ${val.toLocaleString()}`, totXEnd, currentY, { align: 'right' });
            currentY += 6;
        };

        const subTotal = order.subtotal || (order.total_amount - (order.tax_amount || 0) - (order.shipping_cost || 0));
        drawTotRow('Subtotal:', subTotal);
        
        if (order.cgst > 0) drawTotRow('CGST (2.5%):', order.cgst);
        if (order.sgst > 0) drawTotRow('SGST (2.5%):', order.sgst);
        if (order.igst > 0) drawTotRow('IGST (5%):', order.igst);
        if (!order.cgst && !order.sgst && !order.igst && order.tax_amount > 0) drawTotRow('Tax:', order.tax_amount);
        
        drawTotRow('Shipping:', order.shipping_cost || 0);

        currentY += 2;
        doc.setDrawColor(229, 231, 235);
        doc.line(totXStart, currentY - 4, totXEnd, currentY - 4);
        
        doc.setFontSize(12);
        drawTotRow('Grand Total:', order.total_amount || 0, true);

        // Footer terms
        currentY = pageHeight - 35;
        if (settings.bill_terms) {
            doc.setFillColor(249, 250, 251);
            doc.rect(margin, currentY - 5, pageWidth / 2, 20, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text('Terms:', margin + 2, currentY);
            
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(settings.bill_terms, (pageWidth / 2) - 4);
            doc.text(lines, margin + 2, currentY + 4);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99);
        doc.text(settings.bill_footer, pageWidth - margin, currentY + 5, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`WhatsApp: +${settings.shop_phone}`, pageWidth - margin, currentY + 10, { align: 'right' });

        return doc;
    } catch (error) {
        console.error('[INVOICE] Error generating PDF:', error);
        throw error;
    }
}

export async function GET(request, { params }) {
    try {
        const { orderId } = await params;
        
        if (!orderId) {
            return new Response('Order ID is required', { status: 400 });
        }

        // Get order details
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId.toUpperCase())
            .single();

        if (orderError || !order) {
            return new Response('Order not found', { status: 404 });
        }

        // Generate PDF
        const doc = await generateInvoicePDF(order);
        
        // Return PDF as response
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        
        return new Response(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="invoice-${orderId}.pdf"`,
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (error) {
        console.error('Error generating invoice:', error);
        return new Response('Failed to generate invoice', { status: 500 });
    }
}
