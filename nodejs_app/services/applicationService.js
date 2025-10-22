const db = require('../config/database');

class ApplicationService {
    // 創建新申請
    async createApplication(applicationData) {
        try {
            const fields = [
                'email', 'eligibility_criteria', 'types_of_wounded', 'injury_date',
                'salary_status', 'salary_type', 'is_reinstated', 'reinstatement_date',
                'injury_type', 'work_content', 'injury_time', 'injury_location',
                'injury_cause', 'chemical_substance_name', 'other_injury_factors',
                'public_injury_description'
            ];
            const values = fields.map(f => applicationData[f]);
            const sql = `
                INSERT INTO applications (${fields.join(',')})
                VALUES (${fields.map(() => '?').join(',')})
            `;
            const [result] = await db.query(sql, values);
            return { application_id: result.insertId };
        } catch (error) {
            throw new Error('Application creation failed: ' + error.message);
        }
    }

    // 根據申請ID查找申請
    async getApplicationById(application_id) {
        try {
            const [rows] = await db.query('SELECT * FROM applications WHERE application_id = ?', [application_id]);
            return rows[0];
        } catch (error) {
            throw new Error('Application retrieval failed: ' + error.message);
        }
    }

    // 根據email查找所有申請
    async getUserApplications(email) {
        try {
            const [rows] = await db.query('SELECT * FROM applications WHERE email = ?', [email]);
            return rows;
        } catch (error) {
            throw new Error('Applications retrieval failed: ' + error.message);
        }
    }

    // 更新申請資料
    async updateApplication(applicationData) {
        try {
            const fields = [
                'eligibility_criteria', 'types_of_wounded', 'injury_date',
                'salary_status', 'salary_type', 'is_reinstated', 'reinstatement_date',
                'injury_type', 'work_content', 'injury_time', 'injury_location',
                'injury_cause', 'chemical_substance_name', 'other_injury_factors',
                'public_injury_description'
            ];
            const values = fields.map(f => applicationData[f]);
            values.push(applicationData.application_id);
            const sql = `
                UPDATE applications SET
                ${fields.map(f => `${f} = ?`).join(', ')}
                WHERE application_id = ?
            `;
            const [result] = await db.query(sql, values);
            return result;
        } catch (error) {
            throw new Error('Application update failed: ' + error.message);
        }
    }

    // 取得某使用者的 application id 列表（可回傳少量 metadata）
    async listApplicationIdsByEmail(email) {
        if (!email) throw new Error('Email required');
        const sql = 'SELECT application_id, created_at, updated_at FROM applications WHERE email = ? ORDER BY created_at DESC';
        const [rows] = await db.query(sql, [email]);
        return rows;
    }

    // 取得單筆 application 的完整封包： application + user + interruption_periods
    async getApplicationPackage(applicationId, requesterEmail = null) {
        if (!applicationId) throw new Error('applicationId required');

        // 取得 application + user (JOIN)
        const appSql = `
            SELECT a.*, u.user_id AS user_user_id, u.email AS user_email, u.username, u.DOB, u.ID_number, 
                   u.ZIP_code, u.useraddress, u.home_telephone, u.telephone, u.created_at AS user_created_at
            FROM applications a
            JOIN users u ON a.email = u.email
            WHERE a.application_id = ?
            LIMIT 1
        `;
        const [appRows] = await db.query(appSql, [applicationId]);
        const applicationRow = appRows[0];
        if (!applicationRow) throw new Error('Application not found');

        // 權限檢查：若有 requesterEmail，必須與 application 的 email 相同（避免他人存取）
        if (requesterEmail && requesterEmail !== applicationRow.email) {
            throw new Error('Forbidden: not the owner');
        }

        // 取得 interruption_periods
        const periodsSql = `
            SELECT period_id, application_id, start_date, end_date, created_at, updated_at
            FROM interruption_periods
            WHERE application_id = ?
            ORDER BY start_date
        `;
        const [periods] = await db.query(periodsSql, [applicationId]);

        // 組合回傳
        return {
            application: applicationRow,
            user: {
                user_id: applicationRow.user_user_id,
                email: applicationRow.user_email,
                username: applicationRow.username,
                DOB: applicationRow.DOB,
                ID_number: applicationRow.ID_number,
                ZIP_code: applicationRow.ZIP_code,
                useraddress: applicationRow.useraddress,
                home_telephone: applicationRow.home_telephone,
                telephone: applicationRow.telephone,
                created_at: applicationRow.user_created_at
            },
            interruption_periods: periods
        };
    }
}

module.exports = new ApplicationService();