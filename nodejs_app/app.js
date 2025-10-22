// 排程與資料獲取
const cron = require('node-cron');

// Express 伺服器相關
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const userRoutes = require('./routes/userRoutes');
const applicationRouter = require('./routes/applicationRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // 允許跨來源請求
app.use(express.json()); // 解析 JSON 格式的請求主體
app.use(morgan('dev')); // HTTP 請求日誌
app.use('/api/applications', applicationRouter);
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: '伺服器發生未預期的錯誤!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

app.listen(port, () => {
    console.log(`🚀 Web 伺服器已啟動，正在監聽 http://localhost:${port}`);
});

