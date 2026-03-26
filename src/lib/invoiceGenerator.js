import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";

export async function generateInvoicePDF(order) {
    const doc = new jsPDF();

    // Fetch branding from settings
    let branding = {
        shop_name: 'Cast Printz',
        shop_address: "Premium Handwoven Textiles",
        shop_gstin: "",
        bill_footer: "Thank you for your business!"
    };

    try {
        const { data } = await supabase.from('app_settings').select('*');
        if (data) {
            data.forEach(item => {
                // Support both shop_name and companyName keys if they exist in DB
                if (item.key === 'shop_name' || item.key === 'companyName') {
                    branding.shop_name = item.value;
                } else if (branding.hasOwnProperty(item.key)) {
                    branding[item.key] = item.value;
                }
            });
        }
    } catch (e) {
        console.error("PDF Branding Error:", e);
    }

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.text(branding.shop_name || "Cast Printz", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const addressLinesHeader = doc.splitTextToSize(branding.shop_address || "", 150);
    doc.text(addressLinesHeader, 105, 28, { align: "center" });

    if (branding.shop_gstin) {
        doc.text(`GSTIN: ${branding.shop_gstin}`, 105, 36, { align: "center" });
    }

    doc.setDrawColor(200);
    doc.line(10, 42, 200, 42);

    // Customer Details
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("TAX INVOICE", 150, 50);
    doc.setFontSize(10);
    doc.text(`Invoice No: #INV-${order.id.toString().substring(0, 8)}`, 150, 56);
    doc.text(`Date: ${new Date(order.created_at || Date.now()).toLocaleDateString()}`, 150, 62);
    doc.text(`Payment: ${order.payment_method || 'N/A'}`, 150, 68);

    doc.text("Bill To:", 10, 50);
    doc.setFont("helvetica", "bold");
    doc.text(order.customer_name || "Valued Customer", 10, 56);
    doc.setFont("helvetica", "normal");
    doc.text(`Phone: ${order.customer_phone}`, 10, 62);
    const addressLines = doc.splitTextToSize(order.delivery_address || "Address not provided", 80);
    doc.text(addressLines, 10, 68);

    // Table Header
    let y = 95;
    doc.setFillColor(245, 245, 245);
    doc.rect(10, y, 190, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Item Description", 15, y + 7);
    doc.text("Qty", 120, y + 7, { align: "right" });
    doc.text("Price", 155, y + 7, { align: "right" });
    doc.text("Amount", 190, y + 7, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 17;

    // Items
    let subtotal = 0;
    if (order.order_items) {
        order.order_items.forEach(item => {
            const amount = item.price_at_time * item.quantity;
            subtotal += amount;

            // Handle multi-line product names
            const prodNameLines = doc.splitTextToSize(item.product_name, 90);
            doc.text(prodNameLines, 15, y);
            doc.text(item.quantity.toString(), 120, y, { align: "right" });
            doc.text(`Rs. ${item.price_at_time.toFixed(2)}`, 155, y, { align: "right" });
            doc.text(`Rs. ${amount.toFixed(2)}`, 190, y, { align: "right" });

            y += (prodNameLines.length * 5) + 3;

            if (y > 250) { // New page if too long
                doc.addPage();
                y = 20;
            }
        });
    }

    // Calculations & Taxes
    y += 5;
    doc.line(10, y, 200, y);
    y += 10;

    doc.text("Subtotal:", 160, y, { align: "right" });
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 190, y, { align: "right" });
    y += 8;

    // GST Breakdown
    if (order.cgst > 0) {
        doc.text("CGST (9%):", 160, y, { align: "right" });
        doc.text(`Rs. ${parseFloat(order.cgst).toFixed(2)}`, 190, y, { align: "right" });
        y += 8;
    }
    if (order.sgst > 0) {
        doc.text("SGST (9%):", 160, y, { align: "right" });
        doc.text(`Rs. ${parseFloat(order.sgst).toFixed(2)}`, 190, y, { align: "right" });
        y += 8;
    }
    if (order.igst > 0) {
        doc.text("IGST (18%):", 160, y, { align: "right" });
        doc.text(`Rs. ${parseFloat(order.igst).toFixed(2)}`, 190, y, { align: "right" });
        y += 8;
    }

    if (order.shipping_cost > 0) {
        doc.text("Shipping:", 160, y, { align: "right" });
        doc.text(`Rs. ${parseFloat(order.shipping_cost).toFixed(2)}`, 190, y, { align: "right" });
        y += 8;
    }

    doc.setDrawColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    y += 2;
    doc.line(140, y, 200, y);
    y += 10;
    doc.text("Grand Total:", 160, y, { align: "right" });
    doc.text(`Rs. ${parseFloat(order.total_amount).toFixed(2)}`, 190, y, { align: "right" });

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = branding.bill_footer || "Thank you for your business!";
    doc.text(footerText, 105, 280, { align: "center" });
    doc.text("This is a computer generated invoice and does not require signature.", 105, 285, { align: "center" });

    return doc.output('arraybuffer');
}

