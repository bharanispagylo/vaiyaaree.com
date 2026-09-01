import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';
import { mysqlClient } from '@/lib/mysqlClient';
import { sendEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatCsvCell(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
}

function generateBackupId() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const his = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `OBK-${ymd}${his}-${rand}`;
}

/**
 * Reusable Backup Generator Helper
 */
export async function generateBackupData({
    format = 'JSON',
    dateRange = 'all',
    startDate,
    endDate,
    status = 'ALL',
    paymentStatus = 'ALL',
    source = 'ALL',
    notes = '',
    backupType = 'MANUAL',
    createdBy = 'Admin'
}) {
    let sqlWhere = ['1=1'];
    let params = [];
    let rangeLabel = 'All Time';

    if (dateRange === 'today') {
        sqlWhere.push('DATE(o.created_at) = CURDATE()');
        rangeLabel = 'Today';
    } else if (dateRange === 'yesterday') {
        sqlWhere.push('DATE(o.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)');
        rangeLabel = 'Yesterday';
    } else if (dateRange === '7days') {
        sqlWhere.push('o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
        rangeLabel = 'Last 7 Days';
    } else if (dateRange === '30days') {
        sqlWhere.push('o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
        rangeLabel = 'Last 30 Days';
    } else if (dateRange === 'this_month') {
        sqlWhere.push('MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())');
        rangeLabel = 'This Month';
    } else if (dateRange === 'custom' && startDate && endDate) {
        sqlWhere.push('DATE(o.created_at) BETWEEN ? AND ?');
        params.push(startDate, endDate);
        rangeLabel = `${startDate} to ${endDate}`;
    }

    if (status && status !== 'ALL') {
        sqlWhere.push('o.order_status = ?');
        params.push(status);
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
        sqlWhere.push('o.payment_status = ?');
        params.push(paymentStatus);
    }

    if (source && source !== 'ALL') {
        sqlWhere.push('o.source = ?');
        params.push(source);
    }

    const queryStr = `
        SELECT 
            o.*,
            c.name as customer_account_name,
            c.email as customer_account_email,
            c.phone as customer_account_phone
        FROM \`orders\` o
        LEFT JOIN \`customers\` c ON o.customer_id = c.id
        WHERE ${sqlWhere.join(' AND ')}
        ORDER BY o.created_at DESC
    `;

    const [orders] = await pool.query(queryStr, params);

    // Fetch items for all matched orders
    let orderItemsMap = {};
    let orderDiscountsMap = {};

    if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        const placeholders = orderIds.map(() => '?').join(',');

        const [items] = await pool.query(
            `SELECT * FROM \`order_items\` WHERE \`order_id\` IN (${placeholders})`,
            orderIds
        );

        for (const item of items) {
            if (!orderItemsMap[item.order_id]) orderItemsMap[item.order_id] = [];
            orderItemsMap[item.order_id].push(item);
        }

        try {
            const [discounts] = await pool.query(
                `SELECT * FROM \`order_discounts\` WHERE \`order_id\` IN (${placeholders})`,
                orderIds
            );
            for (const d of discounts) {
                if (!orderDiscountsMap[d.order_id]) orderDiscountsMap[d.order_id] = [];
                orderDiscountsMap[d.order_id].push(d);
            }
        } catch (e) {}
    }

    // Attach items & discounts
    const fullOrders = orders.map(o => ({
        ...o,
        items: orderItemsMap[o.id] || [],
        discounts: orderDiscountsMap[o.id] || []
    }));

    const totalOrdersCount = fullOrders.length;
    const totalRevenue = fullOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const backupId = generateBackupId();
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const sanitizedRange = rangeLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `vaiyaaree_orders_backup_${sanitizedRange}_${ymd}.${format.toLowerCase()}`;

    let backupContent = '';

    // ── FORMAT A: JSON ───────────────────────────────────────────────────────
    if (format === 'JSON') {
        const backupPayload = {
            metadata: {
                backup_id: backupId,
                store: 'Vaiyaaree Sarees',
                generated_at: now.toISOString(),
                backup_type: backupType,
                format: 'JSON',
                total_orders: totalOrdersCount,
                total_revenue: totalRevenue,
                date_range_covered: rangeLabel,
                filters: { dateRange, startDate, endDate, status, paymentStatus, source },
                version: '2.0-advanced'
            },
            orders: fullOrders
        };
        backupContent = JSON.stringify(backupPayload, null, 2);
    }

    // ── FORMAT B: CSV ────────────────────────────────────────────────────────
    else if (format === 'CSV') {
        const csvHeaders = [
            'Order ID', 'Invoice No', 'Order Date', 'Customer Name', 'Customer Phone', 'Customer Email',
            'Items Count', 'Total Amount', 'Subtotal', 'Discount Amount', 'Coupon Code', 'Shipping Fee', 'Tax Amount',
            'Order Status', 'Payment Method', 'Payment Status', 'Source',
            'Delivery Address', 'City', 'State', 'Pincode', 'Tracking Number', 'Courier Name', 'Items Summary'
        ];

        const csvRows = fullOrders.map(o => {
            const itemsSummary = (o.items || []).map(i => `${i.product_name} (x${i.quantity}) - ₹${i.price_at_time}`).join(' | ');
            return [
                formatCsvCell(o.id || o.order_number),
                formatCsvCell(o.invoice_number || ''),
                formatCsvCell(o.created_at ? new Date(o.created_at).toISOString() : ''),
                formatCsvCell(o.shipping_name || o.customer_account_name || ''),
                formatCsvCell(o.shipping_phone || o.customer_account_phone || ''),
                formatCsvCell(o.shipping_email || o.customer_account_email || ''),
                formatCsvCell(o.items?.length || 0),
                formatCsvCell(Number(o.total_amount || 0).toFixed(2)),
                formatCsvCell(Number(o.subtotal || 0).toFixed(2)),
                formatCsvCell(Number(o.total_discount || 0).toFixed(2)),
                formatCsvCell(o.coupon_code || ''),
                formatCsvCell(Number(o.shipping_fee || 0).toFixed(2)),
                formatCsvCell(Number(o.tax_amount || 0).toFixed(2)),
                formatCsvCell(o.order_status || 'PENDING'),
                formatCsvCell(o.payment_method || 'COD'),
                formatCsvCell(o.payment_status || 'PENDING'),
                formatCsvCell(o.source || 'ONLINE'),
                formatCsvCell(o.shipping_address || ''),
                formatCsvCell(o.shipping_city || ''),
                formatCsvCell(o.shipping_state || ''),
                formatCsvCell(o.shipping_pincode || ''),
                formatCsvCell(o.tracking_number || ''),
                formatCsvCell(o.courier_name || ''),
                formatCsvCell(itemsSummary)
            ].join(',');
        });

        backupContent = [csvHeaders.join(','), ...csvRows].join('\n');
    }

    // ── FORMAT C: SQL ────────────────────────────────────────────────────────
    else if (format === 'SQL') {
        let sqlLines = [
            '-- -------------------------------------------------------------',
            '-- Vaiyaaree Sarees - Orders Database Backup Dump',
            `-- Generated: ${now.toISOString()}`,
            `-- Total Orders: ${totalOrdersCount} | Total Revenue: INR ${totalRevenue}`,
            `-- Range: ${rangeLabel}`,
            '-- -------------------------------------------------------------',
            'SET FOREIGN_KEY_CHECKS = 0;',
            ''
        ];

        for (const ord of fullOrders) {
            const escapeSql = (v) => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
            
            sqlLines.push(`INSERT INTO \`orders\` (\`id\`, \`order_number\`, \`invoice_number\`, \`customer_id\`, \`total_amount\`, \`subtotal\`, \`total_discount\`, \`tax_amount\`, \`shipping_fee\`, \`order_status\`, \`payment_status\`, \`payment_method\`, \`shipping_name\`, \`shipping_phone\`, \`shipping_address\`, \`shipping_city\`, \`shipping_state\`, \`shipping_pincode\`, \`tracking_number\`, \`courier_name\`, \`source\`, \`created_at\`) VALUES (${escapeSql(ord.id)}, ${escapeSql(ord.order_number || ord.id)}, ${escapeSql(ord.invoice_number)}, ${escapeSql(ord.customer_id)}, ${Number(ord.total_amount || 0)}, ${Number(ord.subtotal || 0)}, ${Number(ord.total_discount || 0)}, ${Number(ord.tax_amount || 0)}, ${Number(ord.shipping_fee || 0)}, ${escapeSql(ord.order_status)}, ${escapeSql(ord.payment_status)}, ${escapeSql(ord.payment_method)}, ${escapeSql(ord.shipping_name)}, ${escapeSql(ord.shipping_phone)}, ${escapeSql(ord.shipping_address)}, ${escapeSql(ord.shipping_city)}, ${escapeSql(ord.shipping_state)}, ${escapeSql(ord.shipping_pincode)}, ${escapeSql(ord.tracking_number)}, ${escapeSql(ord.courier_name)}, ${escapeSql(ord.source)}, ${escapeSql(ord.created_at)});`);

            for (const itm of (ord.items || [])) {
                sqlLines.push(`INSERT INTO \`order_items\` (\`id\`, \`order_id\`, \`product_id\`, \`product_name\`, \`quantity\`, \`price_at_time\`, \`paid_price_per_unit\`, \`image_url\`) VALUES (${escapeSql(itm.id)}, ${escapeSql(ord.id)}, ${escapeSql(itm.product_id)}, ${escapeSql(itm.product_name)}, ${Number(itm.quantity || 1)}, ${Number(itm.price_at_time || 0)}, ${Number(itm.paid_price_per_unit || 0)}, ${escapeSql(itm.image_url)});`);
            }
        }

        sqlLines.push('');
        sqlLines.push('SET FOREIGN_KEY_CHECKS = 1;');
        backupContent = sqlLines.join('\n');
    }

    const fileSizeBytes = Buffer.byteLength(backupContent, 'utf8');
    const filtersJson = JSON.stringify({ dateRange, startDate, endDate, status, paymentStatus, source, format, type: backupType, createdBy });

    await pool.query(
        `INSERT INTO \`order_backups\` (
            \`id\`, \`filename\`, \`backup_type\`, \`format\`, \`total_orders\`, \`total_revenue\`, 
            \`date_range_label\`, \`file_size_bytes\`, \`backup_content\`, \`filters_applied\`, 
            \`status\`, \`notes\`, \`created_at\`, \`created_by\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
            backupId, filename, backupType, format, totalOrdersCount, totalRevenue,
            rangeLabel, fileSizeBytes, backupContent, filtersJson,
            'COMPLETED', notes || null, createdBy
        ]
    );

    return {
        backupId,
        filename,
        format,
        rangeLabel,
        totalOrdersCount,
        totalRevenue,
        fileSizeBytes,
        backupContent,
        downloadUrl: `/api/admin/orders/backup?id=${backupId}&download=1`
    };
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const download = searchParams.get('download');

        // 1. Single Backup Download / Fetch
        if (id) {
            const [rows] = await pool.query('SELECT * FROM `order_backups` WHERE `id` = ? LIMIT 1', [id]);
            if (!rows || rows.length === 0) {
                return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
            }
            const backup = rows[0];

            if (download === '1') {
                let contentType = 'application/json';
                if (backup.format === 'CSV') contentType = 'text/csv; charset=utf-8';
                if (backup.format === 'SQL') contentType = 'application/sql; charset=utf-8';

                return new NextResponse(backup.backup_content || '', {
                    headers: {
                        'Content-Type': contentType,
                        'Content-Disposition': `attachment; filename="${backup.filename || `${backup.id}.${backup.format.toLowerCase()}`}"`
                    }
                });
            }

            return NextResponse.json({ success: true, backup });
        }

        // 2. Fetch list of backups and system stats
        const [backups] = await pool.query(
            'SELECT `id`, `filename`, `backup_type`, `format`, `total_orders`, `total_revenue`, `date_range_label`, `file_size_bytes`, `filters_applied`, `status`, `notes`, `created_at`, `created_by` FROM `order_backups` ORDER BY `created_at` DESC LIMIT 100'
        );

        // Fetch Order Stats
        const [orderStats] = await pool.query(
            'SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue, MIN(created_at) as earliest_order, MAX(created_at) as latest_order FROM `orders`'
        );

        const [itemStats] = await pool.query('SELECT COUNT(*) as total_items FROM `order_items`');

        // Fetch automated backup setting
        const { data: autoSetting } = await mysqlClient
            .from('app_settings')
            .select('value')
            .eq('key', 'auto_order_backup')
            .maybeSingle();

        let autoBackupConfig = {
            enabled: false,
            frequency: 'daily',
            format: 'JSON',
            recipient_emails: '',
            scope: 'all',
            include_items: true,
            last_run: null,
            last_email_sent_to: null,
            last_status: null
        };
        if (autoSetting?.value) {
            try {
                const parsed = typeof autoSetting.value === 'string' ? JSON.parse(autoSetting.value) : autoSetting.value;
                autoBackupConfig = { ...autoBackupConfig, ...parsed };
            } catch (e) {}
        }

        // Fetch order notification setting
        const { data: notifSetting } = await mysqlClient
            .from('app_settings')
            .select('value')
            .eq('key', 'order_notification_email_config')
            .maybeSingle();

        let orderNotificationConfig = {
            enabled: true,
            recipient_emails: '',
            send_pdf_invoice: true
        };
        if (notifSetting?.value) {
            try {
                const parsed = typeof notifSetting.value === 'string' ? JSON.parse(notifSetting.value) : notifSetting.value;
                orderNotificationConfig = { ...orderNotificationConfig, ...parsed };
            } catch (e) {}
        }

        return NextResponse.json({
            success: true,
            backups: backups || [],
            stats: {
                totalOrders: Number(orderStats[0]?.total_orders || 0),
                totalRevenue: Number(orderStats[0]?.total_revenue || 0),
                totalLineItems: Number(itemStats[0]?.total_items || 0),
                earliestOrder: orderStats[0]?.earliest_order || null,
                latestOrder: orderStats[0]?.latest_order || null,
                totalBackups: backups?.length || 0,
                lastBackup: backups?.[0]?.created_at || null,
                autoBackupConfig,
                orderNotificationConfig
            }
        });

    } catch (error) {
        console.error('[ORDER-BACKUP-GET] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch order backups' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            action = 'create',
            id,
            format = 'JSON',
            dateRange = 'all',
            startDate,
            endDate,
            status = 'ALL',
            paymentStatus = 'ALL',
            source = 'ALL',
            notes = '',
            autoBackupConfig,
            orderNotificationConfig,
            recipientEmails
        } = body;

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 1: DELETE BACKUP
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'delete') {
            if (!id) return NextResponse.json({ error: 'Backup ID is required' }, { status: 400 });
            await pool.query('DELETE FROM `order_backups` WHERE `id` = ?', [id]);
            return NextResponse.json({ success: true, message: 'Backup deleted successfully' });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 2: SAVE AUTO BACKUP CONFIGURATION
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'save-auto-backup-config' || action === 'toggle-auto') {
            const currentSetting = autoBackupConfig || { enabled: false, frequency: 'daily' };
            const configPayload = JSON.stringify(currentSetting);
            await mysqlClient.from('app_settings').upsert({
                key: 'auto_order_backup',
                value: configPayload,
                updated_at: new Date().toISOString()
            });
            return NextResponse.json({ success: true, message: 'Automated backup configuration saved successfully' });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 3: SAVE NEW ORDER NOTIFICATION EMAIL CONFIGURATION
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'save-order-notification-config') {
            const currentSetting = orderNotificationConfig || { enabled: true, recipient_emails: '', send_pdf_invoice: true };
            const configPayload = JSON.stringify(currentSetting);
            await mysqlClient.from('app_settings').upsert({
                key: 'order_notification_email_config',
                value: configPayload,
                updated_at: new Date().toISOString()
            });

            // Also synchronize with admin_notification_email key for backward compatibility
            if (currentSetting.recipient_emails) {
                await mysqlClient.from('app_settings').upsert({
                    key: 'admin_notification_email',
                    value: currentSetting.recipient_emails.trim(),
                    updated_at: new Date().toISOString()
                });
            }

            return NextResponse.json({ success: true, message: 'New order email notification settings saved successfully' });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 4: TEST ORDER NOTIFICATION EMAIL
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'test-order-notification-email') {
            const targetEmails = (recipientEmails || orderNotificationConfig?.recipient_emails || '').trim();
            if (!targetEmails) {
                return NextResponse.json({ error: 'Please specify at least one recipient email address.' }, { status: 400 });
            }

            const emailList = targetEmails.split(',').map(e => e.trim()).filter(Boolean);
            const testHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <div style="background: #5d0821; padding: 16px; border-radius: 8px; text-align: center; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 20px; letter-spacing: 1px;">VAIYAAREE SAREES</h2>
                        <p style="margin: 4px 0 0; font-size: 12px; color: #fecdd3;">Instant Order Notification Test</p>
                    </div>
                    <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
                        <p style="font-size: 15px; font-weight: 700; color: #16a34a;">✅ Test Connection Successful!</p>
                        <p>This is a verification email to confirm that your <strong>Vaiyaaree New Order Alert Email</strong> is configured properly.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Sample Order:</td>
                                <td style="padding: 8px 12px;">#INV-TEST-001</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Customer:</td>
                                <td style="padding: 8px 12px;">Priya Sundaram (+91 98765 43210)</td>
                            </tr>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Total Value:</td>
                                <td style="padding: 8px 12px; font-weight: bold; color: #15803d;">₹3,450.00</td>
                            </tr>
                        </table>
                        <p style="font-size: 12px; color: #64748b;">When real customers place orders, full item details, delivery address, and PDF invoice will be automatically delivered to this inbox.</p>
                    </div>
                </div>
            `;

            for (const email of emailList) {
                await sendEmail({
                    to: email,
                    subject: `[Vaiyaaree] Test Notification: New Order Alert Configured Successfully`,
                    html: testHtml
                });
            }

            return NextResponse.json({ success: true, message: `Test email sent to ${emailList.join(', ')} successfully!` });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 5: EMAIL BACKUP SNAPSHOT NOW
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'email-backup') {
            const targetEmails = (recipientEmails || autoBackupConfig?.recipient_emails || '').trim();
            if (!targetEmails) {
                return NextResponse.json({ error: 'Please enter at least one recipient email address to send backup to.' }, { status: 400 });
            }

            const emailList = targetEmails.split(',').map(e => e.trim()).filter(Boolean);

            const backupResult = await generateBackupData({
                format,
                dateRange,
                startDate,
                endDate,
                status,
                paymentStatus,
                source,
                notes: notes ? `${notes} (Emailed to ${targetEmails})` : `Emailed to ${targetEmails}`,
                backupType: 'EMAIL_BACKUP',
                createdBy: 'Admin'
            });

            let mimeType = 'application/json';
            if (format === 'CSV') mimeType = 'text/csv; charset=utf-8';
            if (format === 'SQL') mimeType = 'application/sql; charset=utf-8';

            const attachments = [
                {
                    filename: backupResult.filename,
                    content: backupResult.backupContent,
                    contentType: mimeType
                }
            ];

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <div style="background: #5d0821; padding: 18px; border-radius: 8px; text-align: center; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 20px; letter-spacing: 1px;">VAIYAAREE SAREES</h2>
                        <p style="margin: 4px 0 0; font-size: 12px; color: #fecdd3;">Orders Database Backup Snapshot</p>
                    </div>
                    <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
                        <p style="font-size: 15px; font-weight: 700; color: #0f172a;">📦 Order Backup Archive Attached</p>
                        <p>Your requested order backup snapshot has been generated and is attached to this email.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Backup ID:</td>
                                <td style="padding: 8px 12px; font-family: monospace;">${backupResult.backupId}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Filename:</td>
                                <td style="padding: 8px 12px;">${backupResult.filename}</td>
                            </tr>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Format:</td>
                                <td style="padding: 8px 12px; font-weight: bold; color: #2563eb;">${backupResult.format}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Scope:</td>
                                <td style="padding: 8px 12px;">${backupResult.rangeLabel}</td>
                            </tr>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Total Orders:</td>
                                <td style="padding: 8px 12px; font-weight: bold;">${backupResult.totalOrdersCount.toLocaleString()}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">Total Revenue:</td>
                                <td style="padding: 8px 12px; font-weight: bold; color: #15803d;">₹${backupResult.totalRevenue.toLocaleString()}.00</td>
                            </tr>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 12px; font-weight: bold;">File Size:</td>
                                <td style="padding: 8px 12px;">${(backupResult.fileSizeBytes / 1024).toFixed(2)} KB</td>
                            </tr>
                        </table>
                        <p style="font-size: 12px; color: #64748b;">This file can be restored anytime from your Vaiyaaree Admin Dashboard under <strong>Settings &gt; Order Backup &gt; Restore</strong>.</p>
                    </div>
                </div>
            `;

            for (const email of emailList) {
                await sendEmail({
                    to: email,
                    subject: `[Vaiyaaree Backup] Order Archive ${backupResult.backupId} - ${backupResult.rangeLabel} (${backupResult.totalOrdersCount} orders)`,
                    html: emailHtml,
                    attachments
                });
            }

            // Update auto backup last run status
            try {
                const { data: existingAuto } = await mysqlClient.from('app_settings').select('value').eq('key', 'auto_order_backup').maybeSingle();
                let currentAuto = {};
                if (existingAuto?.value) {
                    currentAuto = typeof existingAuto.value === 'string' ? JSON.parse(existingAuto.value) : existingAuto.value;
                }
                currentAuto.last_run = new Date().toISOString();
                currentAuto.last_email_sent_to = targetEmails;
                currentAuto.last_status = 'SUCCESS';
                await mysqlClient.from('app_settings').upsert({
                    key: 'auto_order_backup',
                    value: JSON.stringify(currentAuto),
                    updated_at: new Date().toISOString()
                });
            } catch (e) {}

            return NextResponse.json({
                success: true,
                message: `Backup ${backupResult.backupId} generated and emailed to ${emailList.join(', ')} successfully!`,
                backup: backupResult
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 6: RESTORE FROM BACKUP
        // ─────────────────────────────────────────────────────────────────────────────
        if (action === 'restore') {
            const { backupData } = body;
            if (!backupData || (!Array.isArray(backupData.orders) && !Array.isArray(backupData))) {
                return NextResponse.json({ error: 'Invalid backup format. Must contain an array of orders.' }, { status: 400 });
            }

            const ordersList = Array.isArray(backupData.orders) ? backupData.orders : backupData;
            if (ordersList.length === 0) {
                return NextResponse.json({ error: 'No orders found in the provided backup file.' }, { status: 400 });
            }

            let restoredCount = 0;
            const conn = await pool.getConnection();
            try {
                await conn.beginTransaction();

                for (const ord of ordersList) {
                    const orderId = ord.id || ord.order_number;
                    if (!orderId) continue;

                    // Upsert order
                    await conn.query(
                        `INSERT INTO \`orders\` (
                            \`id\`, \`customer_id\`, \`order_number\`, \`invoice_number\`, \`total_amount\`, 
                            \`subtotal\`, \`product_discount\`, \`cart_discount\`, \`coupon_discount\`, \`shipping_discount\`, \`total_discount\`, \`coupon_code\`, 
                            \`tax_amount\`, \`shipping_fee\`, \`order_status\`, \`payment_status\`, \`payment_method\`, 
                            \`shipping_name\`, \`shipping_phone\`, \`shipping_address\`, \`shipping_city\`, \`shipping_state\`, \`shipping_pincode\`, 
                            \`tracking_number\`, \`courier_name\`, \`source\`, \`notes\`, \`created_at\`, \`updated_at\`
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE 
                            \`order_status\` = VALUES(\`order_status\`),
                            \`payment_status\` = VALUES(\`payment_status\`),
                            \`total_amount\` = VALUES(\`total_amount\`),
                            \`total_discount\` = VALUES(\`total_discount\`),
                            \`tracking_number\` = VALUES(\`tracking_number\`),
                            \`updated_at\` = NOW()`,
                        [
                            orderId, ord.customer_id || null, ord.order_number || orderId, ord.invoice_number || null, Number(ord.total_amount || 0),
                            Number(ord.subtotal || ord.total_amount || 0), Number(ord.product_discount || 0), Number(ord.cart_discount || 0), Number(ord.coupon_discount || 0), Number(ord.shipping_discount || 0), Number(ord.total_discount || 0), ord.coupon_code || null,
                            Number(ord.tax_amount || 0), Number(ord.shipping_fee || 0), ord.order_status || 'PENDING', ord.payment_status || 'PENDING', ord.payment_method || 'COD',
                            ord.shipping_name || ord.customer_name || '', ord.shipping_phone || ord.customer_phone || '', ord.shipping_address || '', ord.shipping_city || '', ord.shipping_state || '', ord.shipping_pincode || '',
                            ord.tracking_number || null, ord.courier_name || null, ord.source || 'ONLINE', ord.notes || null, ord.created_at ? new Date(ord.created_at) : new Date()
                        ]
                    );

                    // Restore order items if present
                    if (Array.isArray(ord.items) && ord.items.length > 0) {
                        for (const item of ord.items) {
                            const itemId = item.id || `item_${orderId}_${Math.random().toString(36).substr(2, 6)}`;
                            await conn.query(
                                `INSERT INTO \`order_items\` (
                                    \`id\`, \`order_id\`, \`product_id\`, \`product_name\`, \`variant_id\`, \`variant_name\`, 
                                    \`sku\`, \`quantity\`, \`price_at_time\`, \`paid_price_per_unit\`, \`image_url\`, \`created_at\`
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                                ON DUPLICATE KEY UPDATE 
                                    \`quantity\` = VALUES(\`quantity\`),
                                    \`paid_price_per_unit\` = VALUES(\`paid_price_per_unit\`)`,
                                [
                                    itemId, orderId, item.product_id || null, item.product_name || 'Product', item.variant_id || null, item.variant_name || null,
                                    item.sku || null, Number(item.quantity || 1), Number(item.price_at_time || item.price || 0), Number(item.paid_price_per_unit || item.price_at_time || item.price || 0), item.image_url || null
                                ]
                            );
                        }
                    }
                    restoredCount++;
                }

                await conn.commit();
                return NextResponse.json({
                    success: true,
                    message: `Successfully restored ${restoredCount} orders from backup.`
                });
            } catch (err) {
                await conn.rollback();
                throw err;
            } finally {
                conn.release();
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ACTION 7: CREATE NEW BACKUP SNAPSHOT (MANUAL DOWNLOAD)
        // ─────────────────────────────────────────────────────────────────────────────
        const backupResult = await generateBackupData({
            format,
            dateRange,
            startDate,
            endDate,
            status,
            paymentStatus,
            source,
            notes,
            backupType: 'MANUAL',
            createdBy: 'Admin'
        });

        // If user requested to also send an email copy during creation
        if (recipientEmails && recipientEmails.trim()) {
            const emailList = recipientEmails.split(',').map(e => e.trim()).filter(Boolean);
            let mimeType = 'application/json';
            if (format === 'CSV') mimeType = 'text/csv; charset=utf-8';
            if (format === 'SQL') mimeType = 'application/sql; charset=utf-8';

            const attachments = [
                {
                    filename: backupResult.filename,
                    content: backupResult.backupContent,
                    contentType: mimeType
                }
            ];

            for (const email of emailList) {
                try {
                    await sendEmail({
                        to: email,
                        subject: `[Vaiyaaree Backup] Order Archive ${backupResult.backupId} - ${backupResult.rangeLabel}`,
                        html: `<p>Attached is the requested order backup archive <strong>${backupResult.filename}</strong> (${backupResult.totalOrdersCount} orders).</p>`,
                        attachments
                    });
                } catch (e) {}
            }
        }

        return NextResponse.json({
            success: true,
            message: `Order backup ${backupResult.backupId} generated successfully!`,
            backup: {
                id: backupResult.backupId,
                filename: backupResult.filename,
                format: backupResult.format,
                total_orders: backupResult.totalOrdersCount,
                total_revenue: backupResult.totalRevenue,
                date_range_label: backupResult.rangeLabel,
                file_size_bytes: backupResult.fileSizeBytes,
                created_at: new Date().toISOString(),
                downloadUrl: backupResult.downloadUrl
            }
        });

    } catch (error) {
        console.error('[ORDER-BACKUP-POST] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process backup operation' }, { status: 500 });
    }
}
