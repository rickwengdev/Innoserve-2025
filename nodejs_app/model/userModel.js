const db = require('../config/database');

class UserModel {
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

    // 創建新使用者
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

    // 根據 email 查找使用者
    static async findByEmail(email) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // 更新使用者資料
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
}

module.exports = UserModel;