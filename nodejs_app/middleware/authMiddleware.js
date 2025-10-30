/**
 * @fileoverview JWT 身份驗證中間件
 * 保護需要登入才能存取的 API 端點
 * 
 * 驗證流程：
 * 1. 從 HTTP Authorization header 提取 JWT token
 * 2. 驗證 token 的有效性與簽章
 * 3. 將解碼後的使用者資訊附加至 req.user
 * 4. 允許請求繼續處理或拒絕存取
 * 
 * @module middleware/authMiddleware
 * @requires jsonwebtoken
 * @author Rick
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');

/** JWT 簽章密鑰（應使用強隨機字串並存於環境變數） */
const SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ============================================================================
// JWT 驗證中間件
// ============================================================================

/**
 * 身份驗證中間件函式
 * 驗證 HTTP 請求中的 JWT token，確保使用者已登入
 * 
 * @function authenticate
 * @param {Request} req - Express 請求物件
 * @param {Response} res - Express 回應物件
 * @param {Function} next - Express 下一個中間件函式
 * @returns {void}
 * 
 * @description
 * 此中間件預期的 HTTP header 格式：
 * Authorization: Bearer <JWT_TOKEN>
 * 
 * 驗證成功後，req.user 將包含以下資訊：
 * - email: 使用者電子郵件
 * - username: 使用者名稱
 * 
 * @example
 * // 在路由中使用此中間件
 * const authMiddleware = require('./middleware/authMiddleware');
 * router.get('/profile', authMiddleware, (req, res) => {
 *   // req.user 已包含使用者資訊
 *   res.json({ user: req.user });
 * });
 * 
 * @example
 * // 客戶端請求範例（需在 header 帶入 token）
 * fetch('/api/applications', {
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *   }
 * });
 */
module.exports = (req, res, next) => {
    try {
        // ====================================================================
        // 步驟 1: 從 HTTP header 提取 Authorization 欄位
        // ====================================================================
        const authHeader = req.headers.authorization;
        
        // 檢查是否提供 token（格式必須為 "Bearer <token>"）
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided. Please login first.' 
            });
        }
        
        // ====================================================================
        // 步驟 2: 提取 JWT token（移除 "Bearer " 前綴）
        // ====================================================================
        const token = authHeader.split(' ')[1];
        
        // ====================================================================
        // 步驟 3: 驗證 token 的簽章與有效期限
        // ====================================================================
        const payload = jwt.verify(token, SECRET);
        
        // ====================================================================
        // 步驟 4: 將使用者資訊附加到 request 物件
        // ====================================================================
        // 後續的 controller 可透過 req.user 取得當前登入使用者的資訊
        // JWT 現在也包含 user_id（若有），方便以 user_id 建立 FK 關聯
        req.user = {
            email: payload.email,
            username: payload.username,
            user_id: payload.user_id
        };
        
        // ====================================================================
        // 步驟 5: 驗證成功，繼續處理請求
        // ====================================================================
        return next();
        
    } catch (err) {
        // ====================================================================
        // 錯誤處理：Token 過期
        // ====================================================================
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token has expired. Please login again.' 
            });
        }
        
        // ====================================================================
        // 錯誤處理：Token 格式錯誤或簽章無效
        // ====================================================================
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token. Please login again.' 
            });
        }
        
        // ====================================================================
        // 錯誤處理：其他未預期的驗證錯誤
        // ====================================================================
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication failed.' 
        });
    }
};