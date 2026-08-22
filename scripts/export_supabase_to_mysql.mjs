import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fmqgrqxjsoidmyafeavk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtcWdycXhqc29pZG15YWZlYXZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM4NTA3OCwiZXhwIjoyMDg2OTYxMDc4fQ.IvgWY8Mu240T4NjpBPwvwHdER-mckkBqUdmMJhIEPTU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TABLES = [
    'app_settings',
    'admin_users',
    'categories',
    'cms_pages',
    'couriers',
    'customers',
    'customer_addresses',
    'discounts',
    'invoices',
    'media',
    'media_files',
    'products',
    'product_variants',
    'product_history',
    'product_reviews',
    'orders',
    'order_items',
    'order_status_logs',
    'order_status_history',
    'otps',
    'refunds',
    'returns',
    'shipping_zones',
    'shipping_zone_mappings',
    'whatsapp_cart',
    'whatsapp_logs',
    'whatsapp_sessions'
];

function escapeSqlValue(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'number') return isFinite(val) ? String(val) : 'NULL';
    if (typeof val === 'object') {
        const jsonStr = JSON.stringify(val);
        return `'${jsonStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }
    const str = String(val);
    return `'${str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function inferMySqlType(key, sampleValues) {
    const nonNull = sampleValues.filter(v => v !== null && v !== undefined);
    if (nonNull.length === 0) return 'TEXT NULL';

    if (key.toLowerCase() === 'id') {
        const sample = String(nonNull[0]);
        if (/^\d+$/.test(sample)) return 'VARCHAR(100) NOT NULL PRIMARY KEY';
        return 'VARCHAR(100) NOT NULL PRIMARY KEY';
    }

    const first = nonNull[0];
    if (typeof first === 'boolean') return 'TINYINT(1) DEFAULT 0';
    if (typeof first === 'number') {
        const isFloat = nonNull.some(v => typeof v === 'number' && !Number.isInteger(v));
        return isFloat ? 'DECIMAL(12,2) DEFAULT 0.00' : 'BIGINT DEFAULT 0';
    }
    if (typeof first === 'object') {
        return 'JSON NULL';
    }

    const allDates = nonNull.every(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v));
    if (allDates || key.endsWith('_at') || key.endsWith('_date')) {
        return 'DATETIME NULL';
    }

    const maxLen = Math.max(...nonNull.map(v => String(v).length));
    if (maxLen > 255) return 'LONGTEXT NULL';
    return 'VARCHAR(255) NULL';
}

async function run() {
    console.log('🚀 Connecting to Supabase at:', SUPABASE_URL);
    let sqlOutput = `-- ========================================================\n`;
    sqlOutput += `-- VAIYAAREE DATABASE BACKUP / EXPORT FOR MYSQL (XAMPP)\n`;
    sqlOutput += `-- Exported from Supabase on: ${new Date().toISOString()}\n`;
    sqlOutput += `-- Target DB: vaiyaaree_db\n`;
    sqlOutput += `-- ========================================================\n\n`;
    sqlOutput += `CREATE DATABASE IF NOT EXISTS \`vaiyaaree_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
    sqlOutput += `USE \`vaiyaaree_db\`;\n\n`;
    sqlOutput += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    const summary = [];

    for (const table of TABLES) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(5000);
            if (error) {
                // Table might not exist in this instance
                continue;
            }

            console.log(`📦 Found table: [${table}] - Records: ${data ? data.length : 0}`);

            // Generate Schema DDL
            if (!data || data.length === 0) {
                // Empty table, skip or create minimal
                continue;
            }

            const columns = Object.keys(data[0]);
            sqlOutput += `-- --------------------------------------------------------\n`;
            sqlOutput += `-- Table structure for \`${table}\`\n`;
            sqlOutput += `-- --------------------------------------------------------\n`;
            sqlOutput += `DROP TABLE IF EXISTS \`${table}\`;\n`;
            sqlOutput += `CREATE TABLE \`${table}\` (\n`;

            const colDefs = columns.map(col => {
                const sampleVals = data.map(row => row[col]);
                const sqlType = inferMySqlType(col, sampleVals);
                return `  \`${col}\` ${sqlType}`;
            });

            sqlOutput += colDefs.join(',\n');
            sqlOutput += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

            // Generate Inserts
            if (data.length > 0) {
                sqlOutput += `-- Dumping data for table \`${table}\` (${data.length} records)\n`;
                const colList = columns.map(c => `\`${c}\``).join(', ');
                
                // Batch inserts in groups of 50
                for (let i = 0; i < data.length; i += 50) {
                    const chunk = data.slice(i, i + 50);
                    const valRows = chunk.map(row => {
                        const rowVals = columns.map(col => {
                            let val = row[col];
                            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
                                val = val.replace('T', ' ').replace('Z', '').split('.')[0];
                            }
                            return escapeSqlValue(val);
                        });
                        return `(${rowVals.join(', ')})`;
                    });

                    sqlOutput += `INSERT INTO \`${table}\` (${colList}) VALUES\n${valRows.join(',\n')};\n`;
                }
                sqlOutput += `\n`;
            }

            summary.push({ table, records: data.length });
        } catch (err) {
            console.error(`Error processing table ${table}:`, err.message);
        }
    }

    sqlOutput += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const outPath = path.join(process.cwd(), 'vaiyaaree_db_mysql_dump.sql');
    fs.writeFileSync(outPath, sqlOutput, 'utf8');

    console.log(`\n Export completed successfully!`);
    console.log(` Saved SQL dump to: ${outPath}`);
    console.log(`\n--- SUMMARY OF EXPORTED TABLES ---`);
    console.table(summary);

    // Optional: Try importing directly into local MySQL if mysql2 is available
    try {
        const mysql = await import('mysql2/promise');
        console.log(`\n Connecting directly to local XAMPP MySQL (127.0.0.1:3306)...`);
        const connection = await mysql.default.createConnection({
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            password: '',
            multipleStatements: true
        });

        console.log(`⚡ Executing SQL dump into local MySQL database [vaiyaaree_db]...`);
        await connection.query(sqlOutput);
        await connection.end();
        console.log(` ALL TABLES & DATA IMPORTED DIRECTLY INTO XAMPP [vaiyaaree_db] SUCCESSFULLY! `);
    } catch (dbErr) {
        console.log(`\nNote: Direct MySQL connection: ${dbErr.message}`);
        console.log(`You can now also import 'vaiyaaree_db_mysql_dump.sql' in phpMyAdmin -> Import tab!`);
    }
}

run();
