'use client';

import { useState, useEffect } from 'react';
import {
    Plus, Edit, Trash2, Search, Loader2, FileText, Check, X,
    Eye, EyeOff, ExternalLink, Globe, Layout, ArrowLeft,
    Settings, Image as ImageIcon, Code, BarChart, Calendar, Lock,
    ChevronRight, Save, Copy, Monitor, Smartphone, Tablet, Upload
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ModalPortal from '@/components/ModalPortal';
import { useRouter } from 'next/navigation';
import MediaPicker from '@/components/MediaPicker';

const TABS = [
    { id: 'content', label: 'Page Builder', icon: FileText },
    { id: 'seo', label: 'Google Search Info', icon: BarChart },
    { id: 'appearance', label: 'Design & Layout', icon: ImageIcon },
    { id: 'advanced', label: 'Technical Settings', icon: Code },
];

const CONTENT_BLOCKS = [
    { name: 'Hero Banner', content: '<section style="padding: 60px 20px; text-align: center; background: hsl(var(--primary) / 0.05); border-radius: 20px; margin: 20px 0;">\n  <h1 style="font-size: 3rem; color: hsl(var(--primary)); margin-bottom: 20px;">Welcome to Our Story</h1>\n  <p style="font-size: 1.2rem; color: hsl(var(--text-muted)); max-width: 600px; margin: 0 auto;">Discover the finest handwoven sarees crafted with love and tradition.</p>\n</section>' },
    { name: 'Image with Text', content: '<div style="display: flex; gap: 30px; align-items: center; margin: 40px 0; flex-wrap: wrap;">\n  <div style="flex: 1; min-width: 300px;">\n    <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800" style="width: 100%; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" />\n  </div>\n  <div style="flex: 1; min-width: 300px;">\n    <h2 style="font-size: 2rem; color: hsl(var(--text-main));">Our Heritage</h2>\n    <p style="font-size: 1.1rem; color: hsl(var(--text-muted)); line-height: 1.8;">Each weave tells a story of centuries-old craftsmanship passed down through generations...</p>\n  </div>\n</div>' },
    { name: 'FAQ Section', content: '<div style="margin: 40px 0;">\n  <h2 style="text-align: center; margin-bottom: 30px; color: hsl(var(--text-main));">Common Questions</h2>\n  <details style="padding: 15px; border: 1px solid hsl(var(--border-subtle)); border-radius: 10px; margin-bottom: 10px;">\n    <summary style="font-weight: 700; cursor: pointer; color: hsl(var(--text-main));">How long does shipping take?</summary>\n    <p style="margin-top: 10px; color: hsl(var(--text-muted));">We usually ship within 2-3 business days.</p>\n  </details>\n</div>' },
    { name: 'Special Feature', content: '<div style="background: hsl(var(--text-main)); color: white; padding: 40px; border-radius: 20px; text-align: center;">\n  <h3 style="color: white;">Exclusive Collection</h3>\n  <p style="color: rgba(255,255,255,0.8);">Available for a limited time only. Don\'t miss out!</p>\n  <button style="background: hsl(var(--primary)); color: white; border: none; padding: 12px 25px; border-radius: 30px; font-weight: 700; margin-top: 20px; cursor: pointer;">Shop Now</button>\n</div>' }
];

export default function CMSPage() {
    const router = useRouter();
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPage, setCurrentPage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('content');
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // { title, message, onConfirm }

    // Media Picker States
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [activeImageField, setActiveImageField] = useState(null); // 'og_image' | 'featured_image'
    const [ogImageUrl, setOgImageUrl] = useState('');
    const [featuredImageUrl, setFeaturedImageUrl] = useState('');

    const fetchPages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cms_pages')
                .select('*')
                .order('menu_order', { ascending: true })
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPages(data || []);
        } catch (error) {
            console.error('Error fetching CMS pages:', error);
            showNotification('Failed to fetch pages', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();

        const handleReset = () => {
            setIsEditing(false);
            setCurrentPage(null);
        };
        window.addEventListener('resetAdminView', handleReset);
        return () => window.removeEventListener('resetAdminView', handleReset);
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);

        const form = document.querySelector('#cms-page-form');
        if (!form) {
            setSaving(false);
            return;
        }
        const formData = new FormData(form);

        const pageData = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            content: formData.get('content'),
            is_published: formData.get('status') === 'published',
            status: formData.get('status'),
            template: formData.get('template'),
            menu_order: parseInt(formData.get('menu_order') || '0'),
            meta_description: formData.get('meta_description'),
            seo_title: formData.get('seo_title'),
            og_image: formData.get('og_image'),
            featured_image: formData.get('featured_image'),
            custom_css: formData.get('custom_css'),
            custom_js: formData.get('custom_js'),
            parent_id: formData.get('parent_id') === 'none' ? null : formData.get('parent_id')
        };

        try {
            if (currentPage?.id) {
                const { error } = await supabase.from('cms_pages').update(pageData).eq('id', currentPage.id);
                if (error) throw error;
                showNotification('Page updated successfully!');
            } else {
                const { error } = await supabase.from('cms_pages').insert([pageData]);
                if (error) throw error;
                showNotification('New page created successfully!');
            }
            setIsEditing(false);
            setCurrentPage(null);
            setOgImageUrl('');
            setFeaturedImageUrl('');
            setActiveTab('content');
            fetchPages();
        } catch (error) {
            console.error('Save Error:', error);
            showNotification(error.message || 'Failed to save page', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setConfirmAction({
            title: 'Delete Page?',
            message: 'Are you sure you want to delete this page? This will permanently remove all its content and SEO data.',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    const { error } = await supabase.from('cms_pages').delete().eq('id', id);
                    if (error) throw error;
                    showNotification('Page removed successfully');
                    fetchPages();
                } catch (error) {
                    console.error('Delete Error:', error);
                    showNotification('Deletion failed', 'error');
                }
            }
        });
    };

    const generateSlug = (title) => {
        return title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
    };

    const filteredPages = pages.filter(page =>
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const inputStyle = {
        width: '100%', padding: '0.85rem', borderRadius: '12px',
        background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))',
        color: 'hsl(var(--text-main))', fontSize: '0.95rem', outline: 'none',
        boxSizing: 'border-box', transition: 'all 0.2s', marginBottom: '1rem'
    };

    const labelStyle = {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '0.6rem', fontSize: '0.82rem', fontWeight: 700,
        color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em'
    };

    const insertBlock = (content) => {
        const textarea = document.querySelector('textarea[name="content"]');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        textarea.value = before + content + after;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const formatText = (tag) => {
        const textarea = document.querySelector('textarea[name="content"]');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        let replacement = '';

        switch (tag) {
            case 'bold': replacement = `<strong>${selected || 'bold text'}</strong>`; break;
            case 'italic': replacement = `<em>${selected || 'italic text'}</em>`; break;
            case 'h2': replacement = `<h2>${selected || 'Heading'}</h2>`; break;
            case 'link': replacement = `<a href="#">${selected || 'link text'}</a>`; break;
            case 'center': replacement = `<div style="text-align: center;">${selected || 'centered content'}</div>`; break;
            default: replacement = selected;
        }

        const before = textarea.value.substring(0, start);
        const after = textarea.value.substring(end);
        textarea.value = before + replacement + after;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    };

    return (
        <>
            <div className="animate-enter" style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Action Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem', zIndex: 9999,
                    background: notification.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white', padding: '1.25rem 2rem', borderRadius: '16px',
                    boxShadow: '0 15px 40px rgba(0,0,0,0.3)', animation: 'slideIn 0.3s ease',
                    display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600
                }}>
                    {notification.type === 'success' ? <Check size={20} /> : <X size={20} />}
                    {notification.message}
                </div>
            )}

            {!isEditing && (
                <div style={{ padding: '0 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div>
                            <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '2.25rem', fontWeight: 800 }}>
                                <Layout size={32} color="hsl(var(--primary))" />
                                CMS Pages
                            </h1>
                            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1rem' }}>Ultimate Store Content Management • {pages.length} Pages Managed</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => { setCurrentPage(null); setIsEditing(true); setActiveTab('content'); }}
                                className="btn btn-primary"
                                style={{ padding: '0.8rem 1.8rem', borderRadius: '12px', boxShadow: '0 8px 20px hsl(var(--primary) / 0.3)' }}
                            >
                                <Plus size={20} /> Add New Page
                            </button>
                        </div>
                    </div>

                    <div className="card shadow-premium" style={{ padding: '0', overflow: 'hidden', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '12px' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                <input
                                    type="text"
                                    placeholder="Search pages by title or slug..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: '2.5rem', marginBottom: 0 }}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ padding: '8rem 0', textAlign: 'center' }}>
                                <Loader2 size={40} className="animate-spin" style={{ color: 'hsl(var(--primary))', margin: '0 auto 1.5rem' }} />
                                <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Hydrating content engine...</p>
                            </div>
                        ) : filteredPages.length === 0 ? (
                            <div style={{ padding: '6rem 3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <FileText size={48} style={{ color: 'hsl(var(--text-muted))', marginBottom: '1rem' }} />
                                <h3 style={{ fontSize: '1.5rem' }}>No pages found</h3>
                                <p style={{ color: 'hsl(var(--text-muted))' }}>{searchTerm ? 'Try adjusting your search filters' : 'Start building your store content by adding your first page!'}</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                                    <thead style={{ background: 'hsl(var(--bg-app))' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>Page Title & Path</th>
                                            <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>Status</th>
                                            <th style={{ textAlign: 'left', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>Template</th>
                                            <th style={{ textAlign: 'right', padding: '1rem 1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPages.map((page, idx) => (
                                            <tr key={page.id} style={{ borderBottom: '1px solid hsl(var(--border-subtle))' }}>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '10px',
                                                            background: page.is_published ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--bg-app))',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                        }}>
                                                            <FileText size={18} color={page.is_published ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'} />
                                                        </div>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'hsl(var(--text-main))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page.title}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
                                                                <code>/page/{page.slug}</code>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        background: page.status === 'published' ? '#dcfce7' : page.status === 'scheduled' ? '#dbeafe' : '#f3f4f6',
                                                        color: page.status === 'published' ? '#166534' : page.status === 'scheduled' ? '#1e40af' : '#374151'
                                                    }}>
                                                        {page.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
                                                        {page.template || 'default'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => {
                                                                setCurrentPage(page);
                                                                setOgImageUrl(page.og_image || '');
                                                                setFeaturedImageUrl(page.featured_image || '');
                                                                setIsEditing(true);
                                                                setActiveTab('content');
                                                            }}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', border: '1px solid hsl(var(--border-subtle))' }}
                                                            title="Edit Page"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <a
                                                            href={page.slug === 'home' ? '/' : `/page/${page.slug}`}
                                                            target="_blank"
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', border: '1px solid hsl(var(--border-subtle))' }}
                                                            title="View Page"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDelete(page.id)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', color: '#dc2626', border: '1px solid #fee2e2' }}
                                                            title="Delete Page"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isEditing && (
                <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                    <div style={{
                        background: 'hsl(var(--bg-card))', width: '100%', maxWidth: '1200px',
                        borderRadius: '32px', display: 'flex', flexDirection: 'column', margin: '0 auto',
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border-subtle))',
                        position: 'relative', overflow: 'hidden', minHeight: '85vh'
                    }}>
                        {/* Editor Header */}
                        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsl(var(--bg-app))' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Layout size={24} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{currentPage ? `Edit: ${currentPage.title}` : 'Build New Experience'}</h2>
                                    <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '0.2rem' }}>
                                        {currentPage ? `System refined on ${new Date(currentPage.updated_at).toLocaleDateString()}` : 'Configuring initial content module'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="button" onClick={() => setShowPreview(true)} className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', borderRadius: '14px', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <Eye size={18} /> Preview Page
                                </button>
                                <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '14px' }}>
                                    {saving && <Loader2 size={18} className="animate-spin" />} {currentPage ? 'Apply Changes' : 'Initialize Page'}
                                </button>
                                <button
                                    onClick={() => { setIsEditing(false); setActiveTab('content'); }}
                                    style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Editor Navigation (Tabs) */}
                        <div style={{ display: 'flex', background: '#ffffff', borderBottom: '1px solid hsl(var(--border-subtle))', padding: '0 1rem' }}>
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        padding: '1.25rem 2.5rem', border: 'none', background: 'transparent', cursor: 'pointer',
                                        fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        color: activeTab === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                        borderBottom: `3px solid ${activeTab === tab.id ? 'hsl(var(--primary))' : 'transparent'}`,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <tab.icon size={18} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Editor Body (Forms) */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '3rem' }} id="cms-editor-body">
                            <form id="cms-page-form" style={{ maxWidth: '900px', margin: '0 auto' }}>

                                <div className="animate-fade" style={{ display: activeTab === 'content' ? 'block' : 'none' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '3rem' }}>
                                        <div>
                                            <label style={labelStyle}>Page Heading (Big Title)</label>
                                            <input name="title" required placeholder="What is this page about?" defaultValue={currentPage?.title} onChange={(e) => { if (!currentPage) document.querySelector('input[name="slug"]').value = generateSlug(e.target.value); }} style={{ ...inputStyle, fontSize: '1.5rem', fontWeight: 700, padding: '1rem 1.25rem' }} />

                                            <label style={labelStyle}>Interface Builder</label>
                                            <div style={{ background: 'hsl(var(--bg-app))', padding: '0.75rem', borderRadius: '12px 12px 0 0', display: 'flex', gap: '0.5rem', border: '1px solid hsl(var(--border-subtle))', borderBottom: 'none' }}>
                                                <button type="button" onClick={() => formatText('bold')} style={{ padding: '0.4rem 0.8rem', background: 'hsl(var(--text-main))', color: 'hsl(var(--bg-card))', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 800 }}>B</button>
                                                <button type="button" onClick={() => formatText('italic')} style={{ padding: '0.4rem 0.8rem', background: 'hsl(var(--text-main))', color: 'hsl(var(--bg-card))', border: 'none', borderRadius: '6px', cursor: 'pointer', fontStyle: 'italic' }}>I</button>
                                                <button type="button" onClick={() => formatText('h2')} style={{ padding: '0.4rem 0.8rem', background: 'hsl(var(--text-main))', color: 'hsl(var(--bg-card))', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>H2</button>
                                                <button type="button" onClick={() => formatText('link')} style={{ padding: '0.4rem 0.8rem', background: 'hsl(var(--text-main))', color: 'hsl(var(--bg-card))', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Link</button>
                                                <button type="button" onClick={() => formatText('center')} style={{ padding: '0.4rem 0.8rem', background: 'hsl(var(--text-main))', color: 'hsl(var(--bg-card))', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Center</button>
                                            </div>
                                            <textarea name="content" required rows={15} placeholder="Draft your page here using the tools above..." defaultValue={currentPage?.content} style={{ ...inputStyle, borderRadius: '0 0 12px 12px', fontSize: '0.95rem', lineHeight: 1.6, minHeight: '350px', padding: '1.25rem' }} />
                                        </div>

                                        <div>
                                            <div className="card" style={{ padding: '1.25rem', background: 'hsl(var(--bg-app))', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                <label style={labelStyle}>Quick Add Modules</label>
                                                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>Insert industrial content blocks</p>
                                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                    {CONTENT_BLOCKS.map(block => (
                                                        <button
                                                            key={block.name}
                                                            type="button"
                                                            onClick={() => insertBlock(block.content)}
                                                            style={{ padding: '0.75rem', textAlign: 'left', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'hsl(var(--primary))'}
                                                            onMouseLeave={e => e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))'}
                                                        >
                                                            {block.name}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div style={{ marginTop: '2rem' }}>
                                                    <label style={labelStyle}><Globe size={14} /> Link Address</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>/page/</span>
                                                        <input name="slug" required defaultValue={currentPage?.slug} style={{ ...inputStyle, marginBottom: 0, padding: '0.5rem' }} />
                                                    </div>

                                                    <label style={labelStyle}><Lock size={14} /> Visibility Control</label>
                                                    <select name="status" defaultValue={currentPage?.status || 'draft'} style={inputStyle}>
                                                        <option value="draft">Saved Draft (Hidden)</option>
                                                        <option value="published">Live on Website</option>
                                                        <option value="scheduled">Schedule for Later</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-fade" style={{ display: activeTab === 'seo' ? 'block' : 'none' }}>
                                    <div style={{ background: 'hsl(var(--bg-app))', padding: '2rem', borderRadius: '24px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <h3 style={{ marginTop: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
                                            Search Engine Optimization
                                        </h3>

                                        <label style={labelStyle}>Search Title (Keep it short)</label>
                                        <input name="seo_title" placeholder="Leave empty to use page title" defaultValue={currentPage?.seo_title} style={inputStyle} />

                                        <label style={labelStyle}>Short Description (Shows in Google)</label>
                                        <textarea name="meta_description" rows={4} placeholder="Summarize your page for Google search results..." defaultValue={currentPage?.meta_description} style={{ ...inputStyle, minHeight: '100px' }} />

                                        <label style={labelStyle}>Social Sharing Image (OpenGraph URL)</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input name="og_image" value={ogImageUrl} onChange={(e) => setOgImageUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, flex: 1 }} />
                                            <button type="button" onClick={() => { setActiveImageField('og_image'); setShowMediaPicker(true); }} className="btn btn-secondary" style={{ padding: '0.75rem' }}>
                                                <Upload size={16} />
                                            </button>
                                        </div>

                                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'hsl(var(--bg-card))', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle))' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#1a73e8', marginBottom: '0.25rem' }}>www.aiswaryasaree.com/page/{currentPage?.slug || 'preview'}</div>
                                            <div style={{ fontSize: '1.2rem', color: '#1a0dab', fontWeight: 600, marginBottom: '0.25rem' }}>{currentPage?.seo_title || currentPage?.title || 'SEO Title Preview'}</div>
                                            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4 }}>{currentPage?.meta_description || 'Page meta description will appear here in search results. Make it catchy!'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-fade" style={{ display: activeTab === 'appearance' ? 'block' : 'none' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
                                        <div>
                                            <label style={labelStyle}>Layout Template</label>
                                            <select name="template" defaultValue={currentPage?.template || 'default'} style={inputStyle}>
                                                <option value="default">Default Standard Layout</option>
                                                <option value="home">Homepage Style (Full Width)</option>
                                                <option value="landing">Landing Page (No Header/Footer)</option>
                                                <option value="wide">Wide Sidebar Layout</option>
                                            </select>

                                            <label style={labelStyle}>Featured Media (Cover Image)</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input name="featured_image" value={featuredImageUrl} onChange={(e) => setFeaturedImageUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, flex: 1 }} />
                                                <button type="button" onClick={() => { setActiveImageField('featured_image'); setShowMediaPicker(true); }} className="btn btn-secondary" style={{ padding: '0.75rem' }}>
                                                    <Upload size={16} />
                                                </button>
                                            </div>

                                            {featuredImageUrl && (
                                                <img src={featuredImageUrl} alt="Preview" style={{ width: '100%', borderRadius: '12px', height: '200px', objectFit: 'cover', marginTop: '1rem', border: '1px solid hsl(var(--border-subtle))' }} />
                                            )}
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Hierarchy (Parent Page)</label>
                                            <select name="parent_id" defaultValue={currentPage?.parent_id || 'none'} style={inputStyle}>
                                                <option value="none">No Parent (Main Level)</option>
                                                {pages.filter(p => p.id !== currentPage?.id).map(p => (
                                                    <option key={p.id} value={p.id}>{p.title}</option>
                                                ))}
                                            </select>

                                            <label style={labelStyle}>Navigation Order (Low to High)</label>
                                            <input type="number" name="menu_order" min="0" defaultValue={currentPage?.menu_order || 0} style={inputStyle} onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="animate-fade" style={{ display: activeTab === 'advanced' ? 'block' : 'none' }}>
                                    <div style={{ display: 'grid', gap: '2rem' }}>
                                        <div className="card" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                            <label style={{ ...labelStyle, color: '#1e293b' }}><ImageIcon size={14} /> Global Style Override (CSS)</label>
                                            <textarea name="custom_css" rows={8} defaultValue={currentPage?.custom_css} style={{ ...inputStyle, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontFamily: 'var(--font-roboto)', fontWeight: 500 }} placeholder=".hero { background: pink; }" />
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Inject custom CSS scoping only for this specific page.</p>
                                        </div>

                                        <div className="card" style={{ padding: '2.5rem', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                            <label style={{ ...labelStyle, color: '#1e293b' }}><Settings size={14} /> Logic Runtime Script (JS)</label>
                                            <textarea name="custom_js" rows={8} defaultValue={currentPage?.custom_js} style={{ ...inputStyle, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontFamily: 'var(--font-roboto)', fontWeight: 500 }} placeholder="console.log('Page loaded');" />
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Run custom JavaScript functionality when this page is visited.</p>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showPreview && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '1000px', height: '80vh', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>Desktop Preview</div>
                            <button onClick={() => setShowPreview(false)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Close Preview</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '3rem', color: '#334155', fontFamily: 'var(--font-roboto)' }}>
                            <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#0f172a' }}>{document.querySelector('input[name="title"]')?.value}</h1>
                            <div dangerouslySetInnerHTML={{ __html: document.querySelector('textarea[name="content"]')?.value }} />
                        </div>
                    </div>
                </div>
            )}

            {showMediaPicker && (
                <MediaPicker
                    currentImage={activeImageField === 'og_image' ? ogImageUrl : featuredImageUrl}
                    onSelect={(url) => {
                        if (activeImageField === 'og_image') setOgImageUrl(url);
                        else setFeaturedImageUrl(url);
                        setShowMediaPicker(false);
                    }}
                    onClose={() => setShowMediaPicker(false)}
                />
            )}
        </div>
        <style jsx>{`
                @keyframes slideIn { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-enter { animation: fade 0.4s ease-out; }
                .animate-fade { animation: fade 0.3s ease-out; }
                .animate-spin { animation: spin 1s linear infinite; }
                
                .shadow-premium {
                    box-shadow: 0 20px 60px -15px rgba(0,0,0,0.1), 0 10px 30px -10px rgba(0,0,0,0.05);
                }
                
                .btn-icon {
                    width: 42px; height: 42px; border-radius: 12px; border: none;
                    background: hsl(var(--bg-app)); cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s; color: hsl(var(--text-muted));
                }
                .btn-icon svg { display: block; color: inherit; }
                .btn-icon:hover { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }
                .btn-icon.danger { background: #fee2e2; color: #ef4444; }
                .btn-icon.danger:hover { background: #fecaca; color: #dc2626; }
                .btn-icon.primary { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }
                .btn-icon.primary:hover { background: hsl(var(--primary) / 0.2); color: hsl(var(--primary)); }
                
                @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                input:focus, textarea:focus, select:focus {
                    border-color: hsl(var(--primary)) !important;
                    box-shadow: 0 0 0 4px hsl(var(--primary) / 0.1);
                }
            `}</style>

            {/* Live Preview Modal */}
            {showPreview && (
                <ModalPortal>
                    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999 }} onClick={() => setShowPreview(false)}>
                        <div className="modal-box" style={{ maxWidth: '1000px', width: '95%', height: '90vh', background: '#fff', borderRadius: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }} onClick={e => e.stopPropagation()}>
                            <div style={{ padding: '1rem 2rem', background: '#111', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Page Preview</div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{document.querySelector('input[name="title"]')?.value || currentPage?.title || 'Untitled Page'}</h3>
                                </div>
                                <button onClick={() => setShowPreview(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Close Preview </button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 2rem', background: '#fff' }}>
                                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', color: '#111' }}>
                                        {document.querySelector('input[name="title"]')?.value || currentPage?.title}
                                    </h1>
                                    <div 
                                        className="cms-content"
                                        dangerouslySetInnerHTML={{ __html: document.querySelector('textarea[name="content"]')?.value || currentPage?.content || '<p style="color: #999;">No content written yet...</p>' }}
                                        style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#333' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Confirm Modal */}
            {confirmAction && (
                <ModalPortal>
                <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
                    <div className="modal-box shadow-premium" style={{ maxWidth: '440px', padding: '3.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{
                            width: '88px', height: '88px', borderRadius: '30px',
                            background: '#fef2f2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem',
                            color: '#ef4444', transform: 'rotate(-5deg)',
                            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)'
                        }}>
                           <div style={{ transform: 'rotate(5deg)' }}>
                                <Trash2 size={40} strokeWidth={2} />
                           </div>
                        </div>
                        <h3 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.75rem', color: '#1a1a1a', letterSpacing: '-0.02em' }}>
                            {confirmAction.title}
                        </h3>
                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1rem', marginBottom: '2.5rem' }}>
                            {confirmAction.message}
                        </p>
                        <div className="modal-actions" style={{ gap: '0.75rem' }}>
                            <button 
                                onClick={() => setConfirmAction(null)} 
                                className="modal-btn modal-btn-secondary" 
                                style={{ flex: 1, height: '52px', borderRadius: '16px', fontWeight: 700 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction.onConfirm}
                                className="modal-btn modal-btn-primary"
                                style={{
                                    flex: 1.5, background: '#ef4444', height: '52px', borderRadius: '16px', fontWeight: 800,
                                    boxShadow: '0 8px 20px -5px rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                {confirmAction.btnText || 'Confirm Action'}
                            </button>
                        </div>
                    </div>
                </div>
                </ModalPortal>
            )}
        </>
    );
}
