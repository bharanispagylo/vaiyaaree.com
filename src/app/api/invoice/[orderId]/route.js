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
        const centerX = pageWidth / 2;
        const margin = 15;
        const rightColX = 140;

        // Fetch branding from settings
        let settings = {
            shop_name: 'Cast Printz',
            shop_phone: '+91 75581 89732',
            shop_email: 'castprintzofficial@gmail.com',
            shop_address: 'Chennai, Tamil Nadu',
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
                    if (item.key === 'shop_phone') settings.shop_phone = item.value;
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

        // Load logo (try local first, then remote)
        let logoDataUrl = null;
        if (settings.shop_logo) {
            if (settings.shop_logo.startsWith('http')) {
                // Remote logo - keep as is
                logoDataUrl = settings.shop_logo;
            } else {
                // Try to find local logo
                logoDataUrl = await getLocalLogoAsBase64();
            }
        }

        // Add logo if available
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', margin, 10, 40, 20);
            } catch (imgErr) {
                console.error('[INVOICE] Failed to add logo to PDF:', imgErr);
            }
        }

        // Shop info on the right
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(settings.shop_name, rightColX, 20);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(settings.shop_address, rightColX, 26);
        doc.text(`Phone: ${settings.shop_phone}`, rightColX, 32);
        doc.text(`Email: ${settings.shop_email}`, rightColX, 38);
        if (settings.shop_gstin) {
            doc.text(`GSTIN: ${settings.shop_gstin}`, rightColX, 44);
        }

        // Invoice details
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('INVOICE', margin, 60);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Invoice #: ${order.id}`, margin, 66);
        doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, margin, 72);
        doc.text(`Status: ${order.status}`, margin, 78);

        // Customer details
        doc.setFont(undefined, 'bold');
        doc.text('Bill To:', margin, 90);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(order.customer_name || 'Customer', margin, 96);
        doc.text(order.customer_phone || '', margin, 102);
        if (order.customer_email) {
            doc.text(order.customer_email, margin, 108);
        }
        doc.text(order.delivery_address || order.billing_address || 'Address not provided', margin, 114);

        // Items table header
        let yPosition = 130;
        doc.setFont(undefined, 'bold');
        doc.text('Description', margin, yPosition);
        doc.text('Qty', 100, yPosition);
        doc.text('Price', 120, yPosition);
        doc.text('Total', 160, yPosition);
        
        yPosition += 5;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        // Items
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        if (order.order_items && order.order_items.length > 0) {
            order.order_items.forEach(item => {
                doc.text(item.product_name || 'Product', margin, yPosition);
                doc.text(item.quantity.toString(), 100, yPosition);
                doc.text(`₹${(item.price_at_time || item.price || 0).toLocaleString()}`, 120, yPosition);
                doc.text(`₹${((item.price_at_time || item.price || 0) * item.quantity).toLocaleString()}`, 160, yPosition);
                yPosition += 8;
            });
        }

        // Totals
        yPosition += 10;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
        
        doc.setFont(undefined, 'bold');
        doc.text('Subtotal:', 140, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(`₹${(order.total_amount - (order.tax_amount || 0) - (order.shipping_cost || 0)).toLocaleString()}`, 160, yPosition);
        
        if (order.tax_amount && order.tax_amount > 0) {
            yPosition += 8;
            doc.setFont(undefined, 'bold');
            doc.text('Tax:', 140, yPosition);
            doc.setFont(undefined, 'normal');
            doc.text(`₹${order.tax_amount.toLocaleString()}`, 160, yPosition);
        }
        
        if (order.shipping_cost && order.shipping_cost > 0) {
            yPosition += 8;
            doc.setFont(undefined, 'bold');
            doc.text('Shipping:', 140, yPosition);
            doc.setFont(undefined, 'normal');
            doc.text(`₹${order.shipping_cost.toLocaleString()}`, 160, yPosition);
        }
        
        yPosition += 8;
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('Total:', 140, yPosition);
        doc.text(`₹${(order.total_amount || 0).toLocaleString()}`, 160, yPosition);

        // Footer
        if (settings.bill_terms) {
            yPosition += 20;
            doc.setFontSize(9);
            doc.setFont(undefined, 'italic');
            doc.text('Terms & Conditions:', margin, yPosition);
            yPosition += 5;
            doc.setFont(undefined, 'normal');
            const lines = doc.splitTextToSize(settings.bill_terms, pageWidth - 30);
            lines.forEach(line => {
                doc.text(line, margin, yPosition);
                yPosition += 5;
            });
        }

        // Footer message
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text(settings.bill_footer, centerX, 280, { align: 'center' });

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
