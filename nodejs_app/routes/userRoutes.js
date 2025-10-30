/**
 * @fileoverview 使用者管理 API 路由定義
 * 提供使用者註冊、登入、個人資料管理等功能的 RESTful API 端點
 * 
 * 路由分類：
 * - 公開路由：不需要 JWT 驗證（註冊、登入）
 * - 受保護路由：需要有效的 JWT token（個人資料、修改密碼）
 * 
 * 基礎路徑：/api/users
 * 
 * @module routes/userRoutes
 * @requires express
 * @requires controllers/userController
 * @requires middleware/authMiddleware
 * @author Rick
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// ============================================================================
// 公開路由（Public Routes）
// 不需要 JWT 驗證，任何人都可存取
// ============================================================================

/**
 * 使用者註冊
 * 
 * @route POST /api/users/register
 * @access Public
 * @description 建立新使用者帳號
 * 
 * @body {string} email - 使用者電子郵件（必填，唯一）
 * @body {string} password - 使用者密碼（必填，至少 6 字元）
 * @body {string} username - 使用者姓名（必填）
 * @body {string} [DOB] - 出生日期（選填，格式：YYYY-MM-DD）
 * @body {string} [ID_number] - 身分證字號（選填）
 * @body {string} [ZIP_code] - 郵遞區號（選填）
 * @body {string} [useraddress] - 住址（選填）
 * @body {string} [home_telephone] - 家用電話（選填）
 * @body {string} [telephone] - 行動電話（選填）
 * 
 * @returns {201} 註冊成功，回傳使用者資訊與 JWT token
 * @returns {400} 請求格式錯誤或 email 已存在
 * @returns {500} 伺服器錯誤
 */
router.post('/register', userController.register);

/**
 * 使用者登入
 * 
 * @route POST /api/users/login
 * @access Public
 * @description 驗證使用者帳號密碼並取得 JWT token
 * 
 * @body {string} email - 使用者電子郵件
 * @body {string} password - 使用者密碼
 * 
 * @returns {200} 登入成功，回傳使用者資訊與 JWT token
 * @returns {400} 缺少必填欄位
 * @returns {401} 帳號或密碼錯誤
 * @returns {500} 伺服器錯誤
 */
router.post('/login', userController.login);

// ============================================================================
// 受保護路由（Protected Routes）
// 需要在 HTTP header 帶入有效的 JWT token
// Authorization: Bearer <token>
// ============================================================================

/**
 * 驗證 Token 有效性
 * 
 * @route GET /api/users/verify
 * @access Private
 * @description 檢查當前的 JWT token 是否仍然有效
 * 
 * @header {string} Authorization - Bearer token（必填）
 * 
 * @returns {200} Token 有效，回傳使用者資訊
 * @returns {401} Token 無效或已過期
 */
router.get('/verify', auth, userController.verifyToken);

/**
 * 取得個人資料
 * 
 * @route GET /api/users/profile
 * @access Private
 * @description 取得當前登入使用者的完整個人資料
 * 
 * @header {string} Authorization - Bearer token（必填）
 * 
 * @returns {200} 成功回傳使用者資料（不包含密碼）
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {404} 使用者不存在
 * @returns {500} 伺服器錯誤
 */
router.get('/profile', auth, userController.getProfile);

/**
 * 更新個人資料
 * 
 * @route PUT /api/users/profile
 * @access Private
 * @description 更新當前登入使用者的個人資料（不包含密碼）
 * 
 * @header {string} Authorization - Bearer token（必填）
 * 
 * @body {string} [username] - 使用者姓名
 * @body {string} [DOB] - 出生日期（格式：YYYY-MM-DD）
 * @body {string} [ID_number] - 身分證字號
 * @body {string} [ZIP_code] - 郵遞區號
 * @body {string} [useraddress] - 住址
 * @body {string} [home_telephone] - 家用電話
 * @body {string} [telephone] - 行動電話
 * 
 * @returns {200} 更新成功
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {500} 伺服器錯誤
 */
router.put('/profile', auth, userController.updateProfile);

/**
 * 修改密碼
 * 
 * @route PUT /api/users/change-password
 * @access Private
 * @description 變更當前登入使用者的密碼
 * 
 * @header {string} Authorization - Bearer token（必填）
 * 
 * @body {string} oldPassword - 目前的密碼（用於驗證身份）
 * @body {string} newPassword - 新密碼（至少 6 字元）
 * 
 * @returns {200} 密碼修改成功
 * @returns {400} 缺少必填欄位或舊密碼錯誤
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {500} 伺服器錯誤
 */
router.put('/change-password', auth, userController.changePassword);

module.exports = router;