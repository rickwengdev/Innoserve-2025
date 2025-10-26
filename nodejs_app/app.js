const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const db = require('./config/database');

// 載入環境變數
dotenv.config();

// 路由引入
const userRoutes = require('./routes/userRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

const app = express();
const port = process.env.PORT || 3000;

// 中間件設置
app.use(cors()); // 允許跨來源請求
app.use(express.json()); // 解析 JSON 格式的請求主體
app.use(express.urlencoded({ extended: true })); // 解析 URL 編碼的請求主體
app.use(morgan('dev')); // HTTP 請求日誌

// 健康檢查端點（簡單版）
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// 健康檢查端點（API 版，包含資料庫）
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

// API 路由
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);

// 404 處理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 API endpoints:`);
    console.log(`   - Health: GET /health`);
    console.log(`   - Users: /api/users`);
    console.log(`   - Applications: /api/applications`);
});

// 優雅關閉處理
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

module.exports = app;