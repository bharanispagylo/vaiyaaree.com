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

function formatINR(num) {
    if (num === null || num === undefined || isNaN(num)) return "INR 0.00";
    const val = Number(num);
    return "INR " + val.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function extractLocation(order) {
    if (order.shipping_state && order.shipping_state !== 'N/A' && order.shipping_state.trim() !== '') {
        return order.shipping_state.trim();
    }
    if (order.customer_state && order.customer_state !== 'N/A' && order.customer_state.trim() !== '') {
        return order.customer_state.trim();
    }

    const candidates = [order.shipping_address, order.delivery_address, order.billing_address];
    for (const addr of candidates) {
        if (!addr) continue;
        let obj = addr;
        if (typeof addr === 'string') {
            try {
                if (addr.trim().startsWith('{')) {
                    obj = JSON.parse(addr);
                } else {
                    const matchState = addr.match(/\(([^)]+)\)/);
                    if (matchState && matchState[1]) return matchState[1].trim();

                    const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
                    if (parts.length >= 2) {
                        const lastPart = parts[parts.length - 1];
                        const clean = lastPart.replace(/-\s*\d{6}/, '').replace(/\d{6}/, '').trim();
                        if (clean && clean.length > 2 && !/^\d+$/.test(clean)) return clean;
                        if (parts.length >= 3) {
                            const secondLast = parts[parts.length - 2].replace(/-\s*\d{6}/, '').trim();
                            if (secondLast && !/^\d+$/.test(secondLast)) return secondLast;
                        }
                    }
                    if (parts[0] && !/^\d+$/.test(parts[0])) return parts[0];
                }
            } catch (e) {
                // fallthrough
            }
        }
        if (obj && typeof obj === 'object') {
            if (obj.state && obj.state !== 'N/A') {
                return obj.city ? `${obj.city}, ${obj.state}` : obj.state;
            }
            if (obj.city) return obj.city;
        }
    }
    return 'Tamil Nadu';
}

