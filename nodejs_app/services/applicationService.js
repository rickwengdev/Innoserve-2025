/**
 * @fileoverview 職業傷害申請案件業務邏輯服務
 * 處理申請案件相關的業務邏輯，包含申請建立、查詢、更新、完整資料包整合
 * 
 * 核心功能：
 * - 申請案件 CRUD 操作（透過 Model 層）
 * - 使用者申請列表查詢
 * - 完整資料包整合（application + user）
 * - 權限控制（使用者只能存取自己的申請）
 * 
 * 架構說明：
 * Service 層負責業務邏輯，呼叫 Model 層進行資料存取
 * 複雜的多表查詢（JOIN）仍在 Service 層直接操作資料庫
 * 
 * @module services/applicationService
 * @requires config/database
 * @requires model/applicationModel
 * @author Rick
 * @version 1.0.0
 */

const db = require('../config/database');
const ApplicationModel = require('../model/applicationModel');

// ============================================================================
// 職業傷害申請業務邏輯服務類別
// ============================================================================

/**
 * 職業傷害申請業務邏輯服務類別
 * 提供申請案件相關的所有業務邏輯處理
 * 
 * @class ApplicationService
 */
class ApplicationService {
    // ========================================================================
    // 申請案件基本操作（CRUD）
    // ========================================================================

    /**
     * 建立新申請案件
     * 透過 Model 層將申請資料插入資料庫並回傳新建立的 application_id
     * 
     * @async
     * @param {Object} applicationData - 申請案件資料
     * @param {string} applicationData.email - 申請人電子郵件（必填）
     * @param {string} applicationData.eligibility_criteria - 申請資格條件
     * @param {string} applicationData.types_of_wounded - 傷病類型
     * @param {string} applicationData.injury_date - 受傷日期
     * @param {string} applicationData.salary_status - 薪資狀態
     * @param {string} applicationData.salary_type - 薪資類型
     * @param {boolean} applicationData.is_reinstated - 是否復職
     * @param {string} [applicationData.reinstatement_date] - 復職日期
     * @param {string} applicationData.injury_type - 傷害類型
     * @param {string} applicationData.work_content - 工作內容
     * @param {string} applicationData.injury_time - 受傷時間
     * @param {string} applicationData.injury_location - 受傷地點
     * @param {string} applicationData.injury_cause - 受傷原因
     * @param {string} [applicationData.chemical_substance_name] - 化學物質名稱
     * @param {string} [applicationData.other_injury_factors] - 其他致傷因素
     * @param {string} applicationData.public_injury_description - 職業傷害描述
     * 
     * @returns {Promise<Object>} 包含新建立的 application_id
     * @throws {Error} 資料庫插入失敗
     * 
     * @example
     * const result = await applicationService.createApplication({
     *   email: 'test@example.com',
     *   eligibility_criteria: '勞工保險被保險人',
     *   injury_date: '2025-01-15',
     *   // ... 其他欄位
     * });
     * console.log('新申請 ID:', result.application_id);
     */
    async createApplication(applicationData) {
        try {
            // 使用 Model 層處理資料庫操作
            const application = new ApplicationModel(applicationData);
            const result = await application.create();
            return { application_id: result[0].insertId };
        } catch (error) {
            throw new Error('Application creation failed: ' + error.message);
        }
    }

    /**
     * 根據申請 ID 查找申請案件
     * 透過 Model 層取得特定申請案件的基本資料
     * 
     * @async
     * @param {number} application_id - 申請案件 ID
     * 
     * @returns {Promise<Object|undefined>} 申請案件資料物件，若不存在則回傳 undefined
     * @throws {Error} 資料庫查詢失敗
     * 
     * @example
     * const application = await applicationService.getApplicationById(1);
     * if (application) {
     *   console.log('受傷日期:', application.injury_date);
     * }
     */
    async getApplicationById(application_id) {
        try {
            // 使用 Model 層處理資料庫查詢
            return await ApplicationModel.findById(application_id);
        } catch (error) {
            throw new Error('Application retrieval failed: ' + error.message);
        }
    }

