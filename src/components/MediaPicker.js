'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Upload, Search, Loader2, Image as ImageIcon,
    X, Check, Plus, Grid, List as ListIcon, RefreshCw,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { mysqlClient } from '@/lib/mysqlClient'; // still needed for getPublicUrl
import { parseUploadResponse } from '@/lib/uploadHelper';

export default function MediaPicker({ onSelect, onClose, currentImage, catalogId, multiple = false }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeGroup, setActiveGroup] = useState('all'); // 'all' | 'watermark' | 'no-watermark'
    const [watermarkImages, setWatermarkImages] = useState([]);
    
    // Selection state for multiple mode
    const [selectedUrls, setSelectedUrls] = useState(() => {
        if (!multiple) return [];
        if (Array.isArray(currentImage)) return currentImage;
        if (typeof currentImage === 'string' && currentImage) return [currentImage];
        return [];
    });

    const fileInputRef = useRef(null);
    const gridScrollRef = useRef(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(24);
    const [useExistingWatermark, setUseExistingWatermark] = useState(false);

    const toggleSelect = (url, isWatermarked = false) => {
        if (!multiple) {
            onSelect(url, useExistingWatermark || isWatermarked);
            return;
        }
        setSelectedUrls(prev => {
            const exists = prev.includes(url);
            if (exists) return prev.filter(u => u !== url);
            return [...prev, url];
        });
    };

    const isSelected = (url) => {
        if (!multiple) return currentImage === url;
        return selectedUrls.includes(url);
    };

    const isMountedRef = useRef(true);

    const fetchSettings = async () => {
        try {
            const { data } = await mysqlClient
                .from('app_settings')
                .select('value')
                .eq('key', 'watermark_images')
                .single();
            if (!isMountedRef.current) return;
            if (data?.value) {
                const val = data.value;
                if (Array.isArray(val)) {
                    setWatermarkImages(val.filter(Boolean));
                } else if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
                        try {
                            const parsed = JSON.parse(trimmed);
                            setWatermarkImages(Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed]);
                        } catch (e) {
                            setWatermarkImages([trimmed]);
                        }
                    } else if (trimmed) {
                        setWatermarkImages([trimmed]);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching watermark settings in picker:', err);
        }
    };

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch(`/api/admin/upload?_t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load');
            if (isMountedRef.current) {
                setFiles(data.files || []);
            }
        } catch (err) {
            console.error('Error in MediaPicker:', err);
            if (isMountedRef.current) {
                setFiles([]);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        isMountedRef.current = true;
        fetchFiles();
        fetchSettings();
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Format validation: JPEG, PNG, SVG only
        const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'svg'];
        const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
            alert('Invalid file format. Only JPEG, PNG, and SVG formats are allowed.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // 2. Max 10MB upload size limit
        const maxBytes = 10 * 1024 * 1024; // 10MB
        if (file.size > maxBytes) {
            alert(`File size exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose an image smaller than 10MB.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const formData = new FormData();
            formData.append('file', file);
            if (catalogId) {
                formData.append('catalogId', catalogId);
            }
            if (useExistingWatermark) {
                formData.append('alreadyWatermarked', 'true');
                formData.append('skipDetection', 'true');
                formData.append('requireClean', 'false');
            }

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const data = await parseUploadResponse(res);

            // Refresh the list and select the new image
            await fetchFiles();
            setCurrentPage(1);
            if (multiple) {
                setSelectedUrls(prev => [...prev, data.url]);
            } else {
                onSelect(data.url, useExistingWatermark);
            }
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeGroup, itemsPerPage]);

    const filteredFiles = files.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        const isWm = f.folder === 'with-watermark' || watermarkImages.includes(f.url);
        if (activeGroup === 'watermark') return isWm;
        if (activeGroup === 'no-watermark') return !isWm;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredFiles.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredFiles.length);
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        const next = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(next);
        if (gridScrollRef.current) {
            gridScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        if (safeCurrentPage <= 4) {
            pages.push(1, 2, 3, 4, 5, '...', totalPages);
        } else if (safeCurrentPage >= totalPages - 3) {
            pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
        }
        return pages;
    };

    return (
        <div
            className="drawer-overlay"
            style={{
                zIndex: 999999,
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'stretch'
            }}
            onClick={onClose}
        >
            <div
                className="drawer-box"
                style={{
                    width: '75%',
                    minWidth: '320px',
                    height: '100vh',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    border: 'none',
                    borderLeft: '1px solid #e2e8f0',
                    borderTopLeftRadius: '24px',
                    borderBottomLeftRadius: '24px',
                    zIndex: 1000000,
                    position: 'relative',
                    boxShadow: '-16px 0 50px rgba(0, 0, 0, 0.2)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Compact Header */}
                <div style={{
                    padding: '1rem 2rem',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#ffffff',
                    gap: '1rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: 'hsl(var(--text-main))' }}>
                            {multiple ? `Select Images (${selectedUrls.length})` : 'Select Image'}
                        </h2>
                        <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '3px 9px',
                            borderRadius: '6px'
                        }}>
                            {files.length} assets
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                            JPEG, PNG, SVG • Max 10MB
                        </span>
                    </div>

                    {/* Actions: Upload + Refresh + Close */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-primary"
                            disabled={uploading}
                            style={{
                                padding: '0 1.15rem',
                                borderRadius: '10px',
                                height: '38px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.825rem',
                                fontWeight: 700
                            }}
                        >
                            {uploading ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                            {uploading ? 'Uploading...' : 'Upload New'}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            style={{ display: 'none' }}
                            accept=".jpg, .jpeg, .png, .svg, image/jpeg, image/png, image/svg+xml"
                        />
                        <button
                            onClick={fetchFiles}
                            className="btn-icon"
                            title="Refresh Library"
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onClose}
                            className="btn-icon danger"
                            title="Close Drawer"
                            style={{ width: '38px', height: '38px', borderRadius: '10px' }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Compact Toolbar / Filters */}
                <div style={{
                    padding: '0.75rem 2rem',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                }}>
                    {/* Left: Search input & Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', flex: 1, minWidth: '320px' }}>
                        <div style={{ position: 'relative', width: '260px', minWidth: '200px' }}>
                            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Search library..."
                                style={{
                                    width: '100%',
                                    padding: '0.45rem 0.85rem 0.45rem 2.4rem',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    outline: 'none',
                                    fontSize: '0.825rem',
                                    fontWeight: 500,
                                    color: '#1e293b'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div style={{
                            display: 'inline-flex',
                            background: '#e2e8f0',
                            padding: '3px',
                            borderRadius: '10px',
                            gap: '2px'
                        }}>
                            {[
                                { id: 'all', label: 'All Images', count: files.length },
                                { id: 'watermark', label: 'With Watermark', count: files.filter(f => f.folder === 'with-watermark' || watermarkImages.includes(f.url)).length },
                                { id: 'no-watermark', label: 'Without Watermark', count: files.filter(f => f.folder !== 'with-watermark' && !watermarkImages.includes(f.url)).length }
                            ].map(tab => {
                                const isActive = activeGroup === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveGroup(tab.id)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: isActive ? 800 : 700,
                                            background: isActive ? 'hsl(var(--primary))' : 'transparent',
                                            color: isActive ? '#ffffff' : '#64748b',
                                            transition: 'all 0.15s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        <span>{tab.label}</span>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                                            color: isActive ? '#ffffff' : '#64748b',
                                            padding: '1px 5px',
                                            borderRadius: '5px'
                                        }}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Watermark Checkbox */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: useExistingWatermark ? '#f0fdf4' : '#ffffff',
                        border: useExistingWatermark ? '1px solid #86efac' : '1px solid #cbd5e1',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: useExistingWatermark ? '#15803d' : '#475569',
                        whiteSpace: 'nowrap',
                        userSelect: 'none'
                    }}>
                        <input
                            type="checkbox"
                            checked={useExistingWatermark}
                            onChange={(e) => setUseExistingWatermark(e.target.checked)}
                            style={{ accentColor: '#16a34a', cursor: 'pointer', width: '14px', height: '14px' }}
                        />
                        <span>Use existing watermark image</span>
                    </label>
                </div>

                {/* Grid */}
                <div ref={gridScrollRef} style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem' }}>
                            <Loader2 className="animate-spin" size={48} color="hsl(var(--primary))" />
                            <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '1.1rem' }}>Accessing Media Library...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.4 }}>
                            <ImageIcon size={64} style={{ marginBottom: '1.5rem', strokeWidth: 1 }} />
                            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No images found in this category.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '2rem' }}>
                            {paginatedFiles.map((file, idx) => {
                                const itemKey = file.id || file.url || (file.folder && file.name ? `${file.folder}-${file.name}` : `media-${idx}`);
                                const isItemWatermarked = file.folder === 'with-watermark' || watermarkImages.includes(file.url);
                                return (
                                    <div
                                        key={itemKey}
                                        style={{
                                            aspectRatio: '1/1.2', borderRadius: '20px', overflow: 'hidden',
                                            cursor: 'pointer', position: 'relative', 
                                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            border: '4px solid transparent',
                                            borderColor: isSelected(file.url) ? 'hsl(var(--primary))' : 'transparent',
                                            boxShadow: isSelected(file.url) ? '0 12px 30px rgba(0,0,0,0.15)' : '0 4px 15px rgba(0,0,0,0.05)',
                                            transform: isSelected(file.url) ? 'scale(1.02)' : 'scale(1)'
                                        }}
                                        onClick={() => toggleSelect(file.url, isItemWatermarked)}
                                    >
                                        <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        {isItemWatermarked && (
                                            <div style={{
                                                position: 'absolute', top: '8px', left: '8px',
                                                background: 'rgba(15, 23, 42, 0.85)', color: '#38bdf8',
                                                borderRadius: '6px', padding: '3px 7px',
                                                fontSize: '0.62rem', fontWeight: 800,
                                                backdropFilter: 'blur(4px)',
                                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                                letterSpacing: '0.04em'
                                            }}>
                                                WATERMARKED
                                            </div>
                                        )}
                                        {file.catalogId && (
                                            <div style={{
                                                position: 'absolute', bottom: '10px', left: '10px',
                                                background: 'rgba(0,0,0,0.8)', color: 'white',
                                                borderRadius: '6px', padding: '4px 8px',
                                                fontSize: '0.65rem', fontWeight: 800, fontFamily: 'var(--font-roboto)',
                                                backdropFilter: 'blur(4px)',
                                                border: '1px solid rgba(255,255,255,0.2)'
                                            }}>
                                                {file.catalogId}
                                            </div>
                                        )}
                                        {isSelected(file.url) && (
                                            <div style={{
                                                position: 'absolute', top: '10px', right: '10px',
                                                background: 'hsl(var(--primary))', color: 'white',
                                                borderRadius: '50%', width: '28px', height: '28px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                            }}>
                                                <Check size={16} strokeWidth={4} />
                                            </div>
                                        )}
                                        <div className="img-overlay" style={{
                                            position: 'absolute', inset: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)',
                                            opacity: 0, transition: '0.2s'
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.25rem 2.5rem',
                    borderTop: '1px solid hsl(var(--border-subtle))',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    {/* Left: Info & per-page selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>
                            {filteredFiles.length === 0 ? (
                                '0 images'
                            ) : (
                                <>
                                    Showing <strong style={{ color: '#0f172a' }}>{startIndex + 1}–{endIndex}</strong> of <strong style={{ color: '#0f172a' }}>{filteredFiles.length}</strong> images
                                </>
                            )}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.775rem', color: '#94a3b8', fontWeight: 600 }}>Per page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                }}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value={18}>18</option>
                                <option value={24}>24</option>
                                <option value={48}>48</option>
                                <option value={96}>96</option>
                            </select>
                        </div>
                    </div>

                    {/* Center: Pagination controls */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(1)}
                                disabled={safeCurrentPage === 1}
                                title="First Page"
                                aria-label="First Page"
                            >
                                <ChevronsLeft size={16} />
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(safeCurrentPage - 1)}
                                disabled={safeCurrentPage === 1}
                                title="Previous Page"
                                aria-label="Previous Page"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            {getPageNumbers().map((p, idx) => (
                                p === '...' ? (
                                    <span key={`dots-${idx}`} className="pagination-ellipsis">…</span>
                                ) : (
                                    <button
                                        key={`page-${p}`}
                                        className={`pagination-btn ${safeCurrentPage === p ? 'active' : ''}`}
                                        onClick={() => handlePageChange(p)}
                                    >
                                        {p}
                                    </button>
                                )
                            ))}

                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(safeCurrentPage + 1)}
                                disabled={safeCurrentPage === totalPages}
                                title="Next Page"
                                aria-label="Next Page"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(totalPages)}
                                disabled={safeCurrentPage === totalPages}
                                title="Last Page"
                                aria-label="Last Page"
                            >
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Right: Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: totalPages > 1 ? 0 : 'auto' }}>
                        <button onClick={onClose} className="btn modal-btn-secondary" style={{ padding: '0.65rem 1.5rem', borderRadius: '12px' }}>
                            Close Library
                        </button>
                        <button 
                            onClick={() => { 
                                if (multiple) {
                                    onSelect(selectedUrls);
                                } else if (currentImage) {
                                    onSelect(currentImage); 
                                }
                                onClose(); 
                            }} 
                            className="btn modal-btn-primary" 
                            style={{ padding: '0.65rem 2rem', borderRadius: '12px' }}
                        >
                            Confirm Selection {multiple && selectedUrls.length > 0 && `(${selectedUrls.length})`}
                        </button>
                    </div>
                </div>
            </div>
            <style jsx>{`
                .drawer-overlay {
                    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .drawer-box {
                    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @media (max-width: 900px) {
                    .drawer-box {
                        width: 100% !important;
                        border-radius: 0 !important;
                    }
                }
                img:hover + .img-overlay { opacity: 1; }
                .pagination-btn {
                    min-width: 34px;
                    height: 34px;
                    padding: 0 8px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    color: #475569;
                    font-size: 0.825rem;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .pagination-btn:hover:not(:disabled) {
                    background: #f1f5f9;
                    border-color: #cbd5e1;
                    color: #0f172a;
                }
                .pagination-btn.active {
                    background: hsl(var(--primary));
                    color: #ffffff;
                    border-color: hsl(var(--primary));
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }
                .pagination-btn:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                    background: #f8fafc;
                }
                .pagination-ellipsis {
                    min-width: 28px;
                    height: 34px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #94a3b8;
                    font-size: 0.825rem;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}
