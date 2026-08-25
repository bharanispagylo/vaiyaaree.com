import mysql from 'mysql2/promise';

// Singleton pool using globalThis to survive Next.js hot-reloads in development.
const GLOBAL_KEY = '__mysql_pool__';

function createPool() {
    const host = process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST || '127.0.0.1';
    const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || '3306', 10);
    const user = process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER || 'root';
    const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
    const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || process.env.MYSQL_DB || 'vaiyaaree_db';
    const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || process.env.MYSQL_CONNECTION_LIMIT || '10', 10);

    console.log('[MYSQL CONFIG]', {
        host,
        port,
        user,
        database,
        connectionLimit
    });

    return mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit,
        queueLimit: 0,
        decimalNumbers: true,
        dateStrings: true,
        timezone: 'Z',
        connectTimeout: 10000
    });
}

// Reuse the existing pool if it exists on globalThis (hot-reload safe)
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
    try {
        return await pool.query(sql, params);
    } catch (err) {
        console.error('[MYSQL POOL QUERY ERROR]', {
            code: err.code,
            message: err.message,
            errno: err.errno,
            syscall: err.syscall,
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || '3306',
            database: process.env.DB_NAME || 'vaiyaaree_db'
        });
        throw err;
    }
}

/**
 * Get a single connection from the pool for transactions.
 * @returns {Promise<mysql.PoolConnection>}
 */
export async function getConnection() {
    return await pool.getConnection();
}

export default pool;
