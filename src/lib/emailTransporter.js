import nodemailer from 'nodemailer';
import { mysqlClient } from './mysqlClient.js';

let cachedTransporter = null;
let cachedConfigKey = '';

/**
 * Fetch dynamic SMTP configuration from app_settings with .env fallback
 */
export async function getSmtpConfig() {
    let host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    let port = parseInt(process.env.SMTP_PORT || '587', 10);
    let secure = process.env.SMTP_SECURE === 'true' || port === 465;
    let user = (process.env.SMTP_USER || '').trim();
    let pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
    let from = (process.env.SMTP_FROM || process.env.SMTP_FROM_EMAIL || `"Vaiyaaree Sarees" <${user || 'no-reply@vaiyaaree.com'}>`).trim();

    try {
        const { data: settings } = await mysqlClient.from('app_settings').select('*');
        if (settings && Array.isArray(settings)) {
            settings.forEach(s => {
                if (s.key === 'smtp_host' && s.value) host = s.value.trim();
                if (s.key === 'smtp_port' && s.value) {
                    port = parseInt(s.value.trim(), 10);
                    secure = port === 465;
                }
                if (s.key === 'smtp_user' && s.value) user = s.value.trim();
                if (s.key === 'smtp_pass' && s.value) pass = s.value.trim().replace(/\s+/g, '');
                if (s.key === 'smtp_from' && s.value) from = s.value.trim();
            });
        }
    } catch (err) {
        // Fallback to env vars
    }

    return { host, port, secure, user, pass, from };
}

/**
 * Get or initialize a reusable Nodemailer transporter instance
 */
export async function getTransporter() {
    const config = await getSmtpConfig();
    const configKey = `${config.host}:${config.port}:${config.user}:${config.pass}`;

    if (cachedTransporter && cachedConfigKey === configKey) {
        return { transporter: cachedTransporter, config };
    }

    if (!config.user || !config.pass) {
        return { transporter: null, config };
    }

    cachedTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass
        },
        tls: {
            rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 10000
    });

    cachedConfigKey = configKey;
    return { transporter: cachedTransporter, config };
}

/**
 * Verify SMTP connection and authentication
 */
export async function verifySmtpConnection() {
    const { transporter, config } = await getTransporter();

    if (!transporter) {
        return {
            success: false,
            message: 'SMTP credentials not configured in app_settings or .env'
        };
    }

    try {
        await transporter.verify();
        console.log(`[EMAIL] SMTP connection verified successfully for ${config.user}`);
        return {
            success: true,
            message: `SMTP connection verified for ${config.user} (${config.host}:${config.port})`
        };
    } catch (err) {
        console.error('[EMAIL] SMTP verification failed:', err);
        return {
            success: false,
            message: err.message
        };
    }
}

export default getTransporter;