export async function generateAuditPDF({ timeframe, orders = [], products = [], metrics = {} }) {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    // 1. Fetch Branding/Shop Info
    let branding = {
        shop_name: "Vaiyaaree",
        shop_address: "16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015",
        shop_gstin: "84739393083",
        company_vat_tin: "33132028969",
        company_cst_no: "1091562",
        company_pan_no: "AAIFG6568K",
        bank_name: "STATE BANK INDIA",
        bank_account: "170902000000962",
        bank_ifsc: "SBI0001709",
        bank_upi: "vaiyaaree@upi",
        business_phone: "15551678232",
        business_email: "info@vaiyaaree.com"
    };

    try {
        const { data } = await supabase.from('app_settings').select('*');
        if (data && Array.isArray(data)) {
            data.forEach(item => {
                if (item.key === 'shop_name' || item.key === 'companyName') branding.shop_name = item.value;
                else if (item.key === 'shop_logo') branding.shop_logo = item.value;
                else if (item.value) branding[item.key] = item.value;
            });
        }
    } catch (e) {
        console.error("Audit Report Branding Error:", e);
    }

    // --- CALCULATIONS ---
    const totalOrdersCount = orders.length;
    const grossRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const avgOrderValue = totalOrdersCount > 0 ? (grossRevenue / totalOrdersCount) : 0;

    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalTaxCollected = 0;

    orders.forEach(o => {
        let cgst = parseFloat(o.cgst) || 0;
        let sgst = parseFloat(o.sgst) || 0;
        let igst = parseFloat(o.igst) || 0;
        let tax = cgst + sgst + igst;

        if (tax === 0 && o.tax_amount) {
            tax = parseFloat(o.tax_amount) || 0;
            // split evenly CGST / SGST for intra-state default
            cgst = tax / 2;
            sgst = tax / 2;
        } else if (tax === 0 && o.total_amount > 0) {
            // Saree 5% GST inclusive estimate
            tax = Math.round((o.total_amount - (o.total_amount / 1.05)) * 100) / 100;
            cgst = Math.round((tax / 2) * 100) / 100;
            sgst = Math.round((tax - cgst) * 100) / 100;
        }

        totalCGST += cgst;
        totalSGST += sgst;
        totalIGST += igst;
        totalTaxCollected += tax;
    });

    const netTaxableRevenue = Math.max(0, grossRevenue - totalTaxCollected);

    // Payment distribution
    let onlineCount = 0, onlineAmount = 0;
    let codCount = 0, codAmount = 0;
    orders.forEach(o => {
        const method = (o.payment_method || '').toLowerCase();
        if (method.includes('cod') || method.includes('cash')) {
            codCount++;
            codAmount += (parseFloat(o.total_amount) || 0);
        } else {
            onlineCount++;
            onlineAmount += (parseFloat(o.total_amount) || 0);
        }
    });

    // Order status breakdown
    const statusCounts = {};
    orders.forEach(o => {
        const st = o.status || 'PLACED';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    // Inventory metrics
    const totalInventoryUnits = products.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + ((parseInt(p.stock) || 0) * (parseFloat(p.price) || 0)), 0);
    const totalSKUs = products.length;

    // Category breakdown
    const categoryMap = {};
    products.forEach(p => {
        const cat = p.category || 'General Saree';
        if (!categoryMap[cat]) categoryMap[cat] = { skus: 0, stock: 0, value: 0 };
        categoryMap[cat].skus += 1;
        categoryMap[cat].stock += (parseInt(p.stock) || 0);
        categoryMap[cat].value += ((parseInt(p.stock) || 0) * (parseFloat(p.price) || 0));
    });

    const reportRefNo = `AUD-${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const generationDateStr = new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

    // --- PAGE 1: EXECUTIVE FINANCIAL & AUDIT SUMMARY ---
    let y = 15;

    // Company Header & Logo (Left Side)
    let logoLoaded = false;
    if (branding.shop_logo) {
        try {
            let logoSrc = branding.shop_logo;
            if (logoSrc.startsWith('/') && typeof window !== 'undefined') {
                logoSrc = window.location.origin + logoSrc;
            }
            const b64 = await urlToBase64(logoSrc);
            if (b64) {
                doc.addImage(b64, 'PNG', 12, 12, 22, 22);
                logoLoaded = true;
            }
        } catch (err) {
            console.error("Audit Logo Error:", err);
        }
    }

    const brandX = logoLoaded ? 38 : 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Navy Slate
    doc.text(branding.shop_name.toUpperCase(), brandX, y + 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const splitAddr = doc.splitTextToSize(branding.shop_address, 85);
    doc.text(splitAddr, brandX, y + 7);
    const addrLineHeight = splitAddr.length * 3.5;

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`GSTIN: ${branding.shop_gstin || 'N/A'}  |  PAN: ${branding.company_pan_no || 'AAIFG6568K'}`, brandX, y + 7 + addrLineHeight);
    doc.text(`Contact: ${branding.business_phone || 'N/A'}  |  ${branding.business_email || ''}`, brandX, y + 11 + addrLineHeight);

    // Report Header Badge Card (Right Side)
    const cardX = 125;
    const cardW = 73;
    const cardH = 34;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, 10, cardW, cardH, 2, 2, "FD");

    doc.setFillColor(15, 23, 42);
    doc.rect(cardX, 10, cardW, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("BUSINESS AUDIT REPORT", cardX + (cardW / 2), 15.5, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    doc.setFont("helvetica", "bold"); doc.text("Ref No:", cardX + 4, 22);
    doc.setFont("helvetica", "normal"); doc.text(reportRefNo, cardX + 22, 22);

    doc.setFont("helvetica", "bold"); doc.text("Period:", cardX + 4, 27);
    doc.setFont("helvetica", "normal"); doc.text(String(timeframe).toUpperCase(), cardX + 22, 27);

    doc.setFont("helvetica", "bold"); doc.text("Generated:", cardX + 4, 32);
    doc.setFont("helvetica", "normal"); doc.text(generationDateStr, cardX + 22, 32);

    doc.setFont("helvetica", "bold"); doc.text("Status:", cardX + 4, 37);
    doc.setTextColor(16, 185, 129); // Emerald green
    doc.text("VERIFIED & AUDITED", cardX + 22, 37);

    y = Math.max(y + 16 + addrLineHeight, 48);

    // Section Separator Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.line(12, y, 198, y);

    y += 6;

    // --- SECTION 1: EXECUTIVE KPI DASHBOARD ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("1. EXECUTIVE FINANCIAL SUMMARY", 12, y);

    y += 4;

    const kpiW = 44;
    const kpiH = 22;
    const kpiGap = 4;
    const startX = 12;

    const kpis = [
        { label: "GROSS TURNOVER", val: formatINR(grossRevenue), sub: `${totalOrdersCount} Total Invoices` },
        { label: "NET TAXABLE SALES", val: formatINR(netTaxableRevenue), sub: "Pre-Tax Base Value" },
        { label: "TOTAL GST COLLECTED", val: formatINR(totalTaxCollected), sub: `CGST + SGST + IGST` },
        { label: "CLOSING STOCK VALUE", val: formatINR(totalInventoryValue), sub: `${totalInventoryUnits} Units (${totalSKUs} SKUs)` }
    ];

    kpis.forEach((kpi, idx) => {
        const x = startX + idx * (kpiW + kpiGap);
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, kpiW, kpiH, 1.5, 1.5, "FD");

        // Top Accent Bar inside card
        doc.setFillColor(15, 23, 42);
        doc.rect(x, y, kpiW, 2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, x + 3, y + 6);

        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(kpi.val, x + 3, y + 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(kpi.sub, x + 3, y + 18);
    });

    y += kpiH + 8;

    // --- SECTION 2: TAX LIABILITY & PAYMENT METHOD BREAKDOWN ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("2. TAX LIABILITY & PAYMENT CHANNEL BREAKDOWN", 12, y);

    y += 5;

    // Table A: GST Tax Breakdown (Left Box)
    const boxW = 90;
    const boxH = 46;

    // GST Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(12, y, boxW, boxH, "FD");

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(12, y, boxW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("GST TAX LIABILITY HEADS", 15, y + 4.8);
    doc.text("AMOUNT (INR)", 98, y + 4.8, { align: "right" });

    let tableY = y + 12;
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    const taxRows = [
        { name: "Central Tax (CGST)", val: formatINR(totalCGST) },
        { name: "State Tax (SGST)", val: formatINR(totalSGST) },
        { name: "Integrated Tax (IGST)", val: formatINR(totalIGST) },
        { name: "Total Taxable Turnover", val: formatINR(netTaxableRevenue) },
        { name: "TOTAL GST COLLECTED", val: formatINR(totalTaxCollected), bold: true }
    ];

    taxRows.forEach((r, rIdx) => {
        if (r.bold) {
            doc.setFont("helvetica", "bold");
            doc.setFillColor(241, 245, 249);
            doc.rect(12.2, tableY - 3.5, boxW - 0.4, 6, "F");
        } else {
            doc.setFont("helvetica", "normal");
        }
        doc.text(r.name, 15, tableY);
        doc.text(r.val, 98, tableY, { align: "right" });
        tableY += 6.5;
    });

    // Payment & Fulfillment Box (Right Box)
    const rightBoxX = 108;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect(rightBoxX, y, boxW, boxH, "FD");

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(rightBoxX, y, boxW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("PAYMENT CHANNEL & METRICS", rightBoxX + 3, y + 4.8);
    doc.text("COUNT / VAL", rightBoxX + boxW - 3, y + 4.8, { align: "right" });

    let rightTableY = y + 12;
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    const paymentRows = [
        { name: "Prepaid / Online Revenue", val: `${onlineCount} Orders (${formatINR(onlineAmount)})` },
        { name: "Cash on Delivery (COD)", val: `${codCount} Orders (${formatINR(codAmount)})` },
        { name: "Average Order Value (AOV)", val: formatINR(avgOrderValue) },
        { name: "Highest Order Value", val: formatINR(orders.reduce((max, o) => Math.max(max, parseFloat(o.total_amount) || 0), 0)) },
        { name: "Total Invoices Audited", val: `${totalOrdersCount} Completed Orders`, bold: true }
    ];

    paymentRows.forEach((r) => {
        if (r.bold) {
            doc.setFont("helvetica", "bold");
            doc.setFillColor(241, 245, 249);
            doc.rect(rightBoxX + 0.2, rightTableY - 3.5, boxW - 0.4, 6, "F");
        } else {
            doc.setFont("helvetica", "normal");
        }
        doc.text(r.name, rightBoxX + 3, rightTableY);
        doc.text(r.val, rightBoxX + boxW - 3, rightTableY, { align: "right" });
        rightTableY += 6.5;
    });

    y += boxH + 8;

    // --- SECTION 3: CLOSING STOCK & INVENTORY VALUATION ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("3. CLOSING STOCK & CATEGORY VALUATION", 12, y);

    y += 5;

    // Category Inventory Table
    const catCategories = Object.keys(categoryMap);
    const catTableW = 186;
    const catHeaderH = 7;
    const catRowH = 6;
    const catRowsToShow = Math.min(catCategories.length, 5);

    doc.setFillColor(30, 41, 59);
    doc.rect(12, y, catTableW, catHeaderH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PRODUCT CATEGORY", 16, y + 4.8);
    doc.text("ACTIVE SKUS", 75, y + 4.8, { align: "center" });
    doc.text("STOCK UNITS", 105, y + 4.8, { align: "center" });
    doc.text("ESTIMATED VALUATION (AT SELLING PRICE)", 194, y + 4.8, { align: "right" });

    y += catHeaderH;

    catCategories.slice(0, catRowsToShow).forEach((cat, idx) => {
        const item = categoryMap[cat];
        if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(12, y, catTableW, catRowH, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);

        doc.text(cat.substring(0, 35), 16, y + 4.2);
        doc.text(String(item.skus), 75, y + 4.2, { align: "center" });
        doc.text(String(item.stock), 105, y + 4.2, { align: "center" });
        doc.text(formatINR(item.value), 194, y + 4.2, { align: "right" });

        y += catRowH;
    });

    // Category Table Summary Total Row
    doc.setFillColor(241, 245, 249);
    doc.rect(12, y, catTableW, catRowH, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(12, y, 198, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("TOTAL INVENTORY AUDIT", 16, y + 4.2);
    doc.text(String(totalSKUs), 75, y + 4.2, { align: "center" });
    doc.text(String(totalInventoryUnits), 105, y + 4.2, { align: "center" });
    doc.text(formatINR(totalInventoryValue), 194, y + 4.2, { align: "right" });

    y += catRowH + 8;

    // --- SECTION 4: AUDIT COMPLIANCE & BANKING DETAILS ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("4. BANKING & COMPLIANCE SIGN-OFF", 12, y);

    y += 5;

    const complianceBoxH = 26;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, y, 186, complianceBoxH, "FD");

    // Left Column: Bank Details
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42); doc.text("BANKING ACCOUNT DETAILS:", 15, y + 5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
    doc.text(`Bank Name: ${branding.bank_name || 'STATE BANK INDIA'}`, 15, y + 9);
    doc.text(`Account No: ${branding.bank_account || '170902000000962'}`, 15, y + 13);
    doc.text(`IFSC Code: ${branding.bank_ifsc || 'SBI0001709'}`, 15, y + 17);
    doc.text(`UPI ID: ${branding.bank_upi || 'vaiyaaree@upi'}`, 15, y + 21);

    // Middle Line
    doc.setDrawColor(226, 232, 240);
    doc.line(95, y + 2, 95, y + complianceBoxH - 2);

    // Right Column: Company Tax Reg
    doc.setFont("helvetica", "bold"); doc.setTextColor(15, 23, 42); doc.text("STATUTORY REGISTRATION:", 100, y + 5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
    doc.text(`VAT TIN: ${branding.company_vat_tin || '33132028969'}`, 100, y + 9.5);
    doc.text(`CST NO: ${branding.company_cst_no || '1091562'}`, 100, y + 14);
    doc.text(`PAN NO: ${branding.company_pan_no || 'AAIFG6568K'}`, 100, y + 18.5);

    y += complianceBoxH + 6;

    // Audit Declaration & Signatures
    const signBoxH = 26;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, y, 186, signBoxH, "FD");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const declText = "Declaration: This audit report is generated automatically based on verified digital ledger entries and order databases maintained in the Vaiyaaree e-commerce system. All tax calculations comply with prevailing Goods and Services Tax (GST) rules.";
    const splitDecl = doc.splitTextToSize(declText, 180);
    doc.text(splitDecl, 15, y + 4.5);

    // Signatures
    const sigY = y + 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text("Prepared By: ___________________", 15, sigY);
    doc.text("(System Administrator)", 15, sigY + 4);

    doc.text("Authorized Signatory: ___________________", 125, sigY);
    doc.text(`For ${branding.shop_name}`, 125, sigY + 4);


    // --- PAGE 2+: DETAILED SALES REGISTER (TABLE) ---
    doc.addPage();
    y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("5. DETAILED SALES REGISTER & TAX LEDGER", 12, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Complete listing of ${totalOrdersCount} verified customer transactions for audit reference`, 12, y + 4.5);

    y += 10;

    // Table Column Definitions
    const cols = [
        { header: "#", w: 8, align: "center" },
        { header: "INVOICE / ORDER ID", w: 30, align: "left" },
        { header: "DATE", w: 20, align: "left" },
        { header: "CUSTOMER", w: 38, align: "left" },
        { header: "LOCATION", w: 28, align: "left" },
        { header: "PAYMENT / STATUS", w: 30, align: "left" },
        { header: "TAX (INR)", w: 16, align: "right" },
        { header: "TOTAL (INR)", w: 16, align: "right" }
    ];

    const drawTableHeader = (curY) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(12, curY, 186, 7.5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);

        let curX = 12;
        cols.forEach(col => {
            if (col.align === "right") {
                doc.text(col.header, curX + col.w - 1.5, curY + 5, { align: "right" });
            } else if (col.align === "center") {
                doc.text(col.header, curX + (col.w / 2), curY + 5, { align: "center" });
            } else {
                doc.text(col.header, curX + 1.5, curY + 5, { align: "left" });
            }
            curX += col.w;
        });

        return curY + 7.5;
    };

    y = drawTableHeader(y);

    let registerTotalTax = 0;
    let registerTotalRevenue = 0;

    orders.forEach((o, index) => {
        // Calculate tax for order
        let cgst = parseFloat(o.cgst) || 0;
        let sgst = parseFloat(o.sgst) || 0;
        let igst = parseFloat(o.igst) || 0;
        let tax = cgst + sgst + igst;
        if (tax === 0 && o.tax_amount) tax = parseFloat(o.tax_amount) || 0;
        if (tax === 0 && o.total_amount > 0) {
            tax = Math.round((o.total_amount - (o.total_amount / 1.05)) * 100) / 100;
        }

        const totalAmt = parseFloat(o.total_amount) || 0;
        registerTotalTax += tax;
        registerTotalRevenue += totalAmt;

        const invNo = o.invoice_no || `INV-${String(orders.length - index).padStart(4, '0')}`;
        const dateStr = new Date(o.created_at || Date.now()).toLocaleDateString('en-IN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const custName = o.customer_name ? (o.customer_name.length > 20 ? o.customer_name.substring(0, 18) + '..' : o.customer_name) : 'Customer';
        const locationStr = extractLocation(o);
        const locDisplay = locationStr.length > 18 ? locationStr.substring(0, 16) + '..' : locationStr;
        const statusDisplay = `${o.payment_method || 'Online'} / ${o.status || 'PLACED'}`;

        // Page break check
        if (y > 265) {
            doc.addPage();
            y = 20;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            doc.text("5. DETAILED SALES REGISTER (CONTINUED)", 12, y);
            y += 7;
            y = drawTableHeader(y);
        }

        // Row background
        if (index % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(12, y, 186, 6.5, "F");
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);

        let curX = 12;
        // #
        doc.text(String(index + 1), curX + (cols[0].w / 2), y + 4.2, { align: "center" });
        curX += cols[0].w;

        // Invoice No
        doc.setFont("helvetica", "bold");
        doc.text(invNo, curX + 1.5, y + 4.2);
        doc.setFont("helvetica", "normal");
        curX += cols[1].w;

        // Date
        doc.text(dateStr, curX + 1.5, y + 4.2);
        curX += cols[2].w;

        // Customer
        doc.text(custName, curX + 1.5, y + 4.2);
        curX += cols[3].w;

        // Location
        doc.text(locDisplay, curX + 1.5, y + 4.2);
        curX += cols[4].w;

        // Payment / Status
        doc.setFontSize(6.5);
        doc.text(statusDisplay.substring(0, 24), curX + 1.5, y + 4.2);
        doc.setFontSize(7);
        curX += cols[5].w;

        // Tax
        doc.text(tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), curX + cols[6].w - 1.5, y + 4.2, { align: "right" });
        curX += cols[6].w;

        // Total
        doc.setFont("helvetica", "bold");
        doc.text(totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), curX + cols[7].w - 1.5, y + 4.2, { align: "right" });

        y += 6.5;
    });

    // Sales Register Total Summary Row
    if (y > 262) {
        doc.addPage();
        y = 25;
    }

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, y, 186, 7.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAL AUDITED SALES (${orders.length} ORDERS)`, 15, y + 5);

    doc.text(registerTotalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 170, y + 5, { align: "right" });
    doc.text(registerTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 196.5, y + 5, { align: "right" });


    // --- GLOBAL RUNNING HEADER & FOOTER ON ALL PAGES ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Header Accent Line & Text
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 3, "F");

        if (i > 1) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`${branding.shop_name.toUpperCase()} — BUSINESS AUDIT REPORT`, 12, 8);
            doc.setFont("helvetica", "normal");
            doc.text(`Ref: ${reportRefNo}  |  Period: ${timeframe}`, 198, 8, { align: "right" });

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.line(12, 10, 198, 10);
        }

        // Footer Accent Line & Text
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(12, 285, 198, 285);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("CONFIDENTIAL — Prepared strictly for business audit and official taxation purposes.", 12, 289);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Page ${i} of ${pageCount}`, 198, 289, { align: "right" });
    }

    return doc.output('arraybuffer');
}
