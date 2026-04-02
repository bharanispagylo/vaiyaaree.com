'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Upload, Trash2, Search, Loader2, Image as ImageIcon,
    X, Check, Copy, Grid, List as ListIcon, RefreshCw, Plus,
    Star, Layout, Droplets, Sparkles, ZoomIn
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { stampProductCode, uploadWatermarkedImage } from '@/lib/imageStamp';

export default function MediaLibraryPage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [selectedFile, setSelectedFile] = useState(null);
    const [notification, setNotification] = useState(null);
    const [heroImages, setHeroImages] = useState([]);
    const [galleryImages, setGalleryImages] = useState([]);
    const [watermarkImages, setWatermarkImages] = useState([]);
    const [noWatermarkImages, setNoWatermarkImages] = useState([]);
    const [activeGroup, setActiveGroup] = useState('all'); // 'all' | 'watermark' | 'no-watermark'
    const [analyzing, setAnalyzing] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); // { type, payload, title, message, onConfirm }
    const fileInputRef = useRef(null);

    const BUCKET_NAME = 'media';

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/upload');
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to load');
            setFiles(data.files || []);
        } catch (err) {
            console.error('Error fetching media:', err);
            setNotification({ message: 'Failed to load media library: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data: heroData } = await supabase.from('app_settings').select('value').eq('key', 'hero_slider_images').single();
            const { data: galleryData } = await supabase.from('app_settings').select('value').eq('key', 'gallery_images').single();
            const { data: wmData } = await supabase.from('app_settings').select('value').eq('key', 'watermark_images').single();
            const { data: noWmData } = await supabase.from('app_settings').select('value').eq('key', 'no_watermark_images').single();

            if (heroData?.value) setHeroImages(JSON.parse(heroData.value));
            if (galleryData?.value) setGalleryImages(JSON.parse(galleryData.value));
            if (wmData?.value) setWatermarkImages(JSON.parse(wmData.value));
            if (noWmData?.value) setNoWatermarkImages(JSON.parse(noWmData.value));
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
            const { error } = await supabase
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

    const toggleWatermark = async (url) => {
        const newWatermark = watermarkImages.includes(url)
            ? watermarkImages.filter(u => u !== url)
            : [...watermarkImages, url];
        setWatermarkImages(newWatermark);
        await updateSetting('watermark_images', newWatermark);
        setNotification({
            message: watermarkImages.includes(url) ? 'Removed from Watermark' : 'Added to Watermark',
            type: 'success'
        });
    };

    const toggleNoWatermark = async (url) => {
        const newNoWatermark = noWatermarkImages.includes(url)
            ? noWatermarkImages.filter(u => u !== url)
            : [...noWatermarkImages, url];
        setNoWatermarkImages(newNoWatermark);
        await updateSetting('no_watermark_images', newNoWatermark);
        setNotification({
            message: noWatermarkImages.includes(url) ? 'Removed from No Watermark' : 'Added to No Watermark',
            type: 'success'
        });
    };

    const reanalyzeAllImages = async () => {
        setConfirmAction({
            type: 'reanalyze',
            title: 'Re-analyze Library?',
            message: 'Re-analyze all images for watermarks? This will re-categorize all images.',
            onConfirm: async () => {
                setConfirmAction(null);
                setAnalyzing(true);
                setNotification({ message: 'Analyzing all images for watermarks...', type: 'success' });

        const newWatermarkList = [];
        const newNoWatermarkList = [];
        let analyzed = 0;

        for (const file of files) {
            try {
                const res = await fetch('/api/admin/watermark-detect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: file.url })
                });

                const data = await res.json();

                if (data.hasWatermark) {
                    newWatermarkList.push(file.url);
                } else {
                    newNoWatermarkList.push(file.url);
                }

                analyzed++;
            } catch (err) {
                console.error('Failed to analyze:', file.name, err);
                newNoWatermarkList.push(file.url);
            }
        }

        setWatermarkImages(newWatermarkList);
        setNoWatermarkImages(newNoWatermarkList);

        await updateSetting('watermark_images', newWatermarkList);
        await updateSetting('no_watermark_images', newNoWatermarkList);

        setAnalyzing(false);
                setNotification({
                    message: `Re-analyzed ${analyzed} images: ${newWatermarkList.length} with watermark, ${newNoWatermarkList.length} without`,
                    type: 'success'
                });
            }
        });
    };

    const categorizeAllImages = async () => {
        setConfirmAction({
            type: 'categorize',
            title: 'Analyze Watermarks?',
            message: `Categorize all ${files.length} images for watermarks?`,
            onConfirm: async () => {
                setConfirmAction(null);
                setAnalyzing(true);
                setNotification({ message: `Analyzing ${files.length} images...`, type: 'success' });

        const newWatermarkList = [];
        const newNoWatermarkList = [];
        let processed = 0;

        for (const file of files) {
            try {
                const res = await fetch('/api/admin/watermark-detect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: file.url })
                });

                const data = await res.json();

                if (data.hasWatermark) {
                    newWatermarkList.push(file.url);
                } else {
                    newNoWatermarkList.push(file.url);
                }

                processed++;
            } catch (err) {
                console.error('Failed to analyze:', file.name, err);
                newNoWatermarkList.push(file.url);
            }
        }

        // Update state
        setWatermarkImages(newWatermarkList);
        setNoWatermarkImages(newNoWatermarkList);

        // Save to database
        await updateSetting('watermark_images', newWatermarkList);
        await updateSetting('no_watermark_images', newNoWatermarkList);

        setAnalyzing(false);
                setNotification({
                    message: `Categorized ${processed} images: ${newWatermarkList.length} with watermark, ${newNoWatermarkList.length} without`,
                    type: 'success'
                });
            }
        });
    };

    // Auto-categorize all images on page load (run once when files loaded)
    // Auto-categorize is now only performed on upload to improve performance.
    /*
    const hasCategorizedRef = useRef(false);
    useEffect(() => {
        if (files.length > 0 && !hasCategorizedRef.current && !loading) {
            hasCategorizedRef.current = true;
            autoCategorizeImages();
        }
    }, [files, loading]);
    */

    const autoCategorizeImages = async () => {
        if (files.length === 0) return;

        setAnalyzing(true);
        setNotification({ message: `Auto-categorizing ${files.length} images...`, type: 'success' });

        const newWatermarkList = [];
        const newNoWatermarkList = [];
        let processed = 0;

        for (const file of files) {
            try {
                const res = await fetch('/api/admin/watermark-detect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: file.url })
                });

                const data = await res.json();

                if (data.hasWatermark) {
                    newWatermarkList.push(file.url);
                } else {
                    newNoWatermarkList.push(file.url);
                }

                processed++;
            } catch (err) {
                console.error('Failed to analyze:', file.name, err);
                newNoWatermarkList.push(file.url);
            }
        }

        // Update state
        setWatermarkImages(newWatermarkList);
        setNoWatermarkImages(newNoWatermarkList);

        // Save to database
        await updateSetting('watermark_images', newWatermarkList);
        await updateSetting('no_watermark_images', newNoWatermarkList);

        setAnalyzing(false);
        setNotification({
            message: `Auto-categorized: ${newWatermarkList.length} with watermark, ${newNoWatermarkList.length} without`,
            type: 'success'
        });
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');

            // Use watermark detection result from upload API
            const hasWatermark = data.hasWatermark || false;
            const folder = data.folder || 'without-watermark';
            
            if (hasWatermark && folder === 'with-watermark') {
                // Image has watermark - store in watermark collection
                const newWatermark = [...watermarkImages, data.url];
                setWatermarkImages(newWatermark);
                await updateSetting('watermark_images', newWatermark);
                setNotification({ message: 'Watermark detected: Image stored in "With Watermark" collection', type: 'success' });
            } else {
                // Image has no watermark - store in no-watermark collection
                const newNoWatermark = [...noWatermarkImages, data.url];
                setNoWatermarkImages(newNoWatermark);
                await updateSetting('no_watermark_images', newNoWatermark);
                setNotification({ message: 'No watermark detected: Image stored in "Without Watermark" collection', type: 'success' });
            }

            // Refresh the file list
            fetchFiles();

        } catch (err) {
            console.error('Upload error:', err);
            setNotification({ message: 'Upload failed: ' + err.message, type: 'error' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (fullPath) => {
        setConfirmAction({
            type: 'delete',
            title: 'Delete Image?',
            message: 'Are you sure you want to permanently delete this image from the library?',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const res = await fetch('/api/admin/upload', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileName: fullPath }),
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Delete failed');

                    // Get the URL from the files array using the full path
                    const fileToDelete = files.find(f => {
                        const filePath = f.folder && f.folder !== 'root' 
                            ? `${f.folder}/${f.name}` 
                            : f.name;
                        return filePath === fullPath;
                    });

                    if (fileToDelete) {
                        const fileUrl = fileToDelete.url;

                        if (heroImages.includes(fileUrl)) {
                            const newHero = heroImages.filter(u => u !== fileUrl);
                            setHeroImages(newHero);
                            await updateSetting('hero_slider_images', newHero);
                        }
                        if (galleryImages.includes(fileUrl)) {
                            const newGallery = galleryImages.filter(u => u !== fileUrl);
                            setGalleryImages(newGallery);
                            await updateSetting('gallery_images', newGallery);
                        }
                        if (watermarkImages.includes(fileUrl)) {
                            const newWm = watermarkImages.filter(u => u !== fileUrl);
                            setWatermarkImages(newWm);
                            await updateSetting('watermark_images', newWm);
                        }
                        if (noWatermarkImages.includes(fileUrl)) {
                            const newNoWm = noWatermarkImages.filter(u => u !== fileUrl);
                            setNoWatermarkImages(newNoWm);
                            await updateSetting('no_watermark_images', newNoWm);
                        }
                    }

                    setNotification({ message: 'Image deleted', type: 'success' });
                    if (selectedFile?.name === fullPath.split('/').pop()) setSelectedFile(null);
                    fetchFiles();
                } catch (err) {
                    console.error('Delete error:', err);
                    setNotification({ message: 'Delete failed: ' + err.message, type: 'error' });
                }
            }
        });
    };


    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setNotification({ message: 'Link copied to clipboard', type: 'success' });
    };

    const filteredFiles = files.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (activeGroup === 'watermark') {
            return watermarkImages.includes(f.url);
        } else if (activeGroup === 'no-watermark') {
            // Show all images that are NOT watermarked (includes uncategorized)
            return !watermarkImages.includes(f.url);
        }
        return true; // 'all' group
    });

    // Calculate actual counts based on files that exist
    const actualWatermarkCount = files.filter(f => watermarkImages.includes(f.url)).length;
    // 'Without watermark' = everything NOT in the watermark list (includes uncategorized images)
    const actualNoWatermarkCount = files.filter(f => !watermarkImages.includes(f.url)).length;

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    return (
        <>
            <div className="animate-enter" style={{ padding: '0.5rem' }}>
            {/* Header */}
            <div className="admin-header-row" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ImageIcon size={28} className="text-primary" />
                        Media Library
                    </h1>
                    <p style={{ marginTop: '0.25rem' }}>Manage and upload your product images</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-primary"
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                        {uploading ? 'Uploading...' : 'Upload Image'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUpload}
                        style={{ display: 'none' }}
                        accept="image/*"
                    />
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
                    padding: '1rem 1.5rem', borderRadius: '12px',
                    background: notification.type === 'success' ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                    color: 'white', fontWeight: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    animation: 'slideInRight 0.3s ease-out'
                }}>
                    {notification.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {notification.message}
                </div>
            )}

            {/* Toolbar with Group Tabs */}
            <div className="card" style={{ padding: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                        <input
                            type="text"
                            placeholder="Search images by name..."
                            className="admin-input"
                            style={{ paddingLeft: '3rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '10px' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: viewMode === 'grid' ? 'hsl(var(--primary))' : 'transparent',
                                color: viewMode === 'grid' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))'
                            }}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: viewMode === 'list' ? 'hsl(var(--primary))' : 'transparent',
                                color: viewMode === 'list' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))'
                            }}
                        >
                            <ListIcon size={18} />
                        </button>
                        <button
                            onClick={fetchFiles}
                            style={{
                                padding: '0.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: 'transparent', color: 'hsl(var(--text-muted))'
                            }}
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Group Filter Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        onClick={() => setActiveGroup('all')}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: activeGroup === 'all' ? 'hsl(var(--primary))' : 'transparent',
                            color: activeGroup === 'all' ? 'white' : 'hsl(var(--text-muted))',
                            fontWeight: activeGroup === 'all' ? 600 : 400,
                            transition: 'all 0.2s'
                        }}
                    >
                        All Images ({files.length})
                    </button>
                    <button
                        onClick={() => setActiveGroup('watermark')}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: activeGroup === 'watermark' ? 'hsl(var(--info))' : 'transparent',
                            color: activeGroup === 'watermark' ? 'white' : 'hsl(var(--text-muted))',
                            fontWeight: activeGroup === 'watermark' ? 600 : 400,
                            transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                        }}
                    >
                        <Droplets size={14} /> With Watermark ({actualWatermarkCount})
                    </button>
                    <button
                        onClick={() => setActiveGroup('no-watermark')}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: activeGroup === 'no-watermark' ? 'hsl(var(--success))' : 'transparent',
                            color: activeGroup === 'no-watermark' ? 'white' : 'hsl(var(--text-muted))',
                            fontWeight: activeGroup === 'no-watermark' ? 600 : 400,
                            transition: 'all 0.2s'
                        }}
                    >
                        Without Watermark ({actualNoWatermarkCount})
                    </button>
                    {analyzing && (
                        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--text-muted))' }}>
                            <Loader2 size={14} className="animate-spin" /> Analyzing...
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem' }}>
                    <Loader2 className="animate-spin text-primary" size={40} />
                    <p className="text-muted">Loading your media library...</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    {filteredFiles.map((file) => (
                        <div
                            key={file.id}
                            className="card"
                            style={{
                                padding: '0.75rem', borderRadius: '16px', position: 'relative', overflow: 'hidden',
                                border: selectedFile?.name === file.name ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))',
                                cursor: 'pointer'
                            }}
                            onClick={() => setSelectedFile(file)}
                        >
                            <div
                                onClick={(e) => { e.stopPropagation(); setZoomedImage(file); }}
                                style={{
                                    aspectRatio: '1/1', background: '#f5f5f5', borderRadius: '12px', overflow: 'hidden',
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
                                    background: 'rgba(255,255,255,0.8)', borderRadius: '50%',
                                    padding: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <ZoomIn size={16} color="#333" />
                                </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                                {(file.metadata.size / 1024).toFixed(1)} KB • {new Date(file.created_at).toLocaleDateString()}
                            </div>

                            {/* Actions Overlay */}
                            <div style={{
                                position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.4rem',
                                zIndex: 10
                            }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleHero(file.url); }}
                                    style={{
                                        padding: '0.4rem', borderRadius: '6px', border: 'none',
                                        background: heroImages.includes(file.url) ? 'hsl(var(--warning))' : 'rgba(255,255,255,0.9)',
                                        color: heroImages.includes(file.url) ? 'white' : 'hsl(var(--text-muted))',
                                        cursor: 'pointer', transition: '0.2s'
                                    }}
                                    title={heroImages.includes(file.url) ? "Remove from Hero" : "Add to Hero"}
                                >
                                    <Star size={14} fill={heroImages.includes(file.url) ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleGallery(file.url); }}
                                    style={{
                                        padding: '0.4rem', borderRadius: '6px', border: 'none',
                                        background: galleryImages.includes(file.url) ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.9)',
                                        color: galleryImages.includes(file.url) ? 'white' : 'hsl(var(--text-muted))',
                                        cursor: 'pointer', transition: '0.2s'
                                    }}
                                    title={galleryImages.includes(file.url) ? "Remove from Gallery" : "Add to Gallery"}
                                >
                                    <Layout size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(file.url); }}
                                    style={{ padding: '0.4rem', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.9)', color: 'hsl(var(--primary))', cursor: 'pointer' }}
                                    title="Copy Link"
                                >
                                    <Copy size={14} />
                                </button>
                                <button
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        // Use full path for files in folders, or just name for root files
                                        const fullPath = file.folder && file.folder !== 'root' 
                                            ? `${file.folder}/${file.name}` 
                                            : file.name;
                                        handleDelete(fullPath); 
                                    }}
                                    style={{ padding: '0.4rem', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.9)', color: 'hsl(var(--danger))', cursor: 'pointer' }}
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Preview</th>
                                <th>Name</th>
                                <th>Size</th>
                                <th>Usage</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFiles.map((file) => (
                                <tr key={file.id}>
                                    <td>
                                        <div
                                            onClick={() => setZoomedImage(file)}
                                            style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in' }}
                                            title="Click to zoom"
                                        >
                                            <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}</td>
                                    <td style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>{(file.metadata.size / 1024).toFixed(1)} KB</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => toggleHero(file.url)}
                                                style={{
                                                    padding: '0.3rem', borderRadius: '4px', border: 'none',
                                                    background: heroImages.includes(file.url) ? 'hsl(var(--warning)/.2)' : 'transparent',
                                                    color: heroImages.includes(file.url) ? 'hsl(var(--warning))' : 'hsl(var(--text-muted))',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Star size={16} fill={heroImages.includes(file.url) ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                onClick={() => toggleGallery(file.url)}
                                                style={{
                                                    padding: '0.3rem', borderRadius: '4px', border: 'none',
                                                    background: galleryImages.includes(file.url) ? 'hsl(var(--primary)/.2)' : 'transparent',
                                                    color: galleryImages.includes(file.url) ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Layout size={16} />
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => copyToClipboard(file.url)} className="btn btn-secondary" style={{ padding: '0.4rem' }}>
                                                <Copy size={14} />
                                            </button>
                                            <button onClick={() => {
                                            const fullPath = file.folder && file.folder !== 'root' 
                                                ? `${file.folder}/${file.name}` 
                                                : file.name;
                                            handleDelete(fullPath);
                                        }} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--danger))' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Selection Info Footer (Optional) */}
            {selectedFile && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: 'white', borderTop: '1px solid hsl(var(--border-subtle))',
                    padding: '1rem 2rem', zIndex: 100, display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', boxShadow: '0 -10px 30px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src={selectedFile.url} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}</div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{selectedFile.url}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setSelectedFile(null)} className="btn btn-secondary">Deselect</button>
                        <button onClick={() => copyToClipboard(selectedFile.url)} className="btn btn-primary">Copy URL</button>
                    </div>
                </div>
            )}

            </div>

            {/* Confirm Action Modal */}
            {confirmAction && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }} onClick={() => setConfirmAction(null)}>
                    <div className="card shadow-premium animate-enter" style={{
                        width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center',
                        borderRadius: '24px', background: 'hsl(var(--bg-card))',
                        border: `1px solid ${confirmAction.type === 'delete' ? 'hsl(var(--danger) / 0.3)' : 'hsl(var(--primary) / 0.3)'}`
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: confirmAction.type === 'delete' ? 'hsl(var(--danger) / 0.1)' : 'hsl(var(--primary) / 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                            color: confirmAction.type === 'delete' ? 'hsl(var(--danger))' : 'hsl(var(--primary))'
                        }}>
                            {confirmAction.type === 'delete' ? <Trash2 size={40} /> : <Droplets size={40} />}
                        </div>
                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem', fontWeight: 900 }}>{confirmAction.title}</h3>
                        <p style={{ margin: '0 0 2rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6 }}>{confirmAction.message}</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setConfirmAction(null)} className="btn btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '14px', fontWeight: 700 }}>Cancel</button>
                            <button
                                onClick={confirmAction.onConfirm}
                                className="btn btn-primary"
                                style={{
                                    flex: 1, padding: '1rem', borderRadius: '14px', fontWeight: 800,
                                    background: confirmAction.type === 'delete' ? 'hsl(var(--danger))' : 'hsl(var(--primary))',
                                    border: 'none', color: 'white'
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Image Zoom Modal */}
            {zoomedImage && (
                <div
                    onClick={() => setZoomedImage(null)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
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
                            style={{ padding: '0.6rem 1.25rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
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
            `}</style>
        </>
    );
}

