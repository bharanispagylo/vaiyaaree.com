'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Check, Loader2, Image as ImageIcon, X, Grid, AlertTriangle, FileDown, Plus, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { mysqlClient } from '@/lib/mysqlClient';
import ImageZoom from './ImageZoom';
import MediaPicker from './MediaPicker';

/**
 * ProductImageAssigner (Image Upload Page)
 *
 * Manages product image uploads, digital watermark scanning, Excel spreadsheet imports,
 * sequential Product No tracking, failure handling, and re-uploading.
 */
export default function ProductImageAssigner({ products = [], onClose, onDone, initialMaxProductNo = 1000, existingProducts = [] }) {
    const [errorModal, setErrorModal] = useState(null);
    const [importing, setImporting] = useState(false);
    const [activePickerIndex, setActivePickerIndex] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [watermarkModal, setWatermarkModal] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    const fileRefs = useRef([]);
    const spreadsheetInputRef = useRef(null);

    // Calculate baseline Product No - ONLY include products that do not have an image assigned yet
    const getInitialItems = () => {
        let currentMax = initialMaxProductNo || 1000;
        const pendingProducts = (products || []).filter(p => !p.id || !p.image_url);
        return pendingProducts.map((p, idx) => {
            const rawNo = p.product_no || (p.sku ? parseInt(p.sku) : null);
            const prodNo = (rawNo && !isNaN(rawNo)) ? rawNo : (currentMax + idx);
            return {
                ...p,
                product_no: prodNo,
                sku: String(prodNo),
                previewUrl: p.image_url || null,
                status: 'idle', // 'idle' | 'stamping' | 'done' | 'scan_failed'
                errorMessage: null,
                code: p.product_code || null,
                catalogId: p.product_catalog_image_id || null,
                isNew: !p.id
            };
        });
    };

    const [items, setItems] = useState(getInitialItems);

    // Get highest Product No currently in items or initialMax
    const getHighestProductNo = () => {
        let maxNo = initialMaxProductNo || 999;
        items.forEach(it => {
            const num = parseInt(it.product_no);
            if (!isNaN(num) && num > maxNo) {
                maxNo = num;
            }
        });
        return maxNo;
    };

    //  1. SPREADSHEET UPLOAD ON IMAGE UPLOAD PAGE 
    const handleSpreadsheetUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const dataBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(dataBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (!jsonData || jsonData.length === 0) {
                setErrorModal({
                    title: 'Import Failed',
                    message: 'The uploaded Excel spreadsheet is empty. Please check your file.'
                });
                setImporting(false);
                return;
            }

            // Fetch existing products from DB to ignore sarees already inserted and get highest Product No
            let dbProductsList = existingProducts || [];
            try {
                let res = await mysqlClient
                    .from('products')
                    .select('id, name, sku, product_catalog_image_id, image_url');
                if (res.error) {
                    res = await mysqlClient.from('products').select('id, name, sku, image_url');
                }
                if (res.data && res.data.length > 0) {
                    dbProductsList = res.data;
                }
            } catch (dbErr) {
                console.error('Error fetching DB products for deduplication:', dbErr);
            }

            const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[\s_]/g, '');

            let currentMaxNo = 999;
            dbProductsList.forEach(p => {
                const num = p.product_no || (p.sku ? parseInt(p.sku) : null);
                if (num && !isNaN(num) && num > currentMaxNo) currentMaxNo = num;
            });
            if (initialMaxProductNo && initialMaxProductNo > currentMaxNo) {
                currentMaxNo = initialMaxProductNo;
            }
            items.forEach(it => {
                const num = parseInt(it.product_no);
                if (!isNaN(num) && num > currentMaxNo) currentMaxNo = num;
            });

            const newBatchItems = [];
            let skippedCount = 0;

            for (const rawRow of jsonData) {
                // Skip completely empty Excel rows
                const hasValues = Object.values(rawRow).some(v => v !== null && v !== undefined && String(v).trim() !== '');
                if (!hasValues) continue;

                const row = {};
                for (const k of Object.keys(rawRow)) {
                    row[normalizeKey(k)] = rawRow[k];
                }

                const id = row.id || row.productid || row.itemid || null;
                const rawName = String(row.name || row.productname || row.sareename || row.title || row.item || '').trim();
                const catalogId = String(row.catalogid || row.productcatalogimageid || '').trim().toUpperCase();
                const rawProdNo = parseInt(row.productno || row.productnumber || row.no || row.sku || row.code);

                // Skip rows without a product name, catalog ID, or price/stock
                if (!rawName && !catalogId && (!row.price || parseFloat(row.price) === 0)) {
                    continue;
                }

                const name = rawName || 'Saree Product';
                const priceVal = parseFloat(row.price || row.sellingprice || row.mrp || row.rate || row.amount);
                const price = Math.max(0, isNaN(priceVal) ? 0 : priceVal);
                const stockVal = parseInt(row.stock || row.quantity || row.qty || row.inventory || row.available);
                const stock = Math.max(0, isNaN(stockVal) ? 0 : stockVal);
                const description = String(row.description || row.desc || row.details || row.about || row.info || '');
                const category = String(row.category || row.collection || row.type || row.group || 'General');

                // Check if this saree already exists in the database by explicit unique identifiers (Catalog ID, Product ID, or explicit Product No/SKU)
                const existingMatch = dbProductsList.find(p => {
                    if (id && String(p.id) === String(id)) return true;
                    if (!isNaN(rawProdNo) && rawProdNo > 0 && (p.product_no === rawProdNo || p.sku === String(rawProdNo))) return true;
                    if (catalogId && (p.product_catalog_image_id || '').toUpperCase() === catalogId) return true;
                    return false;
                });

                // IGNORE & SKIP if already inserted with an image in database!
                if (existingMatch && existingMatch.image_url) {
                    skippedCount++;
                    continue;
                }

                // For NEW products, auto-assign next sequential continuous Product No
                let assignedNo;
                if (!isNaN(rawProdNo) && rawProdNo > currentMaxNo) {
                    assignedNo = rawProdNo;
                    currentMaxNo = assignedNo;
                } else if (existingMatch && (existingMatch.product_no || existingMatch.sku)) {
                    assignedNo = existingMatch.product_no || parseInt(existingMatch.sku);
                } else {
                    currentMaxNo += 1;
                    assignedNo = currentMaxNo;
                }

                newBatchItems.push({
                    id: existingMatch?.id || id || undefined,
                    name,
                    description,
                    price,
                    stock,
                    category,
                    product_no: assignedNo,
                    sku: String(assignedNo),
                    type: 'simple',
                    catalogId: catalogId || existingMatch?.product_catalog_image_id || '',
                    previewUrl: row.imageurl || row.image || null,
                    status: 'idle',
                    errorMessage: null,
                    isNew: !(existingMatch?.id || id)
                });
            }

            // Set local items to contain ONLY NEW products requiring image upload
            setItems(newBatchItems);

            if (skippedCount > 0 && newBatchItems.length === 0) {
                setErrorModal({
                    title: 'Import Notice',
                    message: `All ${skippedCount} saree(s) in this Excel file are already inserted in your collection. 0 new products to import.`
                });
            }

            e.target.value = '';
        } catch (err) {
            console.error('Spreadsheet Import Error:', err);
            setErrorModal({
                title: 'Spreadsheet Error',
                message: 'Failed to read spreadsheet: ' + err.message
            });
        } finally {
            setImporting(false);
        }
    };

    //  2. ADD NEW PRODUCT 
    const handleAddNewProduct = () => {
        const nextNo = getHighestProductNo() + 1;
        const newItem = {
            name: `New Saree #${nextNo}`,
            description: '',
            price: 0,
            stock: 1,
            category: 'Silk Saree',
            product_no: nextNo,
            sku: String(nextNo),
            type: 'simple',
            catalogId: `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            previewUrl: null,
            status: 'idle',
            errorMessage: null,
            isNew: true
        };
        setItems(prev => [...prev, newItem]);
    };

    //  3. ASSIGN IMAGE & DIGITAL SCAN VALIDATION 
    const assignImage = async (index, rawImageUrl) => {
        const item = items[index];
        setOcrLoading(true);

        try {
            // Fetch image blob for scanning
            const response = await fetch(rawImageUrl);
            if (!response.ok) throw new Error(`Could not fetch image file (${response.status})`);
            const blob = await response.blob();
            const fileCheck = new File([blob], `check-${Date.now()}.jpg`, { type: 'image/jpeg' });

            const checkFormData = new FormData();
            checkFormData.append('file', fileCheck);
            checkFormData.append('checkOnly', 'true');
            const token = localStorage.getItem('cast_prince_admin') || '';
            const detRes = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: checkFormData
            });
            const detData = await detRes.json();

            const onProceedWithUpload = async (catId) => {
                setOcrLoading(true);
                setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'stamping', previewUrl: rawImageUrl } : it));

                try {
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', fileCheck);
                    uploadFormData.append('catalogId', catId);
                    uploadFormData.append('requireClean', 'true');
                    uploadFormData.append('skipDetection', 'true');
                    uploadFormData.append('saveClean', rawImageUrl.startsWith('blob:') ? 'true' : 'false');
                    uploadFormData.append('mode', 'product');

                    const token = localStorage.getItem('cast_prince_admin') || '';
                    const uploadRes = await fetch('/api/admin/upload', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: uploadFormData
                    });
                    const data = await uploadRes.json();

                    if (!uploadRes.ok) {
                        throw new Error(data.error || 'Digital scan / watermark application failed.');
                    }

                    const finalUrl = data.watermarkedUrl || data.url;
                    
                    // Build product payload including Product No & SKU
                    const dbData = {
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        stock: item.stock,
                        category: item.category,
                        type: 'simple',
                        is_active: true,
                        image_url: finalUrl,
                        product_catalog_image_id: data.catalogId,
                        product_no: item.product_no,
                        sku: String(item.product_no)
                    };

                    let savedProduct = null;
                    if (item.isNew) {
                        dbData.total_added = item.stock || 0;
                        const { data: insData, error } = await mysqlClient.from('products').insert([dbData]).select();
                        if (error) {
                            // Fallback if product_no column isn't in DB schema cache yet
                            delete dbData.product_no;
                            const { data: insFallback, error: errFallback } = await mysqlClient.from('products').insert([dbData]).select();
                            if (errFallback) throw errFallback;
                            savedProduct = insFallback?.[0];
                        } else {
                            savedProduct = insData?.[0];
                        }

                        if (savedProduct && savedProduct.stock > 0) {
                            await mysqlClient.from('product_history').insert({
                                product_id: savedProduct.id,
                                change_type: 'ADD',
                                quantity_change: savedProduct.stock,
                                new_stock: savedProduct.stock,
                                reason: 'Catalog Image Upload'
                            });
                        }
                    } else {
                        const { data: updData, error } = await mysqlClient.from('products').update(dbData).eq('id', item.id).select();
                        if (error) {
                            delete dbData.product_no;
                            const { data: updFallback, error: errFallback } = await mysqlClient.from('products').update(dbData).eq('id', item.id).select();
                            if (errFallback) throw errFallback;
                            savedProduct = updFallback?.[0];
                        } else {
                            savedProduct = updData?.[0];
                        }
                    }

                    // Successfully completed digital scan & saved product to database
                    setItems(prev => prev.map((it, i) => i === index ? {
                        ...it,
                        ...savedProduct,
                        product_no: item.product_no, // Preserve original Product No
                        sku: String(item.product_no),
                        status: 'done',
                        errorMessage: null,
                        previewUrl: finalUrl,
                        catalogId: data.catalogId
                    } : it));

                    setWatermarkModal(null);
                } catch (procErr) {
                    console.error('Image Processing Error:', procErr);
                    // Mark as SCAN_FAILED on Image Upload page - DO NOT move to Products List or mark inactive
                    setItems(prev => prev.map((it, i) => i === index ? {
                        ...it,
                        status: 'scan_failed',
                        errorMessage: procErr.message || 'Digital scan processing failed. Please re-upload a clean image.'
                    } : it));
                    setErrorModal({
                        title: 'Digital Scan Failure',
                        message: 'Saree image digital scan failed: ' + procErr.message
                    });
                } finally {
                    setOcrLoading(false);
                }
            };

            if (detData.hasWatermark) {
                // Digital Scan detected watermark conflict
                setWatermarkModal({
                    type: 'existing',
                    detectedCode: detData.catalogId || 'CAT-CODE',
                    url: rawImageUrl,
                    onProceed: () => onProceedWithUpload(detData.catalogId),
                    onReupload: () => {
                        setItems(prev => prev.map((it, i) => i === index ? {
                            ...it,
                            status: 'scan_failed',
                            errorMessage: `Watermark conflict detected (${detData.catalogId}). Please re-upload a clean image.`
                        } : it));
                        setWatermarkModal(null);
                        setOcrLoading(false);
                        setTimeout(() => {
                            fileRefs.current[index]?.click();
                        }, 100);
                    },
                    onCancel: () => {
                        // Mark item as scan failed so user can re-upload
                        setItems(prev => prev.map((it, i) => i === index ? {
                            ...it,
                            status: 'scan_failed',
                            errorMessage: `Watermark conflict detected (${detData.catalogId}). Please re-upload an unbranded image.`
                        } : it));
                        setWatermarkModal(null);
                        setOcrLoading(false);
                    }
                });
            } else {
                const newCatId = item.catalogId || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                setWatermarkModal({
                    type: 'new',
                    detectedCode: newCatId,
                    url: rawImageUrl,
                    onProceed: () => onProceedWithUpload(newCatId)
                });
            }

        } catch (err) {
            console.error('Detection Error:', err);
            // Saree Image Digital Scan Failure Handling
            setItems(prev => prev.map((it, i) => i === index ? {
                ...it,
                status: 'scan_failed',
                errorMessage: err.message || 'Digital scan failed'
            } : it));
            setErrorModal({ title: 'Digital Scan Failed', message: err.message || 'Image scanning failed. Please re-upload.' });
        } finally {
            setOcrLoading(false);
        }
    };

    const handleFileChange = async (e, index) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        await assignImage(index, objectUrl);
        e.target.value = '';
    };

    const doneCount = items.filter(it => it.status === 'done').length;
    const failedCount = items.filter(it => it.status === 'scan_failed').length;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-box shadow-premium" style={{
                width: '95%', maxWidth: '1050px', padding: 0,
                borderRadius: '36px', background: '#ffffff',
                overflow: 'hidden', height: '92vh', maxHeight: '92vh',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
                animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }} onClick={e => e.stopPropagation()}>

                {/*  HEADER  */}
                <div style={{
                    padding: '1.75rem 2.5rem', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#ffffff'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'hsl(var(--text-main))', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ImageIcon size={30} className="text-primary" /> Image Upload & Digital Scanner
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
                            {doneCount} of {items.length} products scanned & verified • Product Nos assigned sequentially
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {/* Hidden Spreadsheet Input */}
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            ref={spreadsheetInputRef}
                            style={{ display: 'none' }}
                            onChange={handleSpreadsheetUpload}
                        />
                        <button
                            disabled={importing}
                            onClick={() => spreadsheetInputRef.current?.click()}
                            className="btn btn-secondary"
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.85rem', height: '42px', gap: '8px' }}
                        >
                            {importing ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                            Upload Spreadsheet
                        </button>

                        <button
                            onClick={handleAddNewProduct}
                            className="btn btn-primary"
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', fontSize: '0.85rem', height: '42px', gap: '8px' }}
                        >
                            <Plus size={16} /> Add Product
                        </button>

                        <button
                            onClick={onClose}
                            className="btn-icon danger"
                            style={{ width: '40px', height: '40px', borderRadius: '12px' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '5px', background: '#eef2f6' }}>
                    <div style={{
                        height: '100%', transition: 'width 0.5s ease',
                        width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%`,
                        background: failedCount > 0 ? '#ef4444' : '#0f172a'
                    }} />
                </div>

                {/* Summary Pill Banner */}
                {failedCount > 0 && (
                    <div style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2', padding: '0.75rem 2.5rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626', fontSize: '0.85rem', fontWeight: 700 }}>
                        <AlertTriangle size={18} />
                        <span>{failedCount} saree image(s) failed digital scan. Click <strong>"Re-upload Image"</strong> on failed items to correct.</span>
                    </div>
                )}

                {/*  PRODUCT LIST (Table / List View matching diagram)  */}
                <div style={{ flex: 1, padding: '1.5rem 2.5rem', overflowY: 'auto', background: '#f8fafc' }}>
                    {items.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
                            <ImageIcon size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>No products in current batch</h3>
                            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Upload an inventory spreadsheet or click "Add Product" to begin.</p>
                            <button onClick={() => spreadsheetInputRef.current?.click()} className="btn btn-primary" style={{ margin: '0 auto' }}>
                                <FileDown size={18} /> Choose Spreadsheet
                            </button>
                        </div>
                    ) : (
                        <div className="card shadow-subtle" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '24px', background: '#ffffff' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '1rem 1.25rem', width: '130px' }}>Product No</th>
                                        <th style={{ padding: '1rem 1rem', width: '90px', textAlign: 'center' }}>Image</th>
                                        <th style={{ padding: '1rem 1.25rem' }}>Product Name</th>
                                        <th style={{ padding: '1rem 1.25rem', width: '160px' }}>Stock / Price</th>
                                        <th style={{ padding: '1rem 1.25rem', width: '360px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={item.id ? `prod-${item.id}` : `idx-${i}`} style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            background: item.status === 'done' ? '#f0fdf4' : item.status === 'scan_failed' ? '#fff5f5' : '#ffffff',
                                            transition: 'background 0.2s'
                                        }}>
                                            {/* Product No Column */}
                                            <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                                                <span style={{
                                                    fontSize: '0.9rem', fontWeight: 900,
                                                    background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))',
                                                    padding: '5px 12px', borderRadius: '8px', border: '1px solid hsl(var(--primary) / 0.2)',
                                                    fontFamily: 'monospace', letterSpacing: '0.03em', display: 'inline-block'
                                                }}>
                                                    #{item.product_no}
                                                </span>
                                            </td>

                                            {/* Image Thumbnail Column */}
                                            <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div style={{
                                                    width: '64px', height: '64px', borderRadius: '12px',
                                                    overflow: 'hidden', margin: '0 auto', position: 'relative',
                                                    background: '#f1f5f9', border: '1px solid #e2e8f0', flexShrink: 0
                                                }}>
                                                    {item.previewUrl ? (
                                                        <img src={item.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} onClick={() => setZoomedImage(item.previewUrl)} />
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                            <ImageIcon size={22} style={{ color: '#94a3b8', opacity: 0.5 }} />
                                                        </div>
                                                    )}

                                                    {item.status === 'stamping' && (
                                                        <div style={{
                                                            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <Loader2 size={18} className="animate-spin text-primary" />
                                                        </div>
                                                    )}

                                                    {item.status === 'done' && (
                                                        <div style={{
                                                            position: 'absolute', top: 4, right: 4,
                                                            background: '#16a34a', borderRadius: '50%', width: '18px', height: '18px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <Check size={11} color="white" strokeWidth={4} />
                                                        </div>
                                                    )}

                                                    {item.status === 'scan_failed' && (
                                                        <div style={{
                                                            position: 'absolute', top: 4, right: 4,
                                                            background: '#ef4444', borderRadius: '50%', width: '18px', height: '18px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <X size={11} color="white" strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Product Name & Category Column */}
                                            <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                                                        {item.name}
                                                    </div>
                                                    {item.catalogId && (
                                                        <span style={{
                                                            fontSize: '0.7rem', fontWeight: 800,
                                                            background: '#f1f5f9', color: '#64748b',
                                                            padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0',
                                                            fontFamily: 'monospace'
                                                        }}>
                                                            {item.catalogId}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                                                    {item.category || 'General'}
                                                </div>

                                                {item.status === 'scan_failed' && (
                                                    <div style={{ marginTop: '4px', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <AlertTriangle size={12} />
                                                        <span>{item.errorMessage || 'Saree digital scan failed. Re-upload a clean image.'}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Stock & Price Column */}
                                            <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'hsl(var(--primary))' }}>
                                                    ₹{(item.price || 0).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                                                    Stock: {item.stock || 0} pcs
                                                </div>
                                            </td>

                                            {/* Actions Column */}
                                            <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        disabled={item.status === 'stamping'}
                                                        onClick={() => setActivePickerIndex(i)}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.5rem 0.9rem', borderRadius: '10px', fontSize: '0.8rem', height: '38px', gap: '6px' }}
                                                    >
                                                        <Grid size={15} /> Media Library
                                                    </button>

                                                    <button
                                                        disabled={item.status === 'stamping'}
                                                        onClick={() => fileRefs.current[i]?.click()}
                                                        className={item.status === 'scan_failed' ? 'btn btn-danger' : 'btn btn-primary'}
                                                        style={{
                                                            padding: '0.5rem 0.9rem', borderRadius: '10px', fontSize: '0.8rem', height: '38px', gap: '6px',
                                                            background: item.status === 'scan_failed' ? '#dc2626' : undefined,
                                                            color: item.status === 'scan_failed' ? '#ffffff' : undefined
                                                        }}
                                                    >
                                                        {item.status === 'stamping' ? (
                                                            <Loader2 size={15} className="animate-spin" />
                                                        ) : item.status === 'scan_failed' ? (
                                                            <RefreshCw size={15} />
                                                        ) : (
                                                            <Upload size={15} />
                                                        )}
                                                        {item.status === 'scan_failed' ? 'Re-upload from Computer' : (item.status === 'done' ? 'Change from Computer' : 'Upload from Computer')}
                                                    </button>

                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        ref={el => fileRefs.current[i] = el}
                                                        onChange={e => handleFileChange(e, i)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/*  FOOTER  */}
                <div style={{
                    padding: '1.75rem 2.5rem', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#ffffff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            
                        </div>
                        <span>Sequential Product Nos are preserved. Failed scans remain in Image Upload until re-uploaded.</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={onClose} className="modal-btn modal-btn-secondary" style={{ padding: '0.7rem 1.5rem' }}>Close</button>
                        <button
                            onClick={() => { onDone?.(); onClose(); }}
                            className="modal-btn modal-btn-primary"
                            disabled={doneCount === 0}
                            style={{ padding: '0.7rem 2rem', background: '#0f172a' }}
                        >
                             Complete ({doneCount} Processed)
                        </button>
                    </div>
                </div>
            </div>

            {/* Media Picker */}
            {activePickerIndex !== null && (
                <MediaPicker
                    onSelect={(url) => {
                        assignImage(activePickerIndex, url);
                        setActivePickerIndex(null);
                    }}
                    onClose={() => setActivePickerIndex(null)}
                    currentImage={items[activePickerIndex]?.previewUrl}
                />
            )}

            {/* OCR Digital Scanning Loading Overlay */}
            {ocrLoading && (
                <div className="modal-overlay" style={{ zIndex: 5000, background: 'rgba(0,0,0,0.75)' }}>
                    <div className="modal-box" style={{ maxWidth: '380px', textAlign: 'center', padding: '3rem 2rem', borderRadius: '28px' }}>
                        <Loader2 size={48} className="animate-spin text-primary" style={{ margin: '0 auto 1.5rem' }} />
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.5rem', color: '#0f172a' }}>Saree Digital Scanning</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>Validating saree image & checking for digital watermarks...</p>
                    </div>
                </div>
            )}

            {/* Watermark Confirmation Modal */}
            {watermarkModal && (
                <div className="modal-overlay" style={{ zIndex: 6000 }}>
                    {watermarkModal.type === 'existing' ? (
                        <div className="modal-box modal-error" style={{ maxWidth: '440px', textAlign: 'center', borderRadius: '28px' }}>
                            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <AlertTriangle size={36} />
                            </div>
                            <h3 className="modal-title" style={{ fontSize: '1.4rem', fontWeight: 900 }}>Digital Scan Conflict</h3>
                            <p className="modal-message" style={{ fontSize: '0.92rem', color: '#64748b' }}>
                                Image already contains a watermark (<strong>{watermarkModal.detectedCode}</strong>). Please re-upload a clean saree image.
                            </p>
                            <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => { watermarkModal.onCancel?.(); setWatermarkModal(null); setOcrLoading(false); }}
                                    className="modal-btn modal-btn-secondary"
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (watermarkModal.onReupload) {
                                            watermarkModal.onReupload();
                                        } else {
                                            watermarkModal.onCancel?.();
                                            setWatermarkModal(null);
                                            setOcrLoading(false);
                                        }
                                    }}
                                    className="modal-btn modal-btn-primary"
                                    style={{ background: '#ef4444', flex: 1 }}
                                >
                                    Reupload
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="modal-box" style={{ maxWidth: '460px', textAlign: 'center', borderRadius: '28px' }}>
                            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <ImageIcon size={36} />
                            </div>
                            <h3 className="modal-title" style={{ fontSize: '1.4rem', fontWeight: 900 }}>Scan Passed & Ready</h3>
                            <p className="modal-message" style={{ fontSize: '0.92rem', color: '#64748b' }}>
                                Clean saree image verified! Generating digital catalog ID <strong>{watermarkModal.detectedCode}</strong> and applying branding.
                            </p>
                            <div style={{
                                width: '100%', height: '220px', borderRadius: '20px',
                                overflow: 'hidden', border: '1px solid #f1f5f9',
                                marginBottom: '2rem', background: '#f8fafc', position: 'relative'
                            }}>
                                <img src={watermarkModal.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                <div style={{
                                    position: 'absolute', bottom: '15px', right: '15px',
                                    background: 'rgba(0,0,0,0.85)', color: 'white',
                                    padding: '6px 14px', borderRadius: '50px',
                                    fontSize: '0.9rem', fontWeight: 900, fontFamily: 'monospace'
                                }}>
                                    {watermarkModal.detectedCode}
                                </div>
                            </div>
                            <div className="modal-actions" style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => { setWatermarkModal(null); setOcrLoading(false); }} className="modal-btn modal-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={watermarkModal.onProceed} className="modal-btn modal-btn-primary" style={{ flex: 1.5, background: '#0f172a' }}>Apply & Complete</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Error Alert Modal */}
            {errorModal && (
                <div className="modal-overlay" style={{ zIndex: 9000 }}>
                    <div className="modal-box modal-error" style={{ maxWidth: '420px', textAlign: 'center', borderRadius: '28px' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <AlertTriangle size={36} />
                        </div>
                        <h3 className="modal-title" style={{ fontSize: '1.3rem', fontWeight: 900 }}>{errorModal.title}</h3>
                        <p className="modal-message" style={{ fontSize: '0.9rem', color: '#64748b' }}>{errorModal.message}</p>
                        <button onClick={() => setErrorModal(null)} className="modal-btn modal-btn-primary" style={{ background: '#ef4444', width: '100%' }}>Got it</button>
                    </div>
                </div>
            )}

            {zoomedImage && (
                <ImageZoom url={zoomedImage} onClose={() => setZoomedImage(null)} />
            )}
        </div>
    );
}

