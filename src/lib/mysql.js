import mysql from 'mysql2/promise';

// Singleton pool using globalThis to survive Next.js hot-reloads in development.
// In production the module is loaded once, so globalThis guard is a no-op.
const GLOBAL_KEY = '__mysql_pool__';

function createPool() {
    return mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vaiyaaree_db',
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
        queueLimit: 0,
        decimalNumbers: true,
        dateStrings: true,
        timezone: 'Z'
    });
}

// Reuse the existing pool if it exists on globalThis (hot-reload safe),
// otherwise create a new one and attach it.
if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = createPool();
}

const pool = globalThis[GLOBAL_KEY];

/**
 * Execute a query with parameters against the MySQL connection pool.
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<[Array, any]>}
 */
export async function query(sql, params = []) {
    return await pool.query(sql, params);
}

/**
 * Get a single connection from the pool for transactions.
 * @returns {Promise<mysql.PoolConnection>}
 */
export async function getConnection() {
    return await pool.getConnection();
}

export default pool;
