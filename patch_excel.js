const fs = require('fs');

function patchExcelImport() {
    const path = 'd:/aiswarya/src/app/admin/products/page.js';
    let content = fs.readFileSync(path, 'utf8');

    const loopStart = 'for (const rawRow of jsonData) {';
    const loopEnd = 'if (insertCount > 0 || updateCount > 0) {';

    const startIndex = content.indexOf(loopStart);
    const endIndex = content.indexOf(loopEnd, startIndex);

    if (startIndex === -1 || endIndex === -1) {
        console.error('Could not find Excel loop boundaries');
        return;
    }

    const newLoopContent = `for (const rawRow of jsonData) {
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
                        name, description, price, category, stock,
                        type: 'simple', is_active: true,
                        product_catalog_image_id: row.catalogid || row.productcatalogimageid || row.code || ''
                    };

                    if (id) {
                        const { data: existingData } = await supabase.from('products').select('*').eq('id', id).single();
                        if (existingData) {
                            const oldStock = existingData.stock || 0;
                            const diff = stock - oldStock;
                            if (!productData.product_catalog_image_id) delete productData.product_catalog_image_id;
                            
                            const { error: updateError } = await supabase.from('products').update(productData).eq('id', id);
                            if (!updateError) {
                                updateCount++;
                                if (diff !== 0) {
                                    await supabase.from('product_history').insert({
                                        product_id: existingData.id,
                                        change_type: 'ADJUSTMENT',
                                        quantity_change: Math.abs(diff),
                                        new_stock: stock,
                                        reason: 'Excel Bulk Sync'
                                    });
                                }
                            }
                            continue;
                        }
                    }
                    
                    // No ID or not found -> New Draft
                    newlyImportedProducts.push({ ...productData, isNew: true });
                    insertCount++;
                } catch (rowErr) {
                    console.error('Error processing a single row:', rowErr);
                }
            }
            `;

    content = content.substring(0, startIndex) + newLoopContent + content.substring(endIndex);

    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully patched handleExcelImport loop');
}

patchExcelImport();
