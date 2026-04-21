'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Upload, Search, Loader2, Image as ImageIcon,
    X, Check, Plus, Grid, List as ListIcon, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; // still needed for getPublicUrl

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

    const toggleSelect = (url) => {
        if (!multiple) {
            onSelect(url);
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

    const fetchSettings = async () => {
        try {
            const { data } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'watermark_images')
                .single();
            if (data?.value) setWatermarkImages(JSON.parse(data.value));
        } catch (err) {
            console.error('Error fetching watermark settings in picker:', err);
        }
    };

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/upload');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load');
            setFiles(data.files || []);
        } catch (err) {
            console.error('Error in MediaPicker:', err);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
        fetchSettings();
    }, []);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (catalogId) {
                formData.append('catalogId', catalogId);
            }

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            
            if (!res.ok) {
                if (data.error === 'Watermark already present') {
                    alert('⚠️ Watermark detected! This image already has a CAT code and cannot be processed again.');
                } else {
                    throw new Error(data.error || 'Upload failed');
                }
                return;
            }

            // Refresh the list and select the new image
            await fetchFiles();
            if (multiple) {
                setSelectedUrls(prev => [...prev, data.url]);
            } else {
                onSelect(data.url);
            }
        } catch (err) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const filteredFiles = files.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (activeGroup === 'watermark') return f.folder === 'with-watermark';
        if (activeGroup === 'no-watermark') return f.folder === 'without-watermark';
        return true;
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box shadow-premium" style={{
                maxWidth: '960px', height: '90vh',
                display: 'flex', flexDirection: 'column', padding: 0,
                borderRadius: '32px', background: '#ffffff',
                overflow: 'hidden', border: 'none'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '2rem 2.5rem', borderBottom: '1px solid hsl(var(--border-subtle))',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#ffffff'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'hsl(var(--text-main))' }}>
                            {multiple ? `Select Images (${selectedUrls.length})` : 'Select Image'}
                        </h2>
                        <p style={{ fontSize: '0.825rem', color: 'hsl(var(--text-muted))', margin: '4px 0 0', fontWeight: 500 }}>
                            {multiple ? 'Select multiple assets for your gallery.' : 'Choose from media library or upload new assets.'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn-icon danger"
                        style={{ width: '40px', height: '40px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '1.5rem 2.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <input
                                type="text"
                                placeholder="Search library..."
                                style={{
                                    width: '100%', padding: '0.85rem 1rem 0.85rem 3.25rem', borderRadius: '14px',
                                    border: '1px solid #e2e8f0', background: 'white',
                                    outline: 'none', fontSize: '1rem', fontWeight: 500, color: '#1e293b'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-primary"
                            disabled={uploading}
                            style={{ padding: '0.85rem 1.75rem', borderRadius: '14px', height: '48px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}
                        >
                            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            {uploading ? 'Uploading...' : 'Upload New'}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} accept="image/*" />
                        <button onClick={fetchFiles} className="btn-icon primary" style={{ width: '48px', height: '48px', borderRadius: '14px' }}>
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {[
                            { id: 'all', label: 'All Images', count: files.length },
                            { id: 'watermark', label: 'With Watermark', count: files.filter(f => watermarkImages.includes(f.url)).length },
                            { id: 'no-watermark', label: 'Without Watermark', count: files.filter(f => !watermarkImages.includes(f.url)).length }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveGroup(tab.id)}
                                style={{
                                    padding: '0.5rem 1.25rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                    fontSize: '0.85rem', fontWeight: activeGroup === tab.id ? 800 : 700,
                                    background: activeGroup === tab.id ? 'hsl(var(--primary))' : 'transparent',
                                    color: activeGroup === tab.id ? 'white' : '#64748b',
                                    transition: 'all 0.2s',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.025em'
                                }}
                            >
                                {tab.label} <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: '4px' }}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
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
                            {filteredFiles.map((file) => (
                                <div
                                    key={file.id}
                                    style={{
                                        aspectRatio: '1/1.2', borderRadius: '20px', overflow: 'hidden',
                                        cursor: 'pointer', position: 'relative', 
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        border: '4px solid transparent',
                                        borderColor: isSelected(file.url) ? 'hsl(var(--primary))' : 'transparent',
                                        boxShadow: isSelected(file.url) ? '0 12px 30px rgba(0,0,0,0.15)' : '0 4px 15px rgba(0,0,0,0.05)',
                                        transform: isSelected(file.url) ? 'scale(1.02)' : 'scale(1)'
                                    }}
                                    onClick={() => toggleSelect(file.url)}
                                >
                                    <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1.5rem 2.5rem', borderTop: '1px solid hsl(var(--border-subtle))', textAlign: 'right', background: '#f8fafc' }}>
                    <button onClick={onClose} className="btn modal-btn-secondary" style={{ padding: '0.75rem 2rem', borderRadius: '12px' }}>Close Library</button>
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
                        style={{ padding: '0.75rem 2.5rem', borderRadius: '12px', marginLeft: '1rem' }}
                    >
                        Confirm Selection {multiple && selectedUrls.length > 0 && `(${selectedUrls.length})`}
                    </button>
                </div>
            </div>
            <style jsx>{`
                .shadow-premium { box-shadow: 0 30px 60px -12px rgba(0,0,0,0.25); }
                img:hover + .img-overlay { opacity: 1; }
            `}</style>
        </div>
    );
}
