'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
    Upload,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    FileSpreadsheet,
    Settings,
    Layers,
    ArrowRight,
    Check,
    X,
    Filter,
    Search,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Database,
    Tag,
    Image as ImageIcon,
    Sliders,
    Eye,
    ShieldAlert,
    ExternalLink,
    Copy,
    ListFilter,
    HelpCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Layers2,
    Grid,
    Package
} from 'lucide-react';

export default function ProductMigrationPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);

    // Stepper State
    const [step, setStep] = useState(1); // 1: Upload & Config, 2: Preview & Match Diffs, 3: Executing & Complete

    // DB Overview
    const [dbOverview, setDbOverview] = useState({
        totalProducts: 0,
        totalVariants: 0,
        maxProductNo: 1000,
        categories: []
    });
    const [loadingOverview, setLoadingOverview] = useState(true);

    // File & Parse State
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [rawRows, setRawRows] = useState([]);
    const [parsedPreviewCount, setParsedPreviewCount] = useState(0);
    const [isParsingFile, setIsParsingFile] = useState(false);
    const [parseError, setParseError] = useState('');
    const [fileStats, setFileStats] = useState({
        totalRows: 0,
        simpleCount: 0,
        variableCount: 0,
        variationCount: 0
    });

    // Migration Settings
    const [matchStrategy, setMatchStrategy] = useState(['catalog_id', 'sku', 'slug', 'name']);
    const [conflictStrategy, setConflictStrategy] = useState('upsert'); // 'upsert' | 'insert_only' | 'update_only'
    const [updateFields, setUpdateFields] = useState({
        price: true,
        compare_price: true,
        stock: true,
        images: true,
        category: true,
        description: true,
        name: false,
        is_active: true
    });
    const [autoCreateCategories, setAutoCreateCategories] = useState(true);
    const [downloadImages, setDownloadImages] = useState(true);
    const [applyVisualWatermark, setApplyVisualWatermark] = useState(false);

    // Preview Analysis State
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState({
        totalRawRows: 0,
        totalProducts: 0,
        simpleCount: 0,
        variableCount: 0,
        totalVariantsCount: 0,
        newCount: 0,
        updateCount: 0,
        skipCount: 0,
        previewItems: []
    });
    const [selectedRows, setSelectedRows] = useState({}); // { [index]: boolean }
    const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'SIMPLE' | 'VARIABLE' | 'NEW' | 'UPDATE' | 'CHANGED'
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);

    // Pagination State for Step 2 Preview
    const [previewPage, setPreviewPage] = useState(1);
    const [previewPageSize, setPreviewPageSize] = useState(25); // 10, 25, 50, 100, 200, 'ALL'

    // Execution & Progress State
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionProgress, setExecutionProgress] = useState(0);
    const [executionStats, setExecutionStats] = useState({
        processed: 0,
        total: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        totalVariantsSaved: 0,
        errors: 0
    });
    const [activityLogs, setActivityLogs] = useState([]);
    const [migrationComplete, setMigrationComplete] = useState(false);

    const getAuthHeaders = () => {
        const token = typeof window !== 'undefined' ? (localStorage.getItem('cast_prince_admin') || '') : '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-admin-token': token
        };
    };

    // Fetch initial DB stats
    useEffect(() => {
        async function fetchDbStats() {
            try {
                setLoadingOverview(true);
                const res = await fetch('/api/admin/products/migrate', {
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                if (res.ok) {
                    setDbOverview({
                        totalProducts: data.totalProducts || 0,
                        totalVariants: data.totalVariants || 0,
                        maxProductNo: data.maxProductNo || 1000,
                        categories: data.categories || []
                    });
                }
            } catch (err) {
                console.error('Failed to fetch DB stats:', err);
            } finally {
                setLoadingOverview(false);
            }
        }
        fetchDbStats();
    }, []);

    // ── Handle File Upload & Parsing via SheetJS (xlsx) ───────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const cleanTextEncoding = (str) => {
        if (str === null || str === undefined) return '';
        const s = typeof str === 'string' ? str : String(str);
        return s
            // 1. Replace literal string "\n", "\\n", "\r\n", "\\r\\n" with actual newlines
            .replace(/\\r\\n|\\n|\\r/g, '\n')
            .replace(/\r\n|\r/g, '\n')
            // 2. Clean multiple redundant newlines into clean paragraph breaks
            .replace(/\n{3,}/g, '\n\n')
            // 3. Clean HTML entity encoding
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;|&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            // 4. Fix UTF-8 / Windows-1252 double-encoded mojibake
            .replace(/â€™|â€˜|â€/g, "'")
            .replace(/â€œ|â€ /g, '"')
            .replace(/â€“|â€”/g, '-')
            .replace(/â‚¹/g, '₹')
            .replace(/wonât/gi, "won't")
            .replace(/canât/gi, "can't")
            .replace(/donât/gi, "don't")
            .replace(/doesnât/gi, "doesn't")
            .replace(/didnât/gi, "didn't")
            .replace(/itâs/gi, "it's")
            .replace(/thatâs/gi, "that's")
            .replace(/youâre/gi, "you're")
            .replace(/theyâre/gi, "they're")
            .replace(/weâre/gi, "we're")
            // 5. Standardize curly/typographic unicode punctuation to clean web-safe characters
            .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
            .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[\u00A0\u200B\uFEFF]/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .trim();
    };

    const processFile = (file) => {
        setParseError('');
        setIsParsingFile(true);
        setFileName(file.name);
        setFileSize(file.size);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const arrayBuffer = evt.target.result;
                const uint8Array = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(uint8Array, { type: 'array', raw: false, codepage: 65001 });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawParsedRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (!rawParsedRows || rawParsedRows.length === 0) {
                    setParseError('The uploaded file does not contain any valid product rows.');
                    setIsParsingFile(false);
                    return;
                }

                // Sanitize and clean text encodings on every row
                let simCount = 0;
                let varCount = 0;
                let childVarCount = 0;

                const sanitizedRows = rawParsedRows.map((r) => {
                    const cleanRow = {};
                    for (const [k, v] of Object.entries(r || {})) {
                        cleanRow[k] = typeof v === 'string' ? cleanTextEncoding(v) : v;
                    }

                    const t = String(cleanRow['Type'] || cleanRow['type'] || '').trim().toLowerCase();
                    if (t === 'variable') varCount++;
                    else if (t === 'variation') childVarCount++;
                    else simCount++;

                    return cleanRow;
                });

                setRawRows(sanitizedRows);
                setParsedPreviewCount(sanitizedRows.length);
                setFileStats({
                    totalRows: sanitizedRows.length,
                    simpleCount: simCount,
                    variableCount: varCount,
                    variationCount: childVarCount
                });
                setIsParsingFile(false);
            } catch (err) {
                console.error('Sheet parse error:', err);
                setParseError('Failed to parse sheet: ' + err.message);
                setIsParsingFile(false);
            }
        };
        reader.onerror = () => {
            setParseError('Error reading file from disk');
            setIsParsingFile(false);
        };
        reader.readAsArrayBuffer(file);
    };

    // ── Match Strategy Checkbox Toggle ───────────────────────────────────────
    const toggleMatchStrategy = (key) => {
        if (matchStrategy.includes(key)) {
            if (matchStrategy.length === 1) return; // Must have at least one strategy
            setMatchStrategy(matchStrategy.filter((k) => k !== key));
        } else {
            setMatchStrategy([...matchStrategy, key]);
        }
    };

    // ── Update Fields Toggle ─────────────────────────────────────────────────
    const toggleUpdateField = (field) => {
        setUpdateFields((prev) => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    // ── Analyze & Generate Match Preview (Step 1 ➔ Step 2) ───────────────────
    const handleGeneratePreview = async () => {
        if (rawRows.length === 0) {
            setParseError('Please upload a valid CSV or Excel sheet first.');
            return;
        }

        setIsPreviewing(true);
        setParseError('');

        try {
            const res = await fetch('/api/admin/products/migrate', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    action: 'preview',
                    rawRows,
                    options: {
                        matchBy: matchStrategy
                    }
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to match products');
            }

            setPreviewData(data);

            // Select all rows by default
            const initialSelected = {};
            (data.previewItems || []).forEach((item) => {
                initialSelected[item.index] = true;
            });
            setSelectedRows(initialSelected);

            setStep(2);
        } catch (err) {
            console.error('Preview error:', err);
            setParseError(err.message || 'Error generating match preview');
        } finally {
            setIsPreviewing(false);
        }
    };

    // ── Filter & Search in Step 2 ─────────────────────────────────────────────
    const filteredPreviewItems = useMemo(() => {
        return (previewData.previewItems || []).filter((item) => {
            const p = item.incomingProduct;

            // Tab Filter
            if (filterTab === 'NEW' && item.action !== 'NEW') return false;
            if (filterTab === 'UPDATE' && item.action !== 'UPDATE') return false;
            if (filterTab === 'SIMPLE' && p.type !== 'simple') return false;
            if (filterTab === 'VARIABLE' && p.type !== 'variant') return false;
            if (filterTab === 'CHANGED') {
                if (item.action !== 'UPDATE' || !item.diff) return false;
                const hasChange = Object.keys(item.diff).length > 0;
                if (!hasChange) return false;
            }

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = (p.name || '').toLowerCase().includes(q);
                const catIdMatch = (p.product_catalog_image_id || '').toLowerCase().includes(q);
                const skuMatch = (p.sku || '').toLowerCase().includes(q);
                const catMatch = (p.category || '').toLowerCase().includes(q);
                const attrMatch = (p.attribute_values || '').toLowerCase().includes(q);
                return nameMatch || catIdMatch || skuMatch || catMatch || attrMatch;
            }

            return true;
        });
    }, [previewData.previewItems, filterTab, searchQuery]);

    // Reset pagination when filter tab, search query, or page size changes
    useEffect(() => {
        setPreviewPage(1);
        setExpandedRow(null);
    }, [filterTab, searchQuery, previewPageSize]);

    // Calculate Pagination Slices for Step 2 Preview
    const totalFilteredCount = filteredPreviewItems.length;
    const isShowAll = previewPageSize === 'ALL';
    const numPageSize = isShowAll ? totalFilteredCount : Number(previewPageSize);
    const totalPages = isShowAll ? 1 : Math.max(1, Math.ceil(totalFilteredCount / (numPageSize || 1)));
    const safePage = Math.min(Math.max(1, previewPage), totalPages);
    const startIndex = isShowAll ? 0 : (safePage - 1) * numPageSize;
    const endIndex = isShowAll ? totalFilteredCount : Math.min(startIndex + numPageSize, totalFilteredCount);
    const paginatedPreviewItems = filteredPreviewItems.slice(startIndex, endIndex);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPreviewPage(newPage);
            setExpandedRow(null);
        }
    };

    const toggleSelectRow = (itemIndex) => {
        setSelectedRows((prev) => ({
            ...prev,
            [itemIndex]: !prev[itemIndex]
        }));
    };

    const handleSelectAll = (select) => {
        const next = { ...selectedRows };
        filteredPreviewItems.forEach((item) => {
            next[item.index] = select;
        });
        setSelectedRows(next);
    };

    const handleSelectCurrentPage = (select) => {
        const next = { ...selectedRows };
        paginatedPreviewItems.forEach((item) => {
            next[item.index] = select;
        });
        setSelectedRows(next);
    };

    const selectedCount = Object.values(selectedRows).filter(Boolean).length;

    // ── Execute Migration in Batches (Step 2 ➔ Step 3) ───────────────────────
    const handleStartMigration = async () => {
        const itemsToMigrate = (previewData.previewItems || []).filter((item) => selectedRows[item.index]);
        if (itemsToMigrate.length === 0) {
            alert('Please select at least one product row to migrate.');
            return;
        }

        setStep(3);
        setIsExecuting(true);
        setMigrationComplete(false);
        setActivityLogs([]);
        setExecutionStats({
            processed: 0,
            total: itemsToMigrate.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
            totalVariantsSaved: 0,
            errors: 0
        });

        const BATCH_SIZE = 20; // Process in chunks of 20 for optimal responsiveness and smooth UI updates
        const totalItems = itemsToMigrate.length;
        let processedSoFar = 0;
        let totalInserted = 0;
        let totalUpdated = 0;
        let totalSkipped = 0;
        let totalVariantsSaved = 0;
        let totalErrors = 0;

        for (let i = 0; i < totalItems; i += BATCH_SIZE) {
            const chunk = itemsToMigrate.slice(i, i + BATCH_SIZE);

            try {
                const res = await fetch('/api/admin/products/migrate', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        action: 'execute',
                        itemsToExecute: chunk,
                        options: {
                            conflictStrategy,
                            updateFields,
                            autoCreateCategories,
                            downloadImages,
                            applyVisualWatermark
                        }
                    })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Batch migration failed');
                }

                totalInserted += data.insertedCount || 0;
                totalUpdated += data.updatedCount || 0;
                totalSkipped += data.skippedCount || 0;
                totalVariantsSaved += data.totalVariantsSaved || 0;
                totalErrors += data.errorCount || 0;
                processedSoFar += chunk.length;

                // Append logs
                const newLogs = (data.results || []).map((r) => ({
                    time: new Date().toLocaleTimeString(),
                    name: r.name,
                    status: r.status,
                    productNo: r.product_no,
                    reason: r.reason
                }));

                if (data.errors && data.errors.length > 0) {
                    data.errors.forEach((err) => {
                        newLogs.push({
                            time: new Date().toLocaleTimeString(),
                            name: err.name,
                            status: 'ERROR',
                            reason: err.error
                        });
                    });
                }

                setActivityLogs((prev) => [...newLogs, ...prev]);

                const pct = Math.min(100, Math.round((processedSoFar / totalItems) * 100));
                setExecutionProgress(pct);

                setExecutionStats({
                    processed: processedSoFar,
                    total: totalItems,
                    inserted: totalInserted,
                    updated: totalUpdated,
                    skipped: totalSkipped,
                    totalVariantsSaved,
                    errors: totalErrors
                });

            } catch (err) {
                console.error('Chunk execution failed:', err);
                totalErrors += chunk.length;
                processedSoFar += chunk.length;

                setActivityLogs((prev) => [
                    {
                        time: new Date().toLocaleTimeString(),
                        name: `Batch (${chunk.length} items)`,
                        status: 'FAILED',
                        reason: err.message
                    },
                    ...prev
                ]);

                setExecutionStats((prev) => ({
                    ...prev,
                    processed: processedSoFar,
                    errors: totalErrors
                }));
            }
        }

        setIsExecuting(false);
        setMigrationComplete(true);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'inherit' }}>
            {/* Header / Nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link
                        href="/admin/products"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            border: '1px solid hsl(var(--border))',
                            background: 'hsl(var(--card))',
                            color: 'hsl(var(--foreground))',
                            textDecoration: 'none'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Layers2 style={{ color: '#6366f1' }} /> Catalog Migration & Sync
                        </h1>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                            Import, match, and sync both simple and variable saree products with size variants from CSV/Excel
                        </p>
                    </div>
                </div>

                {/* Stepper Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'hsl(var(--card))', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}>
                    {[
                        { num: 1, label: 'Upload & Rules' },
                        { num: 2, label: 'Preview & Diffs' },
                        { num: 3, label: 'Migration Sync' }
                    ].map((s, idx) => (
                        <React.Fragment key={s.num}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.85rem',
                                fontWeight: step === s.num ? '700' : '500',
                                color: step === s.num ? '#6366f1' : (step > s.num ? '#10b981' : 'hsl(var(--text-muted))')
                            }}>
                                <span style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: step === s.num ? '#6366f1' : (step > s.num ? '#10b981' : 'hsl(var(--muted))'),
                                    color: step >= s.num ? '#fff' : 'hsl(var(--text-muted))',
                                    fontSize: '0.75rem',
                                    fontWeight: '700'
                                }}>
                                    {step > s.num ? <Check size={14} /> : s.num}
                                </span>
                                <span>{s.label}</span>
                            </div>
                            {idx < 2 && <div style={{ width: '20px', height: '1px', background: 'hsl(var(--border))' }} />}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* STEP 1: FILE UPLOAD & SYNC CONFIGURATION                           */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {step === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: '2rem' }}>
                    {/* Left Column: Dropzone & File Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* File Dropzone */}
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: '2px dashed #6366f1',
                                borderRadius: '16px',
                                padding: '3.5rem 2rem',
                                textAlign: 'center',
                                background: isParsingFile ? 'rgba(99, 102, 241, 0.04)' : 'hsl(var(--card))',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />

                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                color: '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.25rem'
                            }}>
                                {isParsingFile ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                            </div>

                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 0.5rem' }}>
                                {fileName ? fileName : 'Upload Product CSV or Excel File'}
                            </h3>
                            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', margin: '0 0 1rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                                Drag and drop your WooCommerce, Shopify, or custom CSV export here, or click to browse.
                            </p>

                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.08)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontWeight: '600' }}>
                                <Sparkles size={14} /> Full support for Simple Products & Variable Products with Size Variants
                            </div>
                        </div>

                        {/* Error Message */}
                        {parseError && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontSize: '0.9rem'
                            }}>
                                <AlertCircle size={20} />
                                <div>{parseError}</div>
                            </div>
                        )}

                        {/* File Parsed Overview Cards */}
                        {rawRows.length > 0 && (
                            <div style={{
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '16px',
                                padding: '1.5rem',
                                boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FileSpreadsheet size={20} style={{ color: '#10b981' }} />
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Catalog Structure Breakdown</h3>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                        {(fileSize / 1024).toFixed(1)} KB
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ background: 'hsl(var(--muted))', padding: '0.75rem 0.5rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '1.35rem', fontWeight: '800' }}>{fileStats.totalRows}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>Total CSV Rows</div>
                                    </div>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 0.5rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#10b981' }}>{fileStats.simpleCount}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '600', marginTop: '0.2rem' }}>Simple Products</div>
                                    </div>
                                    <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.75rem 0.5rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#6366f1' }}>{fileStats.variableCount}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: '600', marginTop: '0.2rem' }}>Variable Parents</div>
                                    </div>
                                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.75rem 0.5rem', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#d97706' }}>{fileStats.variationCount}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: '600', marginTop: '0.2rem' }}>Child Variations</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Button */}
                        <button
                            type="button"
                            onClick={handleGeneratePreview}
                            disabled={rawRows.length === 0 || isPreviewing}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '14px',
                                background: rawRows.length === 0 ? 'hsl(var(--muted))' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                color: rawRows.length === 0 ? 'hsl(var(--text-muted))' : '#fff',
                                fontWeight: '700',
                                fontSize: '1rem',
                                border: 'none',
                                cursor: rawRows.length === 0 || isPreviewing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.6rem',
                                boxShadow: rawRows.length > 0 ? '0 10px 25px -5px rgba(99, 102, 241, 0.4)' : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isPreviewing ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" /> Grouping Products & Matching Database...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={20} /> Match Products & Preview Diffs ({parsedPreviewCount}) <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Right Column: Matching Strategy & Field Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Matching Criteria Card */}
                        <div style={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '16px',
                            padding: '1.75rem',
                            boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                <Search size={20} style={{ color: '#6366f1' }} />
                                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Matching Hierarchy</h2>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: 0, marginBottom: '1rem' }}>
                                We check each incoming CSV record against your existing products using the keys enabled below:
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {[
                                    {
                                        key: 'catalog_id',
                                        title: '1. Catalog ID / Image Code',
                                        desc: 'Extracts codes like PCDB016, MM01, AP001, FS085 from images or title.'
                                    },
                                    {
                                        key: 'sku',
                                        title: '2. Product SKU Code',
                                        desc: 'Matches exact SKU number in WooCommerce or inventory system.'
                                    },
                                    {
                                        key: 'slug',
                                        title: '3. URL Slug',
                                        desc: 'Matches the permalink slug (e.g. blended-south-cotton-saree-16).'
                                    },
                                    {
                                        key: 'name',
                                        title: '4. Exact Product Title',
                                        desc: 'Matches identical post_title when SKUs are absent.'
                                    }
                                ].map((item) => {
                                    const active = matchStrategy.includes(item.key);
                                    return (
                                        <div
                                            key={item.key}
                                            onClick={() => toggleMatchStrategy(item.key)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '10px',
                                                border: active ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid hsl(var(--border))',
                                                background: active ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={active}
                                                onChange={() => { }}
                                                style={{ marginTop: '0.2rem', accentColor: '#6366f1' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '0.9rem', color: active ? 'hsl(var(--foreground))' : 'hsl(var(--text-muted))' }}>
                                                    {item.title}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                    {item.desc}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conflict Strategy & Granular Field Toggles */}
                        <div style={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '16px',
                            padding: '1.75rem',
                            boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                <Sliders size={20} style={{ color: '#6366f1' }} />
                                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', margin: 0 }}>Sync & Conflict Rules</h2>
                            </div>

                            {/* Conflict Strategy Selector */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                    Conflict Resolution Mode
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {[
                                        { id: 'upsert', label: 'Smart Upsert', sub: 'Insert new & update existing' },
                                        { id: 'insert_only', label: 'Insert Only', sub: 'Skip existing matches' },
                                        { id: 'update_only', label: 'Update Only', sub: 'Skip un-matched new items' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setConflictStrategy(opt.id)}
                                            style={{
                                                padding: '0.6rem 0.5rem',
                                                borderRadius: '10px',
                                                border: conflictStrategy === opt.id ? '2px solid #6366f1' : '1px solid hsl(var(--border))',
                                                background: conflictStrategy === opt.id ? 'rgba(99, 102, 241, 0.08)' : 'hsl(var(--muted))',
                                                color: conflictStrategy === opt.id ? '#6366f1' : 'hsl(var(--foreground))',
                                                fontWeight: '600',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                textAlign: 'center'
                                            }}
                                        >
                                            <div>{opt.label}</div>
                                            <div style={{ fontSize: '0.68rem', fontWeight: '400', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
                                                {opt.sub}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Granular Field Update Toggles */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                    Fields to Sync on Matched Products:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                    {[
                                        { key: 'price', label: 'Sale Price (₹)' },
                                        { key: 'compare_price', label: 'Regular / MRP Price' },
                                        { key: 'stock', label: 'Stock Inventory' },
                                        { key: 'images', label: 'Images & Photos' },
                                        { key: 'category', label: 'Category Link' },
                                        { key: 'description', label: 'Body Description' },
                                        { key: 'is_active', label: 'Active / Published' },
                                        { key: 'name', label: 'Product Title / Name' }
                                    ].map((f) => (
                                        <label
                                            key={f.key}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                fontSize: '0.82rem',
                                                padding: '0.4rem 0.6rem',
                                                borderRadius: '8px',
                                                background: updateFields[f.key] ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                                                border: updateFields[f.key] ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid hsl(var(--border))',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={updateFields[f.key]}
                                                onChange={() => toggleUpdateField(f.key)}
                                                style={{ accentColor: '#10b981' }}
                                            />
                                            <span style={{ fontWeight: updateFields[f.key] ? '600' : '400' }}>{f.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Options */}
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={downloadImages}
                                        onChange={(e) => setDownloadImages(e.target.checked)}
                                        style={{ accentColor: '#6366f1' }}
                                    />
                                    <div>
                                        <span style={{ fontWeight: '600' }}>Download & persist images in database & local storage</span>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                            Downloads remote photos for both parent sarees and individual size variants.
                                        </div>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={applyVisualWatermark}
                                        onChange={(e) => setApplyVisualWatermark(e.target.checked)}
                                        style={{ accentColor: '#6366f1' }}
                                    />
                                    <div>
                                        <span style={{ fontWeight: '600' }}>Stamp visual Catalog ID watermark badge on downloaded images</span>
                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                            Draws the white pill watermark badge with bold Catalog ID in bottom right corner via Canvas.
                                        </div>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={autoCreateCategories}
                                        onChange={(e) => setAutoCreateCategories(e.target.checked)}
                                        style={{ accentColor: '#6366f1' }}
                                    />
                                    <span>Auto-create missing categories & link products</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* STEP 2: INTERACTIVE MATCH PREVIEW & DIFF INSPECTION                 */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {step === 2 && (
                <div>
                    {/* Summary Metric Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '14px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem'
                        }}>
                            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: '500' }}>Catalog Products</span>
                            <span style={{ fontSize: '1.6rem', fontWeight: '800' }}>{previewData.totalProducts}</span>
                            <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '600' }}>
                                {selectedCount} Selected ({previewData.totalRawRows} CSV Rows)
                            </span>
                        </div>

                        <div style={{
                            background: 'hsl(var(--card))',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '14px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem'
                        }}>
                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>🆕 New Products</span>
                            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{previewData.newCount}</span>
                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                Will receive sequential product #
                            </span>
                        </div>

                        <div style={{
                            background: 'hsl(var(--card))',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '14px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem'
                        }}>
                            <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600' }}>🔄 Matched Existing Items</span>
                            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#3b82f6' }}>{previewData.updateCount}</span>
                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                Matched via Catalog ID / SKU
                            </span>
                        </div>

                        <div style={{
                            background: 'hsl(var(--card))',
                            border: '1px solid rgba(147, 51, 234, 0.3)',
                            borderRadius: '14px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.35rem'
                        }}>
                            <span style={{ fontSize: '0.8rem', color: '#9333ea', fontWeight: '600' }}>🔀 Variable Products</span>
                            <span style={{ fontSize: '1.6rem', fontWeight: '800', color: '#9333ea' }}>{previewData.variableCount}</span>
                            <span style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: '600' }}>
                                {previewData.totalVariantsCount} Total Size Variants
                            </span>
                        </div>

                        <div style={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '14px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '0.6rem'
                        }}>
                            <button
                                type="button"
                                onClick={handleStartMigration}
                                disabled={selectedCount === 0 || isExecuting}
                                style={{
                                    width: '100%',
                                    padding: '0.85rem',
                                    borderRadius: '10px',
                                    background: selectedCount === 0 ? 'hsl(var(--muted))' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#fff',
                                    fontWeight: '700',
                                    fontSize: '0.95rem',
                                    border: 'none',
                                    cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.4)'
                                }}
                            >
                                <Check size={18} /> Execute Migration ({selectedCount})
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                style={{
                                    width: '100%',
                                    padding: '0.4rem',
                                    borderRadius: '8px',
                                    background: 'transparent',
                                    color: 'hsl(var(--text-muted))',
                                    fontSize: '0.78rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                Reconfigure or Choose Another File
                            </button>
                        </div>
                    </div>

                    {/* Filter & Action Toolbar */}
                    <div style={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '14px 14px 0 0',
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        borderBottom: 'none'
                    }}>
                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {[
                                { id: 'ALL', label: `All Products (${previewData.totalProducts})` },
                                { id: 'SIMPLE', label: `Simple (${previewData.simpleCount})` },
                                { id: 'VARIABLE', label: `Variable (${previewData.variableCount})` },
                                { id: 'NEW', label: `New Only (${previewData.newCount})` },
                                { id: 'UPDATE', label: `Matched (${previewData.updateCount})` },
                                { id: 'CHANGED', label: `Has Diffs` }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setFilterTab(tab.id)}
                                    style={{
                                        padding: '0.45rem 0.85rem',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: filterTab === tab.id ? '700' : '500',
                                        background: filterTab === tab.id ? '#6366f1' : 'hsl(var(--muted))',
                                        color: filterTab === tab.id ? '#fff' : 'hsl(var(--foreground))',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search & Bulk Select & Page Size */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                <input
                                    type="text"
                                    placeholder="Search name, code, sku, size..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: '0.45rem 0.75rem 0.45rem 2rem',
                                        borderRadius: '8px',
                                        border: '1px solid hsl(var(--border))',
                                        background: 'hsl(var(--background))',
                                        color: 'hsl(var(--foreground))',
                                        fontSize: '0.82rem',
                                        width: '200px'
                                    }}
                                />
                            </div>

                            {/* Page size dropdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                <span>Show:</span>
                                <select
                                    value={previewPageSize}
                                    onChange={(e) => setPreviewPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                    style={{
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: '8px',
                                        border: '1px solid hsl(var(--border))',
                                        background: 'hsl(var(--card))',
                                        color: 'hsl(var(--foreground))',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={10}>10 / page</option>
                                    <option value={25}>25 / page</option>
                                    <option value={50}>50 / page</option>
                                    <option value={100}>100 / page</option>
                                    <option value={200}>200 / page</option>
                                    <option value="ALL">Show All ({totalFilteredCount})</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleSelectCurrentPage(true)}
                                style={{
                                    padding: '0.45rem 0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid hsl(var(--border))',
                                    background: 'hsl(var(--card))',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                                title="Select all items visible on this current page"
                            >
                                Select Page ({paginatedPreviewItems.length})
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSelectAll(true)}
                                style={{
                                    padding: '0.45rem 0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #6366f1',
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    color: '#6366f1',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                                title="Select all items across all pages"
                            >
                                Select All ({totalFilteredCount})
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSelectAll(false)}
                                style={{
                                    padding: '0.45rem 0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid hsl(var(--border))',
                                    background: 'hsl(var(--card))',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Deselect All
                            </button>
                        </div>
                    </div>

                    {/* Diff Data Table */}
                    <div style={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0 0 14px 14px',
                        overflowX: 'auto',
                        boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))', textAlign: 'left' }}>
                                    <th style={{ padding: '0.85rem 1rem', width: '40px' }}>
                                        <input
                                            type="checkbox"
                                            checked={filteredPreviewItems.length > 0 && filteredPreviewItems.every((i) => selectedRows[i.index])}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            style={{ accentColor: '#6366f1' }}
                                        />
                                    </th>
                                    <th style={{ padding: '0.85rem 1rem', width: '70px' }}>Photo</th>
                                    <th style={{ padding: '0.85rem 1rem' }}>Incoming Saree Details</th>
                                    <th style={{ padding: '0.85rem 1rem', width: '150px' }}>Product Type</th>
                                    <th style={{ padding: '0.85rem 1rem', width: '180px' }}>Match Status</th>
                                    <th style={{ padding: '0.85rem 1rem', width: '220px' }}>Pricing & Stock</th>
                                    <th style={{ padding: '0.85rem 1rem', width: '60px', textAlign: 'center' }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPreviewItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                                            No matching product rows found for the selected filter.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedPreviewItems.map((item) => {
                                        const isSelected = Boolean(selectedRows[item.index]);
                                        const isExpanded = expandedRow === item.index;
                                        const p = item.incomingProduct;
                                        const exist = item.existingProduct;
                                        const d = item.diff || {};
                                        const isVariant = p.type === 'variant';

                                        return (
                                            <React.Fragment key={item.index}>
                                                <tr style={{
                                                    borderBottom: '1px solid hsl(var(--border))',
                                                    background: isSelected ? 'transparent' : 'rgba(0,0,0,0.02)',
                                                    opacity: isSelected ? 1 : 0.6,
                                                    transition: 'all 0.15s ease'
                                                }}>
                                                    {/* Checkbox */}
                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectRow(item.index)}
                                                            style={{ accentColor: '#6366f1' }}
                                                        />
                                                    </td>

                                                    {/* Photo Thumbnail */}
                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                        {p.image_url ? (
                                                            <div style={{
                                                                width: '48px',
                                                                height: '56px',
                                                                borderRadius: '6px',
                                                                overflow: 'hidden',
                                                                border: '1px solid hsl(var(--border))',
                                                                background: '#f8fafc'
                                                            }}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={p.image_url}
                                                                    alt={p.name}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div style={{
                                                                width: '48px',
                                                                height: '56px',
                                                                borderRadius: '6px',
                                                                background: 'hsl(var(--muted))',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'hsl(var(--text-muted))'
                                                            }}>
                                                                <ImageIcon size={18} />
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Product Details */}
                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                        <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                                                            {p.name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', flexWrap: 'wrap' }}>
                                                            {p.product_catalog_image_id && (
                                                                <span style={{
                                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                                    color: '#6366f1',
                                                                    padding: '0.15rem 0.45rem',
                                                                    borderRadius: '4px',
                                                                    fontWeight: '700'
                                                                }}>
                                                                    Code: {p.product_catalog_image_id}
                                                                </span>
                                                            )}
                                                            <span>SKU: {p.sku || 'Auto'}</span>
                                                            <span>•</span>
                                                            <span>Cat: {p.category}</span>
                                                        </div>

                                                        {/* Attribute values pills if present */}
                                                        {isVariant && p.attribute_values && (
                                                            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
                                                                    {p.attribute_name || 'Size'}:
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '0.72rem',
                                                                    background: 'rgba(147, 51, 234, 0.08)',
                                                                    color: '#9333ea',
                                                                    padding: '0.1rem 0.4rem',
                                                                    borderRadius: '4px',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {p.attribute_values}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Product Type Badge */}
                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                        {isVariant ? (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem',
                                                                padding: '0.25rem 0.55rem',
                                                                borderRadius: '6px',
                                                                background: 'rgba(147, 51, 234, 0.12)',
                                                                color: '#9333ea',
                                                                fontWeight: '700',
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                <Layers2 size={13} /> Variable ({p.variants?.length || 0} variants)
                                                            </div>
                                                        ) : (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem',
                                                                padding: '0.25rem 0.55rem',
                                                                borderRadius: '6px',
                                                                background: 'hsl(var(--muted))',
                                                                color: 'hsl(var(--foreground))',
                                                                fontWeight: '600',
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                <Package size={13} /> Simple Saree
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Match Status Badge */}
                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                        {item.action === 'NEW' ? (
                                                            <div style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem',
                                                                padding: '0.3rem 0.65rem',
                                                                borderRadius: '6px',
                                                                background: 'rgba(16, 185, 129, 0.12)',
                                                                color: '#10b981',
                                                                fontWeight: '700',
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                <Sparkles size={13} /> NEW PRODUCT
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.35rem',
                                                                    padding: '0.3rem 0.65rem',
                                                                    borderRadius: '6px',
                                                                    background: 'rgba(59, 130, 246, 0.12)',
                                                                    color: '#3b82f6',
                                                                    fontWeight: '700',
                                                                    fontSize: '0.75rem'
                                                                }}>
                                                                    <RefreshCw size={12} /> MATCHED (#{exist?.product_no || exist?.id})
                                                                </div>
                                                                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
                                                                    {item.matchReason}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Pricing & Stock Column */}
                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem' }}>
                                                            <div>
                                                                Price: <strong>₹{p.price}</strong>
                                                                {p.compare_price && p.compare_price > p.price && (
                                                                    <span style={{ textDecoration: 'line-through', color: 'hsl(var(--text-muted))', marginLeft: '0.4rem', fontSize: '0.75rem' }}>
                                                                        ₹{p.compare_price}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                                                                Total Stock: <strong style={{ color: p.stock > 0 ? '#10b981' : '#ef4444' }}>{p.stock}</strong>
                                                                {isVariant && ` across ${p.variants?.length || 0} sizes`}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Expand Toggle */}
                                                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedRow(isExpanded ? null : item.index)}
                                                            style={{
                                                                border: 'none',
                                                                background: 'hsl(var(--muted))',
                                                                borderRadius: '6px',
                                                                padding: '0.35rem',
                                                                cursor: 'pointer',
                                                                color: 'hsl(var(--foreground))'
                                                            }}
                                                            title={isExpanded ? 'Collapse row' : 'View full variant details & description'}
                                                        >
                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded Details Row */}
                                                {isExpanded && (
                                                    <tr style={{ background: 'hsl(var(--muted))' }}>
                                                        <td colSpan={7} style={{ padding: '1.25rem 1.5rem' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.82rem' }}>
                                                                {/* If Variable Product, display the Variants Breakdown Matrix */}
                                                                {isVariant && Array.isArray(p.variants) && p.variants.length > 0 && (
                                                                    <div style={{ background: 'hsl(var(--card))', borderRadius: '10px', border: '1px solid hsl(var(--border))', padding: '1rem' }}>
                                                                        <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                            <Layers2 size={16} style={{ color: '#9333ea' }} />
                                                                            Variant Sizes Matrix ({p.variants.length} options):
                                                                        </div>
                                                                        <div style={{ overflowX: 'auto' }}>
                                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                                                                <thead>
                                                                                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-muted))' }}>
                                                                                        <th style={{ padding: '0.4rem 0.6rem' }}>Photo</th>
                                                                                        <th style={{ padding: '0.4rem 0.6rem' }}>Size / Option</th>
                                                                                        <th style={{ padding: '0.4rem 0.6rem' }}>SKU</th>
                                                                                        <th style={{ padding: '0.4rem 0.6rem' }}>Sale Price</th>
                                                                                        <th style={{ padding: '0.4rem 0.6rem' }}>Regular (MRP)</th>
                                                                                        <th style={{ padding: '0.4rem 0.6rem' }}>Stock</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {p.variants.map((v, vIdx) => (
                                                                                        <tr key={vIdx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                                                                            <td style={{ padding: '0.4rem 0.6rem' }}>
                                                                                                {v.image_url ? (
                                                                                                    <img src={v.image_url} alt={v.name} style={{ width: '32px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                                                                                                ) : (
                                                                                                    <div style={{ width: '32px', height: '36px', background: 'hsl(var(--muted))', borderRadius: '4px' }} />
                                                                                                )}
                                                                                            </td>
                                                                                            <td style={{ padding: '0.4rem 0.6rem', fontWeight: '700', color: '#9333ea' }}>{v.name}</td>
                                                                                            <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace' }}>{v.sku || 'Auto'}</td>
                                                                                            <td style={{ padding: '0.4rem 0.6rem', fontWeight: '700' }}>₹{v.price}</td>
                                                                                            <td style={{ padding: '0.4rem 0.6rem', color: 'hsl(var(--text-muted))' }}>{v.compare_price ? `₹${v.compare_price}` : '—'}</td>
                                                                                            <td style={{ padding: '0.4rem 0.6rem', color: v.stock > 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>{v.stock} in stock</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Description & Raw Mapping */}
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.25rem' }}>
                                                                    <div>
                                                                        <div style={{ fontWeight: '700', marginBottom: '0.35rem' }}>Description:</div>
                                                                        <div style={{
                                                                            background: 'hsl(var(--card))',
                                                                            padding: '0.75rem',
                                                                            borderRadius: '8px',
                                                                            maxHeight: '110px',
                                                                            overflowY: 'auto',
                                                                            whiteSpace: 'pre-line',
                                                                            border: '1px solid hsl(var(--border))'
                                                                        }}>
                                                                            {p.description || 'No description in CSV row'}
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <div style={{ fontWeight: '700', marginBottom: '0.35rem' }}>Technical Identifiers:</div>
                                                                        <div style={{
                                                                            background: 'hsl(var(--card))',
                                                                            padding: '0.75rem',
                                                                            borderRadius: '8px',
                                                                            border: '1px solid hsl(var(--border))',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '0.25rem'
                                                                        }}>
                                                                            <div><strong>Slug:</strong> {p.slug}</div>
                                                                            <div><strong>Image URL:</strong> <span style={{ wordBreak: 'break-all' }}>{p.image_url || 'None'}</span></div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>

                        {/* Pagination Bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.5rem',
                            background: 'hsl(var(--muted))',
                            borderTop: '1px solid hsl(var(--border))',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            {/* Left: Range Info */}
                            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                                Showing <strong style={{ color: 'hsl(var(--foreground))' }}>{totalFilteredCount === 0 ? 0 : startIndex + 1}</strong> to <strong style={{ color: 'hsl(var(--foreground))' }}>{endIndex}</strong> of <strong style={{ color: 'hsl(var(--foreground))' }}>{totalFilteredCount}</strong> products
                                {selectedCount > 0 && (
                                    <span style={{ marginLeft: '0.75rem', color: '#6366f1', fontWeight: '600' }}>
                                        ({selectedCount} selected for migration)
                                    </span>
                                )}
                            </div>

                            {/* Right: Page Navigation */}
                            {!isShowAll && totalPages > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    {/* First Page */}
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(1)}
                                        disabled={safePage <= 1}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            border: '1px solid hsl(var(--border))',
                                            background: 'hsl(var(--card))',
                                            color: safePage <= 1 ? 'hsl(var(--text-muted))' : 'hsl(var(--foreground))',
                                            cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title="First Page"
                                    >
                                        <ChevronsLeft size={16} />
                                    </button>

                                    {/* Previous Page */}
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(safePage - 1)}
                                        disabled={safePage <= 1}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            border: '1px solid hsl(var(--border))',
                                            background: 'hsl(var(--card))',
                                            color: safePage <= 1 ? 'hsl(var(--text-muted))' : 'hsl(var(--foreground))',
                                            cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title="Previous Page"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    {/* Page Number Chips */}
                                    {(() => {
                                        const pageWindow = [];
                                        const delta = 2;
                                        for (let i = Math.max(1, safePage - delta); i <= Math.min(totalPages, safePage + delta); i++) {
                                            pageWindow.push(i);
                                        }

                                        return pageWindow.map((pNum) => (
                                            <button
                                                key={pNum}
                                                type="button"
                                                onClick={() => handlePageChange(pNum)}
                                                style={{
                                                    minWidth: '32px',
                                                    height: '32px',
                                                    padding: '0 0.4rem',
                                                    borderRadius: '6px',
                                                    border: safePage === pNum ? '1px solid #6366f1' : '1px solid hsl(var(--border))',
                                                    background: safePage === pNum ? '#6366f1' : 'hsl(var(--card))',
                                                    color: safePage === pNum ? '#fff' : 'hsl(var(--foreground))',
                                                    fontWeight: safePage === pNum ? '700' : '500',
                                                    fontSize: '0.82rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {pNum}
                                            </button>
                                        ));
                                    })()}

                                    {/* Next Page */}
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(safePage + 1)}
                                        disabled={safePage >= totalPages}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            border: '1px solid hsl(var(--border))',
                                            background: 'hsl(var(--card))',
                                            color: safePage >= totalPages ? 'hsl(var(--text-muted))' : 'hsl(var(--foreground))',
                                            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title="Next Page"
                                    >
                                        <ChevronRight size={16} />
                                    </button>

                                    {/* Last Page */}
                                    <button
                                        type="button"
                                        onClick={() => handlePageChange(totalPages)}
                                        disabled={safePage >= totalPages}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            border: '1px solid hsl(var(--border))',
                                            background: 'hsl(var(--card))',
                                            color: safePage >= totalPages ? 'hsl(var(--text-muted))' : 'hsl(var(--foreground))',
                                            cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title="Last Page"
                                    >
                                        <ChevronsRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* STEP 3: LIVE EXECUTION PROGRESS & FINAL SUMMARY                    */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Execution Progress Banner */}
                    <div style={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '16px',
                        padding: '2rem',
                        boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    {migrationComplete ? (
                                        <>
                                            <CheckCircle2 size={24} style={{ color: '#10b981' }} /> Migration Completed Successfully!
                                        </>
                                    ) : (
                                        <>
                                            <Loader2 size={24} className="animate-spin" style={{ color: '#6366f1' }} /> Migrating Catalog Products...
                                        </>
                                    )}
                                </h2>
                                <p style={{ margin: 0, color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                                    {migrationComplete
                                        ? `Successfully processed ${executionStats.processed} products with ${executionStats.totalVariantsSaved} size variants into MySQL database.`
                                        : `Processing chunk batches and downloading media images in background...`}
                                </p>
                            </div>

                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: migrationComplete ? '#10b981' : '#6366f1' }}>
                                {executionProgress}%
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{
                            width: '100%',
                            height: '10px',
                            background: 'hsl(var(--muted))',
                            borderRadius: '5px',
                            overflow: 'hidden',
                            marginBottom: '1.75rem'
                        }}>
                            <div style={{
                                width: `${executionProgress}%`,
                                height: '100%',
                                background: migrationComplete ? '#10b981' : 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                                borderRadius: '5px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

                        {/* Execution Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', textAlign: 'center' }}>
                            <div style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{executionStats.processed} / {executionStats.total}</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>Total Processed</div>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{executionStats.inserted}</div>
                                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '0.2rem' }}>New Saree Records</div>
                            </div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#3b82f6' }}>{executionStats.updated}</div>
                                <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '600', marginTop: '0.2rem' }}>Updated Existing</div>
                            </div>
                            <div style={{ background: 'rgba(147, 51, 234, 0.08)', border: '1px solid rgba(147, 51, 234, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#9333ea' }}>{executionStats.totalVariantsSaved}</div>
                                <div style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: '600', marginTop: '0.2rem' }}>Size Variants Saved</div>
                            </div>
                            <div style={{ background: 'hsl(var(--muted))', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{executionStats.skipped}</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>Skipped (Rule)</div>
                            </div>
                            {executionStats.errors > 0 && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{executionStats.errors}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600', marginTop: '0.2rem' }}>Errors</div>
                                </div>
                            )}
                        </div>

                        {/* Navigation / Next Actions */}
                        {migrationComplete && (
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
                                <Link
                                    href="/admin/products"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.85rem 1.5rem',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                        color: '#fff',
                                        fontWeight: '700',
                                        fontSize: '0.95rem',
                                        textDecoration: 'none',
                                        boxShadow: '0 8px 20px -4px rgba(99, 102, 241, 0.4)'
                                    }}
                                >
                                    <Eye size={18} /> View All Products in Catalog
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep(1);
                                        setRawRows([]);
                                        setFileName('');
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.85rem 1.5rem',
                                        borderRadius: '10px',
                                        border: '1px solid hsl(var(--border))',
                                        background: 'hsl(var(--card))',
                                        color: 'hsl(var(--foreground))',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCw size={18} /> Start Another Migration
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Real-time Activity Logs */}
                    <div style={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Database size={18} style={{ color: '#6366f1' }} /> Live Migration Activity Stream
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                Showing recent events ({activityLogs.length})
                            </span>
                        </div>

                        <div style={{
                            maxHeight: '350px',
                            overflowY: 'auto',
                            background: 'hsl(var(--muted))',
                            borderRadius: '10px',
                            padding: '0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            fontFamily: 'monospace',
                            fontSize: '0.78rem'
                        }}>
                            {activityLogs.length === 0 ? (
                                <div style={{ color: 'hsl(var(--text-muted))', padding: '1rem', textAlign: 'center' }}>
                                    Activity logs will appear here once migration starts...
                                </div>
                            ) : (
                                activityLogs.map((log, idx) => {
                                    const isSuccess = log.status === 'INSERTED' || log.status === 'UPDATED';
                                    const isError = log.status === 'ERROR' || log.status === 'FAILED';

                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.4rem 0.6rem',
                                                borderRadius: '6px',
                                                background: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <span style={{ color: 'hsl(var(--text-muted))' }}>[{log.time}]</span>
                                                <span style={{
                                                    fontWeight: '700',
                                                    color: isSuccess ? '#10b981' : (isError ? '#ef4444' : '#64748b')
                                                }}>
                                                    {log.status}
                                                </span>
                                                <span style={{ fontWeight: '600' }}>{log.name}</span>
                                                {log.productNo && (
                                                    <span style={{ color: '#6366f1' }}>(#{log.productNo})</span>
                                                )}
                                            </div>
                                            {log.reason && (
                                                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>
                                                    {log.reason}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
