import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

console.log('[TEST DB] Host:', process.env.DB_HOST);
console.log('[TEST DB] Port:', process.env.DB_PORT);
console.log('[TEST DB] User:', process.env.DB_USER);
console.log('[TEST DB] Database:', process.env.DB_NAME);

async function testConnection(config, name) {
    console.log(`\n--- Testing ${name} (${config.host}:${config.port}) ---`);
    try {
        const pool = mysql.createPool({
            ...config,
            connectTimeout: 5000
        });
        const [rows] = await pool.query('SELECT 1 AS connected');
        console.log(` SUCCESS (${name}):`, rows);
        
        try {
            const [settings] = await pool.query('SELECT COUNT(*) as count FROM app_settings');
            console.log(` app_settings count:`, settings[0].count);
        } catch (e) {
            console.log(` app_settings query error:`, e.message);
        }

        try {
            const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
            console.log(` products count:`, products[0].count);
        } catch (e) {
            console.log(` products count:`, products[0].count);
        }

        await pool.end();
    } catch (err) {
        console.error(` FAILED (${name}):`, {
            code: err.code,
            message: err.message,
            syscall: err.syscall,
            address: err.address,
            port: err.port
        });
    }
}

async function run() {
    // Test 1: From .env
    await testConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vaiyaaree_db',
    }, '.env config');

    // Test 2: Localhost root
    await testConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'vaiyaaree_db',
    }, '127.0.0.1 root');

    // Test 3: Remote host 68.178.145.3
    await testConnection({
        host: '68.178.145.3',
        port: 3306,
        user: 'vaiyaaree_user',
        password: '2GKrosr75AIp',
        database: 'vaiyaaree_db',
    }, '68.178.145.3 remote');
}

run();
