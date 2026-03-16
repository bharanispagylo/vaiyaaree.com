import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";

export async function generateAuditPDF({ timeframe, orders, products, metrics }) {
    const doc = new jsPDF();

    // 1. Fetch Branding/Shop Info
    let branding = {
        shop_name: "Caste Print",
        shop_address: "Premium Handwoven Textiles",
        shop_gstin: "",
        shop_pan: "", // Add if possible
        business_phone: ""
    };

    try {
        const { data } = await supabase.from('app_settings').select('*');
        if (data) {
            data.forEach(item => {
                if (branding.hasOwnProperty(item.key)) branding[item.key] = item.value;
            });
        }
    } catch (e) {
        console.error("Audit Report Branding Error:", e);
    }

    // --- Page 1: Executive Summary ---

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.text("AUDIT FINANCIAL REPORT", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 26, { align: "center" });
    doc.text(`Reporting Period: ${timeframe}`, 105, 31, { align: "center" });

    doc.setDrawColor(200);
    doc.line(10, 35, 200, 35);

    // Section 1: Business Information
    let y = 45;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("1. BUSINESS INFORMATION", 10, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    y += 8;
    doc.text(`Shop Name: ${branding.shop_name}`, 15, y);
    y += 6;
    doc.text(`Address: ${branding.shop_address}`, 15, y);
    y += 6;
    doc.text(`GST Registration: ${branding.shop_gstin || 'Not Provided'}`, 15, y);
    y += 6;
    doc.text(`Contact: ${branding.business_phone || 'N/A'}`, 15, y);

    // Section 2: Sales Summary
    y += 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. SALES & INCOME SUMMARY", 10, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    y += 10;
    // Metrics Box
    doc.setFillColor(245, 245, 245);
    doc.rect(10, y, 190, 35, "F");

    y += 8;
    doc.text(`Total Gross Revenue:`, 15, y);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${metrics.totalRevenue.toLocaleString()}`, 100, y);
    doc.setFont("helvetica", "normal");

    y += 8;
    doc.text(`Total Invoices Generated:`, 15, y);
    doc.text(`${metrics.orderCount}`, 100, y);

    y += 8;
    doc.text(`Average Invoice Value:`, 15, y);
    doc.text(`Rs. ${metrics.avgTicket.toFixed(2)}`, 100, y);

    // Tax Breakdown (Estimated)
    const totalCGST = orders.reduce((sum, o) => sum + (parseFloat(o.cgst) || 0), 0);
    const totalSGST = orders.reduce((sum, o) => sum + (parseFloat(o.sgst) || 0), 0);
    const totalIGST = orders.reduce((sum, o) => sum + (parseFloat(o.igst) || 0), 0);

    y += 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("GST LIABILITY BREAKDOWN", 10, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    y += 8;
    doc.text(`Total CGST: Rs. ${totalCGST.toLocaleString()}`, 15, y);
    y += 6;
    doc.text(`Total SGST: Rs. ${totalSGST.toLocaleString()}`, 15, y);
    y += 6;
    doc.text(`Total IGST: Rs. ${totalIGST.toLocaleString()}`, 15, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Tax Collected: Rs. ${(totalCGST + totalSGST + totalIGST).toLocaleString()}`, 15, y);
    doc.setFont("helvetica", "normal");

    // Section 3: Inventory Status
    y += 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. CLOSING STOCK VALUATION", 10, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const totalItems = products.reduce((sum, p) => sum + p.stock, 0);

    y += 8;
    doc.text(`Total Saree Inventory Count: ${totalItems} units`, 15, y);
    y += 6;
    doc.text(`Estimated Inventory Value (at Selling Price): Rs. ${totalInventoryValue.toLocaleString()}`, 15, y);

    // footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("This report is prepared for audit purposes only based on digital records.", 105, 280, { align: "center" });

    // --- Page 2: Detailed Transaction List ---
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("4. DETAILED SALES REGISTER", 10, 20);

    doc.setFontSize(8);
    y = 30;
    // Table Header
    doc.setFillColor(230, 230, 230);
    doc.rect(10, y, 190, 8, "F");
    doc.text("ID", 12, y + 5);
    doc.text("Date", 35, y + 5);
    doc.text('Caste Print', 40, 45);
    doc.text("Location", 110, y + 5);
    doc.text("Tax", 145, y + 5);
    doc.text("Amount", 175, y + 5);

    y += 13;
    doc.setFont("helvetica", "normal");

    orders.forEach(o => {
        const tax = (parseFloat(o.cgst) || 0) + (parseFloat(o.sgst) || 0) + (parseFloat(o.igst) || 0);
        doc.text(o.id.toString().substring(0, 10), 12, y);
        doc.text(new Date(o.created_at).toLocaleDateString(), 35, y);
        doc.text(o.customer_name?.substring(0, 20) || 'N/A', 65, y);
        doc.text(o.shipping_state || 'N/A', 110, y);
        doc.text(tax.toFixed(0), 145, y);
        doc.text(o.total_amount.toLocaleString(), 175, y);

        y += 7;
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
    });

    return doc.output('arraybuffer');
}
