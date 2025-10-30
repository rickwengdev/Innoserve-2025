/**
 * @fileoverview 職業傷害申請案件 API 路由定義
 * 提供申請案件的建立、查詢、更新、PDF 生成等功能的 RESTful API 端點
 * 
 * 所有路由皆為受保護路由，需要有效的 JWT token
 * 
 * 基礎路徑：/api/applications
 * 
 * @module routes/applicationRoutes
 * @requires express
 * @requires controllers/applicationController
 * @requires middleware/authMiddleware
 * @author Innoserve Development Team
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const auth = require('../middleware/authMiddleware');

// ============================================================================
// 受保護路由（Protected Routes）
// 所有端點皆需要在 HTTP header 帶入有效的 JWT token
// Authorization: Bearer <token>
// ============================================================================

/**
 * 取得我的申請案件列表
 * 
 * @route GET /api/applications/my-applications
 * @access Private
 * @description 取得當前登入使用者的所有申請案件（僅包含 ID 和建立時間）
 * 
 * @header {string} Authorization - Bearer token（必填）
 * 
 * @returns {200} 成功回傳申請案件列表
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {500} 伺服器錯誤
 * 
 * @example
 * // Response body
 * {
 *   "success": true,
 *   "data": [
 *     { "application_id": 1, "created_at": "2025-01-15T10:30:00Z" },
 *     { "application_id": 2, "created_at": "2025-01-20T14:45:00Z" }
 *   ]
 * }
 */
router.get('/my-applications', auth, applicationController.getMyApplications);

/**
 * 取得申請案件完整資料包
 * 
 * @route GET /api/applications/:id/full-details
 * @access Private
 * @description 取得特定申請案件的完整資料（包含申請資料 + 使用者資料 + 斷續工作期間）
 * 
 * @header {string} Authorization - Bearer token（必填）
 * @param {number} id - 申請案件 ID（路徑參數）
 * 
 * @returns {200} 成功回傳完整資料包
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {404} 申請案件不存在
 * @returns {500} 伺服器錯誤
 * 
 * @note 此路由必須放在 '/:id' 之前，避免 'full-details' 被誤判為 application_id
 */
router.get('/:id/full-details', auth, applicationController.getApplicationFullDetails);

/**
 * 下載申請案件 PDF
 * 
 * @route GET /api/applications/:id/pdf
 * @access Private
 * @description 生成並下載特定申請案件的 PDF 表單（包含申請資料、使用者資料、斷續時間摘要）
 * 
 * @header {string} Authorization - Bearer token（必填）
 * @param {number} id - 申請案件 ID（路徑參數）
 * 
 * @returns {200} 成功回傳 PDF 檔案（Content-Type: application/pdf）
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {404} 申請案件不存在或使用者資料不存在
 * @returns {500} PDF 生成失敗或伺服器錯誤
 * 
 * @example
 * // Response headers
 * Content-Type: application/pdf
 * Content-Disposition: attachment; filename="application_1.pdf"
 */
router.get('/:id/pdf', auth, applicationController.getApplicationPdf);

/**
 * 建立新申請案件
 * 
 * @route POST /api/applications
 * @access Private
 * @description 建立新的職業傷害申請案件
 * 
 * @header {string} Authorization - Bearer token（必填）
 * 
 * @body {string} eligibility_criteria - 申請資格條件（必填）
 * @body {string} types_of_wounded - 傷病類型（必填）
 * @body {string} injury_date - 受傷日期（必填，格式：YYYY-MM-DD）
 * @body {string} salary_status - 薪資狀態（必填）
 * @body {string} salary_type - 薪資類型（必填）
 * @body {boolean} is_reinstated - 是否復職（必填）
 * @body {string} [reinstatement_date] - 復職日期（選填，格式：YYYY-MM-DD）
 * @body {string} injury_type - 傷害類型（必填）
 * @body {string} work_content - 工作內容描述（必填）
 * @body {string} injury_time - 受傷時間（必填）
 * @body {string} injury_location - 受傷地點（必填）
 * @body {string} injury_cause - 受傷原因（必填）
 * @body {string} [chemical_substance_name] - 化學物質名稱（選填）
 * @body {string} [other_injury_factors] - 其他致傷因素（選填）
 * @body {string} public_injury_description - 職業傷害詳細描述（必填）
 * 
 * @returns {201} 申請案件建立成功，回傳新申請的 ID
 * @returns {400} 請求格式錯誤或缺少必填欄位
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {500} 伺服器錯誤
 */
router.post('/', auth, applicationController.createApplication);

/**
 * 取得單筆申請案件基本資料
 * 
 * @route GET /api/applications/:id
 * @access Private
 * @description 取得特定申請案件的基本資料（僅 applications 表資料）
 * 
 * @header {string} Authorization - Bearer token（必填）
 * @param {number} id - 申請案件 ID（路徑參數）
 * 
 * @returns {200} 成功回傳申請案件基本資料
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {404} 申請案件不存在
 * @returns {500} 伺服器錯誤
 */
router.get('/:id', auth, applicationController.getApplicationById);

/**
 * 更新申請案件
 * 
 * @route PUT /api/applications/:id
 * @access Private
 * @description 更新特定申請案件的資料
 * 
 * @header {string} Authorization - Bearer token（必填）
 * @param {number} id - 申請案件 ID（路徑參數）
 * 
 * @body {string} [eligibility_criteria] - 申請資格條件
 * @body {string} [types_of_wounded] - 傷病類型
 * @body {string} [injury_date] - 受傷日期（格式：YYYY-MM-DD）
 * @body {string} [salary_status] - 薪資狀態
 * @body {string} [salary_type] - 薪資類型
 * @body {boolean} [is_reinstated] - 是否復職
 * @body {string} [reinstatement_date] - 復職日期（格式：YYYY-MM-DD）
 * @body {string} [injury_type] - 傷害類型
 * @body {string} [work_content] - 工作內容描述
 * @body {string} [injury_time] - 受傷時間
 * @body {string} [injury_location] - 受傷地點
 * @body {string} [injury_cause] - 受傷原因
 * @body {string} [chemical_substance_name] - 化學物質名稱
 * @body {string} [other_injury_factors] - 其他致傷因素
 * @body {string} [public_injury_description] - 職業傷害詳細描述
 * 
 * @returns {200} 更新成功
 * @returns {400} 請求格式錯誤
 * @returns {401} 未授權（token 無效或缺少）
 * @returns {404} 申請案件不存在
 * @returns {500} 伺服器錯誤
 */
router.put('/:id', auth, applicationController.updateApplication);

module.exports = router;