    /**
     * 根據 email 查找所有申請案件
     * 透過 Model 層取得特定使用者的所有申請案件完整資料
     * 
     * @async
     * @param {string} email - 使用者電子郵件
     * 
     * @returns {Promise<Array<Object>>} 申請案件資料陣列（可能為空陣列）
     * @throws {Error} 資料庫查詢失敗
     * 
     * @example
     * const applications = await applicationService.getUserApplications('test@example.com');
     * console.log('申請案件數量:', applications.length);
     */
    async getUserApplications(identifier) {
        try {
            // 兼容：可傳入 user_id（number）或 email（string）
            let userId = null;
            if (typeof identifier === 'number') {
                userId = identifier;
            } else if (typeof identifier === 'string') {
                const [urows] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [identifier]);
                userId = (urows && urows[0]) ? urows[0].user_id : null;
            }
            if (!userId) return [];
            return await ApplicationModel.findByUserId(userId);
        } catch (error) {
            throw new Error('Applications retrieval failed: ' + error.message);
        }
    }

    /**
     * 更新申請案件資料
     * 透過 Model 層更新特定申請案件的詳細資訊
     * 
     * @async
     * @param {Object} applicationData - 申請案件資料（必須包含 application_id）
     * @param {number} applicationData.application_id - 申請案件 ID（識別碼）
     * @param {string} [applicationData.eligibility_criteria] - 申請資格條件
     * @param {string} [applicationData.types_of_wounded] - 傷病類型
     * @param {string} [applicationData.injury_date] - 受傷日期
     * @param {string} [applicationData.salary_status] - 薪資狀態
     * @param {string} [applicationData.salary_type] - 薪資類型
     * @param {boolean} [applicationData.is_reinstated] - 是否復職
     * @param {string} [applicationData.reinstatement_date] - 復職日期
     * @param {string} [applicationData.injury_type] - 傷害類型
     * @param {string} [applicationData.work_content] - 工作內容
     * @param {string} [applicationData.injury_time] - 受傷時間
     * @param {string} [applicationData.injury_location] - 受傷地點
     * @param {string} [applicationData.injury_cause] - 受傷原因
     * @param {string} [applicationData.chemical_substance_name] - 化學物質名稱
     * @param {string} [applicationData.other_injury_factors] - 其他致傷因素
     * @param {string} [applicationData.public_injury_description] - 職業傷害描述
     * 
     * @returns {Promise<Object>} 資料庫更新結果（包含 affectedRows）
     * @throws {Error} 資料庫更新失敗
     * 
     * @example
     * await applicationService.updateApplication({
     *   application_id: 1,
     *   injury_date: '2025-01-20',
     *   injury_location: '辦公室三樓'
     * });
     */
    async updateApplication(applicationData) {
        try {
            // 使用 Model 層處理資料庫更新
            const application = new ApplicationModel(applicationData);
            return await application.update();
        } catch (error) {
            throw new Error('Application update failed: ' + error.message);
        }
    }

    // ========================================================================
    // 進階查詢功能
    // ========================================================================

    /**
     * 列出使用者的申請案件 ID 列表
     * 取得特定使用者的所有申請案件（僅包含 ID 與時間戳）
     * 適用於列表顯示，減少資料傳輸量
     * 
     * 註：此方法直接操作資料庫（SELECT 特定欄位），未透過 Model
     * 因為 Model 的 findByEmail() 會返回所有欄位，不符合此需求
     * 
     * @async
     * @param {string} email - 使用者電子郵件
     * 
     * @returns {Promise<Array<Object>>} 申請案件摘要陣列（按建立時間降序排列）
     * @returns {number} return[].application_id - 申請案件 ID
     * @returns {string} return[].created_at - 建立時間
     * @returns {string} return[].updated_at - 更新時間
     * @throws {Error} 缺少 email 參數或資料庫查詢失敗
     * 
     * @example
     * const list = await applicationService.listApplicationIdsByEmail('test@example.com');
     * list.forEach(item => {
     *   console.log(`申請 ${item.application_id}，建立於 ${item.created_at}`);
     * });
     */
    async listApplicationIdsByEmail(email) {
        // 保持外部接口兼容：如果被呼叫仍傳入 email，嘗試以 email 取得 user_id
        if (!email) throw new Error('Email required');
        // 先嘗試找到 user_id
        const [userRows] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
        if (!userRows || !userRows[0]) return [];
        const userId = userRows[0].user_id;
        const sql = 'SELECT application_id, created_at, updated_at FROM applications WHERE user_id = ? ORDER BY created_at DESC';
        const [rows] = await db.query(sql, [userId]);
        return rows;
    }

    /**
     * 取得申請案件完整資料包
     * 整合申請資料、使用者資料、連續不能工作期間資料為單一資料包
     * 包含權限檢查，確保使用者只能存取自己的申請
     * 
     * 註：此方法直接操作資料庫（多表 JOIN），未透過 Model
     * 原因：涉及複雜的 JOIN 查詢與業務邏輯（權限檢查、資料整合）
     * 這類複雜查詢適合放在 Service 層
     * 
     * @async
     * @param {number} applicationId - 申請案件 ID
     * @param {string|null} [requesterEmail=null] - 請求者的 email（用於權限檢查）
     * 
     * @returns {Promise<Object>} 完整資料包
     * @returns {Object} return.application - 申請案件資料（包含 JOIN 的使用者欄位）
     * @returns {Object} return.user - 使用者資料（獨立物件）
     * 
     * @throws {Error} 缺少 applicationId、申請不存在、權限不足
     * 
     * @example
     * // 不檢查權限（內部使用）
     * const pkg = await applicationService.getApplicationPackage(1);
     * console.log('申請人:', pkg.user.username);
     * 
     * @example
     * // 檢查權限（API 端點使用）
     * const pkg = await applicationService.getApplicationPackage(1, 'test@example.com');
     * // 若 requesterEmail 與申請的 email 不符，將拋出錯誤
     */
    async getApplicationPackage(applicationId, requesterEmail = null) {
        if (!applicationId) throw new Error('applicationId required');

        // 複雜的多表 JOIN 查詢：application + user
        // 此類查詢包含業務邏輯（資料整合），適合在 Service 層處理
        const appSql = `
            SELECT a.*, u.user_id AS user_user_id, u.email AS user_email, u.username, u.created_at AS user_created_at
            FROM applications a
            JOIN users u ON a.user_id = u.user_id
            WHERE a.application_id = ?
            LIMIT 1
        `;
        const [appRows] = await db.query(appSql, [applicationId]);
        const applicationRow = appRows[0];
        if (!applicationRow) throw new Error('Application not found');

        // 業務邏輯：權限檢查
        // 確保使用者只能存取自己的申請
        // requesterEmail may actually be requesterUserId (caller should pass user id)
        if (requesterEmail) {
            // 如果傳入為數字 (user_id)，直接比對；否則當作 email，轉成 user_id 再比對
            let requesterUserId = requesterEmail;
            if (typeof requesterEmail !== 'number') {
                const [urows] = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [requesterEmail]);
                requesterUserId = (urows && urows[0]) ? urows[0].user_id : null;
            }
            if (requesterUserId && requesterUserId !== applicationRow.user_id) {
                throw new Error('Forbidden: not the owner');
            }
        }

        // 業務邏輯：組合完整資料包
        // 將多個資料來源整合為統一格式
        return {
            application: applicationRow,
            user: {
                user_id: applicationRow.user_user_id,
                email: applicationRow.user_email,
                username: applicationRow.username,
                created_at: applicationRow.user_created_at
            },
        };
    }
}

// ============================================================================
// 匯出單例實例（Singleton Pattern）
// ============================================================================

module.exports = new ApplicationService();