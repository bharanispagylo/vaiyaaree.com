import { NextResponse } from 'next/server';
import { mysqlClient } from '@/lib/mysqlClient';
import { generateBackupData } from '@/app/api/admin/orders/backup/route';
import { sendEmail } from '@/lib/emailService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
    return handleCronBackup(req);
}

export async function POST(req) {
    return handleCronBackup(req);
}

async function handleCronBackup(req) {
    try {
        // 1. Fetch automated backup setting
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
            scope: 'all'
        };

        if (autoSetting?.value) {
            try {
                const parsed = typeof autoSetting.value === 'string' ? JSON.parse(autoSetting.value) : autoSetting.value;
                autoBackupConfig = { ...autoBackupConfig, ...parsed };
            } catch (e) {}
        }

        if (!autoBackupConfig.enabled) {
            return NextResponse.json({ success: true, message: 'Automated order backup is disabled in settings.' });
        }

        const recipientEmails = (autoBackupConfig.recipient_emails || '').trim();
        if (!recipientEmails) {
            return NextResponse.json({ error: 'No recipient email configured for automated backup.' }, { status: 400 });
        }

        // Determine date range scope
        let scope = autoBackupConfig.scope || 'all';
        if (autoBackupConfig.frequency === 'daily' && scope === 'all') {
            scope = '24h';
        }

        const backupResult = await generateBackupData({
            format: autoBackupConfig.format || 'JSON',
            dateRange: scope === '24h' ? 'today' : (scope === '7days' ? '7days' : (scope === '30days' ? '30days' : 'all')),
            notes: `Automated Scheduled Backup (${autoBackupConfig.frequency})`,
            backupType: 'AUTO_SCHEDULED',
            createdBy: 'System Scheduler'
        });

        let mimeType = 'application/json';
        if (autoBackupConfig.format === 'CSV') mimeType = 'text/csv; charset=utf-8';
        if (autoBackupConfig.format === 'SQL') mimeType = 'application/sql; charset=utf-8';

        const emailList = recipientEmails.split(',').map(e => e.trim()).filter(Boolean);
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
                    <p style="margin: 4px 0 0; font-size: 12px; color: #fecdd3;">Automated Scheduled Orders Backup</p>
                </div>
                <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
                    <p style="font-size: 15px; font-weight: 700; color: #0f172a;">⏰ Scheduled Backup Report</p>
                    <p>Your automated ${autoBackupConfig.frequency} order backup has been generated successfully and is attached.</p>
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
                            <td style="padding: 8px 12px; font-weight: bold;">Total Orders:</td>
                            <td style="padding: 8px 12px; font-weight: bold;">${backupResult.totalOrdersCount.toLocaleString()}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 12px; font-weight: bold;">Total Revenue:</td>
                            <td style="padding: 8px 12px; font-weight: bold; color: #15803d;">₹${backupResult.totalRevenue.toLocaleString()}.00</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        for (const email of emailList) {
            await sendEmail({
                to: email,
                subject: `[Vaiyaaree Automated Backup] Orders Archive ${backupResult.backupId} (${backupResult.totalOrdersCount} orders)`,
                html: emailHtml,
                attachments
            });
        }

        // Update auto backup status
        autoBackupConfig.last_run = new Date().toISOString();
        autoBackupConfig.last_email_sent_to = recipientEmails;
        autoBackupConfig.last_status = 'SUCCESS';

        await mysqlClient.from('app_settings').upsert({
            key: 'auto_order_backup',
            value: JSON.stringify(autoBackupConfig),
            updated_at: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            message: `Automated backup executed and sent to ${recipientEmails}`,
            backupId: backupResult.backupId
        });

    } catch (err) {
        console.error('[CRON-ORDER-BACKUP-ERROR]:', err);
        return NextResponse.json({ error: err.message || 'Automated backup failed' }, { status: 500 });
    }
}
