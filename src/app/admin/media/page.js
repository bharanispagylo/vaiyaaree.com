'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Upload, Trash2, Search, Loader2, Image as ImageIcon,
    X, Check, Copy, Grid, List as ListIcon, RefreshCw, Plus,
    Star, Layout
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

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
            setNotification({ message: '❌ Failed to load media library: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data: heroData } = await supabase.from('app_settings').select('value').eq('key', 'hero_slider_images').single();
            const { data: galleryData } = await supabase.from('app_settings').select('value').eq('key', 'gallery_images').single();

            if (heroData?.value) setHeroImages(JSON.parse(heroData.value));
            if (galleryData?.value) setGalleryImages(JSON.parse(galleryData.value));
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
            setNotification({ message: `❌ Failed to update ${key}`, type: 'error' });
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

            setNotification({ message: '✅ Image uploaded successfully', type: 'success' });
            fetchFiles();
        } catch (err) {
            console.error('Upload error:', err);
            setNotification({ message: `❌ Upload failed: ${err.message}`, type: 'error' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (fileName) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Delete failed');

            setNotification({ message: '✅ Image deleted', type: 'success' });
            if (selectedFile?.name === fileName) setSelectedFile(null);
            fetchFiles();
        } catch (err) {
            console.error('Delete error:', err);
            setNotification({ message: '❌ Delete failed: ' + err.message, type: 'error' });
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setNotification({ message: '📋 Link copied to clipboard', type: 'success' });
    };

    const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    return (
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

            {/* Toolbar */}
            <div className="card" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
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
                            <div style={{
                                aspectRatio: '1/1', background: '#f5f5f5', borderRadius: '12px', overflow: 'hidden',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem'
                            }}>
                                <img
                                    src={file.url}
                                    alt={file.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name}
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
                                    onClick={(e) => { e.stopPropagation(); handleDelete(file.name); }}
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
                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden' }}>
                                            <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{file.name}</td>
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
                                            <button onClick={() => handleDelete(file.name)} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--danger))' }}>
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
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedFile.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{selectedFile.url}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setSelectedFile(null)} className="btn btn-secondary">Deselect</button>
                        <button onClick={() => copyToClipboard(selectedFile.url)} className="btn btn-primary">Copy URL</button>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
