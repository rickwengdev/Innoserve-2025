/**
 * @fileoverview 使用者管理控制器
 * 處理使用者相關的 HTTP 請求，包含註冊、登入、個人資料管理、密碼修改
 * 
 * 控制器職責：
 * - 接收並驗證 HTTP 請求參數
 * - 呼叫 Service 層處理業務邏輯
 * - 格式化 HTTP 回應（統一的 JSON 格式）
 * - 處理錯誤並回傳適當的 HTTP 狀態碼
 * 
 * @module controllers/userController
 * @requires services/userService
 * @author Innoserve Development Team
 * @version 1.0.0
 */

const userService = require('../services/userService');

// ============================================================================
// 使用者註冊與認證
// ============================================================================

/**
 * 使用者註冊處理器
 * 處理新使用者的註冊請求，建立帳號並回傳 JWT token
 * 
 * @async
 * @function register
 * @param {Request} req - Express 請求物件
 * @param {Object} req.body - 請求主體
 * @param {string} req.body.email - 電子郵件（必填，唯一）
 * @param {string} req.body.password - 密碼（必填，至少 6 字元）
 * @param {string} req.body.username - 使用者姓名（必填）
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的註冊結果
 * 
 * @example
 * // Request body
 * {
 *   "email": "test@example.com",
 *   "password": "password123",
 *   "username": "王小明"
 * }
 * 
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "user": { "user_id": 1, "email": "test@example.com", "username": "王小明" },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
exports.register = async (req, res) => {
    try {
        const result = await userService.registerUser(req.body);
        // 將回應扁平化：token 與 user 在頂層，避免前端需要 data.data.token
        const { token, ...user } = result;
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user,
            token
        });
    } catch (error) {
        console.error('Register error:', error.message);
        // 檢查是否為重複 email 錯誤
        if (error.message.includes('Duplicate entry') || error.message.includes('duplicate')) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * 使用者登入處理器
 * 驗證使用者帳號密碼，成功後回傳使用者資訊與 JWT token
 * 
 * @async
 * @function login
 * @param {Request} req - Express 請求物件
 * @param {Object} req.body - 請求主體
 * @param {string} req.body.email - 電子郵件
 * @param {string} req.body.password - 密碼
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的登入結果
 * 
 * @example
 * // Request body
 * {
 *   "email": "test@example.com",
 *   "password": "password123"
 * }
 * 
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "user": { "user_id": 1, "email": "test@example.com", ... },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 驗證必填欄位
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        const { user, token } = await userService.authenticateUser(email, password);
        // 扁平化回應，避免 data.data.token
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user,
            token
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * 驗證 Token 有效性處理器
 * 檢查當前的 JWT token 是否仍然有效
 * 
 * @async
 * @function verifyToken
 * @param {Request} req - Express 請求物件
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的驗證結果
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Token is valid",
 *   "data": { "email": "test@example.com" }
 * }
 */
exports.verifyToken = async (req, res) => {
    try {
        // 如果能通過 auth middleware，token 就是有效的
        res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: {
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Verify token error:', error.message);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// ============================================================================
// 個人資料管理
// ============================================================================

/**
 * 取得個人資料處理器
 * 取得當前登入使用者的完整個人資料
 * 
 * @async
 * @function getProfile
 * @param {Request} req - Express 請求物件
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的使用者資料
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "user_id": 1,
 *     "email": "test@example.com",
 *     "username": "王小明",
 *     "DOB": "1990-01-01",
 *     "ID_number": "A123456789",
 *     ...
 *   }
 * }
 */
exports.getProfile = async (req, res) => {
    try {
        const email = req.user.email;
        const user = await userService.getUserByEmail(email);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * 更新個人資料處理器
 * 更新當前登入使用者的個人資訊（不包含密碼）
 * 
 * @async
 * @function updateProfile
 * @param {Request} req - Express 請求物件
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Object} req.body - 請求主體（要更新的欄位）
 * @param {string} [req.body.username] - 使用者姓名
 * @param {string} [req.body.DOB] - 出生日期
 * @param {string} [req.body.ID_number] - 身分證字號
 * @param {string} [req.body.ZIP_code] - 郵遞區號
 * @param {string} [req.body.useraddress] - 住址
 * @param {string} [req.body.home_telephone] - 家用電話
 * @param {string} [req.body.telephone] - 行動電話
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的更新結果
 * 
 * @example
 * // Request body
 * {
 *   "username": "王大明",
 *   "telephone": "0912345678"
 * }
 * 
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Profile updated successfully",
 *   "data": { "user_id": 1, "email": "test@example.com", ... }
 * }
 */
exports.updateProfile = async (req, res) => {
    try {
        const email = req.user.email;
        
        // 防止更新敏感欄位（安全考量）
        const { password, password_hash, ...updateData } = req.body;
        
        const result = await userService.updateUserProfile(email, updateData);
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Update profile error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================================
// 密碼管理
// ============================================================================

/**
 * 修改密碼處理器
 * 驗證當前密碼後，將使用者密碼更新為新密碼
 * 
 * @async
 * @function changePassword
 * @param {Request} req - Express 請求物件
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Object} req.body - 請求主體
 * @param {string} req.body.currentPassword - 當前密碼（用於驗證身份）
 * @param {string} req.body.newPassword - 新密碼（至少 6 字元）
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的修改結果
 * 
 * @example
 * // Request body
 * {
 *   "currentPassword": "oldPassword123",
 *   "newPassword": "newPassword456"
 * }
 * 
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Password changed successfully"
 * }
 */
exports.changePassword = async (req, res) => {
    try {
        const email = req.user.email;
        const { currentPassword, newPassword } = req.body;
        
        // 驗證必填欄位
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        // 驗證新密碼長度
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }
        
        await userService.changePassword(email, currentPassword, newPassword);
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
