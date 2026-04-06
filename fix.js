const fs = require('fs');

function fixProductsPage() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let content = fs.readFileSync(path, 'utf8');

    // Fix Item 1: The 'Upload Files' onChange handler
    const uploadStartTag = '                                                            try {';
    const uploadEndTag = '                                                                setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: catalogId }));';

    // We search for a unique segment within the upload block
    const oldUploadBlockRegex = /try \{\s+setOcrLoading\(true\);\s+const catalogId = currentProduct\?\.product_catalog_image_id \|\| `CAT-\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 7\)\.toUpperCase\(\)\}`;[\s\S]+?setProductImageUrl\(prev => prev \? `\$\{prev\},\$\{uploadedUrls\.join\(','\)\}` : uploadedUrls\.join\(','\)\);\s+setCurrentProduct\(prev => \(\{ \.\.\.\(prev \|\| \{\}\), product_catalog_image_id: catalogId \}\)\);/g;

    const newUploadBlock = `try {
                                                                 const catalogId = currentProduct?.product_catalog_image_id || \`CAT-\${Math.random().toString(36).substring(2, 7).toUpperCase()}\`;
                                                                 const processedImageUrlList = [...(productImageUrl ? productImageUrl.split(',').filter(Boolean) : [])];
                                                                 
                                                                 for (const file of files) {
                                                                     // High-performance single-call upload (Backend handles 2 versions & OCR)
                                                                     const formData = new FormData();
                                                                     formData.append('file', file);
                                                                     formData.append('catalogId', catalogId);
                                                                     formData.append('requireClean', 'true'); 

                                                                     const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                                                                     const data = await res.json();

                                                                     if (!res.ok) {
                                                                         if (data.error === 'Watermark already present') {
                                                                             setErrorModal({ title: 'Watermark Blocked', message: \`The image "\${file.name}" already has a CAT code. Please upload a clean version.\` });
                                                                         } else {
                                                                             throw new Error(data.error || 'Upload failed');
                                                                         }
                                                                         continue;
                                                                     }

                                                                     processedImageUrlList.push(data.watermarkedUrl || data.url);
                                                                     if (!currentProduct?.product_catalog_image_id) {
                                                                         setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: data.catalogId }));
                                                                     }
                                                                 }
                                                                 setProductImageUrl(processedImageUrlList.join(','));`;

    content = content.replace(oldUploadBlockRegex, newUploadBlock);

    // Fix Item 2: MediaPicker onSelect
    const oldMediaSelectRegex = /onSelect=\{async \(url\) => \{[\s\S]+?updateVariant\(activeImageField\.index, 'image_url', watermarkedUploadData\.url\);\s+\}\s+\}/g;
    
    const newMediaSelect = `onSelect={async (url) => {
                            try {
                                setOcrLoading(true);
                                setShowMediaPicker(false);
                                const response = await fetch(url);
                                const blob = await response.blob();
                                const file = new File([blob], \`media-image-\${Date.now()}.jpg\`, { type: blob.type });

                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('requireClean', 'true');

                                const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                                const data = await uploadRes.json();
                                
                                if (!uploadRes.ok) {
                                    if (data.error === 'Watermark already present') {
                                        setErrorModal({ title: 'Watermark Blocked', message: data.message || 'Image already has a watermark.' });
                                        return;
                                    }
                                    throw new Error(data.error || 'Upload failed');
                                }

                                const finalUrl = data.watermarkedUrl || data.url;
                                if (activeImageField.type === 'product') {
                                    setProductImageUrl(prev => prev ? \`\${prev},\${finalUrl}\` : finalUrl);
                                    if (!currentProduct?.product_catalog_image_id) {
                                        setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: data.catalogId }));
                                    }
                                } else if (activeImageField.type === 'variant') {
                                    updateVariant(activeImageField.index, 'image_url', finalUrl);
                                }
                            } catch (err) {
                                setErrorModal({ title: 'Processing Error', message: err.message });
                            } finally {
                                setOcrLoading(false);
                            }
                        }}`;

    content = content.replace(oldMediaSelectRegex, newMediaSelect);

    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed ProductsPage.js');
}

fixProductsPage();
