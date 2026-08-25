import { NextResponse } from 'next/server';
import { sendEmail, getSmtpConfig } from '@/lib/emailService';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const recipient = body.recipient || body.to || 'vaiyaaree@gmail.com';

        const config = await getSmtpConfig();

        if (!config.user || !config.pass) {
            return NextResponse.json({
                success: false,
                status: 'LOGGED_ONLY',
                message: 'SMTP credentials are not configured. Please configure SMTP User & App Password in Admin Settings or .env file.',
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

        const result = await sendEmail({
            to: recipient,
            subject: 'Vaiyaaree Sarees — SMTP Test Email Connection',
            html: testHtml
        });

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
