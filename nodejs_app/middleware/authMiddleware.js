const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * 身份驗證中間件
 * 驗證 JWT token 並將使用者資訊附加到 req.user
 */
module.exports = (req, res, next) => {
    try {
        // 從 header 取得 authorization
        const authHeader = req.headers.authorization;
        
        // 檢查是否有 token
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided. Please login first.' 
            });
        }
        
        // 提取 token
        const token = authHeader.split(' ')[1];
        
        // 驗證 token
        const payload = jwt.verify(token, SECRET);
        
        // 將使用者資訊附加到 request
        req.user = {
            email: payload.email,
            username: payload.username
        };
        
        // 繼續處理請求
        return next();
    } catch (err) {
        // Token 過期
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token has expired. Please login again.' 
            });
        }
        
        // Token 無效
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token. Please login again.' 
            });
        }
        
        // 其他錯誤
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication failed.' 
        });
    }
};