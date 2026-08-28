'use client';

import { useState, useEffect } from 'react';
import { getProductSlug, slugify } from '@/lib/productUrl';

import ProductFormHeader from './form/ProductFormHeader';
import ProductBasicInfoCard from './form/ProductBasicInfoCard';
import ProductTypeSelector from './form/ProductTypeSelector';
import ProductMediaCard from './form/ProductMediaCard';
import ProductPricingInventoryCard from './form/ProductPricingInventoryCard';
import ProductVariantBuilder from './form/ProductVariantBuilder';
import ProductFormSidebar from './form/ProductFormSidebar';
import ProductFormBottomBar from './form/ProductFormBottomBar';

export default function ProductForm({
    currentProduct,
    formProductName,
    setFormProductName,
    copiedProductUrl,
    setCopiedProductUrl,
    productType,
    setProductType,
    dbActiveCategories = [],
    productImageUrl,
    setProductImageUrl,
    galleryImageUrl,
    setGalleryImageUrl,
    variants = [],
    setVariants,
    addVariant,
    updateVariant,
    removeVariant,
    handleSave,
    handleDelete,
    setIsEditing,
    fbProcessing,
    setZoomedImage,
    setActiveImageField,
    setShowMediaPicker,
    setLoadingOverlayText,
    setOcrLoading,
    setWatermarkModal,
    setErrorModal
}) {
    // Slug & Permalink States
    const [customSlug, setCustomSlug] = useState(() => currentProduct?.slug || '');
    const [isEditingSlug, setIsEditingSlug] = useState(false);
    const [tempSlug, setTempSlug] = useState('');
    const [isCustomSlugLocked, setIsCustomSlugLocked] = useState(() => Boolean(currentProduct?.slug));

    // Product Draft / Active Status State
    const [productStatus, setProductStatus] = useState(() => {
        if (!currentProduct) return 'active';
        return (currentProduct.is_active !== 0 && currentProduct.is_active !== false) ? 'active' : 'draft';
    });

    // Option to use already-watermarked image directly
    const [useExistingWatermark, setUseExistingWatermark] = useState(false);

    const handleSaveAsDraft = (e) => {
        e.preventDefault();
        setProductStatus('draft');
        setTimeout(() => {
            const form = document.getElementById('product-admin-form');
            if (form) {
                const input = form.querySelector('input[name="is_active"]');
                if (input) input.value = 'off';
                form.requestSubmit();
            }
        }, 50);
    };

    // Multi-Option Builder State (Shopify Style: Size, Color, etc.)
    const extractInitialOptions = (existingVars) => {
        if (!existingVars || existingVars.length === 0) {
            return [
                { name: 'Size', values: ['S', 'M'] },
                { name: 'Color', values: ['Red', 'Green', 'Blue'] }
            ];
        }
        const first = existingVars[0]?.name || '';
        if (first.includes('/')) {
            const partsCount = first.split('/').length;
            const defaultNames = ['Size', 'Color', 'Material', 'Style'];
            const opts = [];
            for (let i = 0; i < partsCount; i++) {
                opts.push({ name: defaultNames[i] || `Option ${i + 1}`, values: [] });
            }
            existingVars.forEach(v => {
                const parts = String(v.name || '').split('/').map(p => p.trim());
                parts.forEach((p, idx) => {
                    if (opts[idx] && p && !opts[idx].values.includes(p)) {
                        opts[idx].values.push(p);
                    }
                });
            });
            const valid = opts.filter(o => o.values.length > 0);
            return valid.length > 0 ? valid : [{ name: 'Size', values: ['S', 'M'] }, { name: 'Color', values: ['Red', 'Green'] }];
        } else {
            const vals = [];
            existingVars.forEach(v => {
                const val = String(v.name || '').trim();
                if (val && !vals.includes(val)) vals.push(val);
            });
            return [{ name: 'Size', values: vals.length > 0 ? vals : ['32', '34', '36', '38', '40', '42'] }];
        }
    };

    const [optionsList, setOptionsList] = useState(() => extractInitialOptions(variants));
    const [optValueInputs, setOptValueInputs] = useState({});
    const [selectedVariantRows, setSelectedVariantRows] = useState([]);

    useEffect(() => {
        if (variants && variants.length > 0) {
            setOptionsList(extractInitialOptions(variants));
        }
    }, [currentProduct]);

    // Generate Combinations Matrix from options (Cartesian Product)
    const generateMatrix = (customOpts = optionsList, showModalOnError = true) => {
        const validOptions = (customOpts || []).filter(opt => opt.name.trim() && opt.values && opt.values.length > 0);
        if (validOptions.length === 0) {
            if (showModalOnError && setErrorModal) {
                setErrorModal({
                    title: 'Missing Option Values',
                    message: 'Please specify at least one option name and add at least one value (e.g. Size: S, M or Color: Red, Green) before generating combinations.'
                });
            }
            return;
        }

        // Cartesian product
        const combos = validOptions.reduce((acc, currOpt) => {
            if (acc.length === 0) {
                return currOpt.values.map(val => val.trim());
            }
            const res = [];
            acc.forEach(prev => {
                currOpt.values.forEach(val => {
                    res.push(`${prev} / ${val.trim()}`);
                });
            });
            return res;
        }, []);

        const defaultPrice = currentProduct?.price || 0;
        const defaultCompare = currentProduct?.compare_price || currentProduct?.original_price || '';
        const baseSku = currentProduct?.product_no || currentProduct?.sku || 'SKU';
        const mainImg = (productImageUrl || '').split(',')[0] || '';

        const newVariants = combos.map((comboName) => {
            const existing = (variants || []).find(v => String(v.name || '').trim().toLowerCase() === comboName.toLowerCase());
            if (existing) {
                return {
                    ...existing,
                    name: comboName
                };
            }

            const skuSuffix = comboName.replace(/[^a-zA-Z0-9]+/g, '-').toUpperCase();
            return {
                name: comboName,
                sku: `${baseSku}-${skuSuffix}`,
                price: defaultPrice,
                compare_price: defaultCompare,
                stock: 10,
                image_url: mainImg
            };
        });

        setVariants(newVariants);
    };

    const addOptionGroup = () => {
        const defaultNames = ['Size', 'Color', 'Material', 'Style', 'Pattern'];
        const existingNames = optionsList.map(o => o.name.toLowerCase());
        const nextName = defaultNames.find(n => !existingNames.includes(n.toLowerCase())) || `Option ${optionsList.length + 1}`;
        const updated = [...optionsList, { name: nextName, values: [] }];
        setOptionsList(updated);
    };

    const removeOptionGroup = (optIdx) => {
        const updated = optionsList.filter((_, i) => i !== optIdx);
        setOptionsList(updated);
        generateMatrix(updated, false);
    };

    const updateOptionName = (optIdx, newName) => {
        const updated = [...optionsList];
        updated[optIdx].name = newName;
        setOptionsList(updated);
    };

    const addOptionValue = (optIdx, value) => {
        const clean = String(value || '').trim();
        if (!clean) return;
        const updated = [...optionsList];
        if (!updated[optIdx].values.includes(clean)) {
            updated[optIdx].values = [...updated[optIdx].values, clean];
            setOptionsList(updated);
            generateMatrix(updated, false);
        }
        setOptValueInputs(prev => ({ ...prev, [optIdx]: '' }));
    };

    const removeOptionValue = (optIdx, valIdx) => {
        const updated = [...optionsList];
        updated[optIdx].values = updated[optIdx].values.filter((_, i) => i !== valIdx);
        setOptionsList(updated);
        generateMatrix(updated, false);
    };

    const addPresetValuesToOption = (optIdx, presetValues) => {
        const updated = [...optionsList];
        const currentVals = updated[optIdx].values || [];
        const newVals = presetValues.filter(pv => !currentVals.some(cv => cv.toLowerCase() === pv.toLowerCase()));
        updated[optIdx].values = [...currentVals, ...newVals];
        setOptionsList(updated);
        generateMatrix(updated, false);
    };

    const toggleSelectAllVariants = () => {
        if (selectedVariantRows.length === variants.length) {
            setSelectedVariantRows([]);
        } else {
            setSelectedVariantRows(variants.map((_, i) => i));
        }
    };

    const toggleSelectVariantRow = (idx) => {
        if (selectedVariantRows.includes(idx)) {
            setSelectedVariantRows(selectedVariantRows.filter(i => i !== idx));
        } else {
            setSelectedVariantRows([...selectedVariantRows, idx]);
        }
    };

    useEffect(() => {
        if (productType === 'variant' && (!variants || variants.length === 0)) {
            generateMatrix(optionsList, false);
        }
    }, [productType]);

    useEffect(() => {
        setCustomSlug(currentProduct?.slug || '');
        setIsCustomSlugLocked(Boolean(currentProduct?.slug));
        setIsEditingSlug(false);
    }, [currentProduct]);

    useEffect(() => {
        if (!isCustomSlugLocked) {
            const autoSlug = slugify(formProductName || '');
            setCustomSlug(autoSlug);
        }
    }, [formProductName, isCustomSlugLocked]);

    // Compute effective public product slug
    const effectiveSlug = (customSlug && customSlug.trim())
        ? slugify(customSlug)
        : getProductSlug({
            ...currentProduct,
            name: formProductName || currentProduct?.name || 'new-product',
            product_no: currentProduct?.product_no || currentProduct?.sku || ''
        });

    const publicProductPath = `/product/${effectiveSlug}/`;
    const publicProductFullUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${publicProductPath}`
        : `https://vaiyaaree.com${publicProductPath}`;
    const baseSiteUrl = typeof window !== 'undefined' ? `${window.location.origin}/product/` : 'https://vaiyaaree.com/product/';

    return (
        <div className="animate-enter" style={{ paddingBottom: '3rem', maxWidth: '1450px', margin: '0 auto' }}>
            {/* ── TOP HEADER & PREVIEW BAR ── */}
            <ProductFormHeader
                currentProduct={currentProduct}
                productStatus={productStatus}
                fbProcessing={fbProcessing}
                setIsEditing={setIsEditing}
                handleDelete={handleDelete}
                handleSaveAsDraft={handleSaveAsDraft}
                publicProductPath={publicProductPath}
                publicProductFullUrl={publicProductFullUrl}
                isCustomSlugLocked={isCustomSlugLocked}
                effectiveSlug={effectiveSlug}
                setTempSlug={setTempSlug}
                setIsEditingSlug={setIsEditingSlug}
                copiedProductUrl={copiedProductUrl}
                setCopiedProductUrl={setCopiedProductUrl}
            />

            {/* ── MAIN 2-COLUMN SHOPIFY-STYLE LAYOUT ── */}
            <style>{`
                .shopify-product-form-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 340px;
                    gap: 1.5rem;
                    alignItems: flex-start;
                }
                @media (max-width: 1024px) {
                    .shopify-product-form-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
            <form id="product-admin-form" key={currentProduct?.id || 'new_product'} onSubmit={handleSave}>
                <input type="hidden" name="slug" value={effectiveSlug} />

                <div className="shopify-product-form-grid">
                    {/* ── LEFT COLUMN (Main Product Content & Variants) ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
                        
                        {/* 1. Title, Slug & Description */}
                        <ProductBasicInfoCard
                            formProductName={formProductName}
                            setFormProductName={setFormProductName}
                            currentProduct={currentProduct}
                            baseSiteUrl={baseSiteUrl}
                            effectiveSlug={effectiveSlug}
                            isEditingSlug={isEditingSlug}
                            setIsEditingSlug={setIsEditingSlug}
                            tempSlug={tempSlug}
                            setTempSlug={setTempSlug}
                            setCustomSlug={setCustomSlug}
                            setIsCustomSlugLocked={setIsCustomSlugLocked}
                        />

                        {/* 2. Product Type Selector */}
                        <ProductTypeSelector
                            productType={productType}
                            setProductType={setProductType}
                        />

                        {/* 3. Media & Images */}
                        <ProductMediaCard
                            useExistingWatermark={useExistingWatermark}
                            setUseExistingWatermark={setUseExistingWatermark}
                            productImageUrl={productImageUrl}
                            setProductImageUrl={setProductImageUrl}
                            galleryImageUrl={galleryImageUrl}
                            setGalleryImageUrl={setGalleryImageUrl}
                            currentProduct={currentProduct}
                            setZoomedImage={setZoomedImage}
                            setActiveImageField={setActiveImageField}
                            setShowMediaPicker={setShowMediaPicker}
                            setLoadingOverlayText={setLoadingOverlayText}
                            setOcrLoading={setOcrLoading}
                            setWatermarkModal={setWatermarkModal}
                            setErrorModal={setErrorModal}
                        />

                        {/* 4. Simple Product Pricing & Inventory */}
                        {productType === 'simple' && (
                            <ProductPricingInventoryCard
                                currentProduct={currentProduct}
                            />
                        )}

                        {/* 5. Variant Product: Options Builder & Matrix */}
                        {productType === 'variant' && (
                            <ProductVariantBuilder
                                optionsList={optionsList}
                                setOptionsList={setOptionsList}
                                optValueInputs={optValueInputs}
                                setOptValueInputs={setOptValueInputs}
                                variants={variants}
                                setVariants={setVariants}
                                selectedVariantRows={selectedVariantRows}
                                setSelectedVariantRows={setSelectedVariantRows}
                                productImageUrl={productImageUrl}
                                addVariant={addVariant}
                                updateVariant={updateVariant}
                                removeVariant={removeVariant}
                                addOptionGroup={addOptionGroup}
                                removeOptionGroup={removeOptionGroup}
                                updateOptionName={updateOptionName}
                                addOptionValue={addOptionValue}
                                removeOptionValue={removeOptionValue}
                                addPresetValuesToOption={addPresetValuesToOption}
                                toggleSelectAllVariants={toggleSelectAllVariants}
                                toggleSelectVariantRow={toggleSelectVariantRow}
                                setActiveImageField={setActiveImageField}
                                setShowMediaPicker={setShowMediaPicker}
                            />
                        )}
                    </div>

                    {/* ── RIGHT COLUMN (Sidebar / Organization Cards) ── */}
                    <ProductFormSidebar
                        currentProduct={currentProduct}
                        productStatus={productStatus}
                        setProductStatus={setProductStatus}
                        dbActiveCategories={dbActiveCategories}
                    />
                </div>

                {/* ── BOTTOM ACTION BAR ── */}
                <ProductFormBottomBar
                    currentProduct={currentProduct}
                    handleDelete={handleDelete}
                    setIsEditing={setIsEditing}
                    handleSaveAsDraft={handleSaveAsDraft}
                    fbProcessing={fbProcessing}
                    productStatus={productStatus}
                />
            </form>
        </div>
    );
}
