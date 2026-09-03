'use client';

import { useState, useEffect } from 'react';
import MediaPicker from '@/components/MediaPicker';
import {
    Plus,
    Save,
    RotateCcw,
    Layout,
    Check,
    X,
    ArrowUpRight,
    Sparkles
} from 'lucide-react';
import SectionItemRow from './components/SectionItemRow';
import AddSectionModal from './components/AddSectionModal';
import EditSectionModal from './components/EditSectionModal';

export default function HomepageBuilderPage() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [flushingCache, setFlushingCache] = useState(false);
    const [toast, setToast] = useState(null);
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    // Modal state
    const [editingSection, setEditingSection] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [mediaPickerCallback, setMediaPickerCallback] = useState(null);

    useEffect(() => {
        fetchSections();
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleFlushCache = async () => {
        setFlushingCache(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch('/api/admin/flush-cache', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                showToast(json.message || 'Storefront cache flushed successfully!');
            } else {
                showToast(json.error || 'Failed to flush cache.', 'error');
            }
        } catch (err) {
            console.error('Flush cache error:', err);
            showToast('Error connecting to cache flush service.', 'error');
        } finally {
            setFlushingCache(false);
        }
    };

    const fetchSections = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/homepage-builder');
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setSections(json.data);
            } else {
                showToast(json.error || 'Failed to load sections.', 'error');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Failed to connect to database.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveSectionsToServer = async (updatedSectionsList, silent = false) => {
        const payload = updatedSectionsList || sections;
        if (!silent) setSaving(true);
        try {
            const res = await fetch('/api/admin/homepage-builder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections: payload })
            });
            const json = await res.json();
            if (json.success) {
                if (!silent) showToast('Homepage layout saved successfully!');
            } else {
                showToast(json.error || 'Failed to save changes.', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            showToast('Error saving changes to server.', 'error');
        } finally {
            if (!silent) setSaving(false);
        }
    };

    // Drag-and-Drop Handlers
    const handleDragStart = (e, index) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.parentNode);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIdx !== index) {
            setDragOverIdx(index);
        }
    };

    const handleDragEnd = () => {
        if (draggedIdx !== null && dragOverIdx !== null && draggedIdx !== dragOverIdx) {
            const reordered = [...sections];
            const [movedItem] = reordered.splice(draggedIdx, 1);
            reordered.splice(dragOverIdx, 0, movedItem);
            const withOrders = reordered.map((item, idx) => ({ ...item, display_order: idx + 1 }));
            setSections(withOrders);
            saveSectionsToServer(withOrders, true);
        }
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    const moveSection = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= sections.length) return;
        const reordered = [...sections];
        const temp = reordered[index];
        reordered[index] = reordered[targetIndex];
        reordered[targetIndex] = temp;
        const withOrders = reordered.map((item, idx) => ({ ...item, display_order: idx + 1 }));
        setSections(withOrders);
        saveSectionsToServer(withOrders, true);
    };

    const toggleSectionVisibility = (id) => {
        const updated = sections.map(s => s.id === id ? { ...s, is_enabled: !s.is_enabled } : s);
        setSections(updated);
        saveSectionsToServer(updated, true);
    };

    const deleteSection = (id) => {
        if (!confirm('Are you sure you want to remove this section from the homepage?')) return;
        const updated = sections.filter(s => s.id !== id).map((s, idx) => ({ ...s, display_order: idx + 1 }));
        setSections(updated);
        saveSectionsToServer(updated, true);
    };

    const duplicateSection = (sec) => {
        const newSec = {
            ...sec,
            id: `sec_${Date.now()}`,
            title: `${sec.title} (Copy)`,
            display_order: sections.length + 1
        };
        const updated = [...sections, newSec];
        setSections(updated);
        saveSectionsToServer(updated, true);
        showToast('Section duplicated and saved!');
    };

    const addNewSectionFromTemplate = (tmpl) => {
        const newSec = {
            id: `sec_${tmpl.type}_${Date.now()}`,
            section_key: tmpl.type,
            section_type: tmpl.type,
            title: tmpl.defaultTitle,
            subtitle: tmpl.defaultSubtitle,
            badge_text: tmpl.badge,
            is_enabled: true,
            display_order: sections.length + 1,
            settings: tmpl.defaultSettings
        };
        const updated = [...sections, newSec];
        setSections(updated);
        saveSectionsToServer(updated, true);
        setShowAddModal(false);
        setEditingSection(newSec);
        showToast(`Added ${tmpl.name}! Customize its details below.`);
    };

    const resetToDefaults = async () => {
        if (!confirm('Are you sure you want to reset all homepage sections to factory defaults? All custom additions and arrangements will be reset.')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/homepage-builder?reset_defaults=true', { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                showToast('Reset to factory defaults.');
                await fetchSections();
            } else {
                showToast(json.error || 'Failed to reset.', 'error');
            }
        } catch (error) {
            console.error('Reset error:', error);
            showToast('Error resetting layout.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveEditingSectionModal = (updatedSection) => {
        if (!updatedSection) return;
        const updated = sections.map(s => s.id === updatedSection.id ? updatedSection : s);
        setSections(updated);
        saveSectionsToServer(updated, false);
        setEditingSection(null);
    };

    return (
        <div className="animate-enter" style={{ padding: '0.5rem' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <div style={{ background: '#5d0821', color: '#ffffff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layout size={20} />
                        </div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                            Home Page Builder
                        </h1>
                    </div>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.92rem' }}>
                        Drag and reorder sections, customize text and settings, or add dynamic product carousels & banners to your storefront.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={resetToDefaults}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.65rem 1.1rem', background: '#ffffff', border: '1px solid #cbd5e1',
                            borderRadius: '10px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        title="Reset all sections to default arrangement"
                    >
                        <RotateCcw size={15} />
                        Reset Defaults
                    </button>

                    <button
                        onClick={handleFlushCache}
                        disabled={flushingCache}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.65rem 1.1rem', background: '#fffbeb', border: '1px solid #fde68a',
                            borderRadius: '10px', color: '#b45309', fontSize: '0.85rem', fontWeight: 700,
                            cursor: flushingCache ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
                        }}
                        title="Purge Next.js SSR cache and publish latest changes instantly to all users"
                    >
                        <Sparkles size={15} className={flushingCache ? 'animate-spin' : ''} />
                        {flushingCache ? 'Flushing...' : 'Flush Cache'}
                    </button>

                    <a
                        href="/"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.65rem 1.1rem', background: '#ffffff', border: '1px solid #cbd5e1',
                            borderRadius: '10px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700,
                            textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <ArrowUpRight size={16} />
                        Live Storefront
                    </a>

                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.65rem 1.25rem', background: '#5d0821', border: 'none',
                            borderRadius: '10px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 4px 12px rgba(93, 8, 33, 0.25)', transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={16} />
                        Add New Section
                    </button>

                    <button
                        onClick={() => saveSectionsToServer(null, false)}
                        disabled={saving}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.65rem 1.4rem', background: '#16a34a', border: 'none',
                            borderRadius: '10px', color: '#ffffff', fontSize: '0.85rem', fontWeight: 800,
                            cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                            opacity: saving ? 0.7 : 1, transition: 'all 0.2s'
                        }}
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save & Publish'}
                    </button>
                </div>
            </div>

            {/* Toast Alert */}
            {toast && (
                <div style={{
                    marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: '12px',
                    background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
                    color: toast.type === 'error' ? '#dc2626' : '#15803d',
                    fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                    {toast.type === 'error' ? <X size={18} /> : <Check size={18} />}
                    {toast.message}
                </div>
            )}

            {/* Section Blocks Drag-and-Drop Container */}
            {loading ? (
                <div style={{ background: '#ffffff', padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#5d0821', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>Loading homepage layout sections...</p>
                </div>
            ) : sections.length === 0 ? (
                <div style={{ background: '#ffffff', padding: '4rem 2rem', textAlign: 'center', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                    <Layout size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontWeight: 800 }}>No Homepage Sections Found</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                        Start by adding your first section or initialize with default store sections.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ background: '#5d0821', border: 'none', padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700 }}>
                            <Plus size={16} /> Choose Section
                        </button>
                        <button onClick={resetToDefaults} className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700 }}>
                            <RotateCcw size={16} /> Load Defaults
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {sections.map((sec, index) => (
                        <SectionItemRow
                            key={sec.id}
                            sec={sec}
                            index={index}
                            totalCount={sections.length}
                            isDragging={draggedIdx === index}
                            isDragOver={dragOverIdx === index}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                            onMove={moveSection}
                            onToggleVisibility={toggleSectionVisibility}
                            onDuplicate={duplicateSection}
                            onCustomize={(section) => setEditingSection(JSON.parse(JSON.stringify(section)))}
                            onDelete={deleteSection}
                        />
                    ))}
                </div>
            )}

            {/* ADD SECTION MODAL */}
            {showAddModal && (
                <AddSectionModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSelectTemplate={addNewSectionFromTemplate}
                />
            )}

            {/* EDIT SECTION MODAL */}
            {editingSection && (
                <EditSectionModal
                    editingSection={editingSection}
                    onClose={() => setEditingSection(null)}
                    onSave={saveEditingSectionModal}
                    openMediaPicker={(cb) => setMediaPickerCallback(() => cb)}
                />
            )}

            {/* MEDIA PICKER MODAL */}
            {mediaPickerCallback && (
                <MediaPicker
                    onSelect={(url) => {
                        if (mediaPickerCallback) mediaPickerCallback(url);
                        setMediaPickerCallback(null);
                    }}
                    onClose={() => setMediaPickerCallback(null)}
                />
            )}
        </div>
    );
}
