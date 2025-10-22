const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',      // MariaDB 主機
    user: process.env.DB_USER || 'root',           // MariaDB 使用者
    password: process.env.DB_PASSWORD || 'password', // MariaDB 密碼
    database: process.env.DB_NAME || 'app_db',     // MariaDB 資料庫
    port: process.env.DB_PORT || 3306,             // MariaDB 預設 port
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;