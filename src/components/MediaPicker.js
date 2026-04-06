'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Upload, Search, Loader2, Image as ImageIcon,
    X, Check, Plus, Grid, List as ListIcon, RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient'; // still needed for getPublicUrl

export default function MediaPicker({ onSelect, onClose, currentImage }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeGroup, setActiveGroup] = useState('all'); // 'all' | 'watermark' | 'no-watermark'
    const [watermarkImages, setWatermarkImages] = useState([]);
    const fileInputRef = useRef(null);

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

            // Refresh the list and auto-select the new image
            await fetchFiles();
            onSelect(data.url);
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

        const isWatermarked = watermarkImages.includes(f.url);
        if (activeGroup === 'watermark') return isWatermarked;
        if (activeGroup === 'no-watermark') return !isWatermarked;
        return true;
    });

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 10000,
            padding: '1.5rem'
        }}>
            <div className="card shadow-premium" style={{
                width: '100%', maxWidth: '900px', height: '85vh',
                display: 'flex', flexDirection: 'column', padding: 0,
                borderRadius: '24px', background: '#ffffff',
                overflow: 'hidden', border: '1px solid #e5e7eb'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Select Image</h2>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '4px 0 0' }}>Choose from media library or upload new</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '1rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                            <input
                                type="text"
                                placeholder="Search library..."
                                style={{
                                    width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '12px',
                                    border: '1px solid #e2e8f0', background: 'white',
                                    outline: 'none', fontSize: '0.9rem'
                                }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-primary"
                            disabled={uploading}
                            style={{ padding: '0.75rem 1.25rem' }}
                        >
                            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                            Upload New
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} accept="image/*" />
                        <button onClick={fetchFiles} className="btn btn-secondary" style={{ padding: '0.75rem' }}>
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
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
                                    padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    fontSize: '0.85rem', fontWeight: activeGroup === tab.id ? 700 : 500,
                                    background: activeGroup === tab.id ? 'hsl(var(--primary))' : 'transparent',
                                    color: activeGroup === tab.id ? 'white' : '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                            <Loader2 className="animate-spin text-primary" size={40} />
                            <p className="text-muted">Loading media...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                            <ImageIcon size={48} style={{ marginBottom: '1rem' }} />
                            <p>No images found in this category</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.5rem' }}>
                            {filteredFiles.map((file) => (
                                <div
                                    key={file.id}
                                    style={{
                                        aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden',
                                        cursor: 'pointer', position: 'relative', border: '3px solid transparent',
                                        transition: 'all 0.2s',
                                        borderColor: currentImage === file.url ? 'hsl(var(--primary))' : 'transparent',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                                    }}
                                    onClick={() => onSelect(file.url)}
                                >
                                    <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {file.catalogId && (
                                        <div style={{
                                            position: 'absolute', top: '0.5rem', right: '0.5rem',
                                            background: 'hsl(var(--primary))', color: 'white',
                                            borderRadius: '50%', padding: '0.2rem',
                                            fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace'
                                        }}>
                                            {file.catalogId}
                                        </div>
                                    )}
                                    {currentImage === file.url && (
                                        <div style={{
                                            position: 'absolute', top: '0.5rem', right: '0.5rem',
                                            background: 'hsl(var(--primary))', color: 'white',
                                            borderRadius: '50%', padding: '0.2rem',
                                            fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace'
                                        }}>
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid hsl(var(--border-subtle))', textAlign: 'right' }}>
                    <button onClick={onClose} className="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    );
}
