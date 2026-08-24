import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) process.env[k] = envConfig[k];
}

async function main() {
    console.log('Connecting to MySQL database:', process.env.DB_NAME || 'vaiyaaree_db');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'vaiyaaree_db',
    });

    console.log('Connected to MySQL!');

    // 1. Deduplicate app_settings by keeping the row with highest/latest updated_at for each key
    console.log('Deduplicating `app_settings` table rows...');
    await connection.query(`
        DELETE t1 FROM app_settings t1
        INNER JOIN app_settings t2 
        WHERE t1.key = t2.key 
          AND (
            t1.updated_at < t2.updated_at 
            OR (t1.updated_at = t2.updated_at AND t1.value = '')
            OR (t1.updated_at IS NULL AND t2.updated_at IS NOT NULL)
          )
    `);

    // In case there are exact duplicate rows remaining
    await connection.query(`
        CREATE TABLE app_settings_temp AS 
        SELECT \`key\`, \`value\`, \`description\`, \`updated_at\`
        FROM (
            SELECT \`key\`, \`value\`, \`description\`, \`updated_at\`,
                   ROW_NUMBER() OVER(PARTITION BY \`key\` ORDER BY COALESCE(updated_at, '1970-01-01') DESC, LENGTH(COALESCE(value, '')) DESC) as rn
            FROM app_settings
            WHERE \`key\` IS NOT NULL AND TRIM(\`key\`) != ''
        ) tmp
        WHERE rn = 1;
    `);

    await connection.query(`DROP TABLE app_settings;`);
    await connection.query(`
        CREATE TABLE app_settings (
            \`key\` VARCHAR(255) NOT NULL PRIMARY KEY,
            \`value\` LONGTEXT DEFAULT NULL,
            \`description\` VARCHAR(255) DEFAULT NULL,
            \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
        INSERT INTO app_settings (\`key\`, \`value\`, \`description\`, \`updated_at\`)
        SELECT \`key\`, \`value\`, \`description\`, \`updated_at\` FROM app_settings_temp;
    `);

    await connection.query(`DROP TABLE app_settings_temp;`);

    console.log('✓ Successfully deduplicated and set `key` as PRIMARY KEY on `app_settings` table!');

    const [rows] = await connection.query('SELECT `key`, LEFT(`value`, 60) as val, `updated_at` FROM app_settings');
    console.log(`Current \`app_settings\` table rows (Count: ${rows.length}):`);
    console.table(rows);

    await connection.end();
}

main().catch(err => {
    console.error('Migration Error:', err);
    process.exit(1);
});
