'use client';

import { useState, useEffect } from 'react';
import {
    Plus, Edit, Trash2, Search, Loader2, Image as ImageIcon, LayoutGrid, List,
    Share2, Link as LinkIcon, Check, Package as PackageIcon, ShoppingCart,
    Filter, Facebook, History, MoreHorizontal, FileDown, Upload, X, TrendingUp, Trophy, Eye, AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, Instagram, BarChart3, ThumbsUp, MessageSquare, Heart
} from 'lucide-react';
import * as XLSX from 'xlsx';
import styles from './page.module.css';
import { mysqlClient } from '@/lib/mysqlClient';
import { useRouter } from 'next/navigation';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import MediaPicker from '@/components/MediaPicker';
import ProductImageAssigner from '@/components/ProductImageAssigner';
import ImageZoom from '@/components/ImageZoom';
import ModalPortal from '@/components/ModalPortal';
import { getProductUrl } from '@/lib/productUrl';

// Consolidated image services used via API route

export default function ProductsPage() {
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [products, setProducts] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [allProductsData, setAllProductsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('product_no_asc');
    const [groupFilter, setGroupFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
    const [viewMode, setViewMode] = useState('table'); // 'table', 'card', or 'analytics'
    const [analyticsData, setAnalyticsData] = useState({
        topSellers: [],
        inventoryStatus: [],
        categoryValue: []
    });
    const [timeRange, setTimeRange] = useState('MONTHLY'); // DAILY, MONTHLY, QUARTERLY, ALL

    // Facebook Integration States
    // Variant states
    const [variants, setVariants] = useState([]);
    const [productType, setProductType] = useState('simple');
    const [postToFacebook, setPostToFacebook] = useState(false);
    const [postToInstagram, setPostToInstagram] = useState(false);
    const [fbProcessing, setFbProcessing] = useState(false);
    const [fbConfig, setFbConfig] = useState(null);
    const [importModal, setImportModal] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [importing, setImporting] = useState(false);
    const [syncWithMeta, setSyncWithMeta] = useState(false);
    const [resultModal, setResultModal] = useState(null); // { title, message, type, onClose }
    const [copiedId, setCopiedId] = useState(null);
    const [successModal, setSuccessModal] = useState(null);
    const [errorModal, setErrorModal] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null); // { title: string, message: string, onConfirm: function }
    const [previewModal, setPreviewModal] = useState(null); // { product, caption }

    // Stock History States
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);

    // Media Picker States
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [activeImageField, setActiveImageField] = useState(null); // { type: 'product' } or { type: 'variant', index: number }
    const [productImageUrl, setProductImageUrl] = useState('');
    const [galleryImageUrl, setGalleryImageUrl] = useState([]);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [loadingOverlayText, setLoadingOverlayText] = useState('Searching for WaterMark...');
    const [watermarkModal, setWatermarkModal] = useState(null); // { type, detectedCode, url, onProceed }

    // Post-Import Image Assigner State
    const [importedProductsForImage, setImportedProductsForImage] = useState(null);
    const [productsPage, setProductsPage] = useState(1);
    const PRODUCTS_PER_PAGE = 10;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [productsPage]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);

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

    const getShopUrl = (product) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        if (product && typeof product === 'object') {
            return `${baseUrl}${getProductUrl(product)}`;
        }
        return `${baseUrl}/product/${product}/`;
    };

    const copyLink = (product) => {
        const url = getShopUrl(product);
        navigator.clipboard.writeText(url);
        setCopiedId(product.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const shareToStatus = (product) => {
        const url = getShopUrl(product);
        const text = encodeURIComponent(`Checkout this beautiful ${product.name}!\n\nView details & Order here: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_self');
    };

    const fetchAnalytics = async (currentProducts) => {
        try {
            const now = new Date();
            let startDate = null;

            if (timeRange === 'DAILY') {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                startDate = today.toISOString();
            } else if (timeRange === 'MONTHLY') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            } else if (timeRange === 'QUARTERLY') {
                const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
                startDate = new Date(now.getFullYear(), qStartMonth, 1).toISOString();
            }

            // 1. Top Sellers — fetch orders in time range, then their items
            let ordersQuery = mysqlClient.from('orders').select('id').neq('status', 'DRAFT').neq('status', 'CANCELLED');
            if (startDate) {
                ordersQuery = ordersQuery.gte('created_at', startDate);
            }
            const { data: ordersInRange } = await ordersQuery;
            const orderIds = (ordersInRange || []).map(o => o.id);

            let topSellers = [];
            if (orderIds.length > 0) {
                // Fetch in batches if needed (MySQL IN limit)
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

            // 2. Inventory Health (Always current)
            const lowStock = currentProducts.filter(p => (p.stock || 0) <= (p.alert_threshold || 5)).length;
            const inStock = currentProducts.length - lowStock;

            // 3. Category Distribution
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
                .select('id, name, price, stock, category, product_group, is_active, alert_threshold, product_catalog_image_id, sku');
            
            if (res.error) {
                res = await mysqlClient
                    .from('products')
                    .select('id, name, price, stock, category, product_group, is_active, alert_threshold, product_catalog_image_id');
            }

            const list = res.data || [];
            setAllProductsData(list);
            fetchAnalytics(list);
        } catch (err) {
            console.error('Stats and analytics fetch error:', err?.message || err);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const from = (productsPage - 1) * PRODUCTS_PER_PAGE;
            const to = productsPage * PRODUCTS_PER_PAGE - 1;

            let query = mysqlClient
                .from('products')
                .select('*', { count: 'exact' });

            if (categoryFilter !== 'ALL') {
                query = query.eq('category', categoryFilter);
            }
            if (groupFilter !== 'ALL') {
                query = query.eq('product_group', groupFilter);
            }
            if (statusFilter !== 'ALL') {
                query = query.eq('is_active', statusFilter === 'ACTIVE');
            }
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
                        `id.ilike.%${t}%`
                    );
                }
                query = query.or(orConditions.join(','));
            }

            if (sortBy === 'product_no_asc') {
                query = query.order('created_at', { ascending: true });
            } else if (sortBy === 'low_stock') {
                query = query.order('stock', { ascending: true });
            } else if (sortBy === 'high_price') {
                query = query.order('price', { ascending: false });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data, count, error } = await query.range(from, to);
            if (error) throw error;

            let finalProducts = data || [];
            if (sortBy === 'product_no_asc') {
                finalProducts.sort((a, b) => {
                    const numA = a.product_no || (a.sku ? parseInt(a.sku) : 0) || 0;
                    const numB = b.product_no || (b.sku ? parseInt(b.sku) : 0) || 0;
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

    const generateCaption = (product) => {
        if (!product) return '';
        const shopUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        return `${product.name}\n\nPrice: ₹${(product.price || 0).toLocaleString()}\n\n${product.description || 'Premium quality saree from our exclusive collection.'}\n\nShop now: ${shopUrl}/shop?pid=${product?.id || 'new'}\n\n#Vaiyaaree #Sarees #IndianFashion #EthnicWear #SareeLove #NewArrivals`;
    };

    useEffect(() => {
        setHasMounted(true);
        fetchFbConfig();

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

    // Re-run analytics when time range changes
    useEffect(() => {
        if (allProductsData.length > 0) {
            fetchAnalytics(allProductsData);
        }
    }, [timeRange]);

    // Reset to page 1 when search/filter changes
    useEffect(() => {
        setProductsPage(1);
    }, [debouncedSearchTerm, categoryFilter, groupFilter, statusFilter, sortBy]);

    useEffect(() => {
        fetchProducts();
    }, [productsPage, debouncedSearchTerm, categoryFilter, groupFilter, statusFilter, sortBy]);

    if (!hasMounted) return null;

    const canPostToFacebook = () => {
        if (fbConfig?.pageId && fbConfig?.accessToken) return true;
        return false;
    }

    async function handleExcelImport(e) {
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
                setResultModal({
                    title: 'Import Failed',
                    message: 'Excel sheet appears to be empty! Please check your file.',
                    type: 'error'
                });
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
                        type: 'simple', is_active: true,
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

                    // No ID or not found -> Insert as New Draft immediately
                    const { data: newProd, error: insertError } = await mysqlClient.from('products').insert({
                        ...productData,
                        is_active: false // Keep as draft until images assigned
                    }).select().single();
                    
                    if (!insertError && newProd) {
                        newlyImportedProducts.push(newProd);
                        insertCount++;
                    }
                } catch (rowErr) {
                    console.error('Error processing a single row:', rowErr);
                }
            }
            if (insertCount > 0 || updateCount > 0) {
                const total = insertCount + updateCount;
                setResultModal({
                    title: 'Import Successful',
                    message: `Processed ${total} items (${insertCount} new, ${updateCount} updated)!`,
                    type: 'success'
                });

                // Open the image assigner modal with newly imported products
                setImportedProductsForImage(newlyImportedProducts);
            } else {
                setResultModal({
                    title: 'Import Failed',
                    message: 'Import failed. Please check column headers.',
                    type: 'error'
                });
            }

            fetchProducts();
            setImportModal(false);

            e.target.value = '';
        } catch (err) {
            console.error('Major Excel Import Error:', err);
            setResultModal({
                title: 'Import Error',
                message: 'Invalid file or processing failed. Please try again.',
                type: 'error'
            });
        } finally {
            setImporting(false);
        }
    }

    const handleExportExcel = async () => {
        try {
            setResultModal({
                title: 'Exporting...',
                message: 'Fetching products for export. Please wait...',
                type: 'success'
            });

            // Fetch ALL products matching the current filters (ignoring pagination)
            let query = mysqlClient.from('products').select('*');

            if (categoryFilter !== 'ALL') {
                query = query.eq('category', categoryFilter);
            }
            if (groupFilter !== 'ALL') {
                query = query.eq('product_group', groupFilter);
            }
            if (statusFilter !== 'ALL') {
                query = query.eq('is_active', statusFilter === 'ACTIVE');
            }
            if (debouncedSearchTerm.trim()) {
                const term = debouncedSearchTerm.trim();
                query = query.or(`name.ilike.%${term}%,category.ilike.%${term}%,product_group.ilike.%${term}%`);
            }

            if (sortBy === 'low_stock') {
                query = query.order('stock', { ascending: true });
            } else if (sortBy === 'high_price') {
                query = query.order('price', { ascending: false });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data: exportProducts, error } = await query;
            if (error) throw error;

            if (!exportProducts || exportProducts.length === 0) {
                setResultModal({
                    title: 'Export Failed',
                    message: 'No products found to export!',
                    type: 'error'
                });
                return;
            }

            // Sort ascending by created_at to assign continuous Product Nos
            const sortedProducts = [...exportProducts].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

            // Map products to the Excel format including Product No
            const exportData = sortedProducts.map((p, idx) => {
                const prodNo = p.product_no || (p.sku ? parseInt(p.sku) : null) || (1000 + idx);
                return {
                    'Product No': prodNo,
                    'Catalog ID': p.product_catalog_image_id || '',
                    'Name': p.name || '',
                    'Category': p.category || '',
                    'Price': p.price || 0,
                    'Stock': p.stock || 0,
                    'Description': p.description || '',
                    'ID': p.id
                };
            });

            // Create a new workbook and add the data
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

            // Set column widths for better readability
            const colWidths = [
                { wch: 14 }, // Product No
                { wch: 16 }, // Catalog ID
                { wch: 40 }, // Name
                { wch: 20 }, // Category
                { wch: 10 }, // Price
                { wch: 10 }, // Stock
                { wch: 50 }, // Description
                { wch: 36 }, // ID
            ];
            worksheet['!cols'] = colWidths;


            // Generate file buffer and trigger download
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const downloadUrl = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Products_Catalog_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            setResultModal({
                title: 'Export Successful',
                message: `Exported ${exportProducts.length} products successfully!`,
                type: 'success'
            });
        } catch (err) {
            console.error('Export Error:', err);
            setResultModal({
                title: 'Export Error',
                message: 'Error exporting products. Please try again.',
                type: 'error'
            });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const comparePriceInput = formData.get('compare_price') || formData.get('regular_price');
        const comparePriceVal = comparePriceInput && Number(comparePriceInput) > 0 ? Number(comparePriceInput) : null;

        const sellingPriceInput = formData.get('price');
        const sellingPriceVal = sellingPriceInput && Number(sellingPriceInput) > 0 
            ? Number(sellingPriceInput) 
            : (comparePriceVal || 0);

        // Parse user tags and manage mrp tag
        let userTags = formData.get('tags_input') 
            ? formData.get('tags_input').split(',').map(t => t.trim()).filter(t => Boolean(t) && !t.toLowerCase().startsWith('mrp:')) 
            : [];
        
        if (comparePriceVal && sellingPriceInput && comparePriceVal > sellingPriceVal) {
            userTags.push(`mrp:${comparePriceVal}`);
        }

        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            product_group: formData.get('is_explore') === 'on' ? 'EXPLORE' : (formData.get('product_group') || null),
            description: formData.get('description'),
            type: productType,
            tax_class: formData.get('tax_class') || 'GST_5',
            is_active: formData.get('is_active') === 'on',
            is_featured: formData.get('is_featured') === 'on',
            tags: userTags,
            gallery_image: Array.isArray(galleryImageUrl) ? galleryImageUrl : (galleryImageUrl ? galleryImageUrl.split(',').filter(Boolean) : [])
        };

        if (productType === 'simple') {
            // Validation: Regular Price (Original MRP) is mandatory for simple product
            if (!comparePriceVal || comparePriceVal <= 0) {
                setErrorModal({
                    title: 'Regular Price Required',
                    message: 'Regular Price (Original MRP) is mandatory. Please enter a valid Regular Price.'
                });
                return;
            }

            productData.price = sellingPriceVal;
            productData.stock = Number(formData.get('stock'));
            productData.alert_threshold = Number(formData.get('alert_threshold')) || 0;
            productData.image_url = productImageUrl || '';

            const existingCatalogId = currentProduct?.product_catalog_image_id || '';
            productData.product_catalog_image_id = existingCatalogId;
            if (productData.image_url && !productData.product_catalog_image_id) {
                productData.product_catalog_image_id = `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            }
        } else {
            if (variants.length > 0) {
                // Validation: Regular Price (MRP) is mandatory for all variants
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
                productData.stock = variants.reduce((acc, v) => acc + (v.stock || 0), 0);
                productData.alert_threshold = Number(formData.get('alert_threshold')) || 0;
                productData.image_url = variants[0].image_url;
            }
        }

        // Validate: If Compare Price (Selling Price) is entered, it must not exceed Regular Price (MRP)
        if (productType === 'simple' && sellingPriceInput && comparePriceVal && comparePriceVal < Number(sellingPriceInput)) {
            setErrorModal({
                title: 'Invalid Price Setup',
                message: `Regular Price (Original MRP: ₹${comparePriceVal}) cannot be less than Compare Price (Selling Price: ₹${sellingPriceInput}). Regular Price (MRP) must be higher than or equal to Compare Price (Selling Price).`
            });
            return;
        }

        // Validate: Product image is mandatory
        if (productType === 'simple' && !productImageUrl) {
            setErrorModal({
                title: 'Image Required',
                message: 'Please add a product image before saving. Product image is mandatory.'
            });
            return;
        }
        if (productType === 'variant' && variants.length > 0 && !variants[0].image_url) {
            setErrorModal({
                title: 'Image Required',
                message: 'Please add an image for at least the first variant before saving.'
            });
            return;
        }

        try {
            let savedProduct = null;
            const isNew = !currentProduct?.id;

            // Helper function to perform update/insert with automatic missing column fallback
            const executeProductSave = async (dataToSave) => {
                if (!isNew) {
                    let res = await mysqlClient.from('products').update(dataToSave).eq('id', currentProduct.id).select();
                    if (res.error) {
                        const safeData = { ...dataToSave };
                        delete safeData.compare_price;
                        delete safeData.original_price;
                        res = await mysqlClient.from('products').update(safeData).eq('id', currentProduct.id).select();
                    }
                    if (res.error) {
                        throw new Error(res.error.message || res.error.details || 'Failed to update product in database.');
                    }
                    return res.data?.[0];
                } else {
                    let maxNo = 999;
                    (allProductsData || []).forEach(p => {
                        const num = p.product_no || (p.sku ? parseInt(p.sku) : null);
                        if (num && !isNaN(num) && num > maxNo) maxNo = num;
                    });
                    const nextNo = maxNo + 1;

                    const insertData = {
                        ...dataToSave,
                        total_added: dataToSave.stock || 0,
                        product_no: nextNo,
                        sku: String(nextNo)
                    };

                    let res = await mysqlClient.from('products').insert([insertData]).select();
                    if (res.error) {
                        const safeInsert = { ...insertData };
                        delete safeInsert.product_no;
                        delete safeInsert.compare_price;
                        delete safeInsert.original_price;
                        res = await mysqlClient.from('products').insert([safeInsert]).select();
                    }
                    if (res.error) {
                        throw new Error(res.error.message || res.error.details || 'Failed to insert product into database.');
                    }
                    return res.data?.[0];
                }
            };

            savedProduct = await executeProductSave(productData);

            if (!isNew && savedProduct) {
                // Check for stock change
                const oldStock = currentProduct.stock || 0;
                const newStock = productData.stock || 0;
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
            } else if (savedProduct && savedProduct.stock > 0) {
                // Initial stock entry in history
                await mysqlClient.from('product_history').insert({
                    product_id: savedProduct.id,
                    change_type: 'ADD',
                    quantity_change: savedProduct.stock,
                    new_stock: savedProduct.stock,
                    reason: 'Initial Stock Entry'
                });
            }

            if (productType === 'variant' && savedProduct) {
                // 1. Delete removed variants
                const { error: delErr } = await mysqlClient.from('product_variants').delete().eq('product_id', savedProduct.id);
                if (delErr) console.warn('Variant delete note:', delErr);

                // 2. Insert/Update variants
                if (variants.length > 0) {
                    const variantsToInsert = variants.map(v => {
                        const mPrice = v.compare_price ? Math.max(0, parseFloat(v.compare_price)) : 0;
                        const sPrice = v.price !== undefined && v.price !== '' && parseFloat(v.price) > 0 
                            ? Math.max(0, parseFloat(v.price)) 
                            : mPrice;
                        return {
                            product_id: savedProduct.id,
                            name: v.name,
                            price: sPrice,
                            compare_price: (mPrice > 0 && mPrice > sPrice) ? mPrice : null,
                            stock: Math.max(0, parseInt(v.stock || '0')),
                            image_url: v.image_url
                        };
                    });
                    let { error: insErr } = await mysqlClient.from('product_variants').insert(variantsToInsert);
                    if (insErr && (insErr.message.includes('compare_price') || insErr.message.includes('schema cache'))) {
                        const safeVariants = variantsToInsert.map(v => {
                            const copy = { ...v };
                            delete copy.compare_price;
                            return copy;
                        });
                        const fallbackRes = await mysqlClient.from('product_variants').insert(safeVariants);
                        insErr = fallbackRes.error;
                    }
                    if (insErr) {
                        console.error('Variant insert error:', insErr);
                        throw new Error(insErr.message || insErr.details || 'Failed to save product variants');
                    }
                }
            }

            // Handle Facebook/Instagram Posting
            let postErrors = [];

            if (postToFacebook) {
                if (!fbConfig?.pageId || !fbConfig?.accessToken) {
                    postErrors.push('Facebook: Meta not connected. Go to Meta Connect to link your account.');
                } else if (savedProduct) {
                    setFbProcessing(true);
                    try {
                        await fetch('/api/facebook/post', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                imageUrl: productData.image_url,
                                name: productData.name,
                                price: productData.price,
                                description: productData.description,
                                pageId: fbConfig.pageId,
                                accessToken: fbConfig.accessToken
                            })
                        });
                    } catch (fbErr) {
                        postErrors.push('Facebook: ' + fbErr.message);
                    } finally {
                        setFbProcessing(false);
                    }
                }
            }

            if (postToInstagram) {
                if (!fbConfig?.pageId || !fbConfig?.accessToken) {
                    postErrors.push('Instagram: Meta not connected. Go to Meta Connect to link your account.');
                }
                // Instagram posting via Graph API would go here
            }

            if (postErrors.length > 0) {
                setErrorModal({ title: 'Social Post Issues', message: postErrors.join('\n') });
            }

            fetchProducts();
            setSuccessModal({
                title: 'Product Saved Successfully',
                catalogId: productData.product_catalog_image_id || 'N/A'
            });
            setIsEditing(false);
            setCurrentProduct(null);
            setProductImageUrl('');
            setGalleryImageUrl([]);
            setVariants([]);
            setPostToFacebook(false);
            setPostToInstagram(false);
        } catch (error) {
            console.error('Save product exception:', error);
            const errorMsg = error?.message || error?.details || error?.hint || (typeof error === 'object' && Object.keys(error).length > 0 ? JSON.stringify(error) : String(error));
            const displayMsg = (errorMsg && errorMsg !== '{}' && errorMsg !== '[object Object]') ? errorMsg : 'An unexpected database operation error occurred.';
            setErrorModal({
                title: 'Save Failed',
                message: 'Failed to save product: ' + displayMsg
            });
        }
    };

    const openEditModal = async (product) => {
        setCurrentProduct(product);
        setProductType(product?.type || 'simple');
        setProductImageUrl(product?.image_url || '');
        let gallery = product?.gallery_image || [];
        if (typeof gallery === 'string') gallery = gallery.split(',').filter(Boolean);
        setGalleryImageUrl(gallery);
        if (product?.id) {
            const { data } = await mysqlClient.from('product_variants').select('*').eq('product_id', product.id).order('created_at', { ascending: true });
            setVariants(data || []);
        } else {
            setVariants([]);
        }
        setIsEditing(true);
    };

    const addVariant = () => {
        setVariants([...variants, { name: '', price: currentProduct?.price || 0, compare_price: '', stock: 10, image_url: (productImageUrl || '').split(',')[0] || '' }]);
    };

    const updateVariant = (index, field, value) => {
        const newVariants = [...variants];
        newVariants[index][field] = value;
        setVariants(newVariants);
    };

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index));
    };


    const handleDelete = async (id) => {
        setConfirmModal({
            title: 'Delete Product?',
            message: 'Are you sure you want to delete this product? This will also remove its stock history and variants.',
            onConfirm: async () => {
                setLoading(true);
                try {
                    // Deactivate instead of hard delete
                    const { error } = await mysqlClient
                        .from('products')
                        .update({ is_active: false })
                        .eq('id', id);

                    if (error) throw new Error(error.message || error.details || JSON.stringify(error));

                    setResultModal({
                        title: 'Product Deactivated',
                        message: 'This product has been hidden from the shop and marked as INACTIVE.',
                        type: 'success'
                    });
                    fetchProducts();
                } catch (err) {
                    console.error('Deactivation Error:', err);
                    setResultModal({
                        title: 'Action Failed',
                        message: `Could not deactivate: ${err.message || 'Unknown error'}`,
                        type: 'error'
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const toggleSelectItem = (id) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedProductIds.length === filtered.length && filtered.length > 0) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(filtered.map(p => p.id));
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedProductIds.length) return;

        setConfirmModal({
            title: 'Deactivate Products',
            message: `Are you sure you want to deactivate ${selectedProductIds.length} products? They will be hidden from the shop and marked as INACTIVE.`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    const { error } = await mysqlClient
                        .from('products')
                        .update({ is_active: false })
                        .in('id', selectedProductIds);

                    if (error) throw new Error(error.message || error.details || JSON.stringify(error));

                    setResultModal({
                        title: 'Products Deactivated',
                        message: `Successfully deactivated ${selectedProductIds.length} products.`,
                        type: 'success'
                    });
                    setSelectedProductIds([]);
                    fetchProducts();
                } catch (err) {
                    console.error('Bulk Deactivation Error:', err);
                    setResultModal({
                        title: 'Bulk Action Failed',
                        message: `Failed to deactivate products: ${err.message || 'Unknown error'}`,
                        type: 'error'
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

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
            (statusFilter === 'ACTIVE' ? p.is_active !== false : p.is_active === false);
        return matchesSearch && matchesCategory && matchesGroup && matchesStatus;
    });

    const totalStock = statsFiltered.reduce((s, p) => s + (p.stock || 0), 0);
    const totalValue = statsFiltered.reduce((s, p) => s + ((p.price || 0) * (p.stock || 0)), 0);

    const totalProductPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
    const paginatedProducts = products;
    const filtered = products;

    return (
        <>
            <div className="animate-enter">
                {/*  MAIN LIST VIEW (Hidden when a sub-page is active)  */}
                {!isEditing && !showHistory && !importModal && (
                    <>
                        {/* Header */}
                        <div className="admin-header-row">
                            <div>
                                <h1 style={{ marginBottom: '0.5rem' }}>Products</h1>
                                <p>Manage your premium product collection • {totalCount} items</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setImportedProductsForImage([])} className="btn btn-secondary">
                                    <Upload size={18} /> Image Upload / Import
                                </button>
                                <button onClick={handleExportExcel} className="btn btn-secondary">
                                    <FileDown size={18} style={{ transform: 'rotate(180deg)' }} /> Export Excel
                                </button>
                                <button onClick={() => { setCurrentProduct(null); setProductType('simple'); setVariants([]); setProductImageUrl(''); setGalleryImageUrl([]); setIsEditing(true); }} className="btn btn-primary">
                                    <Plus size={18} /> Add Product
                                </button>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="admin-grid-3">
                            {[
                                { label: 'Total Products', value: totalCount, color: 'hsl(var(--primary))' },
                                { label: 'Total Stock', value: `${totalStock} pcs`, color: 'hsl(var(--accent))' },
                                { label: 'Inventory Value', value: `₹${totalValue.toLocaleString()}`, color: 'hsl(var(--success))' },
                            ].map(s => (
                                <div key={s.label} className="card" style={{ padding: '1.5rem', borderTop: `3px solid ${s.color}` }}>
                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Filter Row - Combined Category and Status */}
                        <div className="admin-filter-row" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Collection:</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    style={{ padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat === 'ALL' ? 'All Collections' : cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ width: '1px', height: '24px', background: 'hsl(var(--border-subtle))' }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Status:</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value); setProductsPage(1); }}
                                    style={{ padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                                >
                                    <option value="ALL">All Products ({allProductsData.length})</option>
                                    <option value="ACTIVE">Active ({allProductsData.filter(p => p.is_active !== false).length})</option>
                                    <option value="INACTIVE">Inactive ({allProductsData.filter(p => p.is_active === false).length})</option>
                                </select>
                            </div>

                            <div style={{ width: '1px', height: '24px', background: 'hsl(var(--border-subtle))' }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Group:</label>
                                <select
                                    value={groupFilter}
                                    onChange={(e) => setGroupFilter(e.target.value)}
                                    style={{ padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-subtle))', backgroundColor: 'hsl(var(--bg-app))', color: 'hsl(var(--text-main))', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                                >
                                    {groups.map(g => (
                                        <option key={g} value={g}>{g === 'ALL' ? 'All Groups' : g}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="card" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Search */}
                            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                                <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                                <input
                                    type="text"
                                    placeholder="Search products by name, category or catalog ID..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="admin-input"
                                    style={{ paddingLeft: '2.75rem' }}
                                />
                            </div>

                            {/* Sort */}
                            <div style={{ minWidth: '180px', position: 'relative' }}>
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                    className="admin-input"
                                    style={{ width: '100%', paddingLeft: '1rem', paddingRight: '2.5rem', height: '42px', fontSize: '0.85rem', appearance: 'none', cursor: 'pointer' }}
                                >
                                    <option value="product_no_asc">Product No: Ascending (#1001, #1002...)</option>
                                    <option value="newest">Newest First</option>
                                    <option value="low_stock">Low Stock First</option>
                                    <option value="high_price">Price: High to Low</option>
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', pointerEvents: 'none' }} />
                            </div>

                            {/* View Toggle & Showing Items */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'nowrap', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.25rem', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', borderRadius: '12px', padding: '4px' }}>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        title="Table View"
                                        style={{
                                            padding: '0.45rem 0.85rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 600,
                                            background: viewMode === 'table' ? 'hsl(var(--primary))' : 'transparent',
                                            color: viewMode === 'table' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                            transition: 'all 0.2s'
                                        }}>
                                        <List size={15} /> Table
                                    </button>
                                    <button
                                        onClick={() => setViewMode('card')}
                                        title="Card View"
                                        style={{
                                            padding: '0.45rem 0.85rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 600,
                                            background: viewMode === 'card' ? 'hsl(var(--primary))' : 'transparent',
                                            color: viewMode === 'card' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                            transition: 'all 0.2s'
                                        }}>
                                        <LayoutGrid size={14} /> Cards
                                    </button>
                                    <button
                                        onClick={() => setViewMode('analytics')}
                                        title="Analytics View"
                                        style={{
                                            padding: '0.45rem 0.85rem', border: 'none', borderRadius: '8px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', fontWeight: 600,
                                            background: viewMode === 'analytics' ? 'hsl(var(--primary))' : 'transparent',
                                            color: viewMode === 'analytics' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                            transition: 'all 0.2s'
                                        }}>
                                        <TrendingUp size={14} /> Analysis
                                    </button>
                                </div>
                                <span style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', fontWeight: 600, marginLeft: '0.25rem' }}>
                                    Showing {totalCount > 0 ? (productsPage - 1) * PRODUCTS_PER_PAGE + 1 : 0} - {Math.min(productsPage * PRODUCTS_PER_PAGE, totalCount)} of {totalCount} items
                                </span>
                            </div>
                        </div>

                        {/*  ANALYTICS VIEW  */}
                        {viewMode === 'analytics' && (
                            <div className="animate-enter">
                                {/* Time Filters */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', background: 'hsl(var(--bg-card))', padding: '4px', borderRadius: '12px', width: 'fit-content', border: '1px solid hsl(var(--border-subtle))' }}>
                                    {['DAILY', 'MONTHLY', 'QUARTERLY', 'ALL'].map(r => (
                                        <button key={r} onClick={() => setTimeRange(r)} style={{
                                            padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                            background: timeRange === r ? 'hsl(var(--primary))' : 'transparent',
                                            color: timeRange === r ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))'
                                        }}>{r}</button>
                                    ))}
                                </div>

                                <div className="admin-grid-2" style={{ marginBottom: '1.5rem' }}>
                                    <div className="card shadow-premium" style={{ padding: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Trophy size={18} color="#f59e0b" /> Best Sellers ({timeRange})
                                        </h3>
                                        <div style={{ height: '300px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analyticsData.topSellers}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--text-muted))' }} />
                                                    <Tooltip contentStyle={{ background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }} />
                                                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={34} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="card shadow-premium" style={{ padding: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <PackageIcon size={18} color="hsl(var(--success))" /> Stock Health Monitor
                                        </h3>
                                        <div style={{ height: '300px' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={analyticsData.inventoryStatus} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                        {analyticsData.inventoryStatus.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="card shadow-premium" style={{ padding: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Collection Distribution</h3>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.categoryValue}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border-subtle))" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--text-muted))' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--text-muted))' }} />
                                                <Tooltip contentStyle={{ background: 'hsl(var(--bg-app))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))' }} />
                                                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/*  TABLE VIEW  */}
                        {viewMode === 'table' && (
                            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                                {loading ? (
                                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                                    </div>
                                ) : (
                                    <div style={{ minWidth: '950px' }}>
                                        <table style={{ margin: 0, width: '100%' }}>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={filtered.length > 0 && selectedProductIds.length === filtered.length}
                                                            onChange={toggleSelectAll}
                                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                        />
                                                    </th>
                                                    <th>Product No</th>
                                                    <th>Product</th>
                                                    <th>Category</th>
                                                    <th style={{ textAlign: 'right' }}>Price</th>
                                                    <th style={{ textAlign: 'center' }}>Stock</th>
                                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.length === 0 ? (
                                                    <tr><td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No products found.</td></tr>
                                                ) : paginatedProducts.map((product, idx) => (
                                                    <tr key={product.id} onClick={() => openEditModal(product)} style={{
                                                        background: selectedProductIds.includes(product.id) ? 'hsl(var(--primary) / 0.02)' : 'transparent',
                                                        cursor: 'pointer'
                                                    }}>
                                                        <td style={{ padding: '0.75rem 1rem', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: 600 }}>{(productsPage - 1) * PRODUCTS_PER_PAGE + idx + 1}</td>
                                                        <td style={{ textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); toggleSelectItem(product.id); }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProductIds.includes(product.id)}
                                                                onChange={() => { }}
                                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '0.75rem 0.5rem' }}>
                                                            <span style={{ fontSize: '0.82rem', fontWeight: 900, background: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))', padding: '4px 10px', borderRadius: '8px', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                                                                #{product.product_no || (product.sku ? parseInt(product.sku) : null) || (1000 + (productsPage - 1) * PRODUCTS_PER_PAGE + idx)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.75rem 1.5rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }} title="Click to edit product">
                                                                <div style={{ width: '52px', height: '52px', borderRadius: '10px', overflow: 'hidden', background: 'hsl(var(--bg-app))', flexShrink: 0, border: '1px solid hsl(var(--border-subtle))', position: 'relative' }}>
                                                                    {product.image_url ? (
                                                                        <>
                                                                            <img src={product.image_url?.split(',')[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                                onClick={(e) => { e.stopPropagation(); setZoomedImage(product.image_url?.split(',')[0]); }}
                                                                                onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'; }} />
                                                                            {/* {product.product_catalog_image_id && (
                                                                                <div style={{
                                                                                    position: 'absolute', bottom: 2, right: 2,
                                                                                    background: 'hsl(var(--accent))', color: 'white',
                                                                                    fontSize: '0.6rem', fontWeight: 700, padding: '2px 4px',
                                                                                    borderRadius: '4px', fontFamily: 'var(--font-body)'
                                                                                }}> */}
                                                                                    {/* {product.product_catalog_image_id} */}
                                                                                {/* </div>
                                                                            )} */}
                                                                        </>
                                                                    ) : (
                                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <ImageIcon size={18} color="hsl(var(--text-muted))" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    {product.product_catalog_image_id && (
                                                                        <div style={{
                                                                            fontSize: '0.65rem', fontWeight: 800, fontFamily: 'var(--font-roboto)',
                                                                            // background: 'hsl(var(--accent) / 0.1)', color: 'hsl(var(--accent))',
                                                                            padding: '1px 5px', borderRadius: '3px', display: 'inline-block', marginBottom: '2px',
                                                                            width: 'fit-content'
                                                                        }}>
                                                                            {product.product_catalog_image_id}
                                                                        </div>
                                                                    )}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ fontWeight: 600, color: 'hsl(var(--text-main))' }}>{product.name}</div>
                                                                        {product.is_featured && (
                                                                            <span style={{ fontSize: '0.65rem', background: 'hsl(var(--primary))', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>FEATURED</span>
                                                                        )}
                                                                        {product.is_active === false && (
                                                                            <span style={{ fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>INACTIVE</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span style={{ padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-muted))', border: '1px solid hsl(var(--border-subtle))', whiteSpace: 'nowrap' }}>
                                                                {product.category}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{(product.price || 0).toLocaleString()}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={(product.stock || 0) <= (product.alert_threshold || 5) ? 'badge badge-cancelled' : 'badge badge-delivered'} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                                {product.stock} pcs
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                                <button onClick={(e) => { e.stopPropagation(); window.open(getProductUrl(product), '_blank'); }} title="View Product Page" className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }}>
                                                                    <Eye size={15} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); shareToStatus(product); }} title="Share to Status" className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }}>
                                                                    <Share2 size={15} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); fetchHistory(product); }} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }} title="View Details">
                                                                    <PackageIcon size={15} />
                                                                </button>
                                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)' }}><Trash2 size={15} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Table Pagination */}
                                {totalProductPages > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap' }}>
                                        <button onClick={() => setProductsPage(p => Math.max(1, p - 1))} disabled={productsPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: productsPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                            <ChevronLeft size={16} /> Previous
                                        </button>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            {(() => {
                                                const pages = [];
                                                const range = 1;
                                                pages.push(1);
                                                if (productsPage > range + 2) pages.push('...');
                                                for (let i = Math.max(2, productsPage - range); i <= Math.min(totalProductPages - 1, productsPage + range); i++) { pages.push(i); }
                                                if (productsPage < totalProductPages - range - 1) pages.push('...');
                                                if (totalProductPages > 1) pages.push(totalProductPages);
                                                return pages.map((page, i) => (
                                                    page === '...' ? (
                                                        <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                                    ) : (
                                                        <button key={page} onClick={() => setProductsPage(page)} className="btn" style={{ minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px', background: productsPage === page ? 'hsl(var(--primary))' : '#ffffff', color: productsPage === page ? 'white' : 'hsl(var(--text-main))', border: productsPage === page ? 'none' : '1px solid hsl(var(--border-subtle))', cursor: 'pointer', transition: 'all 0.2s' }}>{page}</button>
                                                    )
                                                ));
                                            })()}
                                        </div>
                                        <button onClick={() => setProductsPage(p => Math.min(totalProductPages, p + 1))} disabled={productsPage === totalProductPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: productsPage === totalProductPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                            Next <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/*  CARD VIEW  */}
                        {viewMode === 'card' && (
                            <div>
                                {loading ? (
                                    <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No products found.</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                        {paginatedProducts.map(product => (
                                            <div key={product.id} className="card" style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
                                                {/* Product Image */}
                                                <div style={{ height: '190px', background: 'hsl(var(--bg-app))', overflow: 'hidden', position: 'relative', cursor: 'pointer' }} onClick={() => openEditModal(product)} title="Click to edit product">
                                                    {product.image_url ? (
                                                        <>
                                                            <img src={product.image_url?.split(',')[0]} alt={product.name}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                onClick={(e) => { e.stopPropagation(); setZoomedImage(product.image_url?.split(',')[0]); }}
                                                                onError={e => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }} />
                                                        </>
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                                                            <ImageIcon size={48} color="hsl(var(--text-muted))" />
                                                        </div>
                                                    )}
                                                    {/* Stock badge */}
                                                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                                        <span className={(product.stock || 0) <= (product.alert_threshold || 5) ? 'badge badge-cancelled' : 'badge badge-delivered'}>
                                                            {product.stock} pcs
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Info */}
                                                <div style={{ padding: '1rem' }}>
                                                    {product.product_catalog_image_id && (
                                                        <div style={{
                                                            fontSize: '0.65rem', fontWeight: 800, fontFamily: 'var(--font-roboto)',
                                                            background: 'hsl(var(--accent) / 0.1)', color: 'hsl(var(--accent))',
                                                            padding: '1px 5px', borderRadius: '3px', display: 'inline-block', marginBottom: '6px'
                                                        }}>
                                                            {product.product_catalog_image_id}
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {product.category}
                                                    </div>
                                                    <div style={{ fontWeight: 700, color: 'hsl(var(--text-main))', fontSize: '0.95rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.description || '—'}</div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--primary))', marginBottom: '12px' }}>₹{(product.price || 0).toLocaleString()}</div>
                                                    {/* Actions */}
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={() => window.open(getProductUrl(product), '_blank')}
                                                            className="btn btn-secondary" style={{ padding: '0.5rem', color: 'hsl(var(--primary))' }} title="View Product Page">
                                                            <Eye size={13} />
                                                        </button>
                                                        <button onClick={() => fetchHistory(product)} className="btn btn-secondary" style={{ padding: '0.5rem', color: 'hsl(var(--primary))' }} title="View Details">
                                                            <PackageIcon size={13} />
                                                        </button>
                                                        <button onClick={() => shareToStatus(product)}
                                                            className="btn btn-secondary" style={{ padding: '0.5rem', flex: '0.5', color: 'hsl(var(--primary))' }}>
                                                            <Share2 size={13} />
                                                        </button>
                                                        <button onClick={() => handleDelete(product.id)}
                                                            className="btn btn-secondary" style={{ padding: '0.5rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)' }}>
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Card Pagination */}
                                {totalProductPages > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem 1.25rem', borderTop: '1px solid hsl(var(--border-subtle))', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                                        <button onClick={() => setProductsPage(p => Math.max(1, p - 1))} disabled={productsPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: productsPage === 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                            <ChevronLeft size={16} /> Previous
                                        </button>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            {(() => {
                                                const pages = [];
                                                const range = 1;
                                                pages.push(1);
                                                if (productsPage > range + 2) pages.push('...');
                                                for (let i = Math.max(2, productsPage - range); i <= Math.min(totalProductPages - 1, productsPage + range); i++) { pages.push(i); }
                                                if (productsPage < totalProductPages - range - 1) pages.push('...');
                                                if (totalProductPages > 1) pages.push(totalProductPages);
                                                return pages.map((page, i) => (
                                                    page === '...' ? (
                                                        <span key={`dots-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 0.5rem', fontWeight: 600 }}>...</span>
                                                    ) : (
                                                        <button key={page} onClick={() => setProductsPage(page)} className="btn" style={{ minWidth: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px', background: productsPage === page ? 'hsl(var(--primary))' : '#ffffff', color: productsPage === page ? 'white' : 'hsl(var(--text-main))', border: productsPage === page ? 'none' : '1px solid hsl(var(--border-subtle))', cursor: 'pointer', transition: 'all 0.2s' }}>{page}</button>
                                                    )
                                                ));
                                            })()}
                                        </div>
                                        <button onClick={() => setProductsPage(p => Math.min(totalProductPages, p + 1))} disabled={productsPage === totalProductPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', opacity: productsPage === totalProductPages ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
                                            Next <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/*  EDIT / ADD PRODUCT PAGE  */}
                {isEditing && (
                    <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                        <div className="card shadow-premium" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2.5rem', border: '1px solid hsl(var(--border-subtle))', display: 'flex', flexDirection: 'column', borderRadius: '16px', background: '#ffffff' }}>
                            <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{currentProduct?.id ? 'Edit Product' : 'Add New Product'}</h2>
                                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Fill in the details for your catalogue.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    {/* <button type="button" onClick={() => {
                                        const name = document.querySelector('input[name="name"]')?.value;
                                        const price = document.querySelector('input[name="price"]')?.value;
                                        const desc = document.querySelector('textarea[name="description"]')?.value;
                                        setPreviewModal({
                                            product: { name, price, image_url: (productImageUrl || '').split(',')[0] },
                                            caption: generateCaption({ name, price, description: desc, id: currentProduct?.id || 'new' })
                                        });
                                    }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1.25rem', color: 'hsl(var(--primary))' }}>
                                        <Eye size={16} /> View Post Preview
                                    </button> */}
                                    <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Products</button>
                                </div>
                            </div>
                            <form onSubmit={handleSave} style={{ padding: '1.75rem' }}>
                                {/* Product Type Toggle */}
                                <div style={{ marginBottom: '1.75rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product Type</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                        <button type="button" onClick={() => setProductType('simple')} style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                            background: productType === 'simple' ? 'hsl(var(--primary))' : 'transparent',
                                            color: productType === 'simple' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                            fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}>
                                            <PackageIcon size={16} /> Simple Product
                                        </button>
                                        <button type="button" onClick={() => setProductType('variant')} style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                            background: productType === 'variant' ? 'hsl(var(--primary))' : 'transparent',
                                            color: productType === 'variant' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                            fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}>
                                            <LayoutGrid size={16} /> Variant Product
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                                        Basic Information
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Product Name *</label>
                                            <input name="name" type="text" defaultValue={currentProduct?.name} required placeholder="e.g. Royal Kanjivaram Silk" className="admin-input" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Category *</label>
                                            <select name="category" defaultValue={currentProduct?.category || 'Silk Saree'} className="admin-input-select">
                                                <option>Silk Saree</option>
                                                <option>Cotton Saree</option>
                                                <option>Designer</option>
                                                <option>Georgette</option>
                                                <option>Banarasi</option>
                                                <option>Chiffon</option>
                                                <option>Linen</option>
                                            </select>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Description</label>
                                            <textarea name="description" defaultValue={currentProduct?.description} placeholder="Enter product description..." className="admin-input" rows="3" style={{ width: '100%', padding: '0.75rem', background: 'hsl(var(--bg-card))', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', color: 'hsl(var(--text-main))', fontFamily: 'inherit', resize: 'vertical' }}></textarea>
                                        </div>
                                    </div>
                                </div>

                                {productType === 'simple' ? (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                            Product Details (Single Item)
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Regular Price (Original MRP ₹) *</label>
                                                <input 
                                                    type="number" 
                                                    name="compare_price" 
                                                    defaultValue={(() => {
                                                        const tagList = Array.isArray(currentProduct?.tags) 
                                                            ? currentProduct?.tags 
                                                            : (typeof currentProduct?.tags === 'string' ? currentProduct?.tags.split(',') : []);
                                                        const mrpTag = tagList.map(t => String(t).trim()).find(t => t.toLowerCase().startsWith('mrp:'));
                                                        return mrpTag ? mrpTag.split(':')[1] : (currentProduct?.compare_price || currentProduct?.original_price || '');
                                                    })()} 
                                                    required
                                                    min="0" 
                                                    placeholder="e.g. 1600 (Original MRP)" 
                                                    className="admin-input" 
                                                    onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} 
                                                />
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block', fontWeight: 600 }}>Original MRP / Base Price (Mandatory)</span>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Compare Price (Selling Price ₹)</label>
                                                <input 
                                                    type="number" 
                                                    name="price" 
                                                    defaultValue={currentProduct?.price} 
                                                    min="0" 
                                                    placeholder="e.g. 1400 (Selling Price)" 
                                                    className="admin-input" 
                                                    onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} 
                                                />
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block', fontWeight: 600 }}>Optional Selling Price (e.g. ₹1,400)</span>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Stock Qty *</label>
                                                <input type="number" name="stock" defaultValue={currentProduct?.stock} required min="0" placeholder="e.g. 20" className="admin-input" onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1.25rem' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '10px' }}>Product Image *</label>
                                                {productImageUrl && (
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignContent: 'flex-start' }}>
                                                        {productImageUrl.split(',').filter(Boolean).map((imgUrl, idx) => (
                                                            <div key={imgUrl} style={{ position: 'relative', width: '80px', height: '100px' }}>
                                                                <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', cursor: 'pointer' }} onClick={() => setZoomedImage(imgUrl)} title="Click to zoom" />
                                                                <button type="button" onClick={() => {
                                                                    setProductImageUrl(prev => {
                                                                        const urls = prev.split(',').filter(Boolean);
                                                                        urls.splice(idx, 1);
                                                                        return urls.join(',');
                                                                    });
                                                                }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button type="button" onClick={() => { setActiveImageField({ type: 'product' }); setTimeout(() => setShowMediaPicker(true), 50); }} className="btn btn-secondary" style={{ flex: 1, height: '44px' }}>
                                                        <ImageIcon size={15} /> From Library
                                                    </button>
                                                    <label className="btn btn-secondary" style={{ flex: 1, height: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <Upload size={15} /> Upload Files
                                                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async (e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            if (!files.length) return;
                                                            try {
                                                                setLoadingOverlayText("Processing..."); setOcrLoading(true);

                                                                for (const file of files) {
                                                                    const reader = new FileReader();
                                                                    const filePromptPromise = new Promise((resolve) => {
                                                                        reader.onload = async (re) => {
                                                                            try {
                                                                                const base64 = re.target.result;

                                                                                // 1. Send for detection
                                                                                const formData = new FormData();
                                                                                formData.append('file', file);
                                                                                formData.append('checkOnly', 'true');
                                                                                const token = localStorage.getItem('cast_prince_admin') || '';
                                                                                 const detRes = await fetch('/api/admin/upload', {
                                                                                     method: 'POST',
                                                                                     headers: { 'Authorization': `Bearer ${token}` },
                                                                                     body: formData
                                                                                 });
                                                                                const detData = await detRes.json();

                                                                                const onProceedWithUpload = async (catId) => {
                                                                                    setLoadingOverlayText("Processing..."); setOcrLoading(true);
                                                                                    const uploadData = new FormData();
                                                                                    uploadData.append('file', file);
                                                                                    uploadData.append('catalogId', catId);
                                                                                    uploadData.append('requireClean', 'true');
                                                                                    uploadData.append('skipDetection', 'true');
                                                                                    const token = localStorage.getItem('cast_prince_admin') || '';
                                                                                     const res = await fetch('/api/admin/upload', {
                                                                                         method: 'POST',
                                                                                         headers: { 'Authorization': `Bearer ${token}` },
                                                                                         body: uploadData
                                                                                     });
                                                                                    const data = await res.json();

                                                                                    const finalUrl = data.watermarkedUrl || data.url;
                                                                                    setProductImageUrl(prev => {
                                                                                        const existingArray = prev ? prev.split(',').filter(Boolean) : [];
                                                                                        return [...existingArray, finalUrl].join(',');
                                                                                    });
                                                                                    if (data.catalogId) {
                                                                                        setCurrentProduct(prev => ({ ...prev, product_catalog_image_id: data.catalogId }));
                                                                                    }

                                                                                    setWatermarkModal(null);
                                                                                    resolve();
                                                                                };

                                                                                if (detData.hasWatermark) {
                                                                                    setErrorModal({
                                                                                        title: 'Watermarked Image Blocked',
                                                                                        message: `This uploaded image already contains an existing product watermark (${detData.catalogId || 'CAT-CODE'}). Images with existing product watermarks cannot be selected or uploaded as product images.`
                                                                                    });
                                                                                    resolve();
                                                                                    return;
                                                                                } else {
                                                                                    const newCatId = currentProduct?.product_catalog_image_id || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                                                                                    setWatermarkModal({
                                                                                        type: 'new',
                                                                                        detectedCode: newCatId,
                                                                                        url: base64,
                                                                                        onProceed: () => onProceedWithUpload(newCatId)
                                                                                    });
                                                                                }
                                                                            } catch (err) {
                                                                                setErrorModal({ title: 'Error', message: err.message });
                                                                                resolve();
                                                                            } finally {
                                                                                setOcrLoading(false);
                                                                            }
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    });
                                                                    await filePromptPromise;
                                                                }

                                                            } catch (err) { setErrorModal({ title: 'Upload Error', message: err.message }); }
                                                            finally { setOcrLoading(false); }
                                                            e.target.value = '';
                                                        }} />
                                                    </label>
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '10px' }}>Gallery Image</label>
                                                {galleryImageUrl.filter(Boolean).length > 0 && (
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignContent: 'flex-start' }}>
                                                    {galleryImageUrl.filter(Boolean).map((imgUrl, idx) => (
                                                        <div key={imgUrl} style={{ position: 'relative', width: '80px', height: '100px' }}>
                                                            <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', cursor: 'pointer' }} onClick={() => setZoomedImage(imgUrl)} title="Click to zoom" />
                                                            <button type="button" onClick={() => {
                                                                setGalleryImageUrl(prev => {
                                                                    const urls = [...prev];
                                                                    urls.splice(idx, 1);
                                                                    return urls;
                                                                });
                                                            }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}></button>
                                                        </div>
                                                    ))}
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button type="button" onClick={() => { setActiveImageField({ type: 'gallery' }); setTimeout(() => setShowMediaPicker(true), 50); }} className="btn btn-secondary" style={{ flex: 1, height: '44px' }}>
                                                        <ImageIcon size={15} /> From Library
                                                    </button>
                                                    <label className="btn btn-secondary" style={{ flex: 1, height: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <Upload size={15} /> Upload Files
                                                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async (e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            if (!files.length) return;
                                                            try {
                                                                setLoadingOverlayText('Uploading Gallery Assets...');
                                                                setOcrLoading(true);
                                                                const uploadedUrls = [];
                                                                for (const file of files) {
                                                                    const formData = new FormData();
                                                                    formData.append('file', file);
                                                                    formData.append('skipDetection', 'true');
                                                                    formData.append('requireClean', 'false');
                                                                    const token = localStorage.getItem('cast_prince_admin') || '';
                                                                     const res = await fetch('/api/admin/upload', {
                                                                         method: 'POST',
                                                                         headers: { 'Authorization': `Bearer ${token}` },
                                                                         body: formData
                                                                     });
                                                                    const data = await res.json();
                                                                    if (res.ok) uploadedUrls.push(data.url);
                                                                }
                                                                setGalleryImageUrl(prev => [...uploadedUrls, ...prev]);
                                                            } catch (err) {
                                                                setErrorModal({ title: 'Upload Error', message: err.message });
                                                            } finally {
                                                                setOcrLoading(false);
                                                            }
                                                            e.target.value = '';
                                                        }} />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1.25rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Low Stock Threshold</label>
                                            <input type="number" name="alert_threshold" defaultValue={currentProduct?.alert_threshold || 0} min="0" className="admin-input" onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                            Manage Variants (Saree Blouse Sizes & Colors)
                                        </h3>
                                        <div style={{ padding: '1.25rem', background: '#f1f5f9', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))' }}>
                                            {/* Quick Add Size Presets Toolbar */}
                                            <div style={{ marginBottom: '1.25rem', background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                                    <span>Quick Add Size Presets (Saree Blouse & Apparel):</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            const defaultPrice = currentProduct?.price || 0;
                                                            const blouseSizes = ['32', '34', '36', '38', '40', '42', 'Unstitched'];
                                                            const newEntries = blouseSizes
                                                                .filter(sz => !variants.some(v => String(v.name || '').trim().toLowerCase() === sz.toLowerCase()))
                                                                .map(sz => ({ name: sz, price: defaultPrice, stock: 10, image_url: (productImageUrl || '').split(',')[0] || '' }));
                                                            setVariants([...variants, ...newEntries]);
                                                        }}
                                                        style={{ background: '#5d0821', color: '#ffffff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer' }}
                                                    >
                                                        + Add All Saree Blouse Sizes (32 - 42, Unstitched)
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {['32', '34', '36', '38', '40', '42', '44', 'Unstitched', 'Free Size', 'S', 'M', 'L', 'XL', 'XXL'].map(sz => {
                                                        const exists = variants.some(v => String(v.name || '').trim().toLowerCase() === sz.toLowerCase());
                                                        return (
                                                            <button
                                                                key={sz}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!exists) {
                                                                        setVariants([...variants, { name: sz, price: currentProduct?.price || 0, stock: 10, image_url: (productImageUrl || '').split(',')[0] || '' }]);
                                                                    }
                                                                }}
                                                                style={{
                                                                    background: exists ? '#e2e8f0' : '#f8fafc',
                                                                    color: exists ? '#64748b' : '#0f172a',
                                                                    border: '1px solid #cbd5e1',
                                                                    padding: '0.3rem 0.65rem',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    cursor: exists ? 'default' : 'pointer'
                                                                }}
                                                                disabled={exists}
                                                            >
                                                                + {sz}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Variant List:</span>
                                                <button type="button" onClick={addVariant} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}>
                                                    <Plus size={14} /> Add Custom Variant
                                                </button>
                                            </div>

                                            {/* Column Header Titles */}
                                            {variants.length > 0 && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.1fr 1.1fr 0.9fr 2fr auto', gap: '0.6rem', marginBottom: '0.4rem', padding: '0 4px', fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <div>Size / Option Name</div>
                                                    <div>Regular Price (MRP ₹) *</div>
                                                    <div>Compare Price (Selling Price ₹)</div>
                                                    <div>Stock Qty *</div>
                                                    <div>Variant Image</div>
                                                    <div>Action</div>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {variants.map((v, i) => (
                                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.1fr 1.1fr 0.9fr 2fr auto', gap: '0.6rem', alignItems: 'center' }}>
                                                        <input placeholder="Size (e.g. 38, Unstitched)" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} className="admin-input" style={{ padding: '0.5rem' }} />
                                                        <input type="number" placeholder="MRP (Mandatory)" value={v.compare_price || ''} min="0" required onChange={e => updateVariant(i, 'compare_price', e.target.value ? Number(e.target.value) : '')} className="admin-input" style={{ padding: '0.5rem' }} onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                                                        <input type="number" placeholder="Selling Price (Optional)" value={v.price !== undefined ? v.price : ''} min="0" onChange={e => updateVariant(i, 'price', e.target.value ? Number(e.target.value) : '')} className="admin-input" style={{ padding: '0.5rem' }} onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                                                        <input type="number" placeholder="Stock" value={v.stock} min="0" onChange={e => updateVariant(i, 'stock', Number(e.target.value))} className="admin-input" style={{ padding: '0.5rem' }} onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {v.image_url && <img src={v.image_url} style={{ width: '32px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setZoomedImage(v.image_url)} title="Click to zoom" />}
                                                            <button type="button" onClick={() => { setActiveImageField({ type: 'variant', index: i }); setTimeout(() => setShowMediaPicker(true), 20); }} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.7rem', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                                <ImageIcon size={14} /> Library
                                                            </button>
                                                            <label className="btn btn-secondary" style={{ flex: 1, fontSize: '0.7rem', padding: '0.4rem 0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                                <Upload size={14} /> Upload
                                                                <input type="file" style={{ display: 'none' }} onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (!file) return;
                                                                    try {
                                                                        setLoadingOverlayText('Processing Variant Image...');
                                                                        setLoadingOverlayText("Processing..."); setOcrLoading(true);
                                                                        const reader = new FileReader();
                                                                        reader.onload = async (re) => {
                                                                            try {
                                                                                const base64 = re.target.result;

                                                                                // 1. Send for detection
                                                                                const formData = new FormData();
                                                                                formData.append('file', file);
                                                                                formData.append('checkOnly', 'true');
                                                                                const token = localStorage.getItem('cast_prince_admin') || '';
                                                                                 const detRes = await fetch('/api/admin/upload', {
                                                                                     method: 'POST',
                                                                                     headers: { 'Authorization': `Bearer ${token}` },
                                                                                     body: formData
                                                                                 });
                                                                                const detData = await detRes.json();

                                                                                const onProceedWithVariantUpload = async (catId) => {
                                                                                    setLoadingOverlayText("Processing..."); setOcrLoading(true);
                                                                                    const uploadData = new FormData();
                                                                                    uploadData.append('file', file);
                                                                                    uploadData.append('catalogId', catId);
                                                                                    uploadData.append('requireClean', 'true');
                                                                                    uploadData.append('skipDetection', 'true');
                                                                                    const token = localStorage.getItem('cast_prince_admin') || '';
                                                                                     const res = await fetch('/api/admin/upload', {
                                                                                         method: 'POST',
                                                                                         headers: { 'Authorization': `Bearer ${token}` },
                                                                                         body: uploadData
                                                                                     });
                                                                                    const data = await res.json();
                                                                                    if (!res.ok) throw new Error(data.error || 'Upload failed');

                                                                                    updateVariant(i, 'image_url', data.watermarkedUrl || data.url);
                                                                                    if (data.catalogId) {
                                                                                        setCurrentProduct(prev => ({ ...prev, product_catalog_image_id: data.catalogId }));
                                                                                    }
                                                                                    setWatermarkModal(null);
                                                                                };

                                                                                if (detData.hasWatermark) {
                                                                                    setErrorModal({
                                                                                        title: 'Watermarked Image Blocked',
                                                                                        message: `This uploaded image already contains an existing product watermark (${detData.catalogId || 'CAT-CODE'}). Images with existing product watermarks cannot be assigned to variants.`
                                                                                    });
                                                                                    return;
                                                                                } else {
                                                                                    const newCatId = currentProduct?.product_catalog_image_id || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                                                                                    setWatermarkModal({
                                                                                        type: 'new',
                                                                                        detectedCode: newCatId,
                                                                                        url: base64,
                                                                                        onProceed: () => onProceedWithVariantUpload(newCatId)
                                                                                    });
                                                                                }
                                                                            } catch (err) { setErrorModal({ title: 'Error', message: err.message }); }
                                                                            finally { setOcrLoading(false); }
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    } catch (err) { setErrorModal({ title: 'Error', message: err.message }); }
                                                                    finally { setOcrLoading(false); }
                                                                }} />
                                                            </label>
                                                        </div>
                                                        <button type="button" onClick={() => removeVariant(i)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--danger) / 0.1)', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ marginTop: '1rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Low Stock Alert Threshold (Overall)</label>
                                                <input type="number" name="alert_threshold" defaultValue={currentProduct?.alert_threshold || 0} min="0" className="admin-input" onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} />
                                            </div>
                                        </div>
                                    </div>
                                )}


                                <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Product Group</label>
                                        <input name="product_group" defaultValue={currentProduct?.product_group || ''} className="admin-input" placeholder="e.g. Bestsellers" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Product Tags (Keywords)</label>
                                        <input 
                                            name="tags_input" 
                                            defaultValue={(Array.isArray(currentProduct?.tags) ? currentProduct?.tags : (typeof currentProduct?.tags === 'string' ? currentProduct?.tags.split(',') : []))
                                                .map(t => String(t).trim())
                                                .filter(t => Boolean(t) && !t.toLowerCase().startsWith('mrp:'))
                                                .join(', ')
                                            } 
                                            className="admin-input" 
                                            placeholder="e.g. silk, pure, heavy work (comma separated)" 
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', padding: '1rem', background: '#f1f5f9', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input id="is_featured" name="is_featured" type="checkbox" defaultChecked={currentProduct?.is_featured} />
                                        <label htmlFor="is_featured" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Feature on Home Page</label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                        <input id="is_explore" name="is_explore" type="checkbox" defaultChecked={currentProduct?.product_group === 'EXPLORE'} />
                                        <label htmlFor="is_explore" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Explore Our Products Slider</label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                        <input id="is_active_toggle" name="is_active" type="checkbox" defaultChecked={currentProduct ? currentProduct.is_active !== false : true} />
                                        <label htmlFor="is_active_toggle" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Product Status (Active)</label>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                                    <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                                    {currentProduct?.id && (
                                        <button type="button" onClick={() => { handleDelete(currentProduct.id); setIsEditing(false); }} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Trash2 size={16} /> Delete Product
                                        </button>
                                    )}
                                    <button type="submit" className="btn btn-primary" disabled={fbProcessing}>
                                        {fbProcessing ? 'Processing...' : 'Save Product'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}


                {showHistory && selectedProductForHistory && (
                    <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                        <div className="card shadow-premium" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: 0, border: '1px solid hsl(var(--border-subtle))', display: 'flex', flexDirection: 'column', borderRadius: '16px', background: '#ffffff' }}>
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={20} color="hsl(var(--primary))" /> Stock History</h2>
                                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '4px 0 0' }}>{selectedProductForHistory.name}</p>
                                </div>
                                <button onClick={() => setShowHistory(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Products</button>
                            </div>

                            <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                    <div style={{ padding: '1.25rem', background: '#f1f5f9', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>{selectedProductForHistory.total_added || selectedProductForHistory.stock}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Processed</div>
                                    </div>
                                    <div style={{ padding: '1.25rem', background: '#f1f5f9', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(var(--success))' }}>{selectedProductForHistory.total_sold || 0}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sold</div>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>Recent Activity Log</h3>

                                {historyLoading ? (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={24} /></div>
                                ) : historyData.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))', background: '#f1f5f9', borderRadius: '12px', border: '1px dashed hsl(var(--border-subtle))' }}>
                                        No history records found for this product.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {historyData.map((h, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f1f5f9', borderRadius: '14px', border: '1px solid hsl(var(--border-subtle))' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '10px',
                                                        background: h.change_type === 'SALE' ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--primary) / 0.1)',
                                                        color: h.change_type === 'SALE' ? 'hsl(var(--success))' : 'hsl(var(--primary))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem'
                                                    }}>
                                                        {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{h.reason || (h.change_type === 'SALE' ? 'Customer Purchase' : 'Inventory Update')}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 700 }}>NEW STOCK</div>
                                                    <div style={{ fontWeight: 800 }}>{h.new_stock}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/*  IMPORT EXCEL PAGE  */}
                {importModal && (
                    <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                        <div className="card shadow-premium" style={{
                            maxWidth: '600px', margin: '0 auto', padding: 0,
                            borderRadius: '32px', overflow: 'hidden', background: '#ffffff',
                            border: '1px solid hsl(var(--border-subtle))',
                            textAlign: 'center'
                        }}>
                            <div style={{ padding: '4rem' }}>
                                <div style={{
                                    width: '100px', height: '100px', borderRadius: '50%',
                                    background: '#f8fafc',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 2.5rem',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                                    color: '#0f172a',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <Upload size={44} strokeWidth={1.5} />
                                </div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a', letterSpacing: '-0.04em' }}>Bulk Catalog Import</h2>
                                <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: '1.6', marginBottom: '3rem' }}>
                                    Upload your inventory spreadsheet to synchronize your collection in seconds.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <input
                                        key={`file-import-${Date.now()}`}
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        id="bulk-import-input"
                                        style={{ display: 'none' }}
                                        onChange={handleExcelImport}
                                    />
                                    <label htmlFor="bulk-import-input" style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                                        height: '64px', background: '#0f172a',
                                        borderRadius: '16px', color: 'white', fontWeight: 800, cursor: 'pointer', transition: '0.2s',
                                        boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.3)', fontSize: '1.1rem'
                                    }}>
                                        {importing ? <><Loader2 size={24} className="animate-spin" /> Processing...</> : <><FileDown size={22} /> Choose Spreadsheet</>}
                                    </label>
                                    <button onClick={() => setImportModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginTop: '1rem' }}>Cancel and Go Back</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {
                    showMediaPicker && (
                        <MediaPicker catalogId={currentProduct?.product_catalog_image_id}
                            multiple={activeImageField?.type === 'gallery'}
                            currentImage={
                                activeImageField?.type === 'product' ? (productImageUrl ? productImageUrl.split(',')[0] : '') :
                                    activeImageField?.type === 'gallery' ? galleryImageUrl :
                                        variants[activeImageField?.index]?.image_url
                            }
                            onSelect={async (value) => {
                                try {
                                    if (activeImageField?.type === 'gallery') {
                                        const urls = Array.isArray(value) ? value : [value];
                                        setLoadingOverlayText('Checking Gallery Images...');
                                        setOcrLoading(true);
                                        setShowMediaPicker(false);

                                        let validUrls = [];
                                        let blockedCount = 0;

                                        for (const url of urls) {
                                            const detRes = await fetch('/api/admin/watermark-detect', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ imageUrl: url })
                                            });
                                            const detData = await detRes.json();
                                            if (detData.hasWatermark) {
                                                blockedCount++;
                                            } else {
                                                validUrls.push(url);
                                            }
                                        }

                                        if (blockedCount > 0) {
                                            setErrorModal({
                                                title: 'Watermarked Images Blocked',
                                                message: `${blockedCount} image(s) already contained existing product watermarks and were blocked. Images with existing product watermarks cannot be added to gallery images.`
                                            });
                                        }

                                        if (validUrls.length > 0) {
                                            setGalleryImageUrl(prev => Array.from(new Set([...validUrls, ...prev])));
                                        }
                                        setOcrLoading(false);
                                        return;
                                    }

                                    const url = Array.isArray(value) ? value[0] : value;
                                    setLoadingOverlayText('Analyzing Image...');
                                    setOcrLoading(true);
                                    setShowMediaPicker(false);

                                    // 1. Detect if this image from Media Library already has a watermark
                                    const detRes = await fetch('/api/admin/watermark-detect', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ imageUrl: url })
                                    });
                                    const detData = await detRes.json();

                                    const onConfirmSelection = async (finalUrl, catId) => {
                                         if (activeImageField.type === 'product') {
                                             setProductImageUrl(prev => {
                                                 const existingArray = prev ? prev.split(',').filter(Boolean) : [];
                                                 return [...existingArray, finalUrl].join(',');
                                             });
                                             setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: catId }));
                                         } else if (activeImageField.type === 'variant') {
                                            updateVariant(activeImageField.index, 'image_url', finalUrl);
                                            setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: catId }));
                                        }
                                        setWatermarkModal(null);
                                    };

                                    if (detData.hasWatermark) {
                                        // Case A: Image ALREADY has a watermark -> BLOCK SELECTION!
                                        setErrorModal({
                                            title: 'Watermarked Image Blocked',
                                            message: `This image already contains an existing product watermark (${detData.catalogId || 'CAT-CODE'}). Images with existing product watermarks cannot be selected for product features, gallery images, or variants.`
                                        });
                                        setOcrLoading(false);
                                        return;
                                    } else {
                                        // Case B: Clean Image - needs to be watermarked
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
                    )
                }

                {/* OCR Loading Overlay */}
                {ocrLoading && (
                    <ModalPortal>
                        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                                    <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                                    <div style={{ position: 'absolute', inset: 0, border: '4px solid #fff', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                                    <Search size={32} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', color: 'white' }} />
                                </div>
                                <div style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    {loadingOverlayText}
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )}


                {/* PRODUCT IMAGE ASSIGNER & SPREADSHEET UPLOAD PAGE */}
                {
                    importedProductsForImage !== null && (
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
                    )
                }

                {/* SUCCESS MODAL */}
                {
                    successModal && (
                        <ModalPortal>
                            <div className="modal-overlay" onClick={() => setSuccessModal(null)}>
                                <div className="modal-box shadow-premium" style={{ maxWidth: '440px', padding: 0, borderRadius: '32px', background: '#ffffff', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ padding: '3rem' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '1px solid #dcfce7' }}>
                                            <Check size={40} strokeWidth={2} />
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>Success!</h3>
                                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1rem', marginBottom: '2rem' }}>
                                            The operation was completed and synchronized successfully.
                                        </p>
                                        <button onClick={() => setSuccessModal(null)} style={{ width: '100%', background: '#0f172a', height: '52px', borderRadius: '14px', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </ModalPortal>
                    )
                }

                {/* ERROR MODAL */}
                {
                    errorModal && (
                        <ModalPortal>
                            <div className="modal-overlay" onClick={() => setErrorModal(null)}>
                                <div className="modal-box shadow-premium" style={{ maxWidth: '440px', padding: 0, borderRadius: '32px', background: '#ffffff', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ padding: '3rem' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '1px solid #fee2e2' }}>
                                            <X size={40} strokeWidth={2} />
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>{errorModal.title}</h3>
                                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1rem', marginBottom: '2rem' }}>
                                            {errorModal.message}
                                        </p>
                                        <button onClick={() => setErrorModal(null)} style={{ width: '100%', background: '#0f172a', height: '52px', borderRadius: '14px', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </ModalPortal>
                    )
                }

                {/* POST PREVIEW MODAL */}
                {
                    previewModal && (
                        <ModalPortal>
                            <div className="modal-overlay" onClick={() => setPreviewModal(null)}>
                                <div className="modal-box shadow-premium" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', borderRadius: '24px', background: '#f8fafc' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Social Media Preview</h3>
                                            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>See how your product will look on Meta platforms.</p>
                                        </div>
                                        <button onClick={() => setPreviewModal(null)} className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }}><X size={18} /></button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: previewModal.platform ? '1fr' : '1fr 1fr', gap: '1.5rem', justifyContent: 'center' }}>
                                        {/* Facebook Mock */}
                                        {(!previewModal.platform || previewModal.platform === 'facebook') && (
                                            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden', height: 'fit-content' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#f0f2f5' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1877F2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Facebook size={16} /></div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Vaiyaaree</div>
                                                </div>
                                                <div style={{ padding: '12px', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                    {(() => {
                                                        const parts = previewModal.caption.split('\n\n#');
                                                        return (
                                                            <>
                                                                {parts[0]}
                                                                {parts[1] && <div style={{ color: '#1877F2', marginTop: '0.5rem', fontWeight: 500 }}>#{parts[1]}</div>}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                {previewModal.product.image_url && (
                                                    <div style={{ width: '100%', height: '240px', overflow: 'hidden', borderTop: '1px solid #eee', background: '#f1f5f9' }}>
                                                        <img src={previewModal.product.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                )}
                                                <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#65676B', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ThumbsUp size={14} /> Like</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MessageSquare size={14} /> Comment</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Share2 size={14} /> Share</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Instagram Mock */}
                                        {(!previewModal.platform || previewModal.platform === 'instagram') && (
                                            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden', height: 'fit-content', margin: '0 auto', width: '100%', maxWidth: '400px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Instagram size={14} /></div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>vaiyaaree</div>
                                                </div>
                                                {previewModal.product.image_url && (
                                                    <div style={{ width: '100%', height: '300px', overflow: 'hidden', background: '#f1f5f9' }}>
                                                        <img src={previewModal.product.image_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    </div>
                                                )}
                                                <div style={{ padding: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', color: '#262626' }}>
                                                        <Heart size={18} /> <MessageSquare size={18} /> <Share2 size={18} />
                                                    </div>
                                                    <div style={{ fontSize: '0.82rem', lineHeight: 1.4, maxHeight: '200px', overflowY: 'auto' }}>
                                                        <span style={{ fontWeight: 700 }}>vaiyaaree</span>{' '}
                                                        {(() => {
                                                            const parts = previewModal.caption.split('\n\n#');
                                                            return (
                                                                <>
                                                                    <span style={{ whiteSpace: 'pre-wrap' }}>{parts[0]}</span>
                                                                    {parts[1] && <div style={{ color: '#00376b', display: 'inline', marginLeft: '4px' }}>#{parts[1]}</div>}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* <button onClick={() => setPreviewModal(null)} className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', height: '52px', borderRadius: '14px', fontSize: '1rem', fontWeight: 700 }}>Close Preview</button> */}
                                </div>
                            </div>
                        </ModalPortal>
                    )
                }

                {/* RESULT MODAL (Import/Export feedback) */}
                {
                    resultModal && (
                        <ModalPortal>
                            <div className="modal-overlay" onClick={() => setResultModal(null)}>
                                <div className="modal-box shadow-premium" style={{ maxWidth: '440px', padding: 0, borderRadius: '32px', background: '#ffffff', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ padding: '3rem' }}>
                                        <div style={{
                                            width: '80px', height: '80px', borderRadius: '50%',
                                            background: resultModal.type === 'error' ? '#fef2f2' : '#f0fdf4',
                                            color: resultModal.type === 'error' ? '#ef4444' : '#10b981',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 2rem',
                                            border: `1px solid ${resultModal.type === 'error' ? '#fee2e2' : '#dcfce7'}`
                                        }}>
                                            {resultModal.type === 'error' ? <X size={40} strokeWidth={2} /> : <Check size={40} strokeWidth={2} />}
                                        </div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>{resultModal.title}</h3>
                                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1rem', marginBottom: '2rem' }}>
                                            {resultModal.message}
                                        </p>
                                        <button
                                            onClick={() => {
                                                setResultModal(null);
                                                if (resultModal.onClose) resultModal.onClose();
                                            }}
                                            style={{ width: '100%', background: '#0f172a', height: '52px', borderRadius: '14px', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </ModalPortal>
                    )
                }

                {/* WATERMARK CONFIRMATION MODAL */}
                {
                    watermarkModal && (
                        <ModalPortal>
                            <div className="modal-overlay">
                                {watermarkModal.type === 'existing' ? (
                                    <div className="modal-box shadow-premium" style={{
                                        maxWidth: '520px', padding: 0, borderRadius: '32px',
                                        overflow: 'hidden', background: '#ffffff',
                                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.12)',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ padding: '3.5rem' }}>
                                            <div style={{
                                                width: '88px', height: '88px', borderRadius: '50%',
                                                background: '#fef2f2', color: '#ef4444',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                margin: '0 auto 2rem',
                                                border: '1px solid #fee2e2'
                                            }}>
                                                <AlertTriangle size={40} strokeWidth={1.5} />
                                            </div>

                                            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a', letterSpacing: '-0.025em' }}>
                                                Watermark Detected
                                            </h3>
                                            <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1rem', marginBottom: '2.5rem' }}>
                                                This image already contains a digital identity <span style={{ color: '#0f172a', fontWeight: 800 }}>{watermarkModal.detectedCode}</span>. To avoid visual issues, please use an original, clean file.
                                            </p>

                                            <div className="modal-actions">
                                                <button
                                                    onClick={() => setWatermarkModal(null)}
                                                    style={{
                                                        width: '100%', background: '#0f172a', height: '56px',
                                                        borderRadius: '16px', color: '#fff', fontSize: '1rem',
                                                        fontWeight: 800, border: 'none', cursor: 'pointer',
                                                        boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    Dismiss Alert
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="modal-box shadow-premium" style={{
                                        maxWidth: '520px', padding: 0, borderRadius: '32px',
                                        overflow: 'hidden', background: '#ffffff',
                                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.12)',
                                        maxHeight: '90vh', overflowY: 'auto'
                                    }}>
                                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                                            <h3 style={{
                                                fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem',
                                                color: '#0f172a', letterSpacing: '-0.025em'
                                            }}>
                                                Apply Watermark?
                                            </h3>
                                            <p style={{
                                                color: '#64748b', lineHeight: '1.6', fontSize: '1rem',
                                                marginBottom: '2rem'
                                            }}>
                                                This is a clean image. We will generate code <span style={{ color: '#0f172a', fontWeight: 800 }}>{watermarkModal.detectedCode}</span> and apply the watermark for you.
                                            </p>

                                            <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', position: 'relative' }}>
                                                <img src={watermarkModal.url} style={{
                                                    width: '100%', height: '200px', objectFit: 'contain'
                                                }} />
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '20px',
                                                    right: '20px',
                                                    background: 'rgba(0,0,0,0.85)',
                                                    color: 'white',
                                                    padding: '8px 16px',
                                                    borderRadius: '50px',
                                                    fontSize: '1rem',
                                                    fontWeight: 900,
                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                    border: '1.5px solid rgba(255,255,255,0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    zIndex: 10,
                                                    fontFamily: 'var(--font-roboto)',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {watermarkModal.detectedCode}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '1rem', marginTop: "2rem" }}>
                                                <button
                                                    onClick={() => setWatermarkModal(null)}
                                                    style={{
                                                        flex: 1, height: '56px', borderRadius: '16px',
                                                        fontSize: '1rem', fontWeight: 700, border: 'none',
                                                        color: '#64748b', background: '#f1f5f9', cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={watermarkModal.onProceed}
                                                    style={{
                                                        flex: 1.5, height: '56px', borderRadius: '16px',
                                                        fontSize: '1rem', fontWeight: 800, border: 'none',
                                                        color: '#fff', background: '#0f172a',
                                                        boxShadow: '0 10px 20px -5px rgba(15, 23, 42, 0.3)',
                                                        cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                >
                                                    Apply & Proceed
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ModalPortal>
                    )
                }

                {/* CONFIRM MODAL */}
                {
                    confirmModal && (
                        <ModalPortal>
                            <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
                                <div className="modal-box modal-warning" onClick={e => e.stopPropagation()}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', fontSize: '2.5rem', boxShadow: 'inset 0 0 0 2px #fef3c7' }}>
                                        <AlertTriangle size={40} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="modal-title">{confirmModal.title}</h3>
                                    <p className="modal-message">
                                        {confirmModal.message}
                                    </p>
                                    <div className="modal-actions">
                                        <button onClick={() => setConfirmModal(null)} className="modal-btn modal-btn-secondary" style={{ flex: 1 }}>
                                            No, Cancel
                                        </button>
                                        <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="modal-btn modal-btn-primary" style={{ flex: 1.2, background: '#ef4444' }}>
                                            Yes, Proceed
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </ModalPortal>
                    )
                }

                {/* IMAGE ZOOM OVERLAY */}
                {zoomedImage && (
                    <ModalPortal>
                        <ImageZoom url={zoomedImage} onClose={() => setZoomedImage(null)} />
                    </ModalPortal>
                )}



                <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
                {/* Bulk Action Bar */}
                {selectedProductIds.length > 0 && !isEditing && !showHistory && !importModal && (
                    <div style={{
                        position: 'fixed',
                        bottom: '2rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'hsl(var(--text-main))',
                        color: 'white',
                        padding: '1rem 2rem',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2rem',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        zIndex: 1000,
                        animation: 'slideUp 0.3s ease'
                    }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {selectedProductIds.length} Products Selected
                        </div>
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={handleBulkDelete} style={{
                                background: 'rgba(239,68,68,0.2)',
                                border: '1px solid rgba(239,68,68,0.5)',
                                color: '#f87171',
                                padding: '0.5rem 1.25rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}>
                                <Trash2 size={16} /> Delete Selected
                            </button>
                            <button onClick={() => setSelectedProductIds([])} style={{
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                padding: '0.5rem 1.25rem',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

