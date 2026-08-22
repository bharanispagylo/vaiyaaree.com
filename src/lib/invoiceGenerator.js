import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";

async function urlToBase64(url) {
    try {
        if (typeof window === 'undefined' && typeof process !== 'undefined') {
             const fs = await import('fs');
             const path = await import('path');
             let filepath = url;
             if (url.startsWith('/')) filepath = path.join(process.cwd(), 'public', url);
             else if (!url.startsWith('http')) filepath = path.join(process.cwd(), 'public', 'images', url);
             
             if (filepath && !filepath.startsWith('http') && fs.existsSync(filepath)) {
                 const buf = fs.readFileSync(filepath);
                 const ext = path.extname(filepath).toLowerCase();
                 const mime = (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'image/png';
                 return `data:${mime};base64,${buf.toString('base64')}`;
             }
        }

        let fetchUrl = url;
        if (typeof window !== 'undefined' && fetchUrl.startsWith('/')) {
             fetchUrl = window.location.origin + fetchUrl;
        } else if (typeof window !== 'undefined' && !fetchUrl.startsWith('http')) {
             fetchUrl = window.location.origin + '/images/' + fetchUrl;
        } else if (typeof window === 'undefined' && fetchUrl.startsWith('/')) {
             fetchUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + fetchUrl;
        }

        const response = await fetch(fetchUrl);
        if (typeof window === 'undefined') {
             const arrayBuffer = await response.arrayBuffer();
             const mime = response.headers.get('content-type') || 'image/png';
             return `data:${mime};base64,${Buffer.from(arrayBuffer).toString('base64')}`;
        } else {
             const blob = await response.blob();
             return new Promise((resolve, reject) => {
                 const reader = new FileReader();
                 reader.onloadend = () => resolve(reader.result);
                 reader.onerror = reject;
                 reader.readAsDataURL(blob);
             });
        }
    } catch (e) {
        console.error("Failed to convert URL to base64:", e);
        return null;
    }
}

function formatAddress(addr) {
    if (!addr) return "";
    try {
        if (typeof addr === 'string') {
            if (addr.startsWith('{') && addr.endsWith('}')) {
                const parsed = JSON.parse(addr);
                const street = parsed.address || parsed.address_line || parsed.street || '';
                const parts = [
                    street,
                    parsed.city,
                    parsed.state,
                    parsed.pincode
                ].filter(Boolean);
                return parts.length > 0 ? parts.join(', ') : (parsed.name || addr);
            }
            return addr;
        }
        if (typeof addr === 'object') {
            const street = addr.address || addr.address_line || addr.street || '';
            const parts = [
                street,
                addr.city,
                addr.state,
                addr.pincode
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : (addr.name || '');
        }
    } catch (e) {
        return String(addr);
    }
    return String(addr);
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        const part1 = cleaned.substring(2, 7);
        const part2 = cleaned.substring(7);
        return `+91 ${part1} ${part2}`;
    } else if (cleaned.length === 10) {
        const part1 = cleaned.substring(0, 5);
        const part2 = cleaned.substring(5);
        return `+91 ${part1} ${part2}`;
    } else if (cleaned.startsWith('91') && cleaned.length > 10) {
        return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
    } else if (cleaned.length > 5) {
        const part1 = cleaned.substring(0, 5);
        const part2 = cleaned.substring(5);
        return `+91 ${part1} ${part2}`;
    }
    return String(phone);
}

const amountInWords = (num) => {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str ? 'Rupees ' + str.trim() + ' Only' : 'Zero';
};

export async function generateInvoicePDF(order) {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Fetch branding from settings
    let branding = {
        shop_name: 'Vaiyaaree',
        shop_address: "16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.",
        shop_gstin: "8473939083",
        bill_footer: "Thank you for shopping with Vaiyaaree!",
        business_phone: "+91 86677 93292",
        business_website: "www.vaiyaaree.com",
        instagram_handle: "@vaiyaaree",
        company_vat_tin: "33132028969",
        company_cst_no: "1091562",
        company_pan_no: "AAIFG6568K",
        bank_name: "STATE BANK INDIA",
        bank_account: "170902000000962",
        bank_ifsc: "SBI0001709",
        bank_upi: "vaiyaaree@upi",
        business_email: "vaiyaaree@gmail.com",
        shop_email: "vaiyaaree@gmail.com"
    };

    try {
        const { data } = await supabase.from('app_settings').select('*');
        if (data) {
            data.forEach(item => {
                if (item.key === 'shop_name' || item.key === 'companyName') {
                    branding.shop_name = item.value;
                } else if (item.key === 'shop_logo') {
                    branding.shop_logo = item.value;
                } else {
                    branding[item.key] = item.value;
                }
            });
        }
    } catch (e) {
        console.error("PDF Branding Error:", e);
    }

    const margin = 10;
    let y = 10;

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    // Main Outer Box starting Y
    const outerBoxStart = y;

    // Company Header
    let currentY = 15;
    if (branding.shop_logo) {
        try {
            const logoBase64 = await urlToBase64(branding.shop_logo);
            if (logoBase64) {
                const imgProps = doc.getImageProperties(logoBase64);
                const aspect = imgProps.width / imgProps.height;
                const targetHeight = 20;
                const targetWidth = Math.min(targetHeight * aspect, 40);
                doc.addImage(logoBase64, 'PNG', 12, currentY - 1, targetWidth, targetHeight, undefined, 'FAST');
            }
        } catch (e) {
            console.error("Logo injection failed:", e);
        }
    }

    const centerX = 105; // Exact center of A4 page content box (10mm margin + 190mm width / 2)

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(branding.shop_name || "Vaiyaaree", centerX, currentY + 5, { align: "center" });

    currentY += 11;
    
    if (branding.shop_address) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const addrLines = doc.splitTextToSize(branding.shop_address.replace(/\n/g, ', '), 140);
        doc.text(addrLines, centerX, currentY, { align: "center" });
        currentY += (addrLines.length * 4) + 1;
    }

    let contactStr = "";
    if (branding.shop_gstin) contactStr += `GSTIN: ${branding.shop_gstin}`;
    
    if (contactStr) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(contactStr, centerX, currentY, { align: "center" });
        currentY += 5;
    }

    currentY += 3;
    y = currentY;

    // TAX INVOICE Bar
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 190, 8, "FD");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", 105, y + 6, { align: "center" });

    y += 8;

    // Info Row
    doc.rect(margin, y, 190, 18);
    doc.line(105, y, 105, y + 18);
    
    const displayInvoiceNo = order.invoice_no || (order.id ? String(order.id).replace(/^[A-Z]+-/, 'INV-') : 'INV-0001');

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice No:", margin + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(displayInvoiceNo, margin + 25, y + 5);
    
    doc.setFont("helvetica", "bold");
    doc.text("Order ID:", margin + 2, y + 10);
    doc.setFont("helvetica", "normal");
    doc.text(order.id ? order.id.toString() : 'N/A', margin + 25, y + 10);

    doc.setFont("helvetica", "bold");
    doc.text("Invoice Date:", margin + 2, y + 15);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(order.created_at || Date.now()).toLocaleDateString('en-IN'), margin + 25, y + 15);
    
    doc.setFont("helvetica", "bold");
    doc.text("Payment Method:", 107, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(order.payment_method || 'N/A', 137, y + 5);

    doc.setFont("helvetica", "bold");
    doc.text("Order Status:", 107, y + 10);
    doc.setFont("helvetica", "normal");
    doc.text(order.status || 'N/A', 137, y + 10);
    
    y += 18;

    // Billing & Shipping Headers
    doc.setFillColor(249, 249, 249);
    doc.rect(margin, y, 190, 7, "FD");
    doc.line(105, y, 105, y + 7);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Billing Address :", margin + 2, y + 5);
    doc.text("Shipping Address :", 107, y + 5);
    
    y += 7;

    // Address text preparation
    const billAddrText = formatAddress(order.billing_address || order.delivery_address || order.shipping_address) || "";
    const shipAddrText = formatAddress(order.shipping_address || order.delivery_address || order.billing_address) || "";
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const billAddrLines = doc.splitTextToSize(billAddrText, 72);
    const shipAddrLines = doc.splitTextToSize(shipAddrText, 72);
    
    const maxLines = Math.max(billAddrLines.length, shipAddrLines.length, 1);
    const lineHeight = 4.2;
    const detailsHeight = Math.max(28, 12 + (maxLines * lineHeight) + 6);

    // Billing & Shipping Details Box
    doc.rect(margin, y, 190, detailsHeight);
    doc.line(105, y, 105, y + detailsHeight);

    // Left Column (Billing)
    let leftY = y + 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Name:", margin + 2, leftY);
    doc.setFont("helvetica", "normal");
    doc.text(order.customer_name || 'Customer', margin + 18, leftY);
    
    leftY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Address:", margin + 2, leftY);
    doc.setFont("helvetica", "normal");
    doc.text(billAddrLines, margin + 18, leftY);
    
    const billPhoneY = leftY + (billAddrLines.length * lineHeight);
    doc.setFont("helvetica", "bold");
    doc.text("Phone:", margin + 2, billPhoneY);
    doc.setFont("helvetica", "normal");
    doc.text(formatPhoneNumber(order.customer_phone) || '', margin + 18, billPhoneY);

    // Right Column (Shipping)
    let rightY = y + 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Name:", 107, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(order.customer_name || 'Customer', 123, rightY);
    
    rightY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.text("Address:", 107, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(shipAddrLines, 123, rightY);
    
    const shipPhoneY = rightY + (shipAddrLines.length * lineHeight);
    doc.setFont("helvetica", "bold");
    doc.text("Phone:", 107, shipPhoneY);
    doc.setFont("helvetica", "normal");
    doc.text(formatPhoneNumber(order.customer_phone) || '', 123, shipPhoneY);

    y += detailsHeight;

    // Items Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 190, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.text("S.No", 12, y + 5);
    doc.line(22, y, 22, y + 8);
    
    doc.text("Description", 25, y + 5);
    doc.line(120, y, 120, y + 8);
    
    doc.text("Price", 145, y + 5, { align: "right" });
    doc.line(150, y, 150, y + 8);
    
    doc.text("Qty", 160, y + 5, { align: "center" });
    doc.line(170, y, 170, y + 8);
    
    doc.text("Amount", 198, y + 5, { align: "right" });

    y += 8;

    // Items List
    const itemsStartY = y;
    doc.setFont("helvetica", "normal");
    let totalQty = 0;
    
    if (order.order_items) {
        order.order_items.forEach((item, i) => {
            const amount = item.price_at_time * item.quantity;
            totalQty += item.quantity;

            const nameStr = item.product_name + (item.variant_name ? ` (${item.variant_name})` : '');
            const prodLines = doc.splitTextToSize(nameStr, 90);
            
            doc.text((i + 1).toString(), 16, y + 5, { align: "center" });
            doc.text(prodLines, 25, y + 5);
            doc.text((item.price_at_time || 0).toFixed(2), 148, y + 5, { align: "right" });
            doc.text(item.quantity.toString(), 160, y + 5, { align: "center" });
            doc.text(amount.toFixed(2), 198, y + 5, { align: "right" });

            y += (prodLines.length * 5) + 3;
            
            if (y > 230) {
                doc.rect(margin, itemsStartY, 190, y - itemsStartY);
                doc.line(22, itemsStartY, 22, y);
                doc.line(120, itemsStartY, 120, y);
                doc.line(150, itemsStartY, 150, y);
                doc.line(170, itemsStartY, 170, y);
                
                // Outer box closing for page break
                doc.rect(margin, outerBoxStart, 190, y - outerBoxStart);
                
                doc.addPage();
                y = 20;
            }
        });
    }

    if (y < itemsStartY + 12) {
        y = itemsStartY + 12; // minimum height
    }

    // Additional charges
    if (order.shipping_cost > 0) {
        doc.text("Shipping Cost:", 148, y + 5, { align: "right" });
        doc.text(parseFloat(order.shipping_cost).toFixed(2), 198, y + 5, { align: "right" });
        y += 7;
    }
    if (order.cgst > 0) {
        doc.text("CGST:", 148, y + 5, { align: "right" });
        doc.text(parseFloat(order.cgst).toFixed(2), 198, y + 5, { align: "right" });
        y += 7;
    }
    if (order.sgst > 0) {
        doc.text("SGST:", 148, y + 5, { align: "right" });
        doc.text(parseFloat(order.sgst).toFixed(2), 198, y + 5, { align: "right" });
        y += 7;
    }
    if (order.igst > 0) {
        doc.text("IGST:", 148, y + 5, { align: "right" });
        doc.text(parseFloat(order.igst).toFixed(2), 198, y + 5, { align: "right" });
        y += 7;
    }
    if ((!order.cgst && !order.sgst && !order.igst) && order.tax_amount > 0) {
        doc.text("Tax:", 148, y + 5, { align: "right" });
        doc.text(parseFloat(order.tax_amount).toFixed(2), 198, y + 5, { align: "right" });
        y += 7;
    }
    
    // Draw borders for items area
    doc.rect(margin, itemsStartY, 190, y - itemsStartY);
    doc.line(22, itemsStartY, 22, y);
    doc.line(120, itemsStartY, 120, y);
    doc.line(150, itemsStartY, 150, y);
    doc.line(170, itemsStartY, 170, y);

    // Total Row
    doc.rect(margin, y, 190, 8);
    doc.setFont("helvetica", "bold");
    doc.text("Total", 148, y + 5, { align: "right" });
    doc.text(totalQty.toString(), 160, y + 5, { align: "center" });
    doc.text((order.total_amount || 0).toFixed(2), 198, y + 5, { align: "right" });
    doc.line(150, y, 150, y + 8);
    doc.line(170, y, 170, y + 8);

    y += 8;

    // Amount in words
    doc.rect(margin, y, 190, 8);
    doc.text("Amount Chargeable (in words):", 12, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(amountInWords(Math.round(order.total_amount || 0)), 65, y + 5);
    
    y += 8;

    // Company Address & Bank Details Header Bar
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 190, 6, "FD");
    doc.line(105, y, 105, y + 6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Company Address", 57, y + 4.5, { align: "center" });
    doc.text("Bank Details", 152, y + 4.5, { align: "center" });

    y += 6;

    // Company Address & Bank Details Content Box
    const compBoxHeight = 22;
    doc.rect(margin, y, 190, compBoxHeight);
    doc.line(105, y, 105, y + compBoxHeight);

    doc.setFontSize(8);
    // Company Address (Left)
    doc.setFont("helvetica", "normal");
    const addressText = branding.shop_address || "16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.";
    const splitAddress = doc.splitTextToSize(addressText, 90);
    doc.text(splitAddress, margin + 2, y + 4.5);

    // Bank Details (Right)
    doc.setFont("helvetica", "bold"); doc.text("Bank Name", 107, y + 4.5);
    doc.setFont("helvetica", "normal"); doc.text(branding.bank_name || "STATE BANK INDIA", 142, y + 4.5);

    doc.setFont("helvetica", "bold"); doc.text("Bank A/C", 107, y + 9.5);
    doc.setFont("helvetica", "normal"); doc.text(branding.bank_account || "170902000000962", 142, y + 9.5);

    doc.setFont("helvetica", "bold"); doc.text("Branch & IFSC Code", 107, y + 14.5);
    doc.setFont("helvetica", "normal"); doc.text(branding.bank_ifsc || "SBI0001709", 142, y + 14.5);

    doc.setFont("helvetica", "bold"); doc.text("UPI ID", 107, y + 19.5);
    doc.setFont("helvetica", "normal"); doc.text(branding.bank_upi || "vaiyaaree@upi", 142, y + 19.5);

    y += compBoxHeight;

    // Footer terms and signatures
    doc.rect(margin, y, 190, 25);
    doc.line(120, y, 120, y + 25);
    
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions / Declarations :", 12, y + 5);
    // doc.line(10, y + 6, 120, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const termsText = branding.bill_terms || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";
    const splitTerms = doc.splitTextToSize(termsText, 105);
    doc.text(splitTerms, 12, y + 10);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`For ${branding.shop_name}`, 155, y + 5, { align: "center" });
    doc.text("Authorized Signatory", 155, y + 22, { align: "center" });
    
    y += 25;

    // Full outer box mapping around entire layout
    doc.rect(margin, outerBoxStart, 190, y - outerBoxStart);

    // Bottom info (outside the box)
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text(branding.bill_footer || "Thank you for your business!", 105, y + 5, { align: "center" });

    return doc.output('arraybuffer');
}

