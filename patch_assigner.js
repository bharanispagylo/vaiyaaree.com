const fs = require('fs');

function patchProductImageAssigner() {
    const path = 'd:/aiswarya/src/components/ProductImageAssigner.js';
    let content = fs.readFileSync(path, 'utf8');

    // Refactor assignImage and handleFileChange
    const startIndex = content.indexOf('const assignImage = async (index, rawImageUrl) => {');
    const endIndex = content.indexOf('const allDone = items.every(it => it.status === \'done\');');

    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find assignImage boundaries');
        return;
    }

    const newCode = `const assignImage = async (index, rawImageUrl) => {
        const item = items[index];
        setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'stamping', previewUrl: rawImageUrl } : it));

        try {
            const catalogId = item.catalogId || \`CAT-\${Math.random().toString(36).substring(2, 7).toUpperCase()}\`;
            const res = await fetch(rawImageUrl);
            const blob = await res.blob();
            const fileToUpload = new File([blob], \`assign-\${Date.now()}.jpg\`, { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('catalogId', catalogId);
            formData.append('requireClean', 'true');

            const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData });
            const data = await uploadRes.json();
            
            if (!uploadRes.ok) {
                if (data.error === 'Watermark already present') {
                    setErrorModal({ title: 'Watermark Blocked', message: 'This image already has a CAT code.' });
                } else throw new Error(data.error || 'Upload failed');
                setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'idle' } : it));
                return;
            }

            const finalUrl = data.watermarkedUrl || data.url;
            const dbData = {
                name: item.name, description: item.description, price: item.price, stock: item.stock,
                category: item.category, type: 'simple', is_active: true,
                image_url: finalUrl, product_catalog_image_id: catalogId
            };

            let savedProduct = null;
            if (item.isNew) {
                dbData.total_added = item.stock || 0;
                const { data: insData, error } = await supabase.from('products').insert([dbData]).select();
                if (error) throw error;
                savedProduct = insData?.[0];
            } else {
                const { data: updData, error } = await supabase.from('products').update(dbData).eq('id', item.id).select();
                if (error) throw error;
                savedProduct = updData?.[0];
            }

            setItems(prev => prev.map((it, i) => i === index ? { ...it, ...savedProduct, status: 'done', previewUrl: finalUrl, catalogId } : it));
        } catch (err) {
            setErrorModal({ title: 'Error', message: err.message });
            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'error' } : it));
        }
    };

    const handleFileChange = async (e, index) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        await assignImage(index, objectUrl);
        e.target.value = '';
    };

    `;

    content = content.substring(0, startIndex) + newCode + content.substring(endIndex);

    // Also remove the OCR check in the Media Picker loop (lines 413-430 approx)
    content = content.replace(/try\s*\{\s*setOcrLoading\(true\);\s*\/\/ 1\. OCR Check[\s\S]+?assignImage\(activePickerIndex, url\);/g, 'assignImage(activePickerIndex, url);');

    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully patched ProductImageAssigner.js');
}

patchProductImageAssigner();
