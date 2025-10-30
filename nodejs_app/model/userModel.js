/**
 * @fileoverview 使用者資料模型
 * 處理使用者相關的資料庫操作（CRUD）
 * 
 * 資料表結構：users
 * - user_id: 主鍵（自動遞增）
 * - email: 使用者電子郵件（唯一索引）
 * - password_hash: bcrypt 加密後的密碼
 * - username: 使用者姓名
 * - DOB: 出生日期
 * - ID_number: 身分證字號
 * - ZIP_code: 郵遞區號
 * - useraddress: 住址
 * - home_telephone: 家用電話
 * - telephone: 行動電話
 * 
 * @module model/userModel
 * @requires config/database
 * @author Innoserve Development Team
 * @version 1.0.0
 */

const db = require('../config/database');

// ============================================================================
// 使用者資料模型類別
// ============================================================================

/**
 * 使用者資料模型類別
 * 提供使用者資料的建立、查詢、更新功能
 * 
 * @class UserModel
 */
class UserModel {
    /**
     * 建立使用者模型實例
     * 
     * @param {Object} userData - 使用者資料物件
     * @param {string} userData.email - 電子郵件（必填，唯一）
     * @param {string} userData.password_hash - bcrypt 加密後的密碼
     * @param {string} userData.username - 使用者姓名
     * @param {string} [userData.DOB] - 出生日期（格式：YYYY-MM-DD）
     * @param {string} [userData.ID_number] - 身分證字號
     * @param {string} [userData.ZIP_code] - 郵遞區號
     * @param {string} [userData.useraddress] - 住址
     * @param {string} [userData.home_telephone] - 家用電話
     * @param {string} [userData.telephone] - 行動電話
     */
    constructor(userData) {
        this.email = userData.email;
        this.password_hash = userData.password_hash;
        this.username = userData.username;
        this.DOB = userData.DOB;
        this.ID_number = userData.ID_number;
        this.ZIP_code = userData.ZIP_code;
        this.useraddress = userData.useraddress;
        this.home_telephone = userData.home_telephone;
        this.telephone = userData.telephone;
    }

    // ========================================================================
    // 實例方法（Instance Methods）
    // ========================================================================

    /**
     * 建立新使用者記錄
     * 將當前實例的資料插入資料庫
     * 
     * @async
     * @returns {Promise<Object>} 資料庫插入結果（包含 insertId）
     * @throws {Error} 資料庫操作失敗（如 email 重複）
     * 
     * @example
     * const user = new UserModel({
     *   email: 'test@example.com',
     *   password_hash: '$2b$10$...',
     *   username: '王小明'
     * });
     * const result = await user.create();
     * console.log('新使用者 ID:', result[0].insertId);
     */
    async create() {
        try {
            const sql = `
                INSERT INTO users 
                (email, password_hash, username, DOB, ID_number, ZIP_code, useraddress, home_telephone, telephone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const result = await db.query(sql, [
                this.email,
                this.password_hash,
                this.username,
                this.DOB,
                this.ID_number,
                this.ZIP_code,
                this.useraddress,
                this.home_telephone,
                this.telephone
            ]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 更新使用者資料
     * 根據 email 更新使用者的個人資訊（不包含密碼）
     * 
     * @async
     * @returns {Promise<Object>} 資料庫更新結果（包含 affectedRows）
     * @throws {Error} 資料庫操作失敗
     * 
     * @example
     * const user = new UserModel({
     *   email: 'test@example.com',
     *   username: '王大明',
     *   telephone: '0912345678'
     * });
     * await user.update();
     */
    async update() {
        try {
            const sql = `
                UPDATE users 
                SET username = ?, DOB = ?, ID_number = ?, ZIP_code = ?, 
                    useraddress = ?, home_telephone = ?, telephone = ?
                WHERE email = ?
            `;
            const result = await db.query(sql, [
                this.username,
                this.DOB,
                this.ID_number,
                this.ZIP_code,
                this.useraddress,
                this.home_telephone,
                this.telephone,
                this.email
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
     * 根據電子郵件查找使用者
     * 用於登入驗證與檢查 email 是否已註冊
     * 
     * @static
     * @async
     * @param {string} email - 使用者電子郵件
     * @returns {Promise<Object|undefined>} 使用者資料物件，若不存在則回傳 undefined
     * @throws {Error} 資料庫查詢失敗
     * 
     * @example
     * const user = await UserModel.findByEmail('test@example.com');
     * if (user) {
     *   console.log('使用者存在:', user.username);
     * }
     */
    static async findByEmail(email) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * 根據使用者 ID 查找使用者
     * 用於取得使用者詳細資料
     * 
     * @static
     * @async
     * @param {number} user_id - 使用者 ID（主鍵）
     * @returns {Promise<Object|undefined>} 使用者資料物件，若不存在則回傳 undefined
     * @throws {Error} 資料庫查詢失敗
     * 
     * @example
     * const user = await UserModel.findById(1);
     * if (user) {
     *   console.log('使用者姓名:', user.username);
     * }
     */
    static async findById(user_id) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // ========================================================================
    // 靜態方法（Static Methods）- 密碼管理
    // ========================================================================

    /**
     * 更新使用者密碼
     * 用於修改密碼功能（需先以 bcrypt 加密）
     * 
     * @static
     * @async
     * @param {string} email - 使用者電子郵件
     * @param {string} newPasswordHash - bcrypt 加密後的新密碼
     * @returns {Promise<Object>} 資料庫更新結果（包含 affectedRows）
     * @throws {Error} 資料庫操作失敗
     * 
     * @example
     * const bcrypt = require('bcrypt');
     * const newPasswordHash = await bcrypt.hash('newPassword123', 10);
     * await UserModel.updatePassword('test@example.com', newPasswordHash);
     */
    static async updatePassword(email, newPasswordHash) {
        try {
            const sql = `
                UPDATE users 
                SET password_hash = ?
                WHERE email = ?
            `;
            const result = await db.query(sql, [newPasswordHash, email]);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserModel;