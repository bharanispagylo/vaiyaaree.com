'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mysqlClient } from '@/lib/mysqlClient';
import MediaPicker from '@/components/MediaPicker';
import ImageZoom from '@/components/ImageZoom';
import ProductForm from './ProductForm';
import {
    WatermarkModal,
    SuccessModal,
    ErrorModal,
    ConfirmModal,
    OcrLoadingOverlay
} from './ProductModals';

export default function ProductFormContainer({ productId = null, isNew = false }) {
    const router = useRouter();

    // Data states
    const [currentProduct, setCurrentProduct] = useState(null);
    const [loading, setLoading] = useState(Boolean(productId));
    const [dbActiveCategories, setDbActiveCategories] = useState([]);
    const [allProductsData, setAllProductsData] = useState([]);

    // Form states
    const [formProductName, setFormProductName] = useState('');
    const [copiedProductUrl, setCopiedProductUrl] = useState(false);
    const [productType, setProductType] = useState('simple');
    const [productImageUrl, setProductImageUrl] = useState('');
    const [galleryImageUrl, setGalleryImageUrl] = useState([]);
    const [variants, setVariants] = useState([]);
    const [fbProcessing, setFbProcessing] = useState(false);

    // Media & Zoom states
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [activeImageField, setActiveImageField] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);

    // OCR & Watermark states
    const [ocrLoading, setOcrLoading] = useState(false);
    const [loadingOverlayText, setLoadingOverlayText] = useState('Processing...');
    const [watermarkModal, setWatermarkModal] = useState(null);

    // Modals
    const [errorModal, setErrorModal] = useState(null);
    const [successModal, setSuccessModal] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);

    // Fetch active categories
    const fetchActiveCategories = async () => {
        try {
            const { data } = await mysqlClient
                .from('categories')
                .select('*')
                .eq('status', 'active')
                .order('name');
            setDbActiveCategories(data || []);
        } catch (e) {
            console.error('Error fetching active categories:', e);
        }
    };

    // Fetch all products to calculate next product_no for new products
    const fetchAllProducts = async () => {
        try {
            const { data } = await mysqlClient.from('products').select('id, product_no, sku');
            setAllProductsData(data || []);
        } catch (e) {
            console.error('Error fetching all products list:', e);
        }
    };

    // Load existing product details if editing
    const loadProductData = async () => {
        if (!productId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data: prod, error: prodErr } = await mysqlClient
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (prodErr || !prod) {
                throw new Error(prodErr?.message || 'Product not found');
            }

            setCurrentProduct(prod);
            setFormProductName(prod.name || '');
            setProductType(prod.type || 'simple');
            setProductImageUrl(prod.image_url || '');

            let gallery = prod.gallery_image || [];
            if (typeof gallery === 'string') {
                try {
                    gallery = JSON.parse(gallery);
                } catch (e) {
                    gallery = gallery.split(',').filter(Boolean);
                }
            }
            setGalleryImageUrl(Array.isArray(gallery) ? gallery : []);

            // Fetch variants ONLY if product type is 'variant'
            if (prod.type === 'variant') {
                const { data: varsData } = await mysqlClient
                    .from('product_variants')
                    .select('*')
                    .eq('product_id', productId)
                    .order('created_at', { ascending: true });

                const mappedVars = (varsData || []).map(v => ({
                    ...v,
                    compare_price: v.original_price || v.compare_price || v.price || '',
                    stock: Number(v.stock) || 0
                }));
                setVariants(mappedVars);
            } else {
                setVariants([]);
            }
        } catch (err) {
            console.error('Error loading product data:', err);
            setErrorModal({
                title: 'Error Loading Product',
                message: err.message || 'Unable to retrieve product details.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveCategories();
        fetchAllProducts();
        if (productId) {
            loadProductData();
        }
    }, [productId]);

    // Variant Helpers
    const addVariant = () => {
        setVariants(prev => [
            ...prev,
            {
                name: `Variant #${prev.length + 1}`,
                sku: `${currentProduct?.product_no || currentProduct?.sku || 'SKU'}-V${prev.length + 1}`,
                price: currentProduct?.price || 0,
                compare_price: currentProduct?.compare_price || currentProduct?.original_price || '',
                stock: 10,
                image_url: (productImageUrl || '').split(',')[0] || ''
            }
        ]);
    };

    const updateVariant = (index, field, value) => {
        setVariants(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const removeVariant = (index) => {
        setVariants(prev => prev.filter((_, i) => i !== index));
    };

    const handleProductTypeChange = (newType) => {
        setProductType(newType);
        if (newType === 'simple') {
            setVariants([]);
        }
    };

    // Save Product (Insert or Update)
    const handleSave = async (e) => {
        e.preventDefault();
        setFbProcessing(true);

        const formData = new FormData(e.target);
        const rawName = formData.get('name')?.trim();
        const rawSlug = formData.get('slug')?.trim();
        const cleanSlug = rawSlug ? rawSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') : '';
        const sellingPriceInput = formData.get('price');
        const sellingPriceVal = sellingPriceInput !== null && sellingPriceInput !== '' ? Math.max(0, parseFloat(sellingPriceInput)) : 0;
        const comparePriceInput = formData.get('compare_price');
        const comparePriceVal = comparePriceInput ? Math.max(0, parseFloat(comparePriceInput)) : null;

        const rawTags = formData.get('tags_input');
        let userTags = [];
        if (rawTags) {
            userTags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (comparePriceVal && comparePriceVal > 0) {
            userTags.push(`MRP:${comparePriceVal}`);
        }

        const rawGroup = formData.get('product_group')?.trim() || '';
        const isExplore = formData.get('is_explore') === 'on';
        const rawActive = formData.get('is_active');
        const isActive = (rawActive === 'on' || rawActive === '1' || rawActive === 'active' || rawActive === true) ? 1 : 0;

        const productData = {
            name: rawName,
            slug: cleanSlug,
            category: formData.get('category')?.trim() || '',
            product_group: isExplore ? 'EXPLORE' : rawGroup,
            description: formData.get('description')?.trim() || '',
            type: productType,
            tax_class: formData.get('tax_class') || 'GST_5',
            is_active: isActive,
            is_featured: formData.get('is_featured') === 'on' ? 1 : 0,
            tags: userTags,
            gallery_image: Array.isArray(galleryImageUrl) ? galleryImageUrl.filter(Boolean) : (galleryImageUrl ? galleryImageUrl.split(',').filter(Boolean) : [])
        };

        if (productType === 'simple') {
            if (!sellingPriceInput || isNaN(parseFloat(sellingPriceInput)) || parseFloat(sellingPriceInput) <= 0) {
                setErrorModal({
                    title: 'Selling Price Required',
                    message: 'Selling Price (Price ₹) is mandatory. Please enter a valid Selling Price.'
                });
                setFbProcessing(false);
                return;
            }

            if (!comparePriceVal || comparePriceVal <= 0) {
                setErrorModal({
                    title: 'Regular Price Required',
                    message: 'Regular Price (Original MRP) is mandatory. Please enter a valid Regular Price.'
                });
                setFbProcessing(false);
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
                        setFbProcessing(false);
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
            setFbProcessing(false);
            return;
        }

        if (productType === 'simple' && !productImageUrl) {
            setErrorModal({ title: 'Image Required', message: 'Please add a product image before saving.' });
            setFbProcessing(false);
            return;
        }
        if (productType === 'variant' && variants.length > 0 && !variants[0].image_url) {
            setErrorModal({ title: 'Image Required', message: 'Please add an image for at least the first variant before saving.' });
            setFbProcessing(false);
            return;
        }

        try {
            let savedProduct = null;
            const isEditingMode = Boolean(currentProduct?.id);

            const executeProductSave = async (dataToSave) => {
                let currentData = { ...dataToSave };
                const initialBaseSlug = currentData.slug || (currentData.name ? String(currentData.name).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') : 'product');
                if (!currentData.slug) currentData.slug = initialBaseSlug;

                const maxAttempts = 10;
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    try {
                        if (isEditingMode) {
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
            if (isEditingMode && savedProduct) {
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

            // Save or Delete Variants based on productType
            if (productType === 'simple' && savedProduct) {
                await mysqlClient.from('product_variants').delete().eq('product_id', savedProduct.id);
            } else if (productType === 'variant' && savedProduct) {
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

            const isDraft = productData.is_active === 0;
            const successTitle = isDraft
                ? 'Saved as Draft'
                : (isEditingMode ? 'Product Updated Successfully!' : 'Product Published Successfully!');
            const successMessage = isDraft
                ? `Product "${productData.name}" has been saved as a private draft.`
                : (isEditingMode
                    ? `Product "${productData.name}" details and stock have been updated successfully.`
                    : `Product "${productData.name}" is now live and published on your store!`);

            setCurrentProduct(savedProduct);

            // If we just created a new product, transition route to its edit page so it stays on the same product
            if (!isEditingMode && savedProduct?.id) {
                router.replace(`/admin/products/${savedProduct.id}`);
            }

            setSuccessModal({
                title: successTitle,
                message: successMessage,
                onClose: () => {
                    setSuccessModal(null);
                }
            });
        } catch (error) {
            console.error('Save product exception:', error);
            setErrorModal({
                title: 'Publish Failed',
                message: error.message || 'An error occurred while publishing the product. Please check all fields and try again.'
            });
        } finally {
            setFbProcessing(false);
        }
    };

    // Delete Product
    const handleDelete = async (id) => {
        const targetId = id || currentProduct?.id;
        if (!targetId) return;

        setConfirmModal({
            title: 'Delete Product',
            message: 'Are you sure you want to permanently delete this product? All variants, categories and history associated with it will also be removed.',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await mysqlClient.from('product_variants').delete().eq('product_id', targetId);
                    await mysqlClient.from('product_history').delete().eq('product_id', targetId);
                    await mysqlClient.from('category_products').delete().eq('product_id', targetId);
                    const { error } = await mysqlClient.from('products').delete().eq('id', targetId);
                    if (error) throw error;
                    router.push('/admin/products');
                } catch (err) {
                    console.error('Delete error:', err);
                    setErrorModal({
                        title: 'Delete Failed',
                        message: err.message || 'Failed to delete product.'
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTop: '3px solid hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.9rem' }}>Loading product details...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <>
            <ProductForm
                currentProduct={currentProduct}
                setCurrentProduct={setCurrentProduct}
                formProductName={formProductName}
                setFormProductName={setFormProductName}
                copiedProductUrl={copiedProductUrl}
                setCopiedProductUrl={setCopiedProductUrl}
                productType={productType}
                setProductType={handleProductTypeChange}
                dbActiveCategories={dbActiveCategories}
                productImageUrl={productImageUrl}
                setProductImageUrl={setProductImageUrl}
                galleryImageUrl={galleryImageUrl}
                setGalleryImageUrl={setGalleryImageUrl}
                variants={variants}
                setVariants={setVariants}
                addVariant={addVariant}
                updateVariant={updateVariant}
                removeVariant={removeVariant}
                handleSave={handleSave}
                handleDelete={handleDelete}
                setIsEditing={() => router.push('/admin/products')}
                fbProcessing={fbProcessing}
                setZoomedImage={setZoomedImage}
                setActiveImageField={setActiveImageField}
                setShowMediaPicker={setShowMediaPicker}
                setLoadingOverlayText={setLoadingOverlayText}
                setOcrLoading={setOcrLoading}
                setWatermarkModal={setWatermarkModal}
                setErrorModal={setErrorModal}
            />

            {/* Media Picker Modal */}
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
                                setLoadingOverlayText('Attaching Image to Product...');
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
                                setTimeout(() => {
                                    setOcrLoading(false);
                                }, 350);
                            };

                            if (isExistingWatermarked) {
                                onConfirmSelection(url, currentProduct?.product_catalog_image_id);
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
                                            setLoadingOverlayText("Generating Branded Watermark & Catalog ID..."); 
                                            setOcrLoading(true);
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
                                            await onConfirmSelection(uploadData.watermarkedUrl || uploadData.url, newCatId);
                                        } catch (err) {
                                            setErrorModal({ title: 'Watermark Error', message: err.message });
                                            setOcrLoading(false);
                                        }
                                    }
                                });
                                setOcrLoading(false);
                            }
                        } catch (err) {
                            setErrorModal({ title: 'Detection Error', message: err.message });
                            setOcrLoading(false);
                        }
                    }}
                    onClose={() => setShowMediaPicker(false)}
                />
            )}

            {/* Watermark Modal */}
            <WatermarkModal watermarkModal={watermarkModal} onClose={() => setWatermarkModal(null)} />

            {/* Zoom Modal */}
            <ImageZoom src={zoomedImage} onClose={() => setZoomedImage(null)} />

            {/* Error / Success / Confirm Modals */}
            <ErrorModal errorModal={errorModal} onClose={() => setErrorModal(null)} />
            <SuccessModal successModal={successModal} onClose={() => {
                const cb = successModal?.onClose;
                setSuccessModal(null);
                if (cb) cb();
            }} />
            <ConfirmModal confirmModal={confirmModal} onClose={() => setConfirmModal(null)} />

            {/* OCR Loading Overlay */}
            <OcrLoadingOverlay ocrLoading={ocrLoading} loadingOverlayText={loadingOverlayText} />
        </>
    );
}
