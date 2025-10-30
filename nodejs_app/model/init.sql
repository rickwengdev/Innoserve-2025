USE app_db;

-- 1. 使用者 (User) - 儲存使用者基本資料
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL COMMENT '使用者暱稱',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '使用者電子郵件',
    password_hash VARCHAR(255) NOT NULL COMMENT '密碼 (加密後)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 申請表 (Application) - 核心資料表
CREATE TABLE IF NOT EXISTS applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,

    -- 關聯 Foreign Keys
    user_id INT NOT NULL COMMENT '關聯的使用者 ID',

    -- 申請表欄位 (來自圖中)
    applicant_name VARCHAR(100) NOT NULL COMMENT '申請者姓名(可與暱稱不同)',
    DOB DATE COMMENT '出生日期',
    ID_number VARCHAR(20) UNIQUE COMMENT '身分證號',
    ZIP_code VARCHAR(10) COMMENT '郵遞區號',
    useraddress TEXT COMMENT '地址',
    home_telephone VARCHAR(20) COMMENT '住家電話',
    telephone VARCHAR(20) COMMENT '聯絡電話',
    eligibility_criteria TINYINT COMMENT '請領資格 (用 0, 1, 2, 3 代表四個選項)',
    types_of_wounded TINYINT COMMENT '傷兵類別 (用 0, 1 代表兩個選項)',
    injury_date DATE COMMENT '受傷日期',
    salary_status TINYINT COMMENT '取得薪資情形 (用 0, 1 代表連續與斷續)',
    salary_type TINYINT COMMENT '薪資類別 (用 0, 1, 2, 3 代表四個選項)',
    is_reinstated TINYINT COMMENT '是否復工 (用 0, 1 代表否與是)',
    reinstatement_date DATE COMMENT '復工日期',
    injury_type TINYINT COMMENT '傷害類型 (用 0, 1, 2, 3 代表四個選項)',
    work_content TEXT COMMENT '工作內容描述',
    injury_time TIME COMMENT '受傷時間',
    injury_location VARCHAR(255) COMMENT '受傷地點',
    injury_cause TEXT COMMENT '受傷原因描述',
    chemical_substance_name VARCHAR(255) COMMENT '化學物質名稱(如有)',
    public_injury_description TEXT COMMENT '公出受傷說明(如是公出受傷)',
    deposit_type TINYINT COMMENT '存款類型 (用 0, 1 ,2 代表銀行/郵局/專戶)',
    deposit_bank VARCHAR(100) COMMENT '銀行名稱',
    deposit_branch VARCHAR(100) COMMENT '分行名稱',
    deposit_bank_code VARCHAR(20) COMMENT '銀行代碼',
    deposit_account VARCHAR(50) COMMENT '帳戶號碼',

    -- 時間戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 建立索引和外鍵約束
    INDEX(user_id),
    -- 使用者被刪除時，連帶刪除其申請
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. 斷續時間 (Interruption Periods) - 儲存斷續時間區間
CREATE TABLE IF NOT EXISTS interruption_periods (
    period_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 關聯 Foreign Keys
    application_id INT NOT NULL COMMENT '關聯的申請表 ID',

    -- 斷續時間欄位
    start_date DATE COMMENT '斷續開始日期',
    end_date DATE COMMENT '斷續結束日期',

    -- 時間戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 建立索引和外鍵約束
    INDEX(application_id),
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE
);

