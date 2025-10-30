/**
 * @fileoverview MariaDB 資料庫連線池配置
 * 使用 mysql2/promise 提供 Promise-based 的資料庫操作介面
 * 
 * 連線池優勢：
 * - 重複使用資料庫連線，減少連線建立開銷
 * - 自動管理連線生命週期
 * - 支援高並發請求處理
 * 
 * @module config/database
 * @requires mysql2/promise
 * @author Rick
 * @version 1.0.0
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// ============================================================================
// 資料庫連線池配置
// ============================================================================

/**
 * MariaDB 連線池實例
 * 
 * 配置說明：
 * @property {string} host - 資料庫主機位址（預設：localhost）
 * @property {string} user - 資料庫使用者名稱（預設：root）
 * @property {string} password - 資料庫密碼（預設：password）
 * @property {string} database - 目標資料庫名稱（預設：app_db）
 * @property {number} port - 資料庫連接埠（預設：3306）
 * @property {boolean} waitForConnections - 當連線池滿時是否等待（true = 排隊等待）
 * @property {number} connectionLimit - 連線池最大連線數（10 個並發連線）
 * @property {number} queueLimit - 排隊等待連線的請求數上限（0 = 無限制）
 * 
 * @type {Pool}
 * 
 * @example
 * // 使用連線池執行查詢
 * const connection = await pool.getConnection();
 * try {
 *   const [rows] = await connection.query('SELECT * FROM users');
 *   console.log(rows);
 * } finally {
 *   connection.release(); // 務必釋放連線回連線池
 * }
 * 
 * @example
 * // 直接使用連線池執行（自動管理連線）
 * const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'app_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ============================================================================
// 連線池事件監聽（用於開發除錯）
// ============================================================================

/**
 * 監聽連線取得事件
 * 在開發環境中追蹤連線池使用狀況
 */
pool.on('acquire', (connection) => {
    if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Connection %d acquired', connection.threadId);
    }
});

/**
 * 監聽連線釋放事件
 * 確保連線正確歸還至連線池
 */
pool.on('release', (connection) => {
    if (process.env.NODE_ENV === 'development') {
        console.log('🔓 Connection %d released', connection.threadId);
    }
});

/**
 * 監聽連線入隊事件
 * 當連線池滿載時，新請求會進入等待佇列
 */
pool.on('enqueue', () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('⏳ Waiting for available connection slot');
    }
});

module.exports = pool;