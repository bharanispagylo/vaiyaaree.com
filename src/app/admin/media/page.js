'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Upload, Trash2, Search, Loader2, Image as ImageIcon,
    X, Check, Copy, Grid, List as ListIcon, RefreshCw, Plus,
    Star, Layout, Droplets, Sparkles, ZoomIn, CheckSquare, Square,
    AlertTriangle
} from 'lucide-react';
import { mysqlClient } from '@/lib/mysqlClient';

export default function MediaLibraryPage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedUrls, setSelectedUrls] = useState([]); // Array of selected image URLs for multi-select
    const [notification, setNotification] = useState(null);
    const [heroImages, setHeroImages] = useState([]);
    const [galleryImages, setGalleryImages] = useState([]);
    const [watermarkImages, setWatermarkImages] = useState([]);
    const [noWatermarkImages, setNoWatermarkImages] = useState([]);
    const [activeGroup, setActiveGroup] = useState('all'); // 'all' | 'watermark' | 'no-watermark'
    const [analyzing, setAnalyzing] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { type, title, message, onConfirm, isDanger }
    const fileInputRef = useRef(null);

    const formatFileSize = (bytes) => {
        if (bytes == null || !Number.isFinite(Number(bytes)) || Number(bytes) <= 0) {
            return '—';
        }
        const size = Number(bytes);
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        if (size < 1024 * 1024 * 1024) {
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        }
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch('/api/admin/upload', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to load');
            const normalized = (data.files || []).map(f => ({
                ...f,
                size: f.size ?? f.metadata?.size ?? 0,
                metadata: f.metadata || { size: f.size ?? 0 }
            }));
            setFiles(normalized);
            // Prune selectedUrls that no longer exist
            setSelectedUrls(prev => prev.filter(u => normalized.some(file => file.url === u)));
        } catch (err) {
            console.error('Error fetching media:', err);
            setNotification({ message: 'Failed to load media library: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const parseSettingImages = (value) => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map(s => typeof s === 'string' ? s.trim() : s).filter(Boolean);
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return [];
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed.map(s => typeof s === 'string' ? s.trim() : s).filter(Boolean);
                    if (typeof parsed === 'string' && parsed) return [parsed.trim()];
                } catch (e) {
                    return trimmed.includes(',') ? trimmed.split(',').map(s => s.trim()).filter(Boolean) : [trimmed];
                }
            }
            if (trimmed.includes(',')) {
                return trimmed.split(',').map(s => s.trim()).filter(Boolean);
            }
            return [trimmed];
        }
        return [];
    };

    const fetchSettings = async () => {
        try {
            const { data: heroData } = await mysqlClient.from('app_settings').select('value').eq('key', 'hero_slider_images').single();
            const { data: galleryData } = await mysqlClient.from('app_settings').select('value').eq('key', 'gallery_images').single();
            const { data: wmData } = await mysqlClient.from('app_settings').select('value').eq('key', 'watermark_images').single();
            const { data: noWmData } = await mysqlClient.from('app_settings').select('value').eq('key', 'no_watermark_images').single();

            setHeroImages(parseSettingImages(heroData?.value));
            setGalleryImages(parseSettingImages(galleryData?.value));
            setWatermarkImages(parseSettingImages(wmData?.value));
            setNoWatermarkImages(parseSettingImages(noWmData?.value));
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    useEffect(() => {
        fetchFiles();
        fetchSettings();
    }, []);

    const updateSetting = async (key, newValue) => {
        try {
            const { error } = await mysqlClient
                .from('app_settings')
                .upsert({ key, value: JSON.stringify(newValue), updated_at: new Date() });
            if (error) throw error;
        } catch (err) {
            console.error(`Error updating ${key}:`, err);
            setNotification({ message: `Failed to update ${key}`, type: 'error' });
        }
    };

    const toggleHero = async (url) => {
        const newHero = heroImages.includes(url)
            ? heroImages.filter(u => u !== url)
            : [...heroImages, url];
        setHeroImages(newHero);
        await updateSetting('hero_slider_images', newHero);
        setNotification({
            message: heroImages.includes(url) ? 'Removed from Hero Slider' : 'Added to Hero Slider',
            type: 'success'
        });
    };

    const toggleGallery = async (url) => {
        const newGallery = galleryImages.includes(url)
            ? galleryImages.filter(u => u !== url)
            : [...galleryImages, url];
        setGalleryImages(newGallery);
        await updateSetting('gallery_images', newGallery);
        setNotification({
            message: galleryImages.includes(url) ? 'Removed from Gallery' : 'Added to Gallery',
            type: 'success'
        });
    };

    // Multi-Select Handlers
    const toggleSelectUrl = (url, e) => {
        if (e) e.stopPropagation();
        setSelectedUrls(prev => 
            prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
        );
    };

    const handleSelectAll = () => {
        const visibleUrls = filteredFiles.map(f => f.url);
        const allSelected = visibleUrls.every(u => selectedUrls.includes(u));
        if (allSelected) {
            // Deselect visible
            setSelectedUrls(prev => prev.filter(u => !visibleUrls.includes(u)));
        } else {
            // Select all visible
            setSelectedUrls(prev => [...new Set([...prev, ...visibleUrls])]);
        }
    };

    const clearSelection = () => {
        setSelectedUrls([]);
    };

    const handleUpload = async (e) => {
        const uploadedFiles = Array.from(e.target.files || []);
        if (uploadedFiles.length === 0) return;

        setUploading(true);
        let successCount = 0;
        const token = localStorage.getItem('cast_prince_admin') || '';

        try {
            for (const file of uploadedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('mode', 'gallery');

                const res = await fetch('/api/admin/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                const data = await res.json();
                if (res.ok) {
                    successCount++;
                }
            }

            setNotification({ 
                message: `Successfully uploaded ${successCount} image(s).`, 
                type: 'success' 
            });
            fetchFiles();
            fetchSettings();
        } catch (err) {
            console.error('Upload error:', err);
            setNotification({ message: 'Upload error: ' + err.message, type: 'error' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Single Image Delete
    const handleDeleteSingle = (file) => {
        const fileNameToDisplay = file.name || file.url.split('/').pop();
        setConfirmAction({
            type: 'delete',
            isDanger: true,
            title: 'Delete Image?',
            message: `Are you sure you want to permanently delete "${fileNameToDisplay}" from the server? This action cannot be undone.`,
            onConfirm: async () => {
                setConfirmAction(null);
                setDeleting(true);
                try {
                    const token = localStorage.getItem('cast_prince_admin') || '';
                    const res = await fetch('/api/admin/upload', {
                        method: 'DELETE',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ 
                            url: file.url,
                            fileName: file.name,
                            fileNames: [file.name, file.url]
                        }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to delete image');

                    // Clean local state
                    setFiles(prev => prev.filter(f => f.url !== file.url));
                    setSelectedUrls(prev => prev.filter(u => u !== file.url));
                    if (selectedFile?.url === file.url) setSelectedFile(null);

                    // Update collections
                    setHeroImages(prev => prev.filter(u => u !== file.url));
                    setGalleryImages(prev => prev.filter(u => u !== file.url));
                    setWatermarkImages(prev => prev.filter(u => u !== file.url));
                    setNoWatermarkImages(prev => prev.filter(u => u !== file.url));

                    setNotification({ message: 'Image deleted successfully', type: 'success' });
                    fetchFiles();
                } catch (err) {
                    console.error('Delete error:', err);
                    setNotification({ message: 'Delete failed: ' + err.message, type: 'error' });
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    // Bulk Delete Multiple Images
    const handleDeleteSelected = () => {
        if (selectedUrls.length === 0) return;

        setConfirmAction({
            type: 'delete-multiple',
            isDanger: true,
            title: `Delete ${selectedUrls.length} Image(s)?`,
            message: `Are you sure you want to permanently delete all ${selectedUrls.length} selected images from the server? This action cannot be undone.`,
            onConfirm: async () => {
                setConfirmAction(null);
                setDeleting(true);
                try {
                    const token = localStorage.getItem('cast_prince_admin') || '';
                    const res = await fetch('/api/admin/upload', {
                        method: 'DELETE',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ 
                            urls: selectedUrls,
                            fileNames: selectedUrls
                        }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to delete selected images');

                    const deletedCount = data.deletedCount ?? selectedUrls.length;

                    // Clean local state
                    const deletedSet = new Set(selectedUrls);
                    setFiles(prev => prev.filter(f => !deletedSet.has(f.url)));
                    setSelectedUrls([]);
                    if (selectedFile && deletedSet.has(selectedFile.url)) setSelectedFile(null);

                    // Update collections
                    setHeroImages(prev => prev.filter(u => !deletedSet.has(u)));
                    setGalleryImages(prev => prev.filter(u => !deletedSet.has(u)));
                    setWatermarkImages(prev => prev.filter(u => !deletedSet.has(u)));
                    setNoWatermarkImages(prev => prev.filter(u => !deletedSet.has(u)));

                    setNotification({ 
                        message: `Successfully deleted ${deletedCount} image(s).`, 
                        type: 'success' 
                    });
                    fetchFiles();
                } catch (err) {
                    console.error('Bulk delete error:', err);
                    setNotification({ message: 'Delete failed: ' + err.message, type: 'error' });
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    // Bulk Assign to Hero / Gallery
    const handleBulkAssignHero = async () => {
        if (selectedUrls.length === 0) return;
        const newHero = [...new Set([...heroImages, ...selectedUrls])];
        setHeroImages(newHero);
        await updateSetting('hero_slider_images', newHero);
        setNotification({ message: `Added ${selectedUrls.length} image(s) to Hero Slider`, type: 'success' });
    };

    const handleBulkAssignGallery = async () => {
        if (selectedUrls.length === 0) return;
        const newGallery = [...new Set([...galleryImages, ...selectedUrls])];
        setGalleryImages(newGallery);
        await updateSetting('gallery_images', newGallery);
        setNotification({ message: `Added ${selectedUrls.length} image(s) to Gallery`, type: 'success' });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setNotification({ message: 'Link copied to clipboard', type: 'success' });
    };

    const filteredFiles = files.filter(f => {
        const matchesSearch = !searchTerm || 
            (f.name && f.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (f.url && f.url.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (f.catalogId && String(f.catalogId).toLowerCase().includes(searchTerm.toLowerCase()));
        if (!matchesSearch) return false;

        const isWm = Boolean(f.hasWatermark || f.has_watermark || watermarkImages.includes(f.url) || (f.folder && f.folder.includes('with-watermark')));
        if (activeGroup === 'watermark') {
            return isWm;
        } else if (activeGroup === 'no-watermark') {
            return !isWm;
        }
        return true;
    });

    const actualWatermarkCount = files.filter(f => Boolean(f.hasWatermark || f.has_watermark || watermarkImages.includes(f.url) || (f.folder && f.folder.includes('with-watermark')))).length;
    const actualNoWatermarkCount = files.filter(f => !Boolean(f.hasWatermark || f.has_watermark || watermarkImages.includes(f.url) || (f.folder && f.folder.includes('with-watermark')))).length;
    
    const isAllVisibleSelected = filteredFiles.length > 0 && filteredFiles.every(f => selectedUrls.includes(f.url));
    const isSomeVisibleSelected = filteredFiles.some(f => selectedUrls.includes(f.url));

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    return (
        <>
            <div className="animate-enter" style={{ padding: '0.5rem' }}>
                {/* Header */}
                <div className="admin-header-row" style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                            <ImageIcon size={28} style={{ color: 'hsl(var(--primary))' }} />
                            Media Library
                        </h1>
                        <p style={{ margin: '0.35rem 0 0', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                            Manage, multi-select, and upload your product & boutique visuals
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-primary"
                            disabled={uploading}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 1.4rem', borderRadius: '10px' }}
                        >
                            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            {uploading ? 'Uploading...' : 'Upload Images'}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            style={{ display: 'none' }}
                            accept="image/*"
                            multiple
                        />
                    </div>
                </div>

                {/* Floating Multi-Select Action Bar (when images are selected) */}
                {selectedUrls.length > 0 && (
                    <div style={{
                        background: 'linear-gradient(135deg, #27302b 0%, #1a221e 100%)',
                        color: '#ffffff',
                        padding: '0.85rem 1.5rem',
                        borderRadius: '16px',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                        border: '1px solid rgba(212, 122, 6, 0.4)',
                        animation: 'slideInDown 0.25s ease-out'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ 
                                width: '32px', height: '32px', borderRadius: '50%', 
                                background: '#d47a06', color: '#ffffff', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: '0.85rem'
                            }}>
                                {selectedUrls.length}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {selectedUrls.length} image{selectedUrls.length > 1 ? 's' : ''} selected
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>•</span>
                            <button
                                onClick={handleSelectAll}
                                style={{
                                    background: 'none', border: 'none', color: '#dfaa5b',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                                    textDecoration: 'underline'
                                }}
                            >
                                {isAllVisibleSelected ? 'Deselect All' : `Select All (${filteredFiles.length})`}
                            </button>
                            <button
                                onClick={clearSelection}
                                style={{
                                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem'
                                }}
                            >
                                Clear Selection
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                            <button
                                onClick={handleBulkAssignHero}
                                className="btn btn-secondary"
                                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <Star size={14} /> Add to Hero ({selectedUrls.length})
                            </button>
                            <button
                                onClick={handleBulkAssignGallery}
                                className="btn btn-secondary"
                                style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <Layout size={14} /> Add to Gallery ({selectedUrls.length})
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                disabled={deleting}
                                style={{
                                    background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.55rem 1.25rem',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    fontSize: '0.84rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 15px rgba(225, 29, 72, 0.4)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                <span>Delete Selected ({selectedUrls.length})</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Notification */}
                {notification && (
                    <div style={{
                        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
                        padding: '1rem 1.5rem', borderRadius: '12px',
                        background: notification.type === 'success' ? '#10b981' : '#e11d48',
                        color: 'white', fontWeight: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        animation: 'slideInRight 0.3s ease-out'
                    }}>
                        {notification.type === 'success' ? <Check size={18} /> : <X size={18} />}
                        {notification.message}
                    </div>
                )}

                {/* Toolbar with Group Tabs & Multi-Select master toggle */}
                <div className="card" style={{ padding: '1rem', marginBottom: '1.75rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <input
                                type="text"
                                placeholder="Search images by name or catalog ID..."
                                className="admin-input"
                                style={{ paddingLeft: '3rem', width: '100%' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Select All Toggle Button */}
                        <button
                            onClick={handleSelectAll}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0.55rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid hsl(var(--border-subtle))',
                                background: isAllVisibleSelected ? '#27302b' : '#ffffff',
                                color: isAllVisibleSelected ? '#ffffff' : '#27302b',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isAllVisibleSelected ? <CheckSquare size={16} color="#d47a06" /> : isSomeVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            <span>{isAllVisibleSelected ? 'Deselect All' : 'Select All'}</span>
                        </button>

                        {/* View Mode Switcher */}
                        <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '10px' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: '0.45rem 0.65rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: viewMode === 'grid' ? '#27302b' : 'transparent',
                                    color: viewMode === 'grid' ? '#ffffff' : 'hsl(var(--text-muted))'
                                }}
                                title="Grid View"
                            >
                                <Grid size={17} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '0.45rem 0.65rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: viewMode === 'list' ? '#27302b' : 'transparent',
                                    color: viewMode === 'list' ? '#ffffff' : 'hsl(var(--text-muted))'
                                }}
                                title="List View"
                            >
                                <ListIcon size={17} />
                            </button>
                            <button
                                onClick={() => { fetchFiles(); fetchSettings(); }}
                                style={{
                                    padding: '0.45rem 0.65rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    background: 'transparent', color: 'hsl(var(--text-muted))'
                                }}
                                title="Refresh"
                            >
                                <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Group Filter Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            onClick={() => setActiveGroup('all')}
                            style={{
                                padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: activeGroup === 'all' ? '#27302b' : 'transparent',
                                color: activeGroup === 'all' ? 'white' : 'hsl(var(--text-muted))',
                                fontWeight: activeGroup === 'all' ? 700 : 500,
                                transition: 'all 0.2s', fontSize: '0.82rem'
                            }}
                        >
                            All Images ({files.length})
                        </button>
                        <button
                            onClick={() => setActiveGroup('watermark')}
                            style={{
                                padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: activeGroup === 'watermark' ? '#0284c7' : 'transparent',
                                color: activeGroup === 'watermark' ? 'white' : 'hsl(var(--text-muted))',
                                fontWeight: activeGroup === 'watermark' ? 700 : 500,
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem'
                            }}
                        >
                            <Droplets size={14} /> With Watermark ({actualWatermarkCount})
                        </button>
                        <button
                            onClick={() => setActiveGroup('no-watermark')}
                            style={{
                                padding: '0.45rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: activeGroup === 'no-watermark' ? '#059669' : 'transparent',
                                color: activeGroup === 'no-watermark' ? 'white' : 'hsl(var(--text-muted))',
                                fontWeight: activeGroup === 'no-watermark' ? 700 : 500,
                                transition: 'all 0.2s', fontSize: '0.82rem'
                            }}
                        >
                            Without Watermark ({actualNoWatermarkCount})
                        </button>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem' }}>
                        <Loader2 className="animate-spin" size={40} style={{ color: '#a06650' }} />
                        <p className="text-muted">Loading media library...</p>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem', background: '#ffffff', borderRadius: '20px', border: '2px dashed hsl(var(--border-subtle))' }}>
                        <ImageIcon size={48} className="text-muted" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ margin: 0 }}>No images found</h3>
                        <p className="text-muted">Upload your first image to get started</p>
                        <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
                            <Plus size={18} /> Upload Now
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                        {filteredFiles.map((file) => {
                            const isSelected = selectedUrls.includes(file.url);
                            return (
                                <div
                                    key={file.id || file.url}
                                    className="card"
                                    style={{
                                        padding: '0.75rem', borderRadius: '16px', position: 'relative', overflow: 'hidden',
                                        border: isSelected 
                                            ? '2px solid #a06650' 
                                            : selectedFile?.url === file.url 
                                            ? '2px solid #27302b' 
                                            : '1px solid hsl(var(--border-subtle))',
                                        background: isSelected ? 'rgba(160, 102, 80, 0.04)' : '#ffffff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isSelected ? '0 8px 25px rgba(160, 102, 80, 0.18)' : '0 2px 8px rgba(0,0,0,0.04)'
                                    }}
                                    onClick={() => setSelectedFile(file)}
                                >
                                    {/* Multi-Select Checkbox Top-Left */}
                                    <div
                                        onClick={(e) => toggleSelectUrl(file.url, e)}
                                        style={{
                                            position: 'absolute', top: '0.75rem', left: '0.75rem',
                                            zIndex: 12, cursor: 'pointer',
                                            background: isSelected ? '#a06650' : 'rgba(255, 255, 255, 0.95)',
                                            color: isSelected ? '#ffffff' : '#27302b',
                                            width: '28px', height: '28px', borderRadius: '8px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                                            border: isSelected ? 'none' : '1.5px solid #cbd5e1',
                                            transition: 'all 0.2s ease'
                                        }}
                                        title={isSelected ? "Deselect" : "Select"}
                                    >
                                        {isSelected ? <Check size={16} strokeWidth={3} /> : <Square size={14} color="#64748b" />}
                                    </div>

                                    {/* Thumbnail */}
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setZoomedImage(file); }}
                                        style={{
                                            aspectRatio: '1/1', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem',
                                            cursor: 'zoom-in', position: 'relative'
                                        }}
                                        title="Click to zoom"
                                    >
                                        <img
                                            src={file.url}
                                            alt={file.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div style={{
                                            position: 'absolute', bottom: '0.5rem', right: '0.5rem',
                                            background: 'rgba(255,255,255,0.85)', borderRadius: '50%',
                                            padding: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <ZoomIn size={15} color="#333" />
                                        </div>
                                    </div>

                                    {/* File info */}
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#27302b' }}>
                                        {file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'image.jpg'}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
                                        {formatFileSize(file.size ?? file.metadata?.size)} • {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Recent'}
                                    </div>

                                    {/* Action Buttons Top-Right */}
                                    <div style={{
                                        position: 'absolute', top: '0.75rem', right: '0.75rem', display: 'flex', gap: '0.35rem',
                                        zIndex: 10
                                    }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleHero(file.url); }}
                                            style={{ 
                                                padding: '0.4rem', borderRadius: '6px', border: 'none', 
                                                background: heroImages.includes(file.url) ? '#d47a06' : 'rgba(255,255,255,0.92)', 
                                                color: heroImages.includes(file.url) ? 'white' : '#64748b', 
                                                cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                            }}
                                            title={heroImages.includes(file.url) ? "Remove from Hero" : "Add to Hero"}
                                        >
                                            <Star size={13} fill={heroImages.includes(file.url) ? "white" : "none"} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleGallery(file.url); }}
                                            style={{ 
                                                padding: '0.4rem', borderRadius: '6px', border: 'none', 
                                                background: galleryImages.includes(file.url) ? '#a06650' : 'rgba(255,255,255,0.92)', 
                                                color: galleryImages.includes(file.url) ? 'white' : '#64748b', 
                                                cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                            }}
                                            title={galleryImages.includes(file.url) ? "Remove from Gallery" : "Add to Gallery"}
                                        >
                                            <Layout size={13} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(file.url); }}
                                            style={{ 
                                                padding: '0.4rem', borderRadius: '6px', border: 'none', 
                                                background: 'rgba(255,255,255,0.92)', color: '#27302b', cursor: 'pointer',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)' 
                                            }}
                                            title="Copy Link"
                                        >
                                            <Copy size={13} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSingle(file);
                                            }}
                                            style={{ 
                                                padding: '0.4rem', borderRadius: '6px', border: 'none', 
                                                background: 'rgba(255,255,255,0.92)', color: '#e11d48', cursor: 'pointer',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                                            }}
                                            title="Delete Image"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List View with Checkbox Column */
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', padding: '0.75rem 1rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={isAllVisibleSelected}
                                            onChange={handleSelectAll}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                        />
                                    </th>
                                    <th style={{ width: '60px' }}>Preview</th>
                                    <th>Name</th>
                                    <th>Size</th>
                                    <th>Usage</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFiles.map((file) => {
                                    const isSelected = selectedUrls.includes(file.url);
                                    return (
                                        <tr 
                                            key={file.id || file.url} 
                                            onClick={() => setSelectedFile(file)} 
                                            style={{ 
                                                cursor: 'pointer', 
                                                background: isSelected ? 'rgba(160, 102, 80, 0.05)' : 'transparent',
                                                transition: 'background 0.2s' 
                                            }}
                                        >
                                            <td style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => toggleSelectUrl(file.url, e)}
                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                />
                                            </td>
                                            <td>
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); setZoomedImage(file); }}
                                                    style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in' }}
                                                    title="Click to zoom"
                                                >
                                                    <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 700, fontSize: '0.85rem', color: '#27302b' }}>
                                                {file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'image.jpg'}
                                            </td>
                                            <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>
                                                {formatFileSize(file.size ?? file.metadata?.size)}
                                            </td>
                                            <td style={{ minWidth: '180px' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); toggleHero(file.url); }} className={`btn ${heroImages.includes(file.url) ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Star size={12} /> {heroImages.includes(file.url) ? 'In Hero' : 'To Hero'}
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); toggleGallery(file.url); }} className={`btn ${galleryImages.includes(file.url) ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Layout size={12} /> {galleryImages.includes(file.url) ? 'In Gallery' : 'To Gallery'}
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(file.url); }} className="btn btn-secondary" style={{ padding: '0.45rem' }} title="Copy URL">
                                                        <Copy size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSingle(file);
                                                        }} 
                                                        className="btn btn-secondary" 
                                                        style={{ padding: '0.45rem', color: '#e11d48' }}
                                                        title="Delete Image"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Selected File Details Footer (Single selection inspect) */}
                {selectedFile && selectedUrls.length === 0 && (
                    <div style={{
                        position: 'fixed', bottom: 0, left: 0, right: 0,
                        background: '#ffffff', borderTop: '2px solid #ebdcd0',
                        padding: '1rem 2rem', zIndex: 100, display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', boxShadow: '0 -10px 30px rgba(0,0,0,0.08)',
                        animation: 'slideInUp 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <img src={selectedFile.url} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #ebdcd0' }} />
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#27302b' }}>{selectedFile.name ? selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'Image'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{selectedFile.url}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                            <button onClick={() => toggleHero(selectedFile.url)} className={`btn ${heroImages.includes(selectedFile.url) ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}>
                                {heroImages.includes(selectedFile.url) ? 'Remove Hero' : 'Hero Slider'}
                            </button>
                            <button onClick={() => toggleGallery(selectedFile.url)} className={`btn ${galleryImages.includes(selectedFile.url) ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}>
                                {galleryImages.includes(selectedFile.url) ? 'Remove Gallery' : 'Gallery'}
                            </button>
                            <button onClick={() => handleDeleteSingle(selectedFile)} className="btn btn-secondary" style={{ padding: '0.5rem 0.85rem', color: '#e11d48' }}>
                                <Trash2 size={14} /> Delete
                            </button>
                            <div style={{ width: '1px', height: '24px', background: 'hsl(var(--border-subtle))', margin: '0 0.5rem' }}></div>
                            <button onClick={() => setSelectedFile(null)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Close</button>
                            <button onClick={() => copyToClipboard(selectedFile.url)} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Copy URL</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Action Modal */}
            {confirmAction && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
                    zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }} onClick={() => setConfirmAction(null)}>
                    <div className="card shadow-premium animate-enter" style={{
                        width: '100%', maxWidth: '440px', padding: '2.5rem', textAlign: 'center',
                        borderRadius: '24px', background: '#ffffff',
                        border: `1px solid ${confirmAction.isDanger ? 'rgba(225, 29, 72, 0.3)' : 'rgba(160, 102, 80, 0.3)'}`
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: '76px', height: '76px', borderRadius: '50%',
                            background: confirmAction.isDanger ? 'rgba(225, 29, 72, 0.1)' : 'rgba(160, 102, 80, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
                            color: confirmAction.isDanger ? '#e11d48' : '#a06650'
                        }}>
                            {confirmAction.isDanger ? <Trash2 size={38} /> : <AlertTriangle size={38} />}
                        </div>
                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.35rem', fontWeight: 800, color: '#27302b' }}>
                            {confirmAction.title}
                        </h3>
                        <p style={{ margin: '0 0 2rem', color: '#64748b', lineHeight: 1.6, fontSize: '0.92rem' }}>
                            {confirmAction.message}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={() => setConfirmAction(null)} 
                                className="btn btn-secondary" 
                                style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', fontWeight: 700 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction.onConfirm}
                                className="btn btn-primary"
                                style={{
                                    flex: 1, padding: '0.85rem', borderRadius: '12px', fontWeight: 800,
                                    background: confirmAction.isDanger ? '#e11d48' : '#a06650',
                                    border: 'none', color: '#ffffff',
                                    boxShadow: confirmAction.isDanger ? '0 4px 15px rgba(225, 29, 72, 0.35)' : 'none'
                                }}
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Zoom Modal */}
            {zoomedImage && (
                <div
                    onClick={() => setZoomedImage(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)',
                        zIndex: 9999, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', padding: '2rem',
                        cursor: 'zoom-out'
                    }}
                >
                    <img
                        src={zoomedImage.url}
                        alt={zoomedImage.name}
                        onClick={(e) => e.stopPropagation()}
                        className="animate-enter"
                        style={{
                            maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain',
                            borderRadius: '16px', boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    />
                    <div className="animate-enter" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', zIndex: 10000 }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(zoomedImage.url); }}
                            className="btn btn-secondary"
                            style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
                        >
                            <Copy size={16} /> Copy URL
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
                            className="btn btn-primary"
                            style={{ padding: '0.6rem 1.5rem', borderRadius: '12px', background: 'white', color: 'black', border: 'none' }}
                        >
                            <X size={16} /> Close
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideInDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideInUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </>
    );
}
