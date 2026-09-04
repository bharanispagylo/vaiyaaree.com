'use client';

import { useState, useEffect } from 'react';
import { Upload, FileDown, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { mysqlClient } from '@/lib/mysqlClient';
import { useRouter } from 'next/navigation';
import MediaPicker from '@/components/MediaPicker';
import ProductImageAssigner from '@/components/ProductImageAssigner';
import ImageZoom from '@/components/ImageZoom';
import ModalPortal from '@/components/ModalPortal';
import { getProductUrl } from '@/lib/productUrl';

// Modular Components
import ProductStats from './components/ProductStats';
import ProductFilters from './components/ProductFilters';
import ProductTable from './components/ProductTable';
import ProductCards from './components/ProductCards';
import ProductAnalytics from './components/ProductAnalytics';
import ProductForm from './components/ProductForm';
import ProductHistoryModal from './components/ProductHistoryModal';
import ProductBulkActionBar from './components/ProductBulkActionBar';
import {
    ExcelImportModal,
    WatermarkModal,
    SocialPreviewModal,
    SuccessModal,
    ErrorModal,
    ConfirmModal,
    ResultModal,
    OcrLoadingOverlay
} from './components/ProductModals';

export default function ProductsPage() {
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);

    // Data states
    const [products, setProducts] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [allProductsData, setAllProductsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dbActiveCategories, setDbActiveCategories] = useState([]);

    // View & Filter states
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'card' | 'analytics'
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [formProductName, setFormProductName] = useState('');
    const [copiedProductUrl, setCopiedProductUrl] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [groupFilter, setGroupFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
    const [sortBy, setSortBy] = useState('product_no_desc');
    const [productsPage, setProductsPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [columnFilters, setColumnFilters] = useState({
        productNo: '',
        name: '',
        category: 'ALL',
        minPrice: '',
        maxPrice: '',
        stockStatus: 'ALL',
        status: 'ALL'
    });

    const clearColumnFilters = () => {
        setColumnFilters({
            productNo: '',
            name: '',
            category: 'ALL',
            minPrice: '',
            maxPrice: '',
            stockStatus: 'ALL',
            status: 'ALL'
        });
    };

    // Form & Variant states
    const [variants, setVariants] = useState([]);
    const [productType, setProductType] = useState('simple');
    const [productImageUrl, setProductImageUrl] = useState('');
    const [galleryImageUrl, setGalleryImageUrl] = useState([]);

    // Analytics states
    const [timeRange, setTimeRange] = useState('MONTHLY');
    const [analyticsData, setAnalyticsData] = useState({
        topSellers: [],
        inventoryStatus: [],
        categoryValue: []
    });

    // History states
    const [showHistory, setShowHistory] = useState(false);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Media & Watermark states
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [activeImageField, setActiveImageField] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [loadingOverlayText, setLoadingOverlayText] = useState('Searching for WaterMark...');
    const [watermarkModal, setWatermarkModal] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);

    // Excel & Post-Import Image Assigner
    const [importModal, setImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importedProductsForImage, setImportedProductsForImage] = useState(null);

    // Feedback & Confirmation Dialogs
    const [successModal, setSuccessModal] = useState(null);
    const [errorModal, setErrorModal] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [resultModal, setResultModal] = useState(null);
    const [previewModal, setPreviewModal] = useState(null);

    // Social Integration
    const [fbConfig, setFbConfig] = useState(null);
    const [postToFacebook, setPostToFacebook] = useState(false);
    const [postToInstagram, setPostToInstagram] = useState(false);
    const [fbProcessing, setFbProcessing] = useState(false);

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Scroll to top on page change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [productsPage]);

    // Data Loaders
    const fetchActiveCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            const data = await res.json();
            if (data.success && Array.isArray(data.categories)) {
                setDbActiveCategories(data.categories);
            }
        } catch (err) {
            console.error('Fetch active categories error:', err);
        }
    };

    const fetchFbConfig = async () => {
        try {
            const { data } = await mysqlClient.from('app_settings')
                .select('*')
                .in('key', ['fb_page_id', 'fb_page_access_token']);

            const config = { pageId: '', accessToken: '' };
            data?.forEach(item => {
                if (item.key === 'fb_page_id') config.pageId = item.value;
                if (item.key === 'fb_page_access_token') config.accessToken = item.value;
            });
            setFbConfig(config);
        } catch (error) {
            console.error('Error fetching FB config:', error);
        }
    };

    const fetchAnalytics = async (currentProducts) => {
        try {
            const now = new Date();
            let startDate = null;

            if (timeRange === 'DAILY') {
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            } else if (timeRange === 'MONTHLY') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            } else if (timeRange === 'QUARTERLY') {
                const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
                startDate = new Date(now.getFullYear(), qStartMonth, 1).toISOString();
            }

            let ordersQuery = mysqlClient.from('orders').select('id').neq('status', 'DRAFT').neq('status', 'CANCELLED');
            if (startDate) {
                ordersQuery = ordersQuery.gte('created_at', startDate);
            }
            const { data: ordersInRange } = await ordersQuery;
            const orderIds = (ordersInRange || []).map(o => o.id);

            let topSellers = [];
            if (orderIds.length > 0) {
                const batchSize = 200;
                let allItems = [];
                for (let i = 0; i < orderIds.length; i += batchSize) {
                    const batch = orderIds.slice(i, i + batchSize);
                    const { data: batchItems } = await mysqlClient
                        .from('order_items')
                        .select('product_name, quantity')
                        .in('order_id', batch);
                    if (batchItems) allItems = allItems.concat(batchItems);
                }

                const salesMap = {};
                allItems.forEach(item => {
                    if (!item.product_name) return;
                    salesMap[item.product_name] = (salesMap[item.product_name] || 0) + (item.quantity || 1);
                });
                topSellers = Object.entries(salesMap)
                    .map(([name, sales]) => ({ name, sales }))
                    .sort((a, b) => b.sales - a.sales)
                    .slice(0, 10);
            }

            const lowStock = currentProducts.filter(p => (p.stock || 0) <= (p.alert_threshold || 5)).length;
            const inStock = currentProducts.length - lowStock;

            const catMap = {};
            currentProducts.forEach(p => { catMap[p.category] = (catMap[p.category] || 0) + 1; });
            const categoryValue = Object.entries(catMap).map(([name, value]) => ({ name, value }));

            setAnalyticsData({
                topSellers,
                inventoryStatus: [
                    { name: 'Low Stock', value: lowStock, color: 'hsl(var(--danger))' },
                    { name: 'Healthy', value: inStock, color: 'hsl(var(--success))' }
                ],
                categoryValue
            });
        } catch (err) {
            console.error('Analytics Error:', err);
        }
    };

    const fetchStatsAndAnalytics = async () => {
        try {
            let res = await mysqlClient
                .from('products')
                .select('id, name, price, stock, category, product_group, is_active, alert_threshold, product_catalog_image_id, sku, product_no');
            const list = res.data || [];
            setAllProductsData(list);
            fetchAnalytics(list);
        } catch (err) {
            console.error('Stats fetch error:', err);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const from = (productsPage - 1) * pageSize;
            const to = productsPage * pageSize - 1;

            let query = mysqlClient
                .from('products')
                .select('*', { count: 'exact' });

            // Global category / group / status filters
            if (categoryFilter !== 'ALL') {
                query = query.eq('category', categoryFilter);
            }
            if (groupFilter !== 'ALL') {
                query = query.eq('product_group', groupFilter);
            }
            if (statusFilter !== 'ALL') {
                query = query.eq('is_active', statusFilter === 'ACTIVE' ? 1 : 0);
            }

            // Column filters
            if (columnFilters.productNo && columnFilters.productNo.trim()) {
                const pNoTerm = columnFilters.productNo.trim().replace(/^#+/, '');
                const numVal = parseInt(pNoTerm, 10);
                if (!isNaN(numVal)) {
                    query = query.or(`sku.ilike.%${pNoTerm}%,product_no.eq.${numVal}`);
                } else {
                    query = query.or(`sku.ilike.%${pNoTerm}%`);
                }
            }
            if (columnFilters.name && columnFilters.name.trim()) {
                const nTerm = columnFilters.name.trim();
                query = query.or(`name.ilike.%${nTerm}%,product_catalog_image_id.ilike.%${nTerm}%,slug.ilike.%${nTerm}%`);
            }
            if (columnFilters.category && columnFilters.category !== 'ALL') {
                query = query.eq('category', columnFilters.category);
            }
            if (columnFilters.minPrice && !isNaN(Number(columnFilters.minPrice))) {
                query = query.gte('price', Number(columnFilters.minPrice));
            }
            if (columnFilters.maxPrice && !isNaN(Number(columnFilters.maxPrice))) {
                query = query.lte('price', Number(columnFilters.maxPrice));
            }
            if (columnFilters.stockStatus === 'IN_STOCK') {
                query = query.gt('stock', 0);
            } else if (columnFilters.stockStatus === 'OUT_OF_STOCK') {
                query = query.lte('stock', 0);
            } else if (columnFilters.stockStatus === 'LOW_STOCK') {
                query = query.gt('stock', 0).lte('stock', 5);
            }
            if (columnFilters.status && columnFilters.status !== 'ALL') {
                query = query.eq('is_active', columnFilters.status === 'ACTIVE' ? 1 : 0);
            }

            // Global search bar
            if (debouncedSearchTerm.trim()) {
                const rawTerm = debouncedSearchTerm.trim();
                const cleanTerm = rawTerm.replace(/^#+/, '').trim();
                const terms = Array.from(new Set([rawTerm, cleanTerm])).filter(Boolean);

                const orConditions = [];
                for (const t of terms) {
                    orConditions.push(
                        `name.ilike.%${t}%`,
                        `category.ilike.%${t}%`,
                        `product_group.ilike.%${t}%`,
                        `product_catalog_image_id.ilike.%${t}%`,
                        `sku.ilike.%${t}%`,
                        `id.ilike.%${t}%`,
                        `slug.ilike.%${t}%`
                    );
                }
                query = query.or(orConditions.join(','));
            }

            // Sorting logic
            if (sortBy === 'product_no_desc') {
                query = query.order('product_no', { ascending: false }).order('created_at', { ascending: false });
            } else if (sortBy === 'product_no_asc') {
                query = query.order('product_no', { ascending: true }).order('created_at', { ascending: true });
            } else if (sortBy === 'name_asc') {
                query = query.order('name', { ascending: true });
            } else if (sortBy === 'name_desc') {
                query = query.order('name', { ascending: false });
            } else if (sortBy === 'low_stock') {
                query = query.order('stock', { ascending: true });
            } else if (sortBy === 'high_stock') {
                query = query.order('stock', { ascending: false });
            } else if (sortBy === 'low_price') {
                query = query.order('price', { ascending: true });
            } else if (sortBy === 'high_price') {
                query = query.order('price', { ascending: false });
            } else if (sortBy === 'oldest') {
                query = query.order('created_at', { ascending: true });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data, count, error } = await query.range(from, to);
            if (error) throw error;

            let finalProducts = data || [];
            if (sortBy === 'product_no_desc') {
                finalProducts.sort((a, b) => {
                    const numA = Number(a.product_no) || (a.sku ? parseInt(a.sku) : 0) || 0;
                    const numB = Number(b.product_no) || (b.sku ? parseInt(b.sku) : 0) || 0;
                    if (numA && numB && !isNaN(numA) && !isNaN(numB)) return numB - numA;
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                });
            } else if (sortBy === 'product_no_asc') {
                finalProducts.sort((a, b) => {
                    const numA = Number(a.product_no) || (a.sku ? parseInt(a.sku) : 0) || 0;
                    const numB = Number(b.product_no) || (b.sku ? parseInt(b.sku) : 0) || 0;
                    if (numA && numB && !isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                });
            }

            setProducts(finalProducts);
            setTotalCount(count || 0);
            fetchStatsAndAnalytics();
        } catch (error) {
            console.error('Error fetching products:', error.message || error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchFbConfig();
        fetchActiveCategories();

        const handleReset = () => {
            setIsEditing(false);
            setCurrentProduct(null);
            setShowHistory(false);
            setImportModal(false);
            setProductImageUrl('');
            setGalleryImageUrl([]);
            setVariants([]);
        };
        window.addEventListener('resetAdminView', handleReset);
        return () => window.removeEventListener('resetAdminView', handleReset);
    }, []);

    useEffect(() => {
        if (allProductsData.length > 0) fetchAnalytics(allProductsData);
    }, [timeRange]);

    useEffect(() => {
        setProductsPage(1);
    }, [debouncedSearchTerm, categoryFilter, groupFilter, statusFilter, sortBy, columnFilters, pageSize]);

    useEffect(() => {
        fetchProducts();
    }, [productsPage, pageSize, debouncedSearchTerm, categoryFilter, groupFilter, statusFilter, sortBy, columnFilters]);

    if (!hasMounted) return null;

    // Actions
    const openEditModal = (product) => {
        if (product?.id) {
            router.push(`/admin/products/${product.id}`);
        }
    };

    const addVariant = () => {
        setVariants([...variants, {
            name: '',
            price: currentProduct?.price || 0,
            compare_price: currentProduct?.compare_price || currentProduct?.original_price || '',
            stock: 10,
            image_url: (productImageUrl || '').split(',')[0] || ''
        }]);
    };

    const updateVariant = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const fetchHistory = async (product) => {
        setSelectedProductForHistory(product);
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            const { data, error } = await mysqlClient
                .from('product_history')
                .select('*')
                .eq('product_id', product.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setHistoryData(data || []);
        } catch (err) {
            console.error('History Fetch Error:', err.message || err);
            setErrorModal({
                title: 'Error',
                message: 'Could not fetch history: ' + (err.message || 'Unknown error')
            });
        } finally {
            setHistoryLoading(false);
        }
    };

    const shareToStatus = (product) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        const url = `${baseUrl}${getProductUrl(product)}`;
        const text = encodeURIComponent(`Checkout this beautiful ${product.name}!\n\nView details & Order here: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_self');
    };

    const handleDelete = async (id) => {
        setConfirmModal({
            title: 'Delete Product?',
            message: 'Are you sure you want to permanently delete this product? All variants and history will also be removed.',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await mysqlClient.from('product_variants').delete().eq('product_id', id);
                    await mysqlClient.from('product_history').delete().eq('product_id', id);
                    await mysqlClient.from('category_products').delete().eq('product_id', id);
                    const { error } = await mysqlClient.from('products').delete().eq('id', id);
                    if (error) throw error;

                    fetchProducts();
                    setSuccessModal({ title: 'Product Deleted', message: 'Product has been deleted successfully.' });
                    setSelectedProductIds(prev => prev.filter(item => item !== id));
                } catch (error) {
                    console.error('Delete error:', error);
                    setErrorModal({ title: 'Delete Failed', message: error.message || 'Could not delete product.' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedProductIds.length === 0) return;
        setConfirmModal({
            title: `Delete ${selectedProductIds.length} Products?`,
            message: `Are you sure you want to permanently delete these ${selectedProductIds.length} products?`,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    for (const id of selectedProductIds) {
                        await mysqlClient.from('product_variants').delete().eq('product_id', id);
                        await mysqlClient.from('product_history').delete().eq('product_id', id);
                        await mysqlClient.from('category_products').delete().eq('product_id', id);
                        await mysqlClient.from('products').delete().eq('id', id);
                    }
                    setSelectedProductIds([]);
                    fetchProducts();
                    setSuccessModal({ title: 'Bulk Delete Complete', message: 'Selected products have been removed.' });
                } catch (err) {
                    console.error('Bulk Delete Error:', err);
                    setErrorModal({ title: 'Bulk Action Failed', message: err.message || 'Could not delete products.' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const toggleSelectItem = (id) => {
        setSelectedProductIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedProductIds.length === products.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(products.map(p => p.id));
        }
    };

    // Product Save Handler
    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const comparePriceInput = formData.get('compare_price') || formData.get('regular_price');
        const comparePriceVal = comparePriceInput && Number(comparePriceInput) > 0 ? Number(comparePriceInput) : null;

        const sellingPriceInput = formData.get('price');
        const sellingPriceVal = sellingPriceInput && Number(sellingPriceInput) > 0 
            ? Number(sellingPriceInput) 
            : (comparePriceVal || 0);

        let userTags = formData.get('tags_input') 
            ? formData.get('tags_input').split(',').map(t => t.trim()).filter(t => Boolean(t) && !t.toLowerCase().startsWith('mrp:')) 
            : [];
        
        if (comparePriceVal && sellingPriceInput && comparePriceVal > sellingPriceVal) {
            userTags.push(`mrp:${comparePriceVal}`);
        }

        const isExplore = formData.get('is_explore') === 'on';
        const rawGroup = formData.get('product_group')?.trim() || null;
        const rawSlug = formData.get('slug')?.trim() || null;
        const rawName = formData.get('name')?.trim() || 'product';
        const defaultSlugFromName = rawName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
        const cleanSlug = rawSlug ? rawSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') : defaultSlugFromName;

        const rawActive = formData.get('is_active');
        const isActive = (rawActive === 'on' || rawActive === '1' || rawActive === 'active' || rawActive === true) ? 1 : 0;

        let finalProductGroup = null;
        if (isExplore) {
            finalProductGroup = 'EXPLORE';
        } else if (rawGroup && rawGroup.toUpperCase() !== 'EXPLORE') {
            finalProductGroup = rawGroup;
        } else {
            finalProductGroup = null;
        }

        const productData = {
            name: rawName,
            slug: cleanSlug,
            category: formData.get('category')?.trim() || '',
            product_group: finalProductGroup,
            description: formData.get('description')?.trim() || '',
            type: productType,
            tax_class: formData.get('tax_class') || 'GST_5',
            is_active: isActive,
            is_featured: formData.get('is_featured') === 'on' ? 1 : 0,
            tags: userTags,
            gallery_image: Array.isArray(galleryImageUrl) ? galleryImageUrl.filter(Boolean) : (galleryImageUrl ? galleryImageUrl.split(',').filter(Boolean) : [])
        };

        if (productType === 'simple') {
            if (!comparePriceVal || comparePriceVal <= 0) {
                setErrorModal({
                    title: 'Regular Price Required',
                    message: 'Regular Price (Original MRP) is mandatory. Please enter a valid Regular Price.'
                });
                return;
            }

            productData.price = sellingPriceVal;
            productData.compare_price = comparePriceVal;
            productData.original_price = comparePriceVal;
            const stockVal = formData.get('stock');
            productData.stock = stockVal !== null && stockVal !== '' ? Math.max(0, parseInt(stockVal, 10)) : 0;
            const alertVal = formData.get('alert_threshold');
            productData.alert_threshold = alertVal !== null && alertVal !== '' ? Math.max(0, parseInt(alertVal, 10)) : 0;
            productData.image_url = productImageUrl || '';

            const existingCatalogId = currentProduct?.product_catalog_image_id || '';
            productData.product_catalog_image_id = existingCatalogId;
            if (productData.image_url && !productData.product_catalog_image_id) {
                productData.product_catalog_image_id = `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            }
        } else {
            if (variants.length > 0) {
                for (let i = 0; i < variants.length; i++) {
                    const v = variants[i];
                    if (!v.compare_price || Number(v.compare_price) <= 0) {
                        setErrorModal({
                            title: 'Variant Regular Price Required',
                            message: `Regular Price (MRP) is mandatory for variant "${v.name || '#' + (i + 1)}". Please enter a valid Regular Price.`
                        });
                        return;
                    }
                }
                const firstVarSelling = v => (v.price !== undefined && v.price !== '' && Number(v.price) > 0) ? Number(v.price) : Number(v.compare_price || 0);
                productData.price = firstVarSelling(variants[0]);
                productData.compare_price = variants[0]?.compare_price ? Number(variants[0].compare_price) : null;
                productData.original_price = productData.compare_price;
                productData.stock = variants.reduce((acc, v) => acc + Math.max(0, parseInt(v.stock || 0, 10)), 0);
                const alertVal = formData.get('alert_threshold');
                productData.alert_threshold = alertVal !== null && alertVal !== '' ? Math.max(0, parseInt(alertVal, 10)) : 0;
                productData.image_url = variants[0]?.image_url || productImageUrl || '';

                const existingCatalogId = currentProduct?.product_catalog_image_id || '';
                productData.product_catalog_image_id = existingCatalogId;
                if (productData.image_url && !productData.product_catalog_image_id) {
                    productData.product_catalog_image_id = `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                }
            }
        }

        if (productType === 'simple' && sellingPriceInput && comparePriceVal && comparePriceVal < Number(sellingPriceInput)) {
            setErrorModal({
                title: 'Invalid Price Setup',
                message: `Regular Price (Original MRP: ₹${comparePriceVal}) cannot be less than Compare Price (Selling Price: ₹${sellingPriceInput}).`
            });
            return;
        }

        if (productType === 'simple' && !productImageUrl) {
            setErrorModal({ title: 'Image Required', message: 'Please add a product image before saving.' });
            return;
        }
        if (productType === 'variant' && variants.length > 0 && !variants[0].image_url) {
            setErrorModal({ title: 'Image Required', message: 'Please add an image for at least the first variant before saving.' });
            return;
        }

        try {
            let savedProduct = null;
            const isNew = !currentProduct?.id;

            const executeProductSave = async (dataToSave) => {
                let currentData = { ...dataToSave };
                const initialBaseSlug = currentData.slug || (currentData.name ? String(currentData.name).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') : 'product');
                if (!currentData.slug) currentData.slug = initialBaseSlug;

                const maxAttempts = 10;
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    try {
                        if (!isNew) {
                            const res = await mysqlClient.from('products').update(currentData).eq('id', currentProduct.id).select();
                            if (res.error) {
                                const errMsg = String(res.error.message || res.error.details || '');
                                if (errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('slug')) {
                                    const random3Digit = Math.floor(100 + Math.random() * 900);
                                    currentData.slug = `${initialBaseSlug}-${random3Digit}`;
                                    continue;
                                }
                                throw new Error(errMsg || 'Failed to update product in database.');
                            }
                            const saved = Array.isArray(res.data) ? res.data[0] : res.data;
                            return saved || { id: currentProduct.id, ...currentData };
                        } else {
                            let maxNo = 999;
                            (allProductsData || []).forEach(p => {
                                const num = p.product_no || (p.sku ? parseInt(p.sku) : null);
                                if (num && !isNaN(num) && num > maxNo) maxNo = num;
                            });
                            const nextNo = maxNo + 1;

                            const insertData = {
                                ...currentData,
                                total_added: currentData.stock || 0,
                                total_sold: 0,
                                product_no: nextNo,
                                sku: String(nextNo),
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };

                            const res = await mysqlClient.from('products').insert([insertData]).select();
                            if (res.error) {
                                const errMsg = String(res.error.message || res.error.details || '');
                                if (errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('slug')) {
                                    const random3Digit = Math.floor(100 + Math.random() * 900);
                                    currentData.slug = `${initialBaseSlug}-${random3Digit}`;
                                    continue;
                                }
                                throw new Error(errMsg || 'Failed to insert product into database.');
                            }
                            const saved = Array.isArray(res.data) ? res.data[0] : res.data;
                            return saved || insertData;
                        }
                    } catch (err) {
                        const errMsg = String(err.message || '');
                        if (errMsg.toLowerCase().includes('duplicate') || errMsg.toLowerCase().includes('slug')) {
                            const random3Digit = Math.floor(100 + Math.random() * 900);
                            currentData.slug = `${initialBaseSlug}-${random3Digit}`;
                            continue;
                        }
                        throw err;
                    }
                }
                throw new Error('Could not generate a unique slug after multiple attempts.');
            };

            savedProduct = await executeProductSave(productData);

            // Sync category relation
            if (savedProduct?.id && productData.category) {
                try {
                    const catName = String(productData.category).trim();
                    let { data: catRecord } = await mysqlClient.from('categories').select('id').ilike('name', catName).maybeSingle();
                    if (!catRecord?.id) {
                        const catSlug = catName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
                        const { data: newCat } = await mysqlClient.from('categories').insert([{ name: catName, slug: catSlug, status: 'active' }]).select().maybeSingle();
                        catRecord = newCat;
                    }
                    if (catRecord?.id) {
                        await mysqlClient.from('category_products').delete().eq('product_id', savedProduct.id);
                        await mysqlClient.from('category_products').insert({ category_id: catRecord.id, product_id: savedProduct.id });
                    }
                } catch (catErr) {
                    console.error('[CATEGORY RELATION SYNC ERROR]:', catErr);
                }
            }

            // History Log
            if (!isNew && savedProduct) {
                const oldStock = Number(currentProduct.stock) || 0;
                const newStock = Number(productData.stock) || 0;
                if (newStock !== oldStock) {
                    const diff = newStock - oldStock;
                    await mysqlClient.from('product_history').insert({
                        product_id: savedProduct.id,
                        change_type: diff > 0 ? 'ADD' : 'ADJUSTMENT',
                        quantity_change: diff,
                        new_stock: newStock,
                        reason: diff > 0 ? 'Manual Stock Addition' : 'Manual Stock Adjustment'
                    });
                    if (diff > 0) {
                        await mysqlClient.rpc('increment_total_added', { prod_id: savedProduct.id, qty: diff });
                    }
                }
            } else if (savedProduct && Number(savedProduct.stock) > 0) {
                await mysqlClient.from('product_history').insert({
                    product_id: savedProduct.id,
                    change_type: 'ADD',
                    quantity_change: Number(savedProduct.stock),
                    new_stock: Number(savedProduct.stock),
                    reason: 'Initial Stock Entry'
                });
            }

            // Variants
            if (productType === 'variant' && savedProduct) {
                await mysqlClient.from('product_variants').delete().eq('product_id', savedProduct.id);
                if (variants.length > 0) {
                    const variantsToInsert = variants.map((v, idx) => {
                        const mPrice = v.compare_price ? Math.max(0, parseFloat(v.compare_price)) : 0;
                        const sPrice = v.price !== undefined && v.price !== '' && parseFloat(v.price) > 0 ? Math.max(0, parseFloat(v.price)) : mPrice;
                        const vSku = v.sku || `${savedProduct.sku || savedProduct.product_no || 'SKU'}-${(v.name || `VAR${idx + 1}`).replace(/\s+/g, '').toUpperCase()}`;
                        return {
                            product_id: savedProduct.id,
                            name: v.name || `Variant #${idx + 1}`,
                            sku: vSku,
                            price: sPrice,
                            compare_price: mPrice > 0 ? mPrice : null,
                            original_price: mPrice > 0 ? mPrice : null,
                            stock: Math.max(0, parseInt(v.stock || '0', 10)),
                            image_url: v.image_url || productImageUrl || ''
                        };
                    });
                    const { error: insErr } = await mysqlClient.from('product_variants').insert(variantsToInsert);
                    if (insErr) throw new Error(insErr.message || insErr.details || 'Failed to save product variants');
                }
            }

            fetchProducts();
            setSuccessModal({
                title: 'Product Saved Successfully',
                message: `Product "${productData.name}" has been saved.`
            });
            setIsEditing(false);
            setCurrentProduct(null);
            setProductImageUrl('');
            setGalleryImageUrl([]);
            setVariants([]);
        } catch (error) {
            console.error('Save product exception:', error);
            setErrorModal({
                title: 'Save Failed',
                message: error.message || 'Failed to save product.'
            });
        }
    };

    // Excel Export
    const handleExportExcel = async () => {
        try {
            setResultModal({ title: 'Exporting...', message: 'Fetching products for export. Please wait...', type: 'success' });
            let query = mysqlClient.from('products').select('*');
            if (categoryFilter !== 'ALL') query = query.eq('category', categoryFilter);
            if (groupFilter !== 'ALL') query = query.eq('product_group', groupFilter);
            if (statusFilter !== 'ALL') query = query.eq('is_active', statusFilter === 'ACTIVE' ? 1 : 0);
            if (debouncedSearchTerm.trim()) {
                const term = debouncedSearchTerm.trim();
                query = query.or(`name.ilike.%${term}%,category.ilike.%${term}%,product_group.ilike.%${term}%`);
            }

            const { data: exportProducts, error } = await query;
            if (error) throw error;
            if (!exportProducts || exportProducts.length === 0) {
                setResultModal({ title: 'Export Failed', message: 'No products found to export!', type: 'error' });
                return;
            }

            const sortedProducts = [...exportProducts].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            const exportData = sortedProducts.map((p, idx) => ({
                'Product No': p.product_no || (p.sku ? parseInt(p.sku) : null) || (1000 + idx),
                'Catalog ID': p.product_catalog_image_id || '',
                'Name': p.name || '',
                'Category': p.category || '',
                'Price': p.price || 0,
                'Stock': p.stock || 0,
                'Description': p.description || '',
                'ID': p.id
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

            worksheet['!cols'] = [
                { wch: 14 }, { wch: 16 }, { wch: 40 }, { wch: 20 },
                { wch: 10 }, { wch: 10 }, { wch: 50 }, { wch: 36 }
            ];

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const downloadUrl = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Products_Catalog_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            if (link.parentNode) link.parentNode.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            setResultModal({ title: 'Export Successful', message: `Exported ${exportProducts.length} products successfully!`, type: 'success' });
        } catch (err) {
            console.error('Export Error:', err);
            setResultModal({ title: 'Export Error', message: 'Error exporting products. Please try again.', type: 'error' });
        }
    };

    // Excel Import
    const handleExcelImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const dataBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(dataBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (!jsonData || jsonData.length === 0) {
                setResultModal({ title: 'Import Failed', message: 'Excel sheet appears to be empty!', type: 'error' });
                setImporting(false);
                return;
            }

            const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[\s_]/g, '');
            let insertCount = 0;
            let updateCount = 0;
            const newlyImportedProducts = [];

            for (const rawRow of jsonData) {
                try {
                    const row = {};
                    for (const k of Object.keys(rawRow)) {
                        row[normalizeKey(k)] = rawRow[k];
                    }

                    const id = row.id || row.productid || row.itemid || null;
                    const name = row.name || row.productname || row.sareename || row.title || row.item || 'Untitled Product';
                    const priceVal = parseFloat(row.price || row.sellingprice || row.mrp || row.rate || row.amount);
                    const price = Math.max(0, isNaN(priceVal) ? 0 : priceVal);
                    const stockVal = parseInt(row.stock || row.quantity || row.qty || row.inventory || row.available);
                    const stock = Math.max(0, isNaN(stockVal) ? 0 : stockVal);
                    const description = String(row.description || row.desc || row.details || row.about || row.info || '');
                    const category = String(row.category || row.collection || row.type || row.group || 'General');

                    const productData = {
                        name, description, price, category, stock,
                        type: 'simple', is_active: 1,
                        product_catalog_image_id: row.catalogid || row.productcatalogimageid || row.code || ''
                    };

                    if (id) {
                        const { data: existingData } = await mysqlClient.from('products').select('*').eq('id', id).single();
                        if (existingData) {
                            const oldStock = existingData.stock || 0;
                            const diff = stock - oldStock;
                            if (!productData.product_catalog_image_id) delete productData.product_catalog_image_id;

                            const { error: updateError } = await mysqlClient.from('products').update(productData).eq('id', id);
                            if (!updateError) {
                                updateCount++;
                                if (diff !== 0) {
                                    await mysqlClient.from('product_history').insert({
                                        product_id: existingData.id,
                                        change_type: diff > 0 ? 'ADD' : 'ADJUSTMENT',
                                        quantity_change: diff,
                                        new_stock: stock,
                                        reason: 'Excel Bulk Sync'
                                    });
                                }
                            }
                            continue;
                        }
                    }

                    const { data: newProd, error: insertError } = await mysqlClient.from('products').insert({
                        ...productData,
                        is_active: 0
                    }).select().single();

                    if (!insertError && newProd) {
                        newlyImportedProducts.push(newProd);
                        insertCount++;
                    }
                } catch (rowErr) {
                    console.error('Error processing row:', rowErr);
                }
            }

            if (insertCount > 0 || updateCount > 0) {
                setResultModal({
                    title: 'Import Successful',
                    message: `Processed ${insertCount + updateCount} items (${insertCount} new, ${updateCount} updated)!`,
                    type: 'success'
                });
                setImportedProductsForImage(newlyImportedProducts);
            } else {
                setResultModal({ title: 'Import Failed', message: 'Import failed. Please check column headers.', type: 'error' });
            }

            fetchProducts();
            setImportModal(false);
            e.target.value = '';
        } catch (err) {
            console.error('Excel Import Error:', err);
            setResultModal({ title: 'Import Error', message: 'Invalid file or processing failed.', type: 'error' });
        } finally {
            setImporting(false);
        }
    };

    // Calculate filter statistics
    const categories = ['ALL', ...new Set(allProductsData.map(p => p.category).filter(Boolean))];
    const groups = ['ALL', ...new Set(allProductsData.map(p => p.product_group).filter(Boolean))];

    const statsFiltered = allProductsData.filter(p => {
        const rawTerm = debouncedSearchTerm.toLowerCase().trim();
        const cleanTerm = rawTerm.replace(/^#+/, '').trim();
        const matchesSearch = !rawTerm || (
            (p.name || '').toLowerCase().includes(rawTerm) ||
            (p.category || '').toLowerCase().includes(rawTerm) ||
            (p.product_group || '').toLowerCase().includes(rawTerm) ||
            (p.product_catalog_image_id || '').toLowerCase().includes(rawTerm) ||
            (p.sku || '').toLowerCase().includes(rawTerm) ||
            (p.sku || '').toLowerCase().includes(cleanTerm) ||
            (String(p.product_no || '')).includes(cleanTerm) ||
            (p.id || '').toLowerCase().includes(rawTerm)
        );
        const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
        const matchesGroup = groupFilter === 'ALL' || p.product_group === groupFilter;
        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' ? p.is_active !== 0 && p.is_active !== false : p.is_active === 0 || p.is_active === false);
        return matchesSearch && matchesCategory && matchesGroup && matchesStatus;
    });

    const totalStock = statsFiltered.reduce((s, p) => s + (p.stock || 0), 0);
    const totalValue = statsFiltered.reduce((s, p) => s + ((p.price || 0) * (p.stock || 0)), 0);
    const lowStockCount = statsFiltered.filter(p => (p.stock || 0) <= (p.alert_threshold || 5)).length;

    const totalCountToUse = totalCount > 0 ? totalCount : statsFiltered.length;
    const totalProductPages = Math.ceil(totalCountToUse / pageSize);
    const showingStart = totalCountToUse > 0 ? (productsPage - 1) * pageSize + 1 : 0;
    const showingEnd = Math.min(productsPage * pageSize, totalCountToUse);

    return (
        <>
            <div className="animate-enter">
                {/*  MAIN LIST VIEW (Hidden when sub-views are open)  */}
                {!isEditing && !showHistory && !importModal && (
                    <>
                        {/* Header Row */}
                        <div className="admin-header-row">
                            <div>
                                <h1 style={{ marginBottom: '0.5rem' }}>Products</h1>
                                <p>Manage your premium product collection • {totalCountToUse} items</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setImportedProductsForImage([])}
                                    className="btn btn-secondary"
                                >
                                    <Upload size={18} /> Image Upload / Import
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    className="btn btn-secondary"
                                >
                                    <FileDown size={18} style={{ transform: 'rotate(180deg)' }} /> Export Excel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push('/admin/products/new')}
                                    className="btn btn-primary"
                                >
                                    <Plus size={18} /> Add Product
                                </button>
                            </div>
                        </div>

                        {/* KPI Stats Cards */}
                        <ProductStats
                            totalProducts={totalCountToUse}
                            totalStock={totalStock}
                            totalValue={totalValue}
                            lowStockCount={lowStockCount}
                        />

                        {/* Filter Toolbar */}
                        <ProductFilters
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            categoryFilter={categoryFilter}
                            setCategoryFilter={setCategoryFilter}
                            categories={categories}
                            groupFilter={groupFilter}
                            setGroupFilter={setGroupFilter}
                            groups={groups}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            sortBy={sortBy}
                            setSortBy={setSortBy}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            showingStart={showingStart}
                            showingEnd={showingEnd}
                            totalCount={totalCountToUse}
                        />

                        {/* ANALYTICS VIEW */}
                        {viewMode === 'analytics' && (
                            <ProductAnalytics
                                timeRange={timeRange}
                                setTimeRange={setTimeRange}
                                analyticsData={analyticsData}
                            />
                        )}

                        {/* TABLE VIEW */}
                        {viewMode === 'table' && (
                            <ProductTable
                                products={products}
                                loading={loading}
                                selectedProductIds={selectedProductIds}
                                toggleSelectItem={toggleSelectItem}
                                toggleSelectAll={toggleSelectAll}
                                openEditModal={openEditModal}
                                setZoomedImage={setZoomedImage}
                                shareToStatus={shareToStatus}
                                fetchHistory={fetchHistory}
                                handleDelete={handleDelete}
                                currentPage={productsPage}
                                totalPages={totalProductPages}
                                setPage={setProductsPage}
                                pageSize={pageSize}
                                setPageSize={setPageSize}
                                totalCount={totalCountToUse}
                                sortBy={sortBy}
                                setSortBy={setSortBy}
                            />
                        )}

                        {/* CARD VIEW */}
                        {viewMode === 'card' && (
                            <ProductCards
                                products={products}
                                loading={loading}
                                openEditModal={openEditModal}
                                setZoomedImage={setZoomedImage}
                                shareToStatus={shareToStatus}
                                fetchHistory={fetchHistory}
                                handleDelete={handleDelete}
                                currentPage={productsPage}
                                totalPages={totalProductPages}
                                setPage={setProductsPage}
                            />
                        )}
                    </>
                )}

                {/*  STOCK HISTORY MODAL  */}
                {showHistory && (
                    <ProductHistoryModal
                        product={selectedProductForHistory}
                        historyData={historyData}
                        historyLoading={historyLoading}
                        onClose={() => setShowHistory(false)}
                    />
                )}

                {/*  EXCEL IMPORT MODAL  */}
                {importModal && (
                    <ExcelImportModal
                        isOpen={importModal}
                        onClose={() => setImportModal(false)}
                        onFileChange={handleExcelImport}
                        importing={importing}
                    />
                )}

                {/*  MEDIA PICKER MODAL  */}
                {showMediaPicker && (
                    <MediaPicker
                        catalogId={currentProduct?.product_catalog_image_id}
                        multiple={activeImageField?.type === 'gallery'}
                        currentImage={
                            activeImageField?.type === 'product' ? (productImageUrl ? productImageUrl.split(',')[0] : '') :
                                activeImageField?.type === 'gallery' ? galleryImageUrl :
                                    variants[activeImageField?.index]?.image_url
                        }
                        onSelect={async (value, isExistingWatermarked = false) => {
                            try {
                                if (activeImageField?.type === 'gallery') {
                                    const urls = Array.isArray(value) ? value : [value];
                                    setShowMediaPicker(false);
                                    setGalleryImageUrl(prev => Array.from(new Set([...urls, ...prev])));
                                    return;
                                }

                                const url = Array.isArray(value) ? value[0] : value;
                                setLoadingOverlayText('Analyzing Image...');
                                setOcrLoading(true);
                                setShowMediaPicker(false);

                                const onConfirmSelection = async (finalUrl, catId) => {
                                    if (activeImageField?.type === 'product') {
                                        setProductImageUrl(prev => {
                                            const existingArray = prev ? prev.split(',').filter(Boolean) : [];
                                            return [...existingArray, finalUrl].join(',');
                                        });
                                        if (catId) {
                                            setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: catId }));
                                        }
                                    } else if (activeImageField?.type === 'variant') {
                                        updateVariant(activeImageField.index, 'image_url', finalUrl);
                                        if (catId) {
                                            setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: catId }));
                                        }
                                    }
                                    setWatermarkModal(null);
                                };

                                if (isExistingWatermarked) {
                                    onConfirmSelection(url, currentProduct?.product_catalog_image_id);
                                    setOcrLoading(false);
                                    return;
                                }

                                const detRes = await fetch('/api/admin/watermark-detect', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ imageUrl: url })
                                });
                                const detData = await detRes.json();

                                if (detData.hasWatermark) {
                                    const existingCatId = detData.catalogId || currentProduct?.product_catalog_image_id || 'CAT-WATERMARK';
                                    setWatermarkModal({
                                        type: 'existing',
                                        detectedCode: existingCatId,
                                        url: url,
                                        onUseExisting: () => {
                                            onConfirmSelection(url, existingCatId);
                                        }
                                    });
                                    setOcrLoading(false);
                                    return;
                                } else {
                                    const newCatId = currentProduct?.product_catalog_image_id || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

                                    setWatermarkModal({
                                        type: 'new',
                                        detectedCode: newCatId,
                                        url: url,
                                        onProceed: async () => {
                                            try {
                                                setLoadingOverlayText("Watermarking Image..."); setOcrLoading(true);
                                                setWatermarkModal(null);

                                                const formData = new FormData();
                                                formData.append('imageUrl', url);
                                                formData.append('catalogId', newCatId);
                                                formData.append('requireClean', 'true');
                                                formData.append('skipDetection', 'true');
                                                formData.append('saveClean', 'false');

                                                const token = localStorage.getItem('cast_prince_admin') || '';
                                                const uploadRes = await fetch('/api/admin/upload', {
                                                    method: 'POST',
                                                    headers: { 'Authorization': `Bearer ${token}` },
                                                    body: formData
                                                });
                                                const uploadData = await uploadRes.json();

                                                if (!uploadRes.ok) throw new Error(uploadData.error || 'Watermarking failed');
                                                onConfirmSelection(uploadData.watermarkedUrl || uploadData.url, newCatId);
                                            } catch (err) {
                                                setErrorModal({ title: 'Watermark Error', message: err.message });
                                            } finally {
                                                setOcrLoading(false);
                                            }
                                        }
                                    });
                                }
                            } catch (err) {
                                setErrorModal({ title: 'Detection Error', message: err.message });
                            } finally {
                                setOcrLoading(false);
                            }
                        }}
                        onClose={() => setShowMediaPicker(false)}
                    />
                )}

                {/*  PRODUCT IMAGE ASSIGNER  */}
                {importedProductsForImage !== null && (
                    <ModalPortal>
                        <ProductImageAssigner
                            products={importedProductsForImage || []}
                            existingProducts={allProductsData || []}
                            initialMaxProductNo={Math.max(999, ...allProductsData.map(p => p.product_no || (p.sku ? parseInt(p.sku) : 0)))}
                            onClose={() => setImportedProductsForImage(null)}
                            onDone={() => {
                                fetchProducts();
                                setImportedProductsForImage(null);
                            }}
                        />
                    </ModalPortal>
                )}

                {/*  OCR OVERLAY  */}
                <OcrLoadingOverlay isLoading={ocrLoading} text={loadingOverlayText} />

                {/*  WATERMARK MODAL  */}
                <WatermarkModal watermarkModal={watermarkModal} onClose={() => setWatermarkModal(null)} />

                {/*  SOCIAL PREVIEW MODAL  */}
                <SocialPreviewModal previewModal={previewModal} onClose={() => setPreviewModal(null)} />

                {/*  SUCCESS MODAL  */}
                <SuccessModal
                    isOpen={Boolean(successModal)}
                    onClose={() => setSuccessModal(null)}
                    title={successModal?.title}
                    message={successModal?.message}
                />

                {/*  ERROR MODAL  */}
                <ErrorModal errorModal={errorModal} onClose={() => setErrorModal(null)} />

                {/*  CONFIRM MODAL  */}
                <ConfirmModal confirmModal={confirmModal} onClose={() => setConfirmModal(null)} />

                {/*  RESULT MODAL  */}
                <ResultModal resultModal={resultModal} onClose={() => setResultModal(null)} />

                {/*  IMAGE ZOOM  */}
                {zoomedImage && (
                    <ModalPortal>
                        <ImageZoom url={zoomedImage} onClose={() => setZoomedImage(null)} />
                    </ModalPortal>
                )}

                {/*  BULK ACTION BAR  */}
                <ProductBulkActionBar
                    selectedCount={selectedProductIds.length}
                    onBulkDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedProductIds([])}
                />
            </div>
        </>
    );
}
