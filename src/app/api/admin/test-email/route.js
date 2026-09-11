import { NextResponse } from 'next/server';
import { sendEmail, getSmtpConfig } from '@/lib/emailService';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const recipient = body.recipient || body.to || 'vaiyaaree@gmail.com';

        let config = await getSmtpConfig();
        let customTransporter = null;

        if (body.smtpConfig && (body.smtpConfig.user || body.smtpConfig.host)) {
            const host = (body.smtpConfig.host || config.host || 'smtp.gmail.com').trim();
            const port = parseInt(body.smtpConfig.port || config.port || '587', 10);
            const user = (body.smtpConfig.user !== undefined ? body.smtpConfig.user : config.user).trim();
            const pass = (body.smtpConfig.pass !== undefined ? body.smtpConfig.pass : config.pass).trim().replace(/\s+/g, '');
            const from = (body.smtpConfig.from || config.from || `"Vaiyaaree Sarees" <${user}>`).trim();
            const secure = port === 465;

            config = { host, port, user, pass, from, secure };

            if (user && pass) {
                const nodemailer = (await import('nodemailer')).default;
                customTransporter = nodemailer.createTransport({
                    host,
                    port,
                    secure,
                    auth: { user, pass },
                    tls: { rejectUnauthorized: false },
                    connectionTimeout: 10000
                });
            }
        }

        if (!config.user || !config.pass) {
            return NextResponse.json({
                success: false,
                status: 'LOGGED_ONLY',
                message: 'SMTP credentials are not configured. Please enter SMTP User & Password in the fields and try again.',
                config: { host: config.host, port: config.port, user: config.user, from: config.from }
            }, { status: 400 });
        }

        const testHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
                <h2 style="color: #4a0404; margin-top: 0;">Vaiyaaree Sarees — Test Email Verification</h2>
                <p>Hello,</p>
                <p>This is a test notification email from your <strong>Vaiyaaree Sarees</strong> store.</p>
                <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #16a34a; border-radius: 4px; margin: 15px 0;">
                    <p style="margin: 0; font-weight: bold; color: #0f172a;">SMTP Status: ✅ Connected & Working!</p>
                    <p style="margin: 5px 0 0; color: #475569; font-size: 0.9rem;">Sender: ${config.from}</p>
                    <p style="margin: 5px 0 0; color: #475569; font-size: 0.9rem;">Server: ${config.host}:${config.port}</p>
                </div>
                <p style="color: #64748b; font-size: 0.85rem;">Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
            </div>
        `;

        let result;
        if (customTransporter) {
            try {
                const info = await customTransporter.sendMail({
                    from: config.from,
                    to: recipient,
                    subject: 'Vaiyaaree Sarees — SMTP Test Email Connection',
                    html: testHtml
                });
                result = { success: true, messageId: info.messageId, status: 'SENT' };
            } catch (sendErr) {
                result = { success: false, error: sendErr.message, status: 'FAILED' };
            }
        } else {
            result = await sendEmail({
                to: recipient,
                subject: 'Vaiyaaree Sarees — SMTP Test Email Connection',
                html: testHtml
            });
        }

        if (result.success) {
            return NextResponse.json({
                success: true,
                status: 'SENT',
                message: `Test email sent successfully to ${recipient}!`,
                messageId: result.messageId,
                config: { host: config.host, port: config.port, user: config.user, from: config.from }
            }, { status: 200 });
        } else {
            return NextResponse.json({
                success: false,
                status: result.status || 'FAILED',
                message: result.error || 'Failed to send test email',
                error: result.error,
                config: { host: config.host, port: config.port, user: config.user, from: config.from }
            }, { status: 400 });
        }

    } catch (err) {
        console.error('[API /api/admin/test-email Error]:', err);
        return NextResponse.json({
            success: false,
            message: err.message || 'Failed to dispatch test email'
        }, { status: 500 });
    }
}
