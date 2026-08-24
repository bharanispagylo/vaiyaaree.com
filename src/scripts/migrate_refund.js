import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vaiyaaree_db',
    multipleStatements: true
  });

  const sqls = [
    `CREATE TABLE IF NOT EXISTS \`refund_requests\` (
      \`id\`                     VARCHAR(36) NOT NULL PRIMARY KEY,
      \`refund_id\`              VARCHAR(20) UNIQUE NOT NULL,
      \`order_id\`               VARCHAR(50) NOT NULL,
      \`order_item_id\`          VARCHAR(50) DEFAULT NULL,
      \`customer_id\`            VARCHAR(36) NOT NULL,
      \`reason\`                 VARCHAR(200) NOT NULL,
      \`customer_note\`          TEXT DEFAULT NULL,
      \`admin_note\`             TEXT DEFAULT NULL,
      \`requested_amount\`       DECIMAL(10,2) NOT NULL DEFAULT 0,
      \`approved_amount\`        DECIMAL(10,2) DEFAULT NULL,
      \`return_status\`          ENUM('RETURN_REQUIRED','CUSTOMER_SHIPPED','RETURN_RECEIVED','NOT_REQUIRED') DEFAULT 'RETURN_REQUIRED',
      \`refund_status\`          ENUM('REFUND_REQUESTED','UNDER_REVIEW','APPROVED','RETURN_REQUIRED','CUSTOMER_SHIPPED','RETURN_RECEIVED','REFUND_PROCESSING','REFUNDED','REJECTED','CANCELLED','REFUND_FAILED') NOT NULL DEFAULT 'REFUND_REQUESTED',
      \`requested_at\`           DATETIME DEFAULT NULL,
      \`approved_at\`            DATETIME DEFAULT NULL,
      \`received_at\`            DATETIME DEFAULT NULL,
      \`completed_at\`           DATETIME DEFAULT NULL,
      \`razorpay_payment_id\`    VARCHAR(100) DEFAULT NULL,
      \`razorpay_refund_id\`     VARCHAR(100) DEFAULT NULL,
      \`refund_gateway\`         VARCHAR(50) DEFAULT NULL,
      \`refund_gateway_status\`  VARCHAR(50) DEFAULT NULL,
      \`refund_initiated_at\`    DATETIME DEFAULT NULL,
      \`refund_processed_at\`    DATETIME DEFAULT NULL,
      \`refund_failed_at\`       DATETIME DEFAULT NULL,
      \`refund_failure_reason\`  TEXT DEFAULT NULL,
      \`created_at\`             DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS \`refund_shipments\` (
      \`id\`                  INT AUTO_INCREMENT PRIMARY KEY,
      \`refund_request_id\`   VARCHAR(36) NOT NULL,
      \`courier_company\`     VARCHAR(100) DEFAULT NULL,
      \`tracking_number\`     VARCHAR(100) DEFAULT NULL,
      \`shipping_date\`       DATE DEFAULT NULL,
      \`shipping_cost\`       DECIMAL(10,2) DEFAULT 0,
      \`receipt_url\`         VARCHAR(500) DEFAULT NULL,
      \`status\`              VARCHAR(50) DEFAULT 'CUSTOMER_SHIPPED',
      \`customer_notes\`      TEXT DEFAULT NULL,
      \`created_at\`          DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\`          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  try {
    for (const sql of sqls) {
      await conn.query(sql);
    }
    console.log('Migration SUCCESS: refund_requests and refund_shipments tables created.');
  } catch (err) {
    console.error('Migration ERROR:', err.message);
  } finally {
    await conn.end();
  }
}

migrate();
