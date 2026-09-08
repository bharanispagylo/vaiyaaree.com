import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) process.env[k] = envConfig[k];
}

async function main() {
    console.log('--- Connecting to MySQL ---');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vaiyaaree_updated',
    });

    const databases = ['vaiyaaree_updated', 'vaiyaaree_db'];

    const smtpSettings = [
        { key: 'smtp_host', value: process.env.SMTP_HOST || 'smtp.gmail.com', description: 'SMTP Host Server' },
        { key: 'smtp_port', value: process.env.SMTP_PORT || '587', description: 'SMTP Port (587 or 465)' },
        { key: 'smtp_user', value: process.env.SMTP_USER || '', description: 'SMTP Username / Email' },
        { key: 'smtp_pass', value: (process.env.SMTP_PASS || '').replace(/\s+/g, ''), description: 'SMTP Password / App Password' },
        { key: 'smtp_from', value: process.env.SMTP_FROM || `"Vaiyaaree Sarees" <${process.env.SMTP_USER}>`, description: 'Default Sender Address' }
    ];

    for (const db of databases) {
        try {
            console.log(`\nInserting/updating SMTP settings in \`${db}\`.app_settings table...`);
            await connection.query(`USE \`${db}\``);
            for (const item of smtpSettings) {
                await connection.query(`
                    INSERT INTO \`app_settings\` (\`key\`, \`value\`, \`description\`, \`updated_at\`)
                    VALUES (?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`description\` = VALUES(\`description\`), \`updated_at\` = NOW()
                `, [item.key, item.value, item.description]);
                console.log(`✓ [${db}] Set ${item.key} = ${item.key === 'smtp_pass' ? '********' : item.value}`);
            }
        } catch (e) {
            console.warn(`Could not sync to ${db}:`, e.message);
        }
    }

    console.log('\n--- Verifying SMTP with Nodemailer ---');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '')
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        await transporter.verify();
        console.log('✅ Nodemailer SMTP verification succeeded!');
    } catch (err) {
        console.error('❌ Nodemailer SMTP verification failed:', err);
    }

    await connection.end();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
