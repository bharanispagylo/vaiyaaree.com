'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit3, Trash2, CheckCircle, XCircle, FolderPlus,
    Loader2, X, Check, Eye, RefreshCw, AlertCircle, Package
} from 'lucide-react';
import ModalPortal from '@/components/ModalPortal';

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export default function AdminCategoriesPage() {
    const router = useRouter();

    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state for Add/Edit Category
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Category Form fields (Clean: Name, Slug, Status only)
    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formStatus, setFormStatus] = useState('active');
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [formError, setFormError] = useState('');

    // Read-only View Assigned Products modal
    const [viewingCategoryProducts, setViewingCategoryProducts] = useState(null);
    const [viewingProductsList, setViewingProductsList] = useState([]);
    const [isProductsLoading, setIsProductsLoading] = useState(false);

    // Delete Modal
    const [deletingCategory, setDeletingCategory] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toast alert
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Fetch All Categories
    const fetchCategories = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const catRes = await fetch('/api/admin/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const catData = await catRes.json();
            if (catRes.ok && catData.categories) {
                setCategories(catData.categories);
            } else {
                setCategories([]);
            }
        } catch (err) {
            console.error('Error loading categories:', err);
            showToast('Failed to load categories', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Open Modal for Create
    const handleOpenCreateModal = () => {
        setEditingCategory(null);
        setFormName('');
        setFormSlug('');
        setFormStatus('active');
        setIsSlugManuallyEdited(false);
        setFormError('');
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const handleOpenEditModal = (cat) => {
        setEditingCategory(cat);
        setFormName(cat.name);
        setFormSlug(cat.slug);
        setFormStatus(cat.status || 'active');
        // Only consider slug manually edited if it diverged from the auto-slug of the category name
        const wasCustom = Boolean(cat.slug && cat.name && cat.slug !== slugify(cat.name));
        setIsSlugManuallyEdited(wasCustom);
        setFormError('');
        setIsModalOpen(true);
    };

    // Open Read-Only View Products Modal
    const handleOpenViewProductsModal = async (cat) => {
        setViewingCategoryProducts(cat);
        setViewingProductsList([]);
        setIsProductsLoading(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch(`/api/admin/categories/${cat.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.assignedProducts) {
                setViewingProductsList(data.assignedProducts);
            }
        } catch (err) {
            console.error('Error fetching category assigned products:', err);
        } finally {
            setIsProductsLoading(false);
        }
    };

    // Name change handler with auto-slugify
    const handleNameChange = (e) => {
        const val = e.target.value;
        setFormName(val);
        if (!isSlugManuallyEdited) {
            setFormSlug(slugify(val));
        }
    };

    // Slug change handler
    const handleSlugChange = (e) => {
        const val = e.target.value;
        setFormSlug(val);
        // If user clears the slug or sets it to match the auto-slug of the current name, resume auto-sync
        if (!val.trim() || val.trim() === slugify(formName)) {
            setIsSlugManuallyEdited(false);
        } else {
            setIsSlugManuallyEdited(true);
        }
    };

    // Save Category (Create or Edit)
    const handleSaveCategory = async () => {
        setFormError('');
        if (!formName.trim()) {
            setFormError('Category Name is required.');
            return;
        }

        const finalSlug = formSlug.trim() ? slugify(formSlug) : slugify(formName);
        if (!finalSlug) {
            setFormError('A valid Category Slug is required.');
            return;
        }

        // Prevent setting category status to 'inactive' if it has assigned products
        if (formStatus === 'inactive' && editingCategory && (editingCategory.productCount || 0) > 0) {
            setFormError(`Cannot set category "${editingCategory.name}" to Inactive. It has ${editingCategory.productCount} assigned ${editingCategory.productCount === 1 ? 'product' : 'products'}. Please reassign or change the category of these products on the Product Add/Edit page first.`);
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const payload = {
                name: formName.trim(),
                slug: finalSlug,
                status: formStatus
            };

            const url = editingCategory
                ? `/api/admin/categories/${editingCategory.id}`
                : '/api/admin/categories';
            const method = editingCategory ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save category');
            }

            showToast(`Category "${formName}" ${editingCategory ? 'updated' : 'created'} successfully!`, 'success');
            setIsModalOpen(false);
            fetchCategories();
        } catch (err) {
            setFormError(err.message || 'Failed to save category');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Category
    const handleDeleteCategory = async () => {
        if (!deletingCategory) return;
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch(`/api/admin/categories/${deletingCategory.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete category');

            showToast(`Category "${deletingCategory.name}" deleted successfully!`, 'success');
            setDeletingCategory(null);
            fetchCategories();
        } catch (err) {
            showToast(err.message || 'Delete failed', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // Filter categories list by search query
    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) return categories;
        const q = searchTerm.toLowerCase();
        return categories.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.slug || '').toLowerCase().includes(q)
        );
    }, [categories, searchTerm]);

    return (
        <div style={{ padding: '2rem 2.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'hsl(var(--text-main))', margin: 0 }}>
                        Product Category Management
                    </h1>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', marginTop: '0.35rem', fontWeight: 500 }}>
                        Create and manage active/inactive product categories. (Product assignments are made on Product Add/Edit page).
                    </p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="btn btn-primary"
                    style={{ padding: '0.85rem 1.75rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 700, fontSize: '0.95rem' }}
                >
                    <Plus size={20} />
                    Add Category
                </button>
            </div>

            {/* Toolbar */}
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search category name or slug..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '0.8rem 1rem 0.8rem 3.25rem', borderRadius: '12px',
                            border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.95rem'
                        }}
                    />
                </div>
                <button
                    onClick={fetchCategories}
                    className="btn-icon primary"
                    title="Refresh Categories"
                    style={{ width: '44px', height: '44px', borderRadius: '12px' }}
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table */}
            <div style={{ background: '#ffffff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                {loading ? (
                    <div style={{ padding: '5rem', textAlign: 'center' }}>
                        <Loader2 className="animate-spin" size={42} style={{ color: 'hsl(var(--primary))', marginBottom: '1rem' }} />
                        <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Loading categories...</p>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div style={{ padding: '5rem', textAlign: 'center' }}>
                        <FolderPlus size={56} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                        <h3 style={{ margin: '0 0 0.5rem', color: '#334155' }}>No Categories Found</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Create a category to begin grouping products.</p>
                        <button onClick={handleOpenCreateModal} className="btn btn-primary" style={{ borderRadius: '12px', padding: '0.75rem 1.5rem' }}>
                            + Create First Category
                        </button>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '1.1rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Category</th>
                                <th style={{ padding: '1.1rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Slug</th>
                                <th style={{ padding: '1.1rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Assigned Products</th>
                                <th style={{ padding: '1.1rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Status</th>
                                <th style={{ padding: '1.1rem 1.5rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map(cat => (
                                <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{cat.name}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <code style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                                            {cat.slug}
                                        </code>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenViewProductsModal(cat)}
                                            style={{
                                                background: 'rgba(15, 23, 42, 0.06)', color: '#334155',
                                                padding: '5px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700,
                                                border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                transition: 'all 0.2s'
                                            }}
                                            title="View assigned products (Display only)"
                                        >
                                            <Eye size={14} />
                                            {cat.productCount} {cat.productCount === 1 ? 'product' : 'products'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        {cat.status === 'active' ? (
                                            <span style={{
                                                background: '#dcfce7', color: '#15803d',
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800,
                                                display: 'inline-flex', alignItems: 'center', gap: '5px'
                                            }}>
                                                <CheckCircle size={14} /> Active
                                            </span>
                                        ) : (
                                            <span style={{
                                                background: '#f1f5f9', color: '#64748b',
                                                padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                                                display: 'inline-flex', alignItems: 'center', gap: '5px'
                                            }}>
                                                <XCircle size={14} /> Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleOpenEditModal(cat)}
                                                className="btn-icon primary"
                                                title="Edit Category Details"
                                                style={{ width: '36px', height: '36px', borderRadius: '10px' }}
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setDeletingCategory(cat)}
                                                className="btn-icon danger"
                                                title="Delete Category"
                                                style={{ width: '36px', height: '36px', borderRadius: '10px' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/*  CREATE / EDIT CATEGORY MODAL (Clean Form)  */}
            {isModalOpen && (
                <ModalPortal>
                    <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                        <div
                            className="modal-box shadow-premium"
                            onClick={e => e.stopPropagation()}
                            style={{
                                maxWidth: '540px', width: '92vw',
                                display: 'flex', flexDirection: 'column', padding: 0,
                                borderRadius: '24px', background: '#ffffff', overflow: 'hidden'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                                        {editingCategory ? 'Edit Category' : 'Add Product Category'}
                                    </h2>
                                    <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>
                                        Set category name, custom slug, and visibility status.
                                    </p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="btn-icon danger" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '1.75rem' }}>
                                {formError && (
                                    <div style={{
                                        background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                                        padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.25rem',
                                        display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', fontWeight: 600
                                    }}>
                                        <AlertCircle size={18} />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                {/* Category Name */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Category Name <span style={{ color: '#dc2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Cotton Sarees"
                                        value={formName}
                                        onChange={handleNameChange}
                                        style={{
                                            width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                                            border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* Category Slug */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                        <label style={{ fontSize: '0.825rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Category Slug <span style={{ color: '#dc2626' }}>*</span>
                                        </label>
                                        {isSlugManuallyEdited ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormSlug(slugify(formName));
                                                    setIsSlugManuallyEdited(false);
                                                }}
                                                style={{
                                                    border: 'none', background: 'none', color: 'hsl(var(--primary))',
                                                    fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '4px', padding: 0
                                                }}
                                                title="Reset slug to automatically match Category Name"
                                            >
                                                <RefreshCw size={11} /> Sync with Name
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Check size={12} /> Auto-syncing with Name
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="e.g. cotton-sarees"
                                        value={formSlug}
                                        onChange={handleSlugChange}
                                        style={{
                                            width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                                            border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* Status */}
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Category Status
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={e => setFormStatus(e.target.value)}
                                        style={{
                                            width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                                            border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', background: '#fff'
                                        }}
                                    >
                                        <option value="active">Active (Selectable in Product Add/Edit & Shop filter)</option>
                                        <option value="inactive">Inactive (Hidden from customer filters & new product assignments)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn modal-btn-secondary"
                                    style={{ borderRadius: '12px', padding: '0.75rem 1.5rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCategory}
                                    disabled={isSaving}
                                    className="btn modal-btn-primary"
                                    style={{ borderRadius: '12px', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                    {isSaving ? 'Saving...' : 'Save Category'}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/*  READ-ONLY VIEW ASSIGNED PRODUCTS MODAL  */}
            {viewingCategoryProducts && (
                <ModalPortal>
                    <div className="modal-overlay" onClick={() => setViewingCategoryProducts(null)}>
                        <div
                            className="modal-box shadow-premium"
                            onClick={e => e.stopPropagation()}
                            style={{
                                maxWidth: '680px', width: '92vw', maxHeight: '85vh',
                                display: 'flex', flexDirection: 'column', padding: 0,
                                borderRadius: '24px', background: '#ffffff', overflow: 'hidden'
                            }}
                        >
                            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                                        Assigned Products — {viewingCategoryProducts.name}
                                    </h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: '#64748b', fontWeight: 500 }}>
                                        Display-only details of products in this category ({viewingProductsList.length} items). Product category assignment is managed on the Product Add/Edit page.
                                    </p>
                                </div>
                                <button onClick={() => setViewingCategoryProducts(null)} className="btn-icon danger" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                                {isProductsLoading ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                        <Loader2 className="animate-spin" size={32} style={{ marginBottom: '0.75rem', color: 'hsl(var(--primary))' }} />
                                        <p style={{ margin: 0, fontWeight: 600 }}>Loading assigned products...</p>
                                    </div>
                                ) : viewingProductsList.length === 0 ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <Package size={48} style={{ marginBottom: '0.75rem', strokeWidth: 1.5 }} />
                                        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>No products currently assigned to "{viewingCategoryProducts.name}".</p>
                                        <p style={{ margin: '6px 0 0', fontSize: '0.825rem' }}>Assign products to this category on the Product Add / Edit page.</p>
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Product</th>
                                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>SKU</th>
                                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Price</th>
                                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', textAlign: 'right' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewingProductsList.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <img
                                                                src={p.image_url?.split(',')[0] || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100&q=80'}
                                                                alt={p.name}
                                                                style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', background: '#f1f5f9' }}
                                                                onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100&q=80'; }}
                                                            />
                                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{p.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: '#475569', fontWeight: 600 }}>{p.sku || 'N/A'}</td>
                                                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>₹{(p.price || 0).toLocaleString()}</td>
                                                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                                        {p.is_active !== false ? (
                                                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>Active</span>
                                                        ) : (
                                                            <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>Inactive</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', textAlign: 'right' }}>
                                <button onClick={() => setViewingCategoryProducts(null)} className="btn modal-btn-secondary" style={{ borderRadius: '10px', padding: '0.6rem 1.5rem' }}>
                                    Close Window
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/*  DELETE CONFIRMATION MODAL WITH PRODUCT SAFETY  */}
            {deletingCategory && (
                <ModalPortal>
                    <div className="modal-overlay" onClick={() => setDeletingCategory(null)}>
                        <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '2rem', borderRadius: '24px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    background: deletingCategory.productCount > 0 ? '#fffbebfb' : '#fef2f2',
                                    color: deletingCategory.productCount > 0 ? '#d97706' : '#dc2626',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
                                }}>
                                    {deletingCategory.productCount > 0 ? <AlertCircle size={28} /> : <Trash2 size={28} />}
                                </div>

                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#0f172a' }}>
                                    {deletingCategory.productCount > 0 ? 'Category Has Assigned Products' : 'Delete Category?'}
                                </h3>

                                {deletingCategory.productCount > 0 ? (
                                    <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>
                                        Category <strong>"{deletingCategory.name}"</strong> currently has <strong>{deletingCategory.productCount} assigned products</strong>.
                                        <br /><br />
                                        Please reassign or change the category of these products on the <strong>Product Add / Edit</strong> page before deleting, or set this category status to <strong>Inactive</strong> instead.
                                    </p>
                                ) : (
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                                        Are you sure you want to delete category <strong>"{deletingCategory.name}"</strong>? This action cannot be undone.
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setDeletingCategory(null)}
                                    className="btn modal-btn-secondary"
                                    style={{ borderRadius: '12px', padding: '0.75rem 1.5rem', flex: 1 }}
                                >
                                    Cancel
                                </button>
                                {deletingCategory.productCount === 0 && (
                                    <button
                                        onClick={handleDeleteCategory}
                                        disabled={isDeleting}
                                        className="btn danger"
                                        style={{ borderRadius: '12px', padding: '0.75rem 1.5rem', flex: 1, background: '#dc2626', color: 'white' }}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete Category'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/*  TOAST ALERT  */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
                    background: toast.type === 'error' ? '#1e293b' : '#0f172a',
                    color: '#ffffff', padding: '1rem 1.75rem', borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    fontSize: '0.95rem', fontWeight: 600, borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : '#22c55e'}`
                }}>
                    {toast.type === 'error' ? <AlertCircle size={20} color="#ef4444" /> : <CheckCircle size={20} color="#22c55e" />}
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
