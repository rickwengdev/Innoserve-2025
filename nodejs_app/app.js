/**
 * @fileoverview Innoserve 職業傷害申請系統主應用程式
 * Express.js 後端伺服器，提供 RESTful API 服務
 * 包含使用者管理與申請案件處理功能
 * 
 * @author Innoserve Development Team
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const db = require('./config/database');

// 載入環境變數配置
dotenv.config();

// 路由模組引入
const userRoutes = require('./routes/userRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

const app = express();
const port = process.env.PORT || 3000;

// ============================================================================
// 中間件配置
// ============================================================================

/** 啟用 CORS，允許跨來源請求 */
app.use(cors());

/** 解析 JSON 格式的請求主體 */
app.use(express.json());

/** 解析 URL 編碼的請求主體（支援表單提交） */
app.use(express.urlencoded({ extended: true }));

/** HTTP 請求日誌記錄（開發模式） */
app.use(morgan('dev'));

// ============================================================================
// 健康檢查端點
// ============================================================================

/**
 * 簡易健康檢查端點
 * 快速確認伺服器是否正常運行
 * 
 * @route GET /health
 * @returns {object} 200 - 伺服器運行狀態
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * 完整健康檢查端點
 * 包含資料庫連線狀態與回應時間
 * 
 * @route GET /api/health
 * @returns {object} 200 - 所有服務正常
 * @returns {object} 503 - 部分服務異常（降級運行）
 */
app.get('/api/health', async (req, res) => {
  const started = Date.now();
  const health = {
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: 'unknown'
      }
    }
  };

  // 檢查資料庫連線狀態
  try {
    const t0 = Date.now();
    const conn = await db.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    health.services.database = {
      status: 'ok',
      responseTimeMs: Date.now() - t0
    };
  } catch (err) {
    health.success = false;
    health.status = 'degraded';
    health.services.database = {
      status: 'error',
      message: err.message
    };
    return res.status(503).json(health);
  }

  health.responseTimeMs = Date.now() - started;
  return res.status(200).json(health);
});

// ============================================================================
// API 路由註冊
// ============================================================================

/** 使用者管理相關 API（註冊、登入、個人資料） */
app.use('/api/users', userRoutes);

/** 申請案件管理相關 API（建立、查詢、更新、PDF 生成） */
app.use('/api/applications', applicationRoutes);

// ============================================================================
// 錯誤處理
// ============================================================================

/**
 * 404 錯誤處理
 * 當請求的 API 端點不存在時返回此錯誤
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

/**
 * 全域錯誤處理中間件
 * 捕獲所有未處理的錯誤並返回適當的 HTTP 回應
 * 
 * @param {Error} err - 錯誤物件
 * @param {Request} req - Express 請求物件
 * @param {Response} res - Express 回應物件
 * @param {Function} next - 下一個中間件函式
 */
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    // 僅在開發環境顯示詳細錯誤堆疊
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============================================================================
// 伺服器啟動
// ============================================================================

/**
 * 啟動 HTTP 伺服器並監聽指定端口
 */
const server = app.listen(port, () => {
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - Health: GET /health`);
  console.log(`   - Users: /api/users`);
  console.log(`   - Applications: /api/applications`);
});

// ============================================================================
// 優雅關閉處理
// ============================================================================

/**
 * 處理 SIGTERM 信號（Docker/Kubernetes 關閉信號）
 * 確保所有正在處理的請求完成後再關閉伺服器
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

/**
 * 處理 SIGINT 信號（Ctrl+C 中斷信號）
 * 立即關閉伺服器並退出程序
 */
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;