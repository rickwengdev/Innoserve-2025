const applicationService = require('../services/applicationService');

// 將函式改為 async 函式，以便使用 await
exports.submit = async (req, res) => {
    try {
        // 等待 Service 層處理完畢
        const result = await applicationService.submit(req.body);
        // 使用 201 Created 狀態碼表示資源已成功建立
        res.status(201).json({ success: true, ...result });
    } catch (error) {
        console.error('Controller 捕捉到錯誤:', error.message);
        // 根據 Service 層設定的狀態碼回傳，如果沒有則預設為 500
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ success: false, message: error.message || '伺服器內部錯誤' });
    }
};
