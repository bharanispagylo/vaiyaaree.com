import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { executeMysqlQuery } from '../src/lib/mysqlQueryEngine.js';

const publicDir = path.join(process.cwd(), 'public');

function ensureDirSync(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);

        const request = client.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => {});
                return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve(true));
            });
        });

        request.on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
        });

        request.setTimeout(15000, () => {
            request.destroy();
            file.close();
            fs.unlink(destPath, () => {});
            reject(new Error(`Timeout downloading ${url}`));
        });
    });
}

async function migrateImages() {
    console.log("==================================================");
    console.log("STARTING SUPABASE STORAGE TO LOCAL IMAGE MIGRATION");
    console.log("==================================================");

    let totalFound = 0;
    let totalDownloaded = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    // 1. Migrate products.image_url
    console.log("\n1. Scanning products table for Supabase image_url...");
    const { data: prods } = await executeMysqlQuery({
        table: 'products',
        operation: 'select',
        columns: 'id, name, image_url, gallery_image'
    });

    if (prods && prods.length > 0) {
        for (const prod of prods) {
            // Main image_url
            if (prod.image_url && String(prod.image_url).includes('supabase')) {
                totalFound++;
                const oldUrl = String(prod.image_url).trim();
                const fileName = path.basename(new URL(oldUrl).pathname);
                let subFolder = 'products';
                if (oldUrl.includes('with-watermark')) subFolder = 'media/with-watermark';
                else if (oldUrl.includes('without-watermark')) subFolder = 'media/without-watermark';

                const targetDir = path.join(publicDir, 'uploads', subFolder);
                ensureDirSync(targetDir);
                const localFilePath = path.join(targetDir, fileName);
                const relativeUrl = `/uploads/${subFolder}/${fileName}`;

                try {
                    if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size === 0) {
                        console.log(`Downloading product image for [${prod.name}]: ${fileName}`);
                        await downloadFile(oldUrl, localFilePath);
                        totalDownloaded++;
                    } else {
                        totalSkipped++;
                    }

                    // Update MySQL record
                    await executeMysqlQuery({
                        table: 'products',
                        operation: 'update',
                        data: { image_url: relativeUrl },
                        filters: [{ type: 'eq', col: 'id', val: prod.id }]
                    });
                    console.log(` Updated product [${prod.id}] image_url -> ${relativeUrl}`);
                } catch (err) {
                    console.error(`❌ Failed migrating image for product [${prod.id}]:`, err.message);
                    totalFailed++;
                }
            }

            // Gallery images array
            if (prod.gallery_image) {
                let galArray = [];
                if (Array.isArray(prod.gallery_image)) galArray = prod.gallery_image;
                else if (typeof prod.gallery_image === 'string' && prod.gallery_image.startsWith('[')) {
                    try { galArray = JSON.parse(prod.gallery_image); } catch (e) {}
                }

                if (Array.isArray(galArray) && galArray.some(u => String(u).includes('supabase'))) {
                    const newGalArray = [];
                    for (const imgUrl of galArray) {
                        if (String(imgUrl).includes('supabase')) {
                            totalFound++;
                            const fileName = path.basename(new URL(imgUrl).pathname);
                            const targetDir = path.join(publicDir, 'uploads', 'products');
                            ensureDirSync(targetDir);
                            const localFilePath = path.join(targetDir, fileName);
                            const relativeUrl = `/uploads/products/${fileName}`;
                            try {
                                if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size === 0) {
                                    await downloadFile(imgUrl, localFilePath);
                                    totalDownloaded++;
                                } else {
                                    totalSkipped++;
                                }
                                newGalArray.push(relativeUrl);
                            } catch (e) {
                                newGalArray.push(imgUrl);
                                totalFailed++;
                            }
                        } else {
                            newGalArray.push(imgUrl);
                        }
                    }

                    await executeMysqlQuery({
                        table: 'products',
                        operation: 'update',
                        data: { gallery_image: JSON.stringify(newGalArray) },
                        filters: [{ type: 'eq', col: 'id', val: prod.id }]
                    });
                }
            }
        }
    }

    // 2. Migrate media_library table
    console.log("\n2. Scanning media_library table for Supabase URLs...");
    const { data: mediaItems } = await executeMysqlQuery({
        table: 'media_library',
        operation: 'select',
        columns: 'id, url'
    });

    if (mediaItems && mediaItems.length > 0) {
        for (const item of mediaItems) {
            if (item.url && String(item.url).includes('supabase')) {
                totalFound++;
                const oldUrl = String(item.url).trim();
                const fileName = path.basename(new URL(oldUrl).pathname);
                let subFolder = 'media';
                if (oldUrl.includes('with-watermark')) subFolder = 'media/with-watermark';
                else if (oldUrl.includes('without-watermark')) subFolder = 'media/without-watermark';

                const targetDir = path.join(publicDir, 'uploads', subFolder);
                ensureDirSync(targetDir);
                const localFilePath = path.join(targetDir, fileName);
                const relativeUrl = `/uploads/${subFolder}/${fileName}`;

                try {
                    if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size === 0) {
                        await downloadFile(oldUrl, localFilePath);
                        totalDownloaded++;
                    } else {
                        totalSkipped++;
                    }

                    await executeMysqlQuery({
                        table: 'media_library',
                        operation: 'update',
                        data: { url: relativeUrl },
                        filters: [{ type: 'eq', col: 'id', val: item.id }]
                    });
                    console.log(` Updated media_library [${item.id}] -> ${relativeUrl}`);
                } catch (err) {
                    console.error(`❌ Failed migrating media_library [${item.id}]:`, err.message);
                    totalFailed++;
                }
            }
        }
    }

    // 3. Migrate app_settings table
    console.log("\n3. Scanning app_settings table for Supabase URLs...");
    const { data: settings } = await executeMysqlQuery({
        table: 'app_settings',
        operation: 'select',
        columns: 'key, value'
    });

    if (settings && settings.length > 0) {
        for (const set of settings) {
            if (set.value && String(set.value).includes('supabase')) {
                const valStr = String(set.value).trim();
                let urlList = [];
                if (valStr.startsWith('[')) {
                    try { urlList = JSON.parse(valStr); } catch (e) { urlList = valStr.split(','); }
                } else if (valStr.includes(',')) {
                    urlList = valStr.split(',');
                } else {
                    urlList = [valStr];
                }

                const newUrlList = [];
                for (const rawUrl of urlList) {
                    const trimmedUrl = String(rawUrl).trim();
                    if (trimmedUrl.includes('supabase')) {
                        totalFound++;
                        const fileName = path.basename(new URL(trimmedUrl).pathname);
                        let subFolder = 'media';
                        if (trimmedUrl.includes('with-watermark')) subFolder = 'media/with-watermark';
                        else if (trimmedUrl.includes('without-watermark')) subFolder = 'media/without-watermark';

                        const targetDir = path.join(publicDir, 'uploads', subFolder);
                        ensureDirSync(targetDir);
                        const localFilePath = path.join(targetDir, fileName);
                        const relativeUrl = `/uploads/${subFolder}/${fileName}`;

                        try {
                            if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size === 0) {
                                await downloadFile(trimmedUrl, localFilePath);
                                totalDownloaded++;
                            } else {
                                totalSkipped++;
                            }
                            newUrlList.push(relativeUrl);
                        } catch (err) {
                            console.error(`❌ Failed migrating setting image [${set.key}]:`, err.message);
                            newUrlList.push(trimmedUrl);
                            totalFailed++;
                        }
                    } else {
                        newUrlList.push(trimmedUrl);
                    }
                }

                const updatedVal = valStr.startsWith('[') ? JSON.stringify(newUrlList) : newUrlList.join(',');
                await executeMysqlQuery({
                    table: 'app_settings',
                    operation: 'update',
                    data: { value: updatedVal },
                    filters: [{ type: 'eq', col: 'key', val: set.key }]
                });
                console.log(` Updated app_setting [${set.key}] -> ${updatedVal.substring(0, 60)}...`);
            }
        }
    }

    console.log("\n==================================================");
    console.log("IMAGE MIGRATION SUMMARY");
    console.log("==================================================");
    console.log(`Total Supabase URLs Found: ${totalFound}`);
    console.log(`Successfully Downloaded:   ${totalDownloaded}`);
    console.log(`Skipped (Already Local):   ${totalSkipped}`);
    console.log(`Failed Downloads:          ${totalFailed}`);
    console.log("==================================================");
}

migrateImages().catch(err => {
    console.error("❌ MIGRATION ERROR:", err);
    process.exit(1);
});
