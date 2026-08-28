'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Grid, List, Filter, ArrowUpDown, X, Check, ShoppingCart, SlidersHorizontal, ChevronDown, Package, Clock, Tag, MessageCircle, Truck, User, LogOut, MapPin } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import ProductCard from '@/components/ProductCard';
import styles from './shop.module.css';

export default function ShopPage() {
    const { products, loading, addToCart } = useShop();

    //  LOCAL UI STATE 
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const initialCategory = searchParams.get('category') || 'All';
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [selectedBrand, setSelectedBrand] = useState('All');
    const [selectedType, setSelectedType] = useState('All');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 25000 });
    const [tempPriceRange, setTempPriceRange] = useState({ min: 0, max: 25000 });
    const [sortBy, setSortBy] = useState('newness');
    const [gridView, setGridView] = useState(true);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showInStockOnly, setShowInStockOnly] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 12;

    // Reset pagination to page 1 whenever any filter changes
    useEffect(() => {
        setCurrentPage(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [selectedCategory, selectedBrand, selectedType, searchQuery, priceRange, showInStockOnly, sortBy]);

    // Scroll to top when page changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    //  OPTIONS 
    const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);
    const availableBrands = useMemo(() => ['All', ...new Set(products.map(p => p.product_group).filter(Boolean))], [products]);
    const availableSareeTypes = ['All', 'Pure Silk', 'Soft Silk', 'Cotton', 'Georgette', 'Banarasi', 'Handloom', 'Chiffon', 'Net'];

    //  FILTERED DATA 
    const filteredProducts = useMemo(() => {
        let filtered = [...products];

        if (selectedCategory !== 'All') filtered = filtered.filter(p => p.category === selectedCategory);
        if (selectedBrand !== 'All') filtered = filtered.filter(p => p.product_group === selectedBrand);

        if (selectedType !== 'All') {
            const typeLower = selectedType.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name || '').toLowerCase().includes(typeLower) ||
                (p.description || '').toLowerCase().includes(typeLower) ||
                (p.category || '').toLowerCase().includes(typeLower)
            );
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name || '').toLowerCase().includes(query) ||
                (p.description || '').toLowerCase().includes(query)
            );
        }

        filtered = filtered.filter(p => (p.price || 0) >= priceRange.min && (p.price || 0) <= priceRange.max);
        if (showInStockOnly) filtered = filtered.filter(p => Number(p.stock || 0) > 0);

        if (sortBy === 'price-asc') {
            filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (sortBy === 'price-desc') {
            filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else {
            // Default & 'newness': Date DESC (latest first), then Product_No / ID DESC
            const getSortKey = (p) => {
                let time = 0;
                if (p.created_at) {
                    const parsed = typeof p.created_at === 'number' ? p.created_at : new Date(p.created_at).getTime();
                    if (!isNaN(parsed) && parsed > 0) time = parsed;
                }
                if (time === 0 && p.updated_at) {
                    const parsed = typeof p.updated_at === 'number' ? p.updated_at : new Date(p.updated_at).getTime();
                    if (!isNaN(parsed) && parsed > 0) time = parsed;
                }
                let num = 0;
                if (p.product_no !== undefined && p.product_no !== null && !isNaN(Number(p.product_no))) {
                    num = Number(p.product_no);
                } else if (p.sku && !isNaN(Number(p.sku))) {
                    num = Number(p.sku);
                } else if (p.id) {
                    const digits = Number(String(p.id).replace(/\D/g, ''));
                    if (!isNaN(digits) && digits > 0) num = digits;
                }
                return { time, num, id: String(p.id || '') };
            };

            filtered.sort((a, b) => {
                const keyA = getSortKey(a);
                const keyB = getSortKey(b);
                if (keyB.time !== keyA.time) return keyB.time - keyA.time;
                if (keyB.num !== keyA.num) return keyB.num - keyA.num;
                return keyB.id.localeCompare(keyA.id);
            });
        }

        return filtered;
    }, [products, selectedCategory, selectedBrand, selectedType, searchQuery, priceRange, showInStockOnly, sortBy]);

    const clearAllFilters = () => {
        setSelectedCategory('All');
        setSelectedBrand('All');
        setSelectedType('All');
        setSearchQuery('');
        setPriceRange({ min: 0, max: 25000 });
        setTempPriceRange({ min: 0, max: 25000 });
        setSortBy('newness');
        setShowInStockOnly(false);
        setIsFilterPanelOpen(false);
        setCurrentPage(1);
    };

    const applyPriceFilter = () => {
        setPriceRange(tempPriceRange);
    };

    return (
        <div className={styles.shopContainer}>
            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && <div className={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)} />}

            {/* Sidebar */}
            <aside className={`${styles.shopSidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>

                <div className={styles.sidebarSection}>
                    <h3 className={styles.sidebarTitle}>COLLECTIONS</h3>
                    <div className={styles.categoryScrollWrap}>
                        <ul className={styles.categoryList}>
                            {categories.map(cat => (
                                <li
                                    key={cat}
                                    onClick={() => {
                                        setSelectedCategory(cat);
                                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                                    }}
                                    className={`${styles.categoryLink} ${selectedCategory === cat ? styles.categoryLinkActive : ''}`}
                                >
                                    {cat}
                                    {cat !== 'All' && (
                                        <span className={styles.categoryCount}>
                                            {products.filter(p => p.category === cat).length}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className={styles.sidebarSection}>
                    <h3 className={styles.sidebarTitle}>BRAND</h3>
                    <div className={styles.categoryScrollWrap} style={{ maxHeight: '150px' }}>
                        <ul className={styles.categoryList}>
                            {availableBrands.map(brand => (
                                <li
                                    key={brand}
                                    onClick={() => setSelectedBrand(brand)}
                                    className={`${styles.categoryLink} ${selectedBrand === brand ? styles.categoryLinkActive : ''}`}
                                >
                                    {brand}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className={styles.sidebarSection}>
                    <h3 className={styles.sidebarTitle}>AVAILABILITY</h3>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={showInStockOnly}
                            onChange={(e) => setShowInStockOnly(e.target.checked)}
                        />
                        <span>In Stock Only</span>
                    </label>
                </div>

                {(selectedCategory !== 'All' || selectedBrand !== 'All' || selectedType !== 'All' || searchQuery || showInStockOnly || priceRange.min > 0 || priceRange.max < 25000) && (
                    <button onClick={clearAllFilters} className={styles.sidebarClearBtn}>
                        RESET ALL FILTERS
                    </button>
                )}
            </aside>

            {/* Main Content Area */}
            <div className={styles.shopContentArea}>
                <div className={styles.shopGridHeader}>
                    <h1 className={styles.pageMainTitle}>Shop</h1>
                </div>

                <div className={styles.instrumentationBar}>
                    <div className={styles.instrumentLeft}>
                        <div className={styles.toolbarSearch}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder={`Showing ${Math.min(filteredProducts.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}–${Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of ${filteredProducts.length} results`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.instrumentRight}>
                        <div className={styles.viewToggles}>
                            <button
                                onClick={() => setGridView(true)}
                                className={`${styles.viewBtn} ${gridView ? styles.active : ''}`}
                                title="Grid View"
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setGridView(false)}
                                className={`${styles.viewBtn} ${!gridView ? styles.active : ''}`}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (window.innerWidth < 1024) {
                                    setIsSidebarOpen(true);
                                } else {
                                    setIsFilterPanelOpen(!isFilterPanelOpen);
                                }
                            }}
                            className={`${styles.filterToggleBtn} ${isFilterPanelOpen ? styles.filterPanelOpen : ''}`}
                        >
                            <Filter size={18} /> Filters
                        </button>

                        <div className={styles.sortWrapper}>
                            <ArrowUpDown size={16} className={styles.sortIcon} />
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className={styles.sortSelect}
                            >
                                <option value="newness">Sort by latest (Default)</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Expandable Filter Panel */}
                {isFilterPanelOpen && (
                    <div className={styles.filterExpandedPanel}>
                        <div className={styles.filterGrid}>
                            <div className={styles.filterGroup}>
                                <h4>FILTER BY PRICE</h4>
                                <div className={styles.pricePresets}>
                                    {[
                                        { label: 'Under ₹2,000', min: 0, max: 2000 },
                                        { label: '₹2,000 - ₹5,000', min: 2000, max: 5000 },
                                        { label: '₹5,000 - ₹10,000', min: 5000, max: 10000 },
                                        { label: 'Above ₹10,000', min: 10000, max: 1000000 },
                                    ].map(bracket => (
                                        <button
                                            key={bracket.label}
                                            className={priceRange.min === bracket.min && priceRange.max === bracket.max ? styles.activeBracket : ''}
                                            onClick={() => {
                                                setPriceRange({ min: bracket.min, max: bracket.max });
                                                setTempPriceRange({ min: bracket.min, max: bracket.max });
                                            }}
                                        >
                                            {bracket.label}
                                        </button>
                                    ))}
                                </div>

                                <div className={styles.customPriceRange}>
                                    <h5>CUSTOM RANGE:</h5>
                                    <div className={styles.priceInputsWrapper}>
                                        <div className={styles.priceInputItem}>
                                            <span>₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={tempPriceRange.min}
                                                onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                onChange={e => setTempPriceRange({ ...tempPriceRange, min: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className={styles.priceSeparator} />
                                        <div className={styles.priceInputItem}>
                                            <span>₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={tempPriceRange.max}
                                                onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                                                onChange={e => setTempPriceRange({ ...tempPriceRange, max: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <button className={styles.applyCustomBtn} onClick={applyPriceFilter}>APPLY CUSTOM</button>
                                </div>
                            </div>

                            <div className={styles.filterGroup}>
                                <h4>BRAND</h4>
                                <div className={styles.tagFilters}>
                                    {availableBrands.map(brand => (
                                        <button
                                            key={brand}
                                            className={`${styles.filterTag} ${selectedBrand === brand ? styles.tagActive : ''}`}
                                            onClick={() => setSelectedBrand(brand)}
                                        >
                                            {brand}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.filterGroup}>
                                <h4>TYPE OF SAREE</h4>
                                <div className={styles.tagFilters}>
                                    {availableSareeTypes.map(type => (
                                        <button
                                            key={type}
                                            className={`${styles.filterTag} ${selectedType === type ? styles.tagActive : ''}`}
                                            onClick={() => setSelectedType(type)}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.filterPanelActions}>
                            <button className={styles.resetAllBtn} onClick={clearAllFilters}>RESET ALL</button>
                            <button className={styles.doneBtn} onClick={() => setIsFilterPanelOpen(false)}>DONE</button>
                        </div>
                    </div>
                )}

                {/* Active Filter Badges */}
                {(selectedCategory !== 'All' || selectedBrand !== 'All' || selectedType !== 'All' || (priceRange.min > 0 || priceRange.max < 25000)) && (
                    <div className={styles.activeFiltersRow}>
                        {selectedCategory !== 'All' && (
                            <span className={styles.activeFilterTag}>
                                {selectedCategory} <X size={12} onClick={() => setSelectedCategory('All')} />
                            </span>
                        )}
                        {selectedBrand !== 'All' && (
                            <span className={styles.activeFilterTag}>
                                {selectedBrand} <X size={12} onClick={() => setSelectedBrand('All')} />
                            </span>
                        )}
                        {selectedType !== 'All' && (
                            <span className={styles.activeFilterTag}>
                                {selectedType} <X size={12} onClick={() => setSelectedType('All')} />
                            </span>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className={styles.loadingGrid}>
                        {[...Array(6)].map((_, i) => <div key={i} className={styles.skeleton} />)}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className={styles.noResults}>
                        <Search size={48} />
                        <h3>No products found</h3>
                        <p>Try adjusting your filters or search terms.</p>
                        <button onClick={clearAllFilters} className={styles.resetSearchBtn}>Reset All Filters</button>
                    </div>
                ) : (
                    <>
                        <div className={gridView ? styles.productsGrid : styles.productsList}>
                            {filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(product => (
                                <ProductCard key={product.id} product={product} gridView={gridView} />
                            ))}
                        </div>
                        {filteredProducts.length > ITEMS_PER_PAGE && (
                            <div className={styles.paginationWrapper} style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem' }}>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{ padding: '0.5rem 1rem', background: currentPage === 1 ? '#f1f5f9' : '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#475569' }}
                                >
                                    Previous
                                </button>
                                
                                {Array.from({ length: Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: currentPage === i + 1 ? '#0f172a' : '#fff', color: currentPage === i + 1 ? '#fff' : '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                                    >
                                        {i + 1}
                                    </button>
                                ))}

                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredProducts.length / ITEMS_PER_PAGE), prev + 1))}
                                    disabled={currentPage === Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)}
                                    style={{ padding: '0.5rem 1rem', background: currentPage === Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) ? '#f1f5f9' : '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: currentPage === Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#475569' }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
