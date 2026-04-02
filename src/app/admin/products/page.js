'use client';

import { useState, useEffect } from 'react';
import {
    Plus, Edit, Trash2, Search, Loader2, Image as ImageIcon, LayoutGrid, List,
    Share2, Link as LinkIcon, Check, Package as PackageIcon, ShoppingCart,
    Filter, Facebook, History, MoreHorizontal, FileDown, Upload, X, TrendingUp, Trophy, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import styles from './page.module.css';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import MediaPicker from '@/components/MediaPicker';
import ProductImageAssigner from '@/components/ProductImageAssigner';
import { stampProductCode, uploadWatermarkedImage } from '@/lib/imageStamp';

export default function ProductsPage() {
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [groupFilter, setGroupFilter] = useState('ALL');
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
    const [fbProcessing, setFbProcessing] = useState(false);
    const [fbConfig, setFbConfig] = useState(null);
    const [importModal, setImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [syncWithMeta, setSyncWithMeta] = useState(false);
    const [resultModal, setResultModal] = useState(null); // { title, message, type, onClose }
    const [copiedId, setCopiedId] = useState(null);
    const [successModal, setSuccessModal] = useState(null);
    const [errorModal, setErrorModal] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null); // { title: string, message: string, onConfirm: function }

    // Stock History States
    const [showHistory, setShowHistory] = useState(false);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Media Picker States
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [activeImageField, setActiveImageField] = useState(null); // { type: 'product' } or { type: 'variant', index: number }
    const [productImageUrl, setProductImageUrl] = useState('');
    const [ocrLoading, setOcrLoading] = useState(false);

    // Post-Import Image Assigner State
    const [importedProductsForImage, setImportedProductsForImage] = useState(null);
    const [productsPage, setProductsPage] = useState(1);
    const PRODUCTS_PER_PAGE = 10;

    const fetchHistory = async (product) => {
        setSelectedProductForHistory(product);
        setShowHistory(true);
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
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

    const getShopUrl = (pid) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
        return `${baseUrl}/shop?pid=${pid}`;
    };

    const copyLink = (product) => {
        const url = getShopUrl(product.id);
        navigator.clipboard.writeText(url);
        setCopiedId(product.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const shareToStatus = (product) => {
        const url = getShopUrl(product.id);
        const text = encodeURIComponent(`Checkout this beautiful ${product.name}!\n\nView details & Order here: ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_self');
    };

    const fetchAnalytics = async (currentProducts) => {
        try {
            const now = new Date();
            let timeFilter = {};

            if (timeRange === 'DAILY') {
                timeFilter = { start: new Date(now.setHours(0, 0, 0, 0)).toISOString() };
            } else if (timeRange === 'MONTHLY') {
                timeFilter = { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
            } else if (timeRange === 'QUARTERLY') {
                const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
                timeFilter = { start: new Date(now.getFullYear(), qStartMonth, 1).toISOString() };
            }

            // 1. Top Sellers (Filter based on range)
            let itemsQuery = supabase.from('order_items').select('product_name, quantity, created_at');
            if (timeFilter.start) {
                itemsQuery = itemsQuery.gte('created_at', timeFilter.start);
            }

            const { data: orderItems } = await itemsQuery;
            const salesMap = {};
            orderItems?.forEach(item => {
                salesMap[item.product_name] = (salesMap[item.product_name] || 0) + item.quantity;
            });
            const topSellers = Object.entries(salesMap)
                .map(([name, sales]) => ({ name, sales }))
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 10);

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

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
            setProducts(data || []);
            fetchAnalytics(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFbConfig = async () => {
        try {
            const { data } = await supabase.from('app_settings')
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

    useEffect(() => {
        setHasMounted(true);
        fetchProducts();
        fetchFbConfig();

        const handleReset = () => {
            setIsEditing(false);
            setCurrentProduct(null);
            setShowHistory(false);
            setImportModal(false);
            setProductImageUrl('');
            setVariants([]);
        };
        window.addEventListener('resetAdminView', handleReset);
        return () => window.removeEventListener('resetAdminView', handleReset);
    }, [timeRange]); // Refresh when time range changes

    // Reset to page 1 when search/filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setProductsPage(1); }, [searchTerm, categoryFilter, sortBy]);

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
                    const name = row.name || row.productname || row.sareename || row.title || row.item || 'Untitled Saree';
                    const priceVal = parseFloat(row.price || row.sellingprice || row.mrp || row.rate || row.amount);
                    const price = isNaN(priceVal) ? 0 : priceVal;

                    const stockVal = parseInt(row.stock || row.quantity || row.qty || row.inventory || row.available);
                    const stock = isNaN(stockVal) ? 0 : stockVal;

                    const description = String(row.description || row.desc || row.details || row.about || row.info || '');
                    const category = String(row.category || row.collection || row.type || row.group || 'General');

                    const productData = {
                        name,
                        description,
                        price,
                        category,
                        stock,
                        type: 'simple',
                        is_active: true,
                        // Always ensure a catalog ID exists or is ready to be generated
                        product_catalog_image_id: row.catalogid || row.productcatalogimageid || row.code || ''
                    };

                    let savedProduct = null;

                    if (id) {
                        // Check if exists
                        const { data: existingData } = await supabase.from('products').select('*').eq('id', id).single();

                        if (existingData) {
                            // Update
                            // Only update stock if explicitly changing it, but Excel usually gives absolute numbers.
                            // If user is syncing, replace stock and record diff.
                            const oldStock = existingData.stock || 0;
                            const newStock = stock;
                            const diff = newStock - oldStock;

                            // Ensure catalog ID exists
                            if (!existingData.product_catalog_image_id && !productData.product_catalog_image_id) {
                                productData.product_catalog_image_id = `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                            } else if (!productData.product_catalog_image_id) {
                                // Keep existing if not provided in Excel
                                delete productData.product_catalog_image_id;
                            }

                            const { data, error: updateError } = await supabase.from('products').update(productData).eq('id', id).select();

                            if (updateError) {
                                console.error('Update Error for row:', id, JSON.stringify(updateError));
                                continue;
                            }
                            savedProduct = data?.[0];
                            if (savedProduct) {
                                updateCount++;
                                newlyImportedProducts.push(savedProduct);

                                // History for stock adjustment
                                if (diff !== 0) {
                                    await supabase.from('product_history').insert({
                                        product_id: savedProduct.id,
                                        change_type: diff > 0 ? 'ADJUSTMENT' : 'ADJUSTMENT',
                                        quantity_change: Math.abs(diff),
                                        new_stock: newStock,
                                        reason: 'Excel Bulk Sync'
                                    });
                                }
                            }
                        } else {
                            // ID provided but not found, ignore ID and Insert
                            // Generate new catalog ID if not provided
                            if (!productData.product_catalog_image_id) {
                                productData.product_catalog_image_id = `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                            }

                            productData.total_added = stock;
                            const { data, error: insertError } = await supabase.from('products').insert([productData]).select();
                            if (!insertError && data?.[0]) {
                                savedProduct = data[0];
                                insertCount++;
                                newlyImportedProducts.push(savedProduct);
                                if (stock > 0) {
                                    await supabase.from('product_history').insert({
                                        product_id: savedProduct.id,
                                        change_type: 'ADD',
                                        quantity_change: stock,
                                        new_stock: stock,
                                        reason: 'Bulk Excel Import'
                                    });
                                }
                            }
                        }
                    } else {
                        // No ID, standard Insert
                        // Generate new catalog ID if not provided
                        if (!productData.product_catalog_image_id) {
                            productData.product_catalog_image_id = `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                        }

                        productData.total_added = stock;
                        const { data, error: insertError } = await supabase.from('products').insert([productData]).select();

                        if (insertError) {
                            console.error('Database Error for row:', name, JSON.stringify(insertError));
                            if (insertCount === 0 && updateCount === 0) {
                                setResultModal({
                                    title: 'Import Error',
                                    message: `Database Error: ${insertError.message || 'Check required fields'}`,
                                    type: 'error'
                                });
                            }
                            continue;
                        }

                        savedProduct = data?.[0];
                        if (savedProduct) {
                            insertCount++;
                            newlyImportedProducts.push(savedProduct);

                            // Log history
                            if (stock > 0) {
                                await supabase.from('product_history').insert({
                                    product_id: savedProduct.id,
                                    change_type: 'ADD',
                                    quantity_change: stock,
                                    new_stock: stock,
                                    reason: 'Bulk Excel Import'
                                });
                            }
                        }
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

    const handleExportExcel = () => {
        if (!products || products.length === 0) {
            setResultModal({
                title: 'Export Failed',
                message: 'No products to export!',
                type: 'error'
            });
            return;
        }

        try {
            // Map products to the Excel format
            const exportData = products.map(p => ({
                'ID': p.id,
                'Name': p.name || '',
                'Category': p.category || '',
                'Price': p.price || 0,
                'Stock': p.stock || 0,
                'Description': p.description || ''
            }));

            // Create a new workbook and add the data
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

            // Set column widths for better readability
            const colWidths = [
                { wch: 36 }, // ID (UUID length)
                { wch: 40 }, // Name
                { wch: 20 }, // Category
                { wch: 10 }, // Price
                { wch: 10 }, // Stock
                { wch: 50 }, // Description
            ];
            worksheet['!cols'] = colWidths;

            // Generate file buffer and trigger download
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const downloadUrl = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `Sarees_Catalog_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            setResultModal({
                title: 'Export Successful',
                message: `Exported ${products.length} products successfully!`,
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

        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            product_group: formData.get('product_group') || null,
            description: formData.get('description'),
            type: productType,
            tax_class: formData.get('tax_class') || 'GST_5',
            is_active: true,
            is_featured: formData.get('is_featured') === 'on',
            product_group: formData.get('is_explore') === 'on' ? 'EXPLORE' : (formData.get('product_group') || null)
        };

        // For simple products, we take price/stock/image from main fields
        if (productType === 'simple') {
            productData.price = Number(formData.get('price'));
            productData.stock = Number(formData.get('stock'));
            productData.alert_threshold = Number(formData.get('alert_threshold')) || 0;

            // Image URL comes from React state (set after upload/library pick)
            const imageUrl = productImageUrl || '';
            productData.image_url = imageUrl;

            // Preserve existing catalog ID if editing, otherwise generate a new one
            const existingCatalogId = currentProduct?.product_catalog_image_id || '';
            productData.product_catalog_image_id = existingCatalogId || (imageUrl ? `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}` : '');
        } else {
            // For variants, we take price/stock/image from the first variant as "representative" for the list view
            if (variants.length > 0) {
                productData.price = variants[0].price;
                productData.stock = variants.reduce((acc, v) => acc + (v.stock || 0), 0);
                productData.alert_threshold = Number(formData.get('alert_threshold')) || 0;
                productData.image_url = variants[0].image_url;
            }
        }

        try {
            let savedProduct = null;
            const isNew = !currentProduct?.id;

            if (!isNew) {
                // UPDATE
                const { data, error } = await supabase.from('products').update(productData).eq('id', currentProduct.id).select();
                if (error) throw error;
                savedProduct = data?.[0];

                // Check for stock change
                const oldStock = currentProduct.stock || 0;
                const newStock = productData.stock || 0;
                if (newStock !== oldStock) {
                    const diff = newStock - oldStock;
                    await supabase.from('product_history').insert({
                        product_id: savedProduct.id,
                        change_type: diff > 0 ? 'ADD' : 'ADJUSTMENT',
                        quantity_change: diff,
                        new_stock: newStock,
                        reason: diff > 0 ? 'Manual Stock Addition' : 'Manual Stock Adjustment'
                    });
                    if (diff > 0) {
                        await supabase.rpc('increment_total_added', { prod_id: savedProduct.id, qty: diff });
                    }
                }
            } else {
                // INSERT
                // Initialize total_added with the initial stock
                const insertData = { ...productData, total_added: productData.stock || 0 };
                const { data, error } = await supabase.from('products').insert([insertData]).select();
                if (error) throw error;
                savedProduct = data?.[0];

                // Initial stock entry in history
                if (savedProduct && savedProduct.stock > 0) {
                    await supabase.from('product_history').insert({
                        product_id: savedProduct.id,
                        change_type: 'ADD',
                        quantity_change: savedProduct.stock,
                        new_stock: savedProduct.stock,
                        reason: 'Initial Stock Entry'
                    });
                }
            }

            if (productType === 'variant' && savedProduct) {
                // 1. Delete removed variants (not simple, but easy)
                await supabase.from('product_variants').delete().eq('product_id', savedProduct.id);

                // 2. Insert/Update variants
                if (variants.length > 0) {
                    const variantsToInsert = variants.map(v => ({
                        product_id: savedProduct.id,
                        name: v.name,
                        price: v.price,
                        stock: v.stock,
                        image_url: v.image_url
                    }));
                    await supabase.from('product_variants').insert(variantsToInsert);
                }
            }

            // Handle Facebook Posting
            if (postToFacebook && savedProduct && canPostToFacebook()) {
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
                    console.error('Facebook posting failed:', fbErr);
                } finally {
                    setFbProcessing(false);
                }
            }

            fetchProducts();
            setSuccessModal({
                title: 'Product Saved Successfully',
                catalogId: productData.product_catalog_image_id || 'N/A'
            });
            setIsEditing(false);
            setCurrentProduct(null);
            setProductImageUrl('');
            setVariants([]);
            setPostToFacebook(false);
        } catch (error) {
            console.error(error);
            setErrorModal({
                title: 'Save Failed',
                message: 'Failed to save product: ' + error.message
            });
        }
    };

    const openEditModal = async (product) => {
        setCurrentProduct(product);
        setProductType(product?.type || 'simple');
        setProductImageUrl(product?.image_url || '');
        if (product?.id) {
            const { data } = await supabase.from('product_variants').select('*').eq('product_id', product.id).order('created_at', { ascending: true });
            setVariants(data || []);
        } else {
            setVariants([]);
        }
        setIsEditing(true);
    };

    const addVariant = () => {
        setVariants([...variants, { name: '', price: currentProduct?.price || 0, stock: 10, image_url: currentProduct?.image_url || '' }]);
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
            title: 'Delete Saree?',
            message: 'Are you sure you want to delete this saree? This will also remove its stock history and variants.',
            onConfirm: async () => {
                setLoading(true);
                try {
                    // 1. Delete dependent records first to avoid Foreign Key Constraint errors
                    // Note: We don't delete order_items as they are historical records, 
                    // but usually those should have SET NULL or CASCADE at DB level.
                    await supabase.from('product_variants').delete().eq('product_id', id);
                    await supabase.from('product_history').delete().eq('product_id', id);
                    await supabase.from('whatsapp_cart').delete().eq('product_id', id);

                    // 2. Delete the main product
                    const { error } = await supabase.from('products').delete().eq('id', id);

                    if (error) {
                        if (error.code === '23503') {
                            setResultModal({
                                title: 'Cannot Delete',
                                message: 'This product has past orders. It has been hidden from the shop instead.',
                                type: 'error'
                            });
                            // Deletion failed due to history, so let's just deactivate it
                            await supabase.from('products').update({ is_active: false }).eq('id', id);
                            fetchProducts();
                            return;
                        }
                        throw error;
                    }

                    setResultModal({
                        title: 'Deleted',
                        message: 'Product deleted successfully.',
                        type: 'success'
                    });
                    fetchProducts();
                } catch (err) {
                    console.error('Delete Error:', err);
                    setResultModal({
                        title: 'Delete Failed',
                        message: `Delete failed: ${err.message || 'Check database permissions'}`,
                        type: 'error'
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const categories = ['ALL', ...new Set(products.map(p => p.category).filter(Boolean))];
    const groups = ['ALL', ...new Set(products.map(p => p.product_group).filter(Boolean))];
    let filtered = products.filter(p => {
        const term = searchTerm.toLowerCase();
        return (
            (p.name || '').toLowerCase().includes(term) ||
            (p.category || '').toLowerCase().includes(term) ||
            (p.product_group || '').toLowerCase().includes(term) ||
            (p.product_catalog_image_id || '').toLowerCase().includes(term)
        ) && (categoryFilter === 'ALL' || p.category === categoryFilter)
            && (groupFilter === 'ALL' || p.product_group === groupFilter);
    });
    filtered.sort((a, b) => {
        if (sortBy === 'low_stock') return (a.stock || 0) - (b.stock || 0);
        if (sortBy === 'high_price') return (b.price || 0) - (a.price || 0);
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const totalProductPages = Math.ceil(filtered.length / PRODUCTS_PER_PAGE);
    const paginatedProducts = filtered.slice((productsPage - 1) * PRODUCTS_PER_PAGE, productsPage * PRODUCTS_PER_PAGE);



    const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
    const totalValue = products.reduce((s, p) => s + ((p.price || 0) * (p.stock || 0)), 0);

    const inputStyle = {
        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
        background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))',
        color: 'hsl(var(--text-main))', fontFamily: 'inherit', fontSize: '0.925rem', outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s'
    };

    return (
        <>
            <div className="animate-enter">
            {/* ─── MAIN LIST VIEW (Hidden when a sub-page is active) ─── */}
            {!isEditing && !showHistory && !importModal && (
                <>
                    {/* Header */}
                    <div className="admin-header-row">
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>Products</h1>
                            <p>Manage your premium saree collection • {products.length} items</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setImportModal(true)} className="btn btn-secondary">
                                <FileDown size={18} /> Import Excel
                            </button>
                            <button onClick={handleExportExcel} className="btn btn-secondary">
                                <FileDown size={18} style={{ transform: 'rotate(180deg)' }} /> Export Excel
                            </button>
                            <button onClick={() => { setCurrentProduct(null); setProductType('simple'); setVariants([]); setIsEditing(true); }} className="btn btn-primary">
                                <Plus size={18} /> Add Product
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="admin-grid-3">
                        {[
                            { label: 'Total Products', value: products.length, color: 'hsl(var(--primary))' },
                            { label: 'Total Stock', value: `${totalStock} pcs`, color: 'hsl(var(--accent))' },
                            { label: 'Inventory Value', value: `₹${totalValue.toLocaleString()}`, color: 'hsl(var(--success))' },
                        ].map(s => (
                            <div key={s.label} className="card" style={{ padding: '1.5rem', borderTop: `3px solid ${s.color}` }}>
                                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: s.color, fontFamily: 'var(--font-heading)' }}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Category Tabs */}
                    <div className="admin-filter-row">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                                padding: '0.5rem 1.1rem', borderRadius: '9999px', fontSize: '0.82rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s',
                                background: categoryFilter === cat ? 'hsl(var(--primary))' : 'hsl(var(--bg-card))',
                                color: categoryFilter === cat ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                border: categoryFilter === cat ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border-subtle))',
                            }}>
                                {cat === 'ALL' ? 'All Collections' : cat}
                            </button>
                        ))}
                    </div>

                    {/* Group Tags Filter */}
                    {/* {groups.length > 1 && (
                <div className="admin-filter-row" style={{ marginTop: '-0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontWeight: 600, marginRight: '0.5rem' }}>🏷️ Groups:</span>
                    {groups.map(grp => (
                        <button key={grp} onClick={() => setGroupFilter(grp)} style={{
                            padding: '0.35rem 0.9rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.2s',
                            background: groupFilter === grp ? 'hsl(var(--accent))' : 'hsl(var(--bg-card))',
                            color: groupFilter === grp ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                            border: groupFilter === grp ? '1px solid hsl(var(--accent))' : '1px solid hsl(var(--border-subtle))',
                        }}>
                            {grp === 'ALL' ? 'All Groups' : grp}
                        </button>
                    ))}
                </div>
            */}

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
                        <div style={{ minWidth: '180px' }}>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="admin-input-select"
                            >
                                <option value="newest">Newest First</option>
                                <option value="low_stock">⚠️ Low Stock First</option>
                                <option value="high_price">Price: High to Low</option>
                            </select>
                        </div>

                        {/* View Toggle */}
                        <div style={{ display: 'flex', gap: '0.25rem', background: 'hsl(var(--bg-app))', border: '1px solid hsl(var(--border-subtle))', borderRadius: 'var(--radius-sm)', padding: '3px' }}>
                            <button
                                onClick={() => setViewMode('table')}
                                title="Table View"
                                style={{
                                    padding: '0.45rem 0.8rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
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
                                    padding: '0.4rem 0.6rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600,
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
                                    padding: '0.4rem 0.6rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600,
                                    background: viewMode === 'analytics' ? 'hsl(var(--primary))' : 'transparent',
                                    color: viewMode === 'analytics' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                    transition: 'all 0.2s'
                                }}>
                                <TrendingUp size={14} /> Analysis
                            </button>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>{filtered.length} items</span>
                    </div>

                    {/* ─── ANALYTICS VIEW ─── */}
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

                    {/* ─── TABLE VIEW ─── */}
                    {viewMode === 'table' && (
                        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                            {loading ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                    <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                                </div>
                            ) : (
                                <div style={{ minWidth: '950px' }}>
                                    <table style={{ margin: 0, width: '100%' }}>
                                        <thead style={{ background: '#f1f5f9' }}>
                                        <tr style={{ color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <th>#</th>
                                            <th>Product</th>
                                            <th>Category</th>
                                            {/* <th>Group</th>
                                    <th>Status</th> */}
                                            <th style={{ textAlign: 'right' }}>Price</th>
                                            <th style={{ textAlign: 'center' }}>Stock</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>No products found.</td></tr>
                                        ) : paginatedProducts.map((product, idx) => (
                                            <tr key={product.id}>
                                                <td style={{ padding: '0.75rem 1rem', color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1}</td>
                                                <td style={{ padding: '0.75rem 1.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', cursor: 'pointer' }} onClick={() => openEditModal(product)} title="Click to edit product">
                                                        <div style={{ width: '52px', height: '52px', borderRadius: '10px', overflow: 'hidden', background: 'hsl(var(--bg-app))', flexShrink: 0, border: '1px solid hsl(var(--border-subtle))', position: 'relative' }}>
                                                            {product.image_url ? (
                                                                <>
                                                                    <img src={product.image_url?.split(',')[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80'; }} />
                                                                    {product.product_catalog_image_id && (
                                                                        <div style={{
                                                                            position: 'absolute', bottom: 2, right: 2,
                                                                            background: 'hsl(var(--accent))', color: 'white',
                                                                            fontSize: '0.6rem', fontWeight: 700, padding: '2px 4px',
                                                                            borderRadius: '4px', fontFamily: 'monospace'
                                                                        }}>
                                                                            {/* {product.product_catalog_image_id} */}
                                                                        </div>
                                                                    )}
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
                                                                    fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace',
                                                                    background: 'hsl(var(--accent) / 0.1)', color: 'hsl(var(--accent))',
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
                                                            </div>
                                                            <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {product.description || '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: 'hsl(var(--bg-app))', color: 'hsl(var(--text-muted))', border: '1px solid hsl(var(--border-subtle))', whiteSpace: 'nowrap' }}>
                                                        {product.category}
                                                    </span>
                                                </td>
                                                {/* <td>
                                            {product.product_group ? (
                                                <span style={{ padding: '0.2rem 0.7rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 600, background: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.3)' }}>
                                                    🏷️ {product.product_group}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.73rem', color: 'hsl(var(--text-muted) / 0.5)' }}>—</span>
                                            )}
                                        </td> */}
                                                {/* <td>
                                            <span style={{
                                                padding: '0.2rem 0.7rem', borderRadius: '9999px', fontSize: '0.73rem', fontWeight: 600,
                                                background: product.is_active ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--danger) / 0.1)',
                                                color: product.is_active ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                                                border: `1px solid ${product.is_active ? 'hsl(var(--success) / 0.3)' : 'hsl(var(--danger) / 0.3)'}`
                                            }}>
                                                {product.is_active ? 'Active' : 'Hidden'}
                                            </span>
                                        </td> */}
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{(product.price || 0).toLocaleString()}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={product.stock < 5 ? 'badge badge-cancelled' : 'badge badge-delivered'} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                        {product.stock} pcs
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => window.open('/product/' + product.id, '_blank')} title="View Product Page" className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }}>
                                                            <Eye size={15} />
                                                        </button>
                                                        <button onClick={() => shareToStatus(product)} title="Share to Status" className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }}>
                                                            <Share2 size={15} />
                                                        </button>
                                                        <button onClick={() => fetchHistory(product)} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--primary))' }} title="View Details">
                                                            <PackageIcon size={15} />
                                                        </button>
                                                        <button onClick={() => handleDelete(product.id)} className="btn btn-secondary" style={{ padding: '0.4rem', color: 'hsl(var(--danger))', borderColor: 'hsl(var(--danger) / 0.3)' }}><Trash2 size={15} /></button>
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
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.25rem', borderTop: '1px solid hsl(var(--border-subtle))' }}>
                                    <button onClick={() => setProductsPage(p => Math.max(1, p - 1))} disabled={productsPage === 1} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: productsPage === 1 ? 0.4 : 1 }}>← Prev</button>
                                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Page {productsPage} of {totalProductPages} &nbsp;·&nbsp; {filtered.length} products</span>
                                    <button onClick={() => setProductsPage(p => Math.min(totalProductPages, p + 1))} disabled={productsPage === totalProductPages} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: productsPage === totalProductPages ? 0.4 : 1 }}>Next →</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── CARD VIEW ─── */}
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
                                                            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80'; }} />
                                                        {/* Catalog ID Badge */}
                                                        {product.product_catalog_image_id && (
                                                            <div style={{
                                                                position: 'absolute', bottom: '10px', left: '10px',
                                                                background: 'hsl(var(--accent))', color: 'white',
                                                                fontSize: '0.65rem', fontWeight: 700, padding: '4px 8px',
                                                                borderRadius: '6px', fontFamily: 'monospace',
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                                            }}>
                                                                {product.product_catalog_image_id}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>💮</div>
                                                )}
                                                {/* Stock badge */}
                                                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                                    <span className={product.stock < 5 ? 'badge badge-cancelled' : 'badge badge-delivered'}>
                                                        {product.stock} pcs
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Info */}
                                            <div style={{ padding: '1rem' }}>
                                                {product.product_catalog_image_id && (
                                                    <div style={{
                                                        fontSize: '0.65rem', fontWeight: 800, fontFamily: 'monospace',
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
                                                    <button onClick={() => window.open('/product/' + product.id, '_blank')}
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
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.25rem 0', marginTop: '1rem' }}>
                                    <button onClick={() => setProductsPage(p => Math.max(1, p - 1))} disabled={productsPage === 1} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: productsPage === 1 ? 0.4 : 1 }}>← Prev</button>
                                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Page {productsPage} of {totalProductPages} &nbsp;·&nbsp; {filtered.length} products</span>
                                    <button onClick={() => setProductsPage(p => Math.min(totalProductPages, p + 1))} disabled={productsPage === totalProductPages} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', opacity: productsPage === totalProductPages ? 0.4 : 1 }}>Next →</button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ─── EDIT / ADD PRODUCT PAGE ─── */}
            {isEditing && (
                <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                    <div className="card shadow-premium" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '2.5rem', border: '1px solid hsl(var(--border-subtle))', display: 'flex', flexDirection: 'column', borderRadius: '16px', background: '#ffffff' }}>
                        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-subtle))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{currentProduct ? 'Edit Product' : 'Add New Product'}</h2>
                                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Fill in the details for your catalogue.</p>
                            </div>
                            <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>← Back to Products</button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: '1.75rem' }}>
                            {/* Product Type Toggle */}
                            <div style={{ marginBottom: '1.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saree Type</label>
                                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                    <button type="button" onClick={() => setProductType('simple')} style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: productType === 'simple' ? 'hsl(var(--primary))' : 'transparent',
                                        color: productType === 'simple' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                        fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                        <PackageIcon size={16} /> Simple Saree
                                    </button>
                                    <button type="button" onClick={() => setProductType('variant')} style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: productType === 'variant' ? 'hsl(var(--primary))' : 'transparent',
                                        color: productType === 'variant' ? 'hsl(var(--bg-app))' : 'hsl(var(--text-muted))',
                                        fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                        <LayoutGrid size={16} /> Variant Saree
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
                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Saree Name *</label>
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
                                </div>
                            </div>

                            {productType === 'simple' ? (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                        Saree Details (Single Item)
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Price (₹) *</label>
                                            <input type="number" name="price" defaultValue={currentProduct?.price} required placeholder="e.g. 12500" className="admin-input" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Stock Qty *</label>
                                            <input type="number" name="stock" defaultValue={currentProduct?.stock} required placeholder="e.g. 10" className="admin-input" />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Saree Image *</label>

                                            {/* Image preview */}
                                            {productImageUrl && (
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                    {productImageUrl.split(',').filter(Boolean).map((imgUrl, idx) => (
                                                        <div key={idx} style={{ position: 'relative', width: '80px', height: '100px' }}>
                                                            <img
                                                                src={imgUrl}
                                                                onClick={() => window.open(imgUrl, '_blank')}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid hsl(var(--border-subtle))', cursor: 'pointer' }}
                                                                title="Click to view full image"
                                                            />
                                                            <button type="button" onClick={() => {
                                                                const urls = productImageUrl.split(',').filter(Boolean);
                                                                urls.splice(idx, 1);
                                                                setProductImageUrl(urls.join(','));
                                                            }} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Two option buttons */}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* Option 1: Media Library */}
                                                <button
                                                    type="button"
                                                    onClick={() => { setActiveImageField({ type: 'product' }); setShowMediaPicker(true); }}
                                                    style={{
                                                        flex: 1, height: '44px', borderRadius: '8px', cursor: 'pointer',
                                                        background: '#f1f5f9', border: '1px dashed hsl(var(--primary) / 0.5)',
                                                        color: 'hsl(var(--primary))', fontSize: '0.82rem', fontWeight: 600,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                    }}
                                                >
                                                    <ImageIcon size={15} /> From Library
                                                </button>

                                                {/* Option 2: Upload from device */}
                                                <label
                                                    style={{
                                                        flex: 1, height: '44px', borderRadius: '8px', cursor: 'pointer',
                                                        background: '#f1f5f9', border: '1px dashed hsl(var(--border-subtle))',
                                                        color: 'hsl(var(--text-muted))', fontSize: '0.82rem', fontWeight: 600,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                                    }}
                                                >
                                                    <Upload size={15} /> Upload Files
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        style={{ display: 'none' }}
                                                        onChange={async (e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            if (!files.length) return;

                                                            try {
                                                                setOcrLoading(true);
                                                                const catalogId = currentProduct?.product_catalog_image_id || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

                                                                const uploadedUrls = [];
                                                                for (const file of files) {
                                                                    // 1. OCR Check for existing watermark
                                                                    const reader = new FileReader();
                                                                    const base64Promise = new Promise((resolve) => {
                                                                        reader.onload = () => resolve(reader.result);
                                                                        reader.readAsDataURL(file);
                                                                    });
                                                                    const base64Image = await base64Promise;

                                                                    const ocrRes = await fetch('/api/admin/ocr', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ base64Image })
                                                                    });
                                                                    const ocrData = await ocrRes.json();

                                                                    if (ocrData.hasWatermark) {
                                                                        setErrorModal({
                                                                            title: 'Watermark Detected',
                                                                            message: 'The image already has a WaterMark.'
                                                                        });
                                                                        continue;
                                                                    }

                                                                    // 2. First, Store the ORIGINAL CLEAN image to Media Library
                                                                    const originalFd = new FormData();
                                                                    originalFd.append('file', file, file.name);
                                                                    originalFd.append('skipDetection', 'true'); // Don't run OCR on original clean file
                                                                    originalFd.append('alreadyWatermarked', 'false');
                                                                    
                                                                    await fetch('/api/admin/upload', { method: 'POST', body: originalFd });

                                                                    // 3. Proceed with stamping and upload for the product itself
                                                                    const localUrl = URL.createObjectURL(file);
                                                                    const watermarkedBlob = await stampProductCode(localUrl, catalogId);
                                                                    URL.revokeObjectURL(localUrl);
                                                                    const uploadedUrl = await uploadWatermarkedImage(watermarkedBlob, catalogId);
                                                                    uploadedUrls.push(uploadedUrl);
                                                                }

                                                                if (uploadedUrls.length > 0) {
                                                                    setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: catalogId }));
                                                                    setProductImageUrl(prev => {
                                                                        const existing = prev ? prev.split(',').filter(Boolean) : [];
                                                                        return [...existing, ...uploadedUrls].join(',');
                                                                    });
                                                                }
                                                            } catch (err) {
                                                                setErrorModal({
                                                                    title: 'Upload Failed',
                                                                    message: err.message || 'Unknown error'
                                                                });
                                                            } finally {
                                                                setOcrLoading(false);
                                                            }
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Low Stock Alert Threshold</label>
                                            <input type="number" name="alert_threshold" defaultValue={currentProduct?.alert_threshold || 0} placeholder="e.g. 5" className="admin-input" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'hsl(var(--primary) / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                                        Manage Variants (Multiple Colors/Options)
                                    </h3>
                                    <div style={{ padding: '1.25rem', background: '#f1f5f9', borderRadius: '16px', border: '1px solid hsl(var(--border-subtle))', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Create different versions of this saree:</span>
                                            <button type="button" onClick={addVariant} className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.2)' }}>
                                                <Plus size={14} /> Add Variant
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {variants.length > 0 && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '0.75rem', marginBottom: '-0.25rem', padding: '0 2px' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color/Option</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price (₹)</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Image</div>
                                                    <div style={{ width: '20px' }}></div>
                                                </div>
                                            )}
                                            {variants.map((v, i) => (
                                                <div key={i} className="animate-in fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: '0.75rem', alignItems: 'center' }}>
                                                    <input placeholder="Red/Silk" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} className="admin-input" style={{ padding: '0.5rem' }} />
                                                    <input type="number" placeholder="0" value={v.price} onChange={e => updateVariant(i, 'price', Number(e.target.value))} className="admin-input" style={{ padding: '0.5rem' }} />
                                                    <input type="number" placeholder="0" value={v.stock} onChange={e => updateVariant(i, 'stock', Number(e.target.value))} className="admin-input" style={{ padding: '0.5rem' }} />
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {/* Thumbnail preview */}
                                                        {v.image_url && (
                                                            <div style={{ position: 'relative', width: '32px', height: '40px', flexShrink: 0 }}>
                                                                <img
                                                                    src={v.image_url}
                                                                    onClick={() => window.open(v.image_url, '_blank')}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px', border: '1px solid hsl(var(--border-subtle))', cursor: 'pointer' }}
                                                                    title="Click to view full image"
                                                                />
                                                                <button type="button" onClick={() => updateVariant(i, 'image_url', '')} style={{ position: 'absolute', top: '-5px', right: '-5px', width: '14px', height: '14px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✕</button>
                                                            </div>
                                                        )}
                                                        {/* Two buttons */}
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setActiveImageField({ type: 'variant', index: i }); setShowMediaPicker(true); }}
                                                                style={{
                                                                    flex: 1, height: '32px', borderRadius: '6px', cursor: 'pointer',
                                                                    background: '#f1f5f9', border: '1px dashed hsl(var(--primary) / 0.5)',
                                                                    color: 'hsl(var(--primary))', fontSize: '0.7rem', fontWeight: 600,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                                                }}
                                                            >
                                                                <ImageIcon size={11} /> Library
                                                            </button>
                                                            <label style={{
                                                                flex: 1, height: '32px', borderRadius: '6px', cursor: 'pointer',
                                                                background: '#f1f5f9', border: '1px dashed hsl(var(--border-subtle))',
                                                                color: 'hsl(var(--text-muted))', fontSize: '0.7rem', fontWeight: 600,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                                            }}>
                                                                <Upload size={11} /> Upload
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    style={{ display: 'none' }}
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (!file) return;
                                                                            try {
                                                                                setOcrLoading(true);
                                                                                const catalogId = currentProduct?.product_catalog_image_id || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                                                                                
                                                                                // 1. Store the ORIGINAL CLEAN image to Media Library
                                                                                const originalFd = new FormData();
                                                                                originalFd.append('file', file, file.name);
                                                                                originalFd.append('skipDetection', 'true');
                                                                                originalFd.append('alreadyWatermarked', 'false');
                                                                                await fetch('/api/admin/upload', { method: 'POST', body: originalFd });

                                                                                // 2. Perform watermarking for the product variant record
                                                                                const localUrl = URL.createObjectURL(file);
                                                                                const watermarkedBlob = await stampProductCode(localUrl, catalogId);
                                                                                URL.revokeObjectURL(localUrl);
                                                                                
                                                                                const uploadedUrl = await uploadWatermarkedImage(watermarkedBlob, catalogId);
                                                                                updateVariant(i, 'image_url', uploadedUrl);
                                                                                
                                                                                // If we generated a new catalog ID, make sure to update the product too
                                                                                if (!currentProduct?.product_catalog_image_id) {
                                                                                    setCurrentProduct(prev => ({ ...prev, product_catalog_image_id: catalogId }));
                                                                                }
                                                                            } catch (err) {
                                                                                console.error('Variant upload error:', err);
                                                                                setErrorModal({
                                                                                    title: 'Upload Failed',
                                                                                    message: err.message || 'Upload failed'
                                                                                });
                                                                            } finally {
                                                                                setOcrLoading(false);
                                                                            }
                                                                        }}
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => removeVariant(i)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--danger) / 0.1)', border: 'none', color: 'hsl(var(--danger))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--danger) / 0.2)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'hsl(var(--danger) / 0.1)'}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {variants.length === 0 && (
                                                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))', fontSize: '0.85rem', border: '1px dashed hsl(var(--border-subtle))', borderRadius: '12px' }}>
                                                    No variants added yet. Click <strong>"Add Variant"</strong> to start.
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '1rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Low Stock Alert Threshold (Overall)</label>
                                            <input type="number" name="alert_threshold" defaultValue={currentProduct?.alert_threshold || 0} placeholder="e.g. 5" className="admin-input" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Description</label>
                                <textarea name="description" defaultValue={currentProduct?.description} rows={3}
                                    className="admin-input" style={{ resize: 'vertical' }} placeholder="Fabric, colors, design details..." />
                            </div>
                            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Tax Class (GST)</label>
                                    <select name="tax_class" defaultValue={currentProduct?.tax_class || 'GST_5'} className="admin-input-select">
                                        <option value="GST_0">GST 0% (Exempt)</option>
                                        <option value="GST_5">GST 5% (Default)</option>
                                        <option value="GST_12">GST 12%</option>
                                        <option value="GST_18">GST 18%</option>
                                        <option value="GST_28">GST 28%</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Product Group / Tag</label>
                                    <input name="product_group" defaultValue={currentProduct?.product_group || ''} placeholder="e.g. Festive2026, NewArrivals, BridalSeason" className="admin-input" />
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', padding: '1rem', background: '#f1f5f9', borderRadius: '12px', border: '1px solid hsl(var(--border-subtle))' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input id="is_featured" name="is_featured" type="checkbox" defaultChecked={currentProduct?.is_featured} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                    <label htmlFor="is_featured" style={{ fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>Feature on Home Page (Best Sellers)</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                                    <input id="is_explore" name="is_explore" type="checkbox" defaultChecked={currentProduct?.product_group === 'EXPLORE'} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                    <label htmlFor="is_explore" style={{ fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>Explore Our Products Slider</label>
                                </div>
                            </div>

                            {/* Facebook Integration */}
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                            <Share2 size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Facebook Meta Integration</div>
                                            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>Auto-post to your business page</div>
                                        </div>
                                    </div>
                                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={postToFacebook} onChange={e => setPostToFacebook(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: postToFacebook ? '#1877F2' : '#ccc', transition: '.4s', borderRadius: '20px' }}>
                                            <span style={{ position: 'absolute', content: '""', height: '14px', width: '14px', left: postToFacebook ? '23px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                                        </span>
                                    </label>
                                </div>

                                {postToFacebook && !fbConfig.pageId && (
                                    <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'hsl(var(--danger))', background: 'hsl(var(--danger) / 0.1)', padding: '8px', borderRadius: '6px' }}>
                                        ⚠️ Facebook account not linked. <button type="button" onClick={() => router.push('/admin/facebook')} style={{ background: 'none', border: 'none', color: '#1877F2', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Connect Account</button>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                                <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={fbProcessing}>
                                    {fbProcessing ? (
                                        <><Loader2 size={16} className="animate-spin" style={{ marginRight: '8px' }} /> Posting...</>
                                    ) : (
                                        <>💾 Save {postToFacebook ? '& Post' : ''}</>
                                    )}
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
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>📊 Stock History</h2>
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

            {/* ─── IMPORT EXCEL PAGE ─── */}
            {importModal && (
                <div className="animate-enter" style={{ paddingBottom: '4rem' }}>
                    <div className="card shadow-premium" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '2.5rem', border: '1px solid hsl(var(--border-subtle))', textAlign: 'center', borderRadius: '16px', background: 'hsl(var(--bg-card))' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'hsl(var(--primary) / 0.1)', display: 'grid', placeItems: 'center', margin: '0 auto 1rem', color: 'hsl(var(--primary))' }}>
                                <Upload size={30} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Bulk Import Catalog</h2>
                            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>Upload your inventory spreadsheet to add products in bulk.</p>
                        </div>

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
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                                padding: '1rem', background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                                borderRadius: '12px', color: 'white', fontWeight: 800, cursor: 'pointer', transition: '0.2s'
                            }}>
                                {importing ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><FileDown size={18} /> Select Excel File</>}
                            </label>
                            <button onClick={() => setImportModal(false)} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )
            }


            {
                showMediaPicker && (
                    <MediaPicker
                        currentImage={activeImageField?.type === 'product' ? (productImageUrl ? productImageUrl.split(',')[0] : '') : variants[activeImageField?.index]?.image_url}
                        onSelect={async (url) => {
                            try {
                                setOcrLoading(true);
                                setShowMediaPicker(false);

                                // 1. OCR Check for existing watermark in library image using direct URL
                                const ocrRes = await fetch('/api/admin/ocr', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ imageUrl: url })
                                });
                                const ocrData = await ocrRes.json();

                                if (ocrData.hasWatermark) {
                                    setErrorModal({
                                        title: '🚫 Watermark Detected',
                                        message: 'The image has already WaterMark'
                                    });
                                    return;
                                }

                                // 2. Get or generate catalog ID (same for all images of this product)
                                const catalogId = currentProduct?.product_catalog_image_id || `CAT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

                                // 3. Stamp the catalog code onto the image
                                const watermarkedBlob = await stampProductCode(url, catalogId);

                                // 4. Upload the watermarked image
                                const watermarkedUrl = await uploadWatermarkedImage(watermarkedBlob, catalogId);

                                // 5. Update product image URL with watermarked version
                                if (activeImageField.type === 'product') {
                                    setProductImageUrl(prev => prev ? `${prev},${watermarkedUrl}` : watermarkedUrl);
                                    setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: catalogId }));
                                } else if (activeImageField.type === 'variant') {
                                    updateVariant(activeImageField.index, 'image_url', watermarkedUrl);
                                }

                            } catch (err) {
                                console.error('Media select error:', err);
                                setNotification({ message: '❌ Failed to process image: ' + err.message, type: 'error' });
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
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    zIndex: 7000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem'
                }}>
                    <Loader2 size={42} style={{ color: 'white', animation: 'spin 1s linear infinite' }} />
                    <div style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.05em', background: 'rgba(0,0,0,0.5)', padding: '0.5rem 1.5rem', borderRadius: '12px' }}>
                        Searching for WaterMark...
                    </div>
                </div>
            )}

            </div>

            {/* PRODUCT IMAGE ASSIGNER (Post-Excel Import) */}
            {
                importedProductsForImage && importedProductsForImage.length > 0 && (
                    <ProductImageAssigner
                        products={importedProductsForImage}
                        onClose={() => setImportedProductsForImage(null)}
                        onDone={() => {
                            fetchProducts();
                            setImportedProductsForImage(null);
                        }}
                    />
                )
            }

            {/* SUCCESS MODAL */}
            {
                successModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setSuccessModal(null)}>
                        <div style={{
                            background: 'white', borderRadius: '20px', padding: '2.5rem',
                            maxWidth: '420px', width: '90%', textAlign: 'center',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                width: '70px', height: '70px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem', fontSize: '2rem'
                            }}>
                                ✓
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', color: '#1f2937' }}>
                                Product Saved Successfully!
                            </h3>
                            <button
                                onClick={() => setSuccessModal(null)}
                                style={{
                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: 'white', border: 'none', padding: '0.875rem 2.5rem',
                                    borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                                    cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 10px 25px rgba(34, 197, 94, 0.4)'; }}
                                onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none'; }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )
            }

            {/* ERROR MODAL */}
            {
                errorModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                        zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setErrorModal(null)}>
                        <div style={{
                            background: 'white', borderRadius: '20px', padding: '2.5rem',
                            maxWidth: '420px', width: '90%', textAlign: 'center',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                width: '70px', height: '70px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem', fontSize: '2rem'
                            }}>
                                ✕
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', color: '#1f2937' }}>
                                {errorModal.title}
                            </h3>
                            <p style={{ color: '#374151', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                {errorModal.message}
                            </p>
                            <button
                                onClick={() => setErrorModal(null)}
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    color: 'white', border: 'none', padding: '0.875rem 2.5rem',
                                    borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                                    cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.4)'; }}
                                onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none'; }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )
            }

            {/* RESULT MODAL (Import/Export feedback) */}
            {
                resultModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        zIndex: 5500, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setResultModal(null)}>
                        <div style={{
                            background: 'white', borderRadius: '20px', padding: '2.5rem',
                            maxWidth: '420px', width: '90%', textAlign: 'center',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                width: '70px', height: '70px', borderRadius: '50%',
                                background: resultModal.type === 'error'
                                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem', fontSize: '2rem'
                            }}>
                                {resultModal.type === 'error' ? '✕' : '✓'}
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', color: '#1f2937' }}>
                                {resultModal.title}
                            </h3>
                            <p style={{ color: '#374151', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                {resultModal.message}
                            </p>
                            <button
                                onClick={() => {
                                    setResultModal(null);
                                    if (resultModal.onClose) resultModal.onClose();
                                }}
                                style={{
                                    background: resultModal.type === 'error'
                                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                        : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    color: 'white', border: 'none', padding: '0.875rem 2.5rem',
                                    borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                                    cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.target.style.transform = 'scale(1.05)';
                                    e.target.style.boxShadow = resultModal.type === 'error'
                                        ? '0 10px 25px rgba(239, 68, 68, 0.4)'
                                        : '0 10px 25px rgba(34, 197, 94, 0.4)';
                                }}
                                onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none'; }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )
            }

            {/* CONFIRM MODAL */}
            {
                confirmModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        zIndex: 6500, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setConfirmModal(null)}>
                        <div style={{
                            background: 'white', borderRadius: '20px', padding: '2.5rem',
                            maxWidth: '420px', width: '90%', textAlign: 'center',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{
                                width: '70px', height: '70px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem', fontSize: '2rem'
                            }}>
                                ?
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', color: '#1f2937' }}>
                                {confirmModal.title}
                            </h3>
                            <p style={{ color: '#374151', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                {confirmModal.message}
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    style={{
                                        background: '#e5e7eb', color: '#374151', border: 'none',
                                        padding: '0.875rem 2rem', borderRadius: '12px',
                                        fontWeight: 700, fontSize: '1rem', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        confirmModal.onConfirm();
                                        setConfirmModal(null);
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: 'white', border: 'none', padding: '0.875rem 2rem',
                                        borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                                        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.4)'; }}
                                    onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = 'none'; }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </>
    );
}
