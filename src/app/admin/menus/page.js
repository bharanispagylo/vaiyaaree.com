'use client';

import { useState, useEffect } from 'react';
import {
    Compass, Save, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
    CornerDownRight, Check, X, Loader2, ExternalLink, RefreshCcw, Layers, FileText,
    Link as LinkIcon, GripVertical, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import styles from './page.module.css';

export default function AdminNavigationMenusPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    // Menu state
    const [selectedMenuId, setSelectedMenuId] = useState('menu_primary');
    const [menuName, setMenuName] = useState('Primary Header Navigation');
    const [availableMenus, setAvailableMenus] = useState([]);
    const [menuItems, setMenuItems] = useState([]);

    // Accordion panels state (left column)
    const [expandedAccordion, setExpandedAccordion] = useState('pages'); // 'pages' | 'categories' | 'custom'
    const [availablePages, setAvailablePages] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);

    // Checkbox selections for batch add
    const [selectedPages, setSelectedPages] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);

    // Custom link form
    const [customUrl, setCustomUrl] = useState('');
    const [customLabel, setCustomLabel] = useState('');

    // Expanded drawer items in the menu structure
    const [expandedItemIds, setExpandedItemIds] = useState({});

    // Drag-and-drop tracking
    const [draggedIndex, setDraggedIndex] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Load Menu Data
    const fetchMenuData = async (menuId = selectedMenuId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const res = await fetch(`/api/admin/menus?menuId=${menuId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setMenuName(data.menu?.name || 'Primary Header Navigation');
                setMenuItems(data.items || []);
                setAvailableMenus(data.availableMenus || []);
                setAvailablePages(data.availablePages || []);
                setAvailableCategories(data.availableCategories || []);
            } else {
                showToast(data.error || 'Failed to load menu data', 'error');
            }
        } catch (err) {
            console.error('[ADMIN-MENUS] Error loading menu:', err);
            showToast('Connection error loading menus', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuData(selectedMenuId);
    }, [selectedMenuId]);

    // Save Menu to Server
    const handleSaveMenu = async () => {
        if (!menuName.trim()) {
            showToast('Please enter a Menu Name', 'error');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('cast_prince_admin') || '';
            const payload = {
                menuId: selectedMenuId,
                menuName: menuName.trim(),
                items: menuItems.map((item, index) => ({
                    ...item,
                    display_order: index + 1
                }))
            };

            const res = await fetch('/api/admin/menus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Menu structure saved successfully!');
                if (data.items) {
                    setMenuItems(data.items);
                }
            } else {
                showToast(data.error || 'Failed to save menu', 'error');
            }
        } catch (err) {
            console.error('[ADMIN-MENUS] Save error:', err);
            showToast('Error connecting to server', 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── ADD TO MENU HANDLERS ──────────────────────────────────────────────────
    const handleAddPages = () => {
        if (selectedPages.length === 0) return;

        const newItems = selectedPages.map(pageId => {
            const page = availablePages.find(p => p.id === pageId);
            return {
                id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: page.title,
                url: page.url,
                target: '_self',
                item_type: 'page',
                badge_text: null,
                parent_id: null,
                is_active: 1
            };
        });

        setMenuItems(prev => [...prev, ...newItems]);
        setSelectedPages([]);
        showToast(`Added ${newItems.length} page(s) to menu`);
    };

    const handleAddCategories = () => {
        if (selectedCategories.length === 0) return;

        const newItems = selectedCategories.map(catId => {
            const cat = availableCategories.find(c => c.id === catId);
            return {
                id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: cat.title,
                url: cat.url,
                target: '_self',
                item_type: 'category',
                badge_text: null,
                parent_id: null,
                is_active: 1
            };
        });

        setMenuItems(prev => [...prev, ...newItems]);
        setSelectedCategories([]);
        showToast(`Added ${newItems.length} category link(s) to menu`);
    };

    const handleAddCustomLink = (e) => {
        if (e) e.preventDefault();
        if (!customLabel.trim() || !customUrl.trim()) {
            showToast('Please provide both URL and Link Text', 'error');
            return;
        }

        const newItem = {
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: customLabel.trim(),
            url: customUrl.trim(),
            target: '_self',
            item_type: 'custom',
            badge_text: null,
            parent_id: null,
            is_active: 1
        };

        setMenuItems(prev => [...prev, newItem]);
        setCustomUrl('');
        setCustomLabel('');
        showToast(`Added custom link "${newItem.title}" to menu`);
    };

    // ─── ITEM REORDERING & NESTING (SUBMENU) ──────────────────────────────────
    const moveItem = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= menuItems.length) return;

        const updated = [...menuItems];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);

        setMenuItems(updated);
    };

    // Indent (make child of previous item)
    const handleIndentItem = (index) => {
        if (index === 0) return; // Top item cannot be indented
        const previousItem = menuItems[index - 1];
        if (!previousItem) return;

        // If previous item is already a subitem, attach to previous item's parent or previous item directly
        const targetParentId = previousItem.parent_id || previousItem.id;

        setMenuItems(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], parent_id: targetParentId };
            return copy;
        });
    };

    // Outdent (promote child back to top level)
    const handleOutdentItem = (index) => {
        setMenuItems(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], parent_id: null };
            return copy;
        });
    };

    const removeItem = (id) => {
        setMenuItems(prev => {
            // Also detach or delete children
            return prev
                .filter(item => item.id !== id)
                .map(item => item.parent_id === id ? { ...item, parent_id: null } : item);
        });
        showToast('Item removed from menu');
    };

    const updateItemField = (id, field, value) => {
        setMenuItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const toggleItemDrawer = (id) => {
        setExpandedItemIds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Drag-and-drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const updated = [...menuItems];
        const [dragged] = updated.splice(draggedIndex, 1);
        updated.splice(index, 0, dragged);

        setDraggedIndex(index);
        setMenuItems(updated);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // Reset to initial defaults
    const handleResetDefaults = () => {
        const defaultItems = [
            { id: 'item_home', title: 'Home', url: '/', target: '_self', item_type: 'page', parent_id: null, is_active: 1 },
            { id: 'item_shop', title: 'Shop Collections', url: '/shop', target: '_self', item_type: 'page', parent_id: null, is_active: 1 },
            { id: 'item_heritage', title: 'Our Heritage', url: '/about-us', target: '_self', item_type: 'page', parent_id: null, is_active: 1 },
            { id: 'item_contact', title: 'Contact', url: '/contact', target: '_self', item_type: 'page', parent_id: null, is_active: 1 }
        ];
        setMenuItems(defaultItems);
        showToast('Reset to default navigation structure (Click "Save Menu" to commit)');
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleArea}>
                    <h1>Navigation Menus</h1>
                    <p className={styles.subtitle}>
                        Manage and structure header links, dropdown submenus, and badges for your storefront.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        className={styles.resetBtn}
                        title="Reset to core defaults"
                    >
                        <RefreshCcw size={15} />
                        Reset Defaults
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveMenu}
                        disabled={saving}
                        className={styles.saveBtn}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Menu
                    </button>
                </div>
            </div>

            {/* Menu Selector Bar */}
            <div className={styles.menuSelectorBar}>
                <div className={styles.selectorLabel}>
                    <Compass size={18} style={{ color: '#a06650' }} />
                    <span>Select a menu to edit:</span>
                    <select
                        value={selectedMenuId}
                        onChange={(e) => setSelectedMenuId(e.target.value)}
                        className={styles.menuSelect}
                    >
                        {availableMenus.length > 0 ? (
                            availableMenus.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.name} ({m.location || 'Header'})
                                </option>
                            ))
                        ) : (
                            <option value="menu_primary">Primary Header Navigation</option>
                        )}
                    </select>
                </div>
                <span style={{ fontSize: '0.82rem', color: '#7c8675' }}>
                    Theme Location: <strong>Header Main Navigation Bar</strong>
                </span>
            </div>

            {/* 2-Column WordPress Layout */}
            <div className={styles.layout}>
                {/* ─── LEFT COLUMN: ADD MENU ITEMS ────────────────────────────── */}
                <div className={styles.leftColumn}>
                    <h3 className={styles.columnHeading}>Add Menu Items</h3>

                    {/* Accordion 1: Pages */}
                    <div className={styles.accordionCard}>
                        <button
                            type="button"
                            className={styles.accordionHeader}
                            onClick={() => setExpandedAccordion(expandedAccordion === 'pages' ? null : 'pages')}
                        >
                            <span className={styles.accordionTitle}>
                                <FileText size={16} style={{ color: '#a06650' }} />
                                Storefront Pages
                            </span>
                            {expandedAccordion === 'pages' ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        {expandedAccordion === 'pages' && (
                            <div className={styles.accordionBody}>
                                <div className={styles.itemList}>
                                    {availablePages.map(page => (
                                        <label key={page.id} className={styles.checkboxRow}>
                                            <input
                                                type="checkbox"
                                                checked={selectedPages.includes(page.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedPages(prev => [...prev, page.id]);
                                                    } else {
                                                        setSelectedPages(prev => prev.filter(id => id !== page.id));
                                                    }
                                                }}
                                            />
                                            <span>{page.title}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className={styles.selectActions}>
                                    <button
                                        type="button"
                                        className={styles.selectToggleBtn}
                                        onClick={() => {
                                            if (selectedPages.length === availablePages.length) {
                                                setSelectedPages([]);
                                            } else {
                                                setSelectedPages(availablePages.map(p => p.id));
                                            }
                                        }}
                                    >
                                        {selectedPages.length === availablePages.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.addBtn}
                                        onClick={handleAddPages}
                                        disabled={selectedPages.length === 0}
                                    >
                                        Add to Menu
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Accordion 2: Categories */}
                    <div className={styles.accordionCard}>
                        <button
                            type="button"
                            className={styles.accordionHeader}
                            onClick={() => setExpandedAccordion(expandedAccordion === 'categories' ? null : 'categories')}
                        >
                            <span className={styles.accordionTitle}>
                                <Layers size={16} style={{ color: '#a06650' }} />
                                Product Categories
                            </span>
                            {expandedAccordion === 'categories' ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        {expandedAccordion === 'categories' && (
                            <div className={styles.accordionBody}>
                                <div className={styles.itemList}>
                                    {availableCategories.length > 0 ? (
                                        availableCategories.map(cat => (
                                            <label key={cat.id} className={styles.checkboxRow}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.includes(cat.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedCategories(prev => [...prev, cat.id]);
                                                        } else {
                                                            setSelectedCategories(prev => prev.filter(id => id !== cat.id));
                                                        }
                                                    }}
                                                />
                                                <span>{cat.title}</span>
                                            </label>
                                        ))
                                    ) : (
                                        <p style={{ fontSize: '0.84rem', color: '#7c8675', margin: '0.5rem 0' }}>
                                            No active categories found in database.
                                        </p>
                                    )}
                                </div>
                                <div className={styles.selectActions}>
                                    <button
                                        type="button"
                                        className={styles.selectToggleBtn}
                                        onClick={() => {
                                            if (selectedCategories.length === availableCategories.length) {
                                                setSelectedCategories([]);
                                            } else {
                                                setSelectedCategories(availableCategories.map(c => c.id));
                                            }
                                        }}
                                    >
                                        {selectedCategories.length === availableCategories.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.addBtn}
                                        onClick={handleAddCategories}
                                        disabled={selectedCategories.length === 0}
                                    >
                                        Add to Menu
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Accordion 3: Custom Links */}
                    <div className={styles.accordionCard}>
                        <button
                            type="button"
                            className={styles.accordionHeader}
                            onClick={() => setExpandedAccordion(expandedAccordion === 'custom' ? null : 'custom')}
                        >
                            <span className={styles.accordionTitle}>
                                <LinkIcon size={16} style={{ color: '#a06650' }} />
                                Custom Links
                            </span>
                            {expandedAccordion === 'custom' ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>

                        {expandedAccordion === 'custom' && (
                            <form onSubmit={handleAddCustomLink} className={styles.accordionBody}>
                                <div className={styles.formGroup}>
                                    <label>URL</label>
                                    <input
                                        type="text"
                                        value={customUrl}
                                        onChange={(e) => setCustomUrl(e.target.value)}
                                        placeholder="https:// or /shop?tag=silk"
                                        className={styles.inputField}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Link Text</label>
                                    <input
                                        type="text"
                                        value={customLabel}
                                        onChange={(e) => setCustomLabel(e.target.value)}
                                        placeholder="e.g. Bridal Sarees"
                                        className={styles.inputField}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                    <button
                                        type="submit"
                                        className={styles.addBtn}
                                        disabled={!customUrl.trim() || !customLabel.trim()}
                                    >
                                        Add to Menu
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* ─── RIGHT COLUMN: MENU STRUCTURE ───────────────────────────── */}
                <div className={styles.rightColumn}>
                    <div className={styles.menuMetaHeader}>
                        <div className={styles.menuNameInputWrap}>
                            <label className={styles.menuNameLabel}>Menu Name:</label>
                            <input
                                type="text"
                                value={menuName}
                                onChange={(e) => setMenuName(e.target.value)}
                                className={styles.menuNameInput}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveMenu}
                            disabled={saving}
                            className={styles.saveBtn}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Menu
                        </button>
                    </div>

                    {/* Tree List */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: '#a06650', margin: '0 auto' }} />
                            <p style={{ marginTop: '0.75rem', color: '#7c8675', fontSize: '0.9rem' }}>Loading menu structure...</p>
                        </div>
                    ) : menuItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Compass size={40} style={{ color: '#a06650', opacity: 0.6 }} />
                            <h4>Your menu is empty</h4>
                            <p>Add pages, categories, or custom links from the left panel to populate this menu.</p>
                        </div>
                    ) : (
                        <div className={styles.treeList}>
                            {menuItems.map((item, index) => {
                                const isSubItem = Boolean(item.parent_id);
                                const isExpanded = Boolean(expandedItemIds[item.id]);
                                const canIndent = index > 0 && !isSubItem;
                                const canOutdent = isSubItem;

                                // Potential parents: only top-level items preceding this one
                                const potentialParents = menuItems
                                    .slice(0, index)
                                    .filter(p => !p.parent_id && p.id !== item.id);

                                return (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={`${styles.menuItemCard} ${isSubItem ? styles.isSubItem : ''}`}
                                    >
                                        <div
                                            className={styles.itemHeaderRow}
                                            onClick={() => toggleItemDrawer(item.id)}
                                        >
                                            <div className={styles.itemLeftInfo}>
                                                <div
                                                    className={styles.dragHandle}
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Drag to reorder"
                                                >
                                                    <GripVertical size={18} />
                                                </div>
                                                <span className={styles.itemTitle}>{item.title}</span>
                                                {isSubItem && <span className={styles.subItemPill}>Sub item</span>}
                                                {item.badge_text && (
                                                    <span className={styles.itemPillBadge}>{item.badge_text}</span>
                                                )}
                                                <span className={styles.typeBadge}>{item.item_type || 'Custom'}</span>
                                                {item.is_active === 0 && (
                                                    <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600 }}>Hidden</span>
                                                )}
                                            </div>

                                            <div className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
                                                {/* Reorder Buttons */}
                                                <button
                                                    type="button"
                                                    onClick={() => moveItem(index, -1)}
                                                    disabled={index === 0}
                                                    className={styles.iconBtn}
                                                    title="Move Up"
                                                >
                                                    <ArrowUp size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveItem(index, 1)}
                                                    disabled={index === menuItems.length - 1}
                                                    className={styles.iconBtn}
                                                    title="Move Down"
                                                >
                                                    <ArrowDown size={15} />
                                                </button>

                                                {/* Indent / Outdent Submenu Buttons */}
                                                {canIndent && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleIndentItem(index)}
                                                        className={styles.iconBtn}
                                                        title="Make Sub-item (Dropdown child of item above)"
                                                        style={{ color: '#a06650' }}
                                                    >
                                                        <CornerDownRight size={15} />
                                                    </button>
                                                )}
                                                {canOutdent && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOutdentItem(index)}
                                                        className={styles.iconBtn}
                                                        title="Promote to Top Level"
                                                        style={{ color: '#2563eb' }}
                                                    >
                                                        <ArrowUp size={15} style={{ transform: 'rotate(-45deg)' }} />
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => toggleItemDrawer(item.id)}
                                                    className={styles.iconBtn}
                                                    title="Configure Item"
                                                >
                                                    {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Item Settings Drawer */}
                                        {isExpanded && (
                                            <div className={styles.itemDrawer}>
                                                <div className={styles.formGroup}>
                                                    <label>Navigation Label</label>
                                                    <input
                                                        type="text"
                                                        value={item.title || ''}
                                                        onChange={(e) => updateItemField(item.id, 'title', e.target.value)}
                                                        className={styles.inputField}
                                                    />
                                                </div>

                                                <div className={styles.formGroup}>
                                                    <label>URL Destination</label>
                                                    <input
                                                        type="text"
                                                        value={item.url || ''}
                                                        onChange={(e) => updateItemField(item.id, 'url', e.target.value)}
                                                        className={styles.inputField}
                                                    />
                                                </div>

                                                <div className={styles.formGroup}>
                                                    <label>Badge Text (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={item.badge_text || ''}
                                                        onChange={(e) => updateItemField(item.id, 'badge_text', e.target.value)}
                                                        placeholder="e.g. NEW, HOT, SALE"
                                                        className={styles.inputField}
                                                    />
                                                </div>

                                                <div className={styles.formGroup}>
                                                    <label>Hierarchy / Parent</label>
                                                    <select
                                                        value={item.parent_id || ''}
                                                        onChange={(e) => updateItemField(item.id, 'parent_id', e.target.value || null)}
                                                        className={styles.inputField}
                                                    >
                                                        <option value="">— None (Top-Level Item) —</option>
                                                        {potentialParents.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                Child of "{p.title}"
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className={styles.drawerSpan2} style={{ display: 'flex', gap: '2rem', marginTop: '0.25rem' }}>
                                                    <label className={styles.toggleWrap}>
                                                        <input
                                                            type="checkbox"
                                                            checked={item.target === '_blank'}
                                                            onChange={(e) => updateItemField(item.id, 'target', e.target.checked ? '_blank' : '_self')}
                                                        />
                                                        <span>Open link in a new tab</span>
                                                    </label>

                                                    <label className={styles.toggleWrap}>
                                                        <input
                                                            type="checkbox"
                                                            checked={item.is_active !== 0}
                                                            onChange={(e) => updateItemField(item.id, 'is_active', e.target.checked ? 1 : 0)}
                                                        />
                                                        <span>Visible on Storefront</span>
                                                    </label>
                                                </div>

                                                <div className={styles.drawerActions}>
                                                    <span style={{ fontSize: '0.78rem', color: '#7c8675' }}>
                                                        Original: {item.item_type === 'page' ? 'Page' : item.item_type === 'category' ? 'Category' : 'Custom'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        className={styles.deleteBtn}
                                                    >
                                                        <Trash2 size={14} />
                                                        Remove Item
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className={styles.bottomActionBar}>
                        <button
                            type="button"
                            onClick={handleResetDefaults}
                            className={styles.resetBtn}
                        >
                            <RefreshCcw size={15} />
                            Reset Defaults
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveMenu}
                            disabled={saving}
                            className={styles.saveBtn}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Menu
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
                    {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
