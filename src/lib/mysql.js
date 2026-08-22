import mysql from 'mysql2/promise';

const pool = mysql.createPool({
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
