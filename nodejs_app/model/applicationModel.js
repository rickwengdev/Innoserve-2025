const db = require('../config/database');

class ApplicationModel {
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

    // 創建新申請
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

    // 根據申請ID查找申請
    static async findById(application_id) {
        try {
            const [rows] = await db.query('SELECT * FROM applications WHERE application_id = ?', [application_id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // 根據email查找所有申請
    static async findByEmail(email) {
        try {
            const [rows] = await db.query('SELECT * FROM applications WHERE email = ?', [email]);
            return rows;
        } catch (error) {
            throw error;
        }
    }

    // 更新申請資料
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
}

module.exports = ApplicationModel;