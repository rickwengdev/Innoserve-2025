/**
 * @fileoverview 職業傷害申請資料模型
 * 處理職業傷害申請案件的資料庫操作（CRUD）
 * 
 * 資料表結構：applications
 * - application_id: 主鍵（自動遞增）
 * - email: 申請人電子郵件（外鍵關聯至 users 表）
 * - eligibility_criteria: 申請資格條件
 * - types_of_wounded: 傷病類型
 * - injury_date: 受傷日期
 * - salary_status: 薪資狀態
 * - salary_type: 薪資類型
 * - is_reinstated: 是否復職
 * - reinstatement_date: 復職日期
 * - injury_type: 傷害類型
 * - work_content: 工作內容
 * - injury_time: 受傷時間
 * - injury_location: 受傷地點
 * - injury_cause: 受傷原因
 * - chemical_substance_name: 化學物質名稱
 * - other_injury_factors: 其他致傷因素
 * - public_injury_description: 職業傷害詳細描述
 * 
 * @module model/applicationModel
 * @requires config/database
 * @author Innoserve Development Team
 * @version 1.0.0
 */

const db = require('../config/database');

// ============================================================================
// 職業傷害申請資料模型類別
// ============================================================================

/**
 * 職業傷害申請資料模型類別
 * 提供申請案件的建立、查詢、更新功能
 * 
 * @class ApplicationModel
 */
class ApplicationModel {
    /**
     * 建立申請案件模型實例
     * 
     * @param {Object} applicationData - 申請資料物件
     * @param {number} [applicationData.application_id] - 申請 ID（更新時使用）
     * @param {string} applicationData.email - 申請人電子郵件（必填）
     * @param {string} applicationData.eligibility_criteria - 申請資格條件
     * @param {string} applicationData.types_of_wounded - 傷病類型
     * @param {string} applicationData.injury_date - 受傷日期（格式：YYYY-MM-DD）
     * @param {string} applicationData.salary_status - 薪資狀態
     * @param {string} applicationData.salary_type - 薪資類型
     * @param {boolean} applicationData.is_reinstated - 是否復職
     * @param {string} [applicationData.reinstatement_date] - 復職日期（格式：YYYY-MM-DD）
     * @param {string} applicationData.injury_type - 傷害類型
     * @param {string} applicationData.work_content - 工作內容描述
     * @param {string} applicationData.injury_time - 受傷時間
     * @param {string} applicationData.injury_location - 受傷地點
     * @param {string} applicationData.injury_cause - 受傷原因
     * @param {string} [applicationData.chemical_substance_name] - 化學物質名稱
     * @param {string} [applicationData.other_injury_factors] - 其他致傷因素
     * @param {string} applicationData.public_injury_description - 職業傷害詳細描述
     */
    constructor(applicationData) {
        this.application_id = applicationData.application_id;
        this.email = applicationData.email;
        this.eligibility_criteria = applicationData.eligibility_criteria;
        this.types_of_wounded = applicationData.types_of_wounded;
        this.injury_date = applicationData.injury_date;
        this.salary_status = applicationData.salary_status;
        this.salary_type = applicationData.salary_type;
        this.is_reinstated = applicationData.is_reinstated;
        this.reinstatement_date = applicationData.reinstatement_date;
        this.injury_type = applicationData.injury_type;
        this.work_content = applicationData.work_content;
        this.injury_time = applicationData.injury_time;
        this.injury_location = applicationData.injury_location;
        this.injury_cause = applicationData.injury_cause;
        this.chemical_substance_name = applicationData.chemical_substance_name;
        this.other_injury_factors = applicationData.other_injury_factors;
        this.public_injury_description = applicationData.public_injury_description;
    }

    // ========================================================================
    // 實例方法（Instance Methods）
    // ========================================================================

