const fs = require('fs');

function refactorProductsPage() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let content = fs.readFileSync(path, 'utf8');

    // 1. Fix EVERYTHING in manual uploads (Main product and Variant)
    // We target the multi-step pattern: detectWatermark -> upload original -> stamp -> upload watermarked
    
    const manualBlockRegex = /try \{\s+setOcrLoading\(true\);\s+const catalogId = (?:currentProduct\?\.product_catalog_image_id \|\| )?`CAT-\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 7\)\.toUpperCase\(\)\}`;[\s\S]+?setImageUrl\(watermarkedUploadData\.url\);\s+if \(!currentProduct\?\.product_catalog_image_id\) \{[\s\S]+?\}\s+\} catch \(err\) \{[\s\S]+?\} finally \{\s+setOcrLoading\(false\);\s+\}/g;
    
    // Actually, it's easier to just REPLACE the entire content of the event handlers.
    
    // FIX MAIN PRODUCT UPLOAD (multiple files)
    const oldMainUpload = /onChange=\{async \(e\) => \{[\s\S]+?const files = Array\.from\(e\.target\.files \|\| \[\]\);[\s\S]+?e\.target\.value = '';\s+\}\}/;
    const newMainUpload = `onChange={async (e) => {
                                                              const files = Array.from(e.target.files || []);
                                                              if (!files.length) return;
                                                              try {
                                                                  setOcrLoading(true);
                                                                  const catalogId = currentProduct?.product_catalog_image_id || \`CAT-\${Math.random().toString(36).substring(2, 7).toUpperCase()}\`;
                                                                  const processedImageUrlList = [...(productImageUrl ? productImageUrl.split(',').filter(Boolean) : [])];
                                                                  for (const file of files) {
                                                                      const formData = new FormData();
                                                                      formData.append('file', file);
                                                                      formData.append('catalogId', catalogId);
                                                                      formData.append('requireClean', 'true');
                                                                      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                                                                      const data = await res.json();
                                                                      if (!res.ok) {
                                                                          if (data.error === 'Watermark already present') {
                                                                             setErrorModal({ title: 'Watermark Blocked', message: \`The image "\${file.name}" already has a CAT code.\` });
                                                                          } else throw new Error(data.error || 'Upload failed');
                                                                          continue;
                                                                      }
                                                                      processedImageUrlList.push(data.watermarkedUrl || data.url);
                                                                      if (!currentProduct?.product_catalog_image_id) {
                                                                          setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: data.catalogId }));
                                                                      }
                                                                  }
                                                                  setProductImageUrl(processedImageUrlList.join(','));
                                                              } catch (err) {
                                                                  setErrorModal({ title: 'Upload Failed', message: err.message });
                                                              } finally { setOcrLoading(false); }
                                                              e.target.value = '';
                                                          }}`;

    content = content.replace(oldMainUpload, newMainUpload);

    // FIX VARIANT UPLOAD (single file)
    const oldVariantUpload = /onChange=\{async \(e\) => \{[\s\S]+?const file = e\.target\.files\?\.\[0\];[\s\S]+?if \(!currentProduct\?\.product_catalog_image_id\) \{[\s\S]+?\}\s+\} catch \(err\) \{[\s\S]+?\} finally \{\s+setOcrLoading\(false\);\s+\}\s+\}\}/;
    const newVariantUpload = `onChange={async (e) => {
                                                                             const file = e.target.files?.[0];
                                                                             if (!file) return;
                                                                             try {
                                                                                 setOcrLoading(true);
                                                                                 const catalogId = currentProduct?.product_catalog_image_id || \`CAT-\${Math.random().toString(36).substring(2, 7).toUpperCase()}\`;
                                                                                 const formData = new FormData();
                                                                                 formData.append('file', file);
                                                                                 formData.append('catalogId', catalogId);
                                                                                 formData.append('requireClean', 'true');
                                                                                 const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
                                                                                 const data = await res.json();
                                                                                 if (!res.ok) {
                                                                                     if (data.error === 'Watermark already present') {
                                                                                         setErrorModal({ title: 'Watermark Blocked', message: \`The image "\${file.name}" already has a CAT code.\` });
                                                                                     } else throw new Error(data.error || 'Upload failed');
                                                                                     return;
                                                                                 }
                                                                                 updateVariant(i, 'image_url', data.watermarkedUrl || data.url);
                                                                                 if (!currentProduct?.product_catalog_image_id) {
                                                                                     setCurrentProduct(prev => ({ ...(prev || {}), product_catalog_image_id: data.catalogId }));
                                                                                 }
                                                                             } catch (err) {
                                                                                 setErrorModal({ title: 'Upload Failed', message: err.message });
                                                                             } finally { setOcrLoading(false); }
                                                                         }}`;
    content = content.replace(oldVariantUpload, newVariantUpload);

    // FIX MEDIA PICKER (Syntax error cleanup from previous run)
    const oldMediaPicker = /onSelect=\{async \(url\) => \{[\s\S]+?\}\s+\} catch \(err\) \{[\s\S]+?\} finally \{\s+setOcrLoading\(false\);\s+\}\s+\}/;
    const newMediaPicker = `onSelect={async (url) => {
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
                                        setErrorModal({ title: 'Watermark Blocked', message: 'Image already has a watermark.' });
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
    content = content.replace(oldMediaPicker, newMediaPicker);

    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully refactored ProductsPage.js');
}

refactorProductsPage();
