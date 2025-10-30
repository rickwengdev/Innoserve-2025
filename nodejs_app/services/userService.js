/**
 * @fileoverview 使用者業務邏輯服務
 * 處理使用者相關的業務邏輯，包含註冊、登入、個人資料管理、密碼管理
 * 
 * 核心功能：
 * - 使用者註冊與 email 驗證
 * - 密碼加密與驗證（bcrypt）
 * - JWT token 生成與驗證
 * - 個人資料 CRUD 操作（透過 Model 層）
 * - 密碼修改功能
 * 
 * 架構說明：
 * Service 層負責業務邏輯（驗證、加密、JWT），呼叫 Model 層進行資料存取
 * 
 * @module services/userService
 * @requires model/userModel
 * @requires bcrypt
 * @requires jsonwebtoken
 * @author Rick
 * @version 1.0.0
 */

const UserModel = require('../model/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ============================================================================
// 安全配置常數
// ============================================================================

/** JWT 簽章密鑰（建議從環境變數載入） */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/** JWT Token 有效期限（24 小時） */
const JWT_EXPIRES_IN = '24h';

/** bcrypt 加密強度（salt rounds） */
const SALT_ROUNDS = 10;

// ============================================================================
// 使用者業務邏輯服務類別
// ============================================================================

/**
 * 使用者業務邏輯服務類別
 * 提供使用者相關的所有業務邏輯處理
 * 
 * @class UserService
 */
class UserService {
    // ========================================================================
    // 註冊與認證
    // ========================================================================

    /**
     * 註冊新使用者
     * 驗證輸入資料、檢查 email 唯一性、加密密碼並建立使用者帳號
     * 
     * @async
     * @param {Object} userData - 使用者註冊資料
     * @param {string} userData.email - 電子郵件（必填，唯一）
     * @param {string} userData.password - 密碼（必填，至少 6 字元）
     * @param {string} userData.username - 使用者姓名（必填）
    * 注意：依新 schema，個人詳細資料改由 applications 表承載。
     * 
     * @returns {Promise<Object>} 註冊結果（包含 user_id, email, username, token）
     * @throws {Error} 註冊失敗（缺少必填欄位、email 格式錯誤、email 已存在、密碼過短）
     * 
     * @example
     * const result = await userService.registerUser({
     *   email: 'test@example.com',
     *   password: 'password123',
     *   username: '王小明'
     * });
     * console.log('註冊成功，Token:', result.token);
     */
    async registerUser(userData) {
        try {
            // 驗證必填欄位
            const requiredFields = ['email', 'password', 'username'];
            for (const field of requiredFields) {
                if (!userData[field]) {
                    throw new Error(`${field} is required`);
                }
            }
            
            // 驗證 email 格式
            if (!this._isValidEmail(userData.email)) {
                throw new Error('Invalid email format');
            }
            
            // 驗證密碼長度
            if (userData.password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            
            // 檢查 email 是否已存在
            const existingUser = await UserModel.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Email already exists');
            }
            
            // Hash password（使用 bcrypt 加密）
            userData.password_hash = await bcrypt.hash(userData.password, SALT_ROUNDS);
            delete userData.password; // 刪除明文密碼，確保安全
            
            const user = new UserModel(userData);
            const result = await user.create();
            
            // 生成 JWT token
            const newUserId = result[0].insertId;
            const token = this._generateToken({ email: userData.email, username: userData.username, user_id: newUserId });
            
            return {
                user_id: newUserId,
                email: userData.email,
                username: userData.username,
                token
            };
        } catch (error) {
            throw new Error('User registration failed: ' + error.message);
        }
    }

    /**
     * 使用者登入驗證
     * 驗證使用者的電子郵件與密碼，成功後回傳使用者資訊與 JWT token
     * 
     * @async
     * @param {string} email - 使用者電子郵件
     * @param {string} password - 使用者密碼
     * 
     * @returns {Promise<Object>} 登入結果（包含 user 物件與 token）
     * @returns {Object} result.user - 使用者資料（排除密碼）
     * @returns {string} result.token - JWT token
     * @throws {Error} 驗證失敗（email 不存在或密碼錯誤）
     * 
     * @example
     * const result = await userService.authenticateUser('test@example.com', 'password123');
     * console.log('登入成功:', result.user.username);
     * console.log('Token:', result.token);
     */
    async authenticateUser(email, password) {
        try {
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }
            
            // 使用 bcrypt 比對密碼
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) {
                throw new Error('Invalid email or password');
            }
            
            // 生成 JWT token（user 物件中應包含 user_id, email, username）
            const token = this._generateToken(user);
            
            // 回傳使用者資訊和 token（排除敏感資訊）
            return {
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    username: user.username
                },
                token
            };
        } catch (error) {
            throw new Error('Authentication failed: ' + error.message);
        }
    }

    // ========================================================================
    // 個人資料管理
    // ========================================================================

    /**
     * 根據 email 取得使用者資料
     * 透過 Model 層查詢使用者的完整資料（排除密碼欄位）
     * 
     * @async
     * @param {string} email - 使用者電子郵件
     * 
    * @returns {Promise<Object>} 使用者資料物件（不包含 password_hash）
     * @throws {Error} 使用者不存在
     * 
     * @example
     * const user = await userService.getUserByEmail('test@example.com');
     * console.log('使用者姓名:', user.username);
     */
    async getUserByEmail(email) {
        try {
            // 使用 Model 層查詢資料
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            
            // 業務邏輯：只返回基本欄位
            return {
                user_id: user.user_id,
                email: user.email,
                username: user.username
            };
        } catch (error) {
            throw new Error('Get user failed: ' + error.message);
        }
    }

    /**
     * 更新使用者個人資料
     * 透過 Model 層更新使用者的個人資訊（不包含 email 與密碼）
     * 
     * @async
     * @param {string} email - 使用者電子郵件（識別碼）
     * @param {Object} userData - 要更新的資料物件
    * @param {string} [userData.username] - 使用者姓名
     * 
     * @returns {Promise<Object>} 更新後的使用者資料
     * @throws {Error} 使用者不存在或更新失敗
     * 
     * @example
     * const updatedUser = await userService.updateUserProfile('test@example.com', {
     *   username: '王大明',
     *   telephone: '0912345678'
     * });
     */
    async updateUserProfile(email, userData) {
        try {
            // 只允許更新 username；忽略其他欄位（這些欄位已移至 applications）
            const { password, password_hash, username } = userData;
            
            // 業務邏輯：檢查使用者是否存在
            const existingUser = await UserModel.findByEmail(email);
            if (!existingUser) {
                throw new Error('User not found');
            }
            
            // 使用 Model 層更新資料
            const user = new UserModel({ email, username });
            await user.update();
            
            // 返回更新後的使用者資料
            return await this.getUserByEmail(email);
        } catch (error) {
            throw new Error('Profile update failed: ' + error.message);
        }
    }

    // ========================================================================
    // 密碼管理
    // ========================================================================

    /**
     * 修改使用者密碼
     * 驗證當前密碼後，透過 Model 層將使用者密碼更新為新密碼
     * 
     * @async
     * @param {string} email - 使用者電子郵件
     * @param {string} currentPassword - 當前密碼（用於驗證身份）
     * @param {string} newPassword - 新密碼
     * 
     * @returns {Promise<boolean>} 密碼修改成功回傳 true
     * @throws {Error} 使用者不存在、當前密碼錯誤或更新失敗
     * 
     * @example
     * await userService.changePassword('test@example.com', 'oldPass123', 'newPass456');
     * console.log('密碼修改成功');
     */
    async changePassword(email, currentPassword, newPassword) {
        try {
            // 業務邏輯：驗證當前密碼
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            
            const match = await bcrypt.compare(currentPassword, user.password_hash);
            if (!match) {
                throw new Error('Current password is incorrect');
            }
            
            // 業務邏輯：Hash 新密碼
            const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            
            // 使用 Model 層更新密碼
            await UserModel.updatePassword(email, newPasswordHash);
            
            return true;
        } catch (error) {
            throw new Error('Password change failed: ' + error.message);
        }
    }

    // ========================================================================
    // JWT 相關工具方法
    // ========================================================================

    /**
     * 生成 JWT token
     * 將使用者資訊編碼為 JWT token（私有方法）
     * 
     * @private
     * @param {Object} user - 使用者物件
     * @param {string} user.email - 使用者電子郵件
     * @param {string} user.username - 使用者姓名
     * 
     * @returns {string} JWT token
     * 
     * @example
     * const token = this._generateToken({ email: 'test@example.com', username: '王小明' });
     */
    _generateToken(user) {
        // 包含 user_id 以便中間件與其他服務使用
        const payload = {
            email: user.email,
            username: user.username
        };
        if (user.user_id) payload.user_id = user.user_id;
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }

    /**
     * 驗證 JWT token
     * 解碼並驗證 JWT token 的有效性
     * 
     * @param {string} token - JWT token
     * 
     * @returns {Object} 解碼後的 payload（包含 email, username）
     * @throws {Error} Token 無效或已過期
     * 
     * @example
     * const payload = userService.verifyToken(token);
     * console.log('Token 擁有者:', payload.email);
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    // ========================================================================
    // 驗證工具方法
    // ========================================================================

    /**
     * 驗證 email 格式
     * 使用正則表達式驗證 email 格式是否正確（私有方法）
     * 
     * @private
     * @param {string} email - 電子郵件地址
     * 
     * @returns {boolean} 格式正確回傳 true，否則回傳 false
     * 
     * @example
     * this._isValidEmail('test@example.com'); // true
     * this._isValidEmail('invalid-email'); // false
     */
    _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// ============================================================================
// 匯出單例實例（Singleton Pattern）
// ============================================================================

module.exports = new UserService();