    /**
     * 建立新申請案件記錄
     * 將當前實例的資料插入資料庫
     * 
     * @async
     * @returns {Promise<Object>} 資料庫插入結果（包含 insertId）
     * @throws {Error} 資料庫操作失敗
     * 
     * @example
     * const application = new ApplicationModel({
     *   email: 'test@example.com',
     *   eligibility_criteria: '勞工保險被保險人',
     *   injury_date: '2025-01-15',
     *   injury_type: '跌倒',
     *   // ... 其他欄位
     * });
     * const result = await application.create();
     * console.log('新申請 ID:', result[0].insertId);
     */
    async create() {
        try {
            const sql = `
                INSERT INTO applications 
                (email, eligibility_criteria, types_of_wounded, injury_date, 
                salary_status, salary_type, is_reinstated, reinstatement_date,
                injury_type, work_content, injury_time, injury_location,
                injury_cause, chemical_substance_name, other_injury_factors,
                public_injury_description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await db.query(sql, [
                this.email,
                this.eligibility_criteria,
                this.types_of_wounded,
                this.injury_date,
                this.salary_status,
                this.salary_type,
                this.is_reinstated,
                this.reinstatement_date,
                this.injury_type,
                this.work_content,
                this.injury_time,
                this.injury_location,
                this.injury_cause,
                this.chemical_substance_name,
                this.other_injury_factors,
                this.public_injury_description
            ]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 更新申請案件資料
     * 根據 application_id 更新申請案件的詳細資訊
     * 
     * @async
     * @returns {Promise<Object>} 資料庫更新結果（包含 affectedRows）
     * @throws {Error} 資料庫操作失敗
     * 
     * @example
     * const application = new ApplicationModel({
     *   application_id: 1,
     *   eligibility_criteria: '勞工保險被保險人',
     *   injury_date: '2025-01-20',
     *   // ... 更新的欄位
     * });
     * await application.update();
     */
    async update() {
        try {
            const sql = `
                UPDATE applications 
                SET eligibility_criteria = ?, types_of_wounded = ?, 
                    injury_date = ?, salary_status = ?, salary_type = ?,
                    is_reinstated = ?, reinstatement_date = ?, injury_type = ?,
                    work_content = ?, injury_time = ?, injury_location = ?,
                    injury_cause = ?, chemical_substance_name = ?,
                    other_injury_factors = ?, public_injury_description = ?
                WHERE application_id = ?
            `;
            const result = await db.query(sql, [
                this.eligibility_criteria,
                this.types_of_wounded,
                this.injury_date,
                this.salary_status,
                this.salary_type,
                this.is_reinstated,
                this.reinstatement_date,
                this.injury_type,
                this.work_content,
                this.injury_time,
                this.injury_location,
                this.injury_cause,
                this.chemical_substance_name,
                this.other_injury_factors,
                this.public_injury_description,
                this.application_id
            ]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    // ========================================================================
    // 靜態方法（Static Methods）- 查詢功能
    // ========================================================================

    /**
     * 根據申請 ID 查找申請案件
     * 用於取得特定申請案件的詳細資料
     * 
     * @static
     * @async
     * @param {number} application_id - 申請案件 ID（主鍵）
     * @returns {Promise<Object|undefined>} 申請案件資料物件，若不存在則回傳 undefined
     * @throws {Error} 資料庫查詢失敗
     * 
     * @example
     * const application = await ApplicationModel.findById(1);
     * if (application) {
     *   console.log('受傷日期:', application.injury_date);
     * }
     */
    static async findById(application_id) {
        try {
            const [rows] = await db.query('SELECT * FROM applications WHERE application_id = ?', [application_id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * 根據電子郵件查找所有申請案件
     * 用於取得特定使用者的所有申請記錄
     * 
     * @static
     * @async
     * @param {string} email - 申請人電子郵件
     * @returns {Promise<Array<Object>>} 申請案件資料陣列（可能為空陣列）
     * @throws {Error} 資料庫查詢失敗
     * 
     * @example
     * const applications = await ApplicationModel.findByEmail('test@example.com');
     * console.log('申請案件數量:', applications.length);
     * applications.forEach(app => {
     *   console.log(`案件 ${app.application_id}: ${app.injury_date}`);
     * });
     */
    static async findByEmail(email) {
        try {
            const [rows] = await db.query('SELECT * FROM applications WHERE email = ?', [email]);
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ApplicationModel;