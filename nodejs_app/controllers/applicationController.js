/**
 * @fileoverview 職業傷害申請案件控制器
 * 處理申請案件相關的 HTTP 請求，包含建立、查詢、更新、PDF 生成
 * 
 * 控制器職責：
 * - 接收並驗證 HTTP 請求參數
 * - 權限控制（使用者只能存取自己的申請）
 * - 呼叫 Service 層處理業務邏輯
 * - 格式化 HTTP 回應（統一的 JSON 格式或 PDF 檔案）
 * - 處理錯誤並回傳適當的 HTTP 狀態碼
 * 
 * @module controllers/applicationController
 * @requires services/applicationService
 * @requires services/pdfService
 * @author Rick
 * @version 1.0.0
 */

const applicationService = require('../services/applicationService');
const pdfService = require('../services/pdfService');

// ============================================================================
// 申請案件基本操作
// ============================================================================

/**
 * 建立新申請案件處理器
 * 處理新申請案件的建立請求
 * 
 * @async
 * @function createApplication
 * @param {Request} req - Express 請求物件
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件（自動附加至申請）
 * @param {Object} req.body - 請求主體（申請案件資料）
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的建立結果
 * 
 * @example
 * // Request body
 * {
 *   "eligibility_criteria": "勞工保險被保險人",
 *   "injury_date": "2025-01-15",
 *   "injury_type": "跌倒",
 *   // ... 其他欄位
 * }
 * 
 * // Response (201 Created)
 * {
 *   "success": true,
 *   "message": "Application created successfully",
 *   "data": { "application_id": 1 }
 * }
 */
exports.createApplication = async (req, res) => {
    try {
        // 從 auth middleware 取得使用者 email
        // 將使用者以 user_id 關聯，並允許表單上申請人的姓名與帳戶名稱不同
        const applicationData = {
            ...req.body,
            user_id: req.user.user_id, // 由 auth middleware 提供
            applicant_name: req.body.applicant_name || req.user.username
        };
        const result = await applicationService.createApplication(applicationData);
        res.status(201).json({
            success: true,
            message: 'Application created successfully',
            data: result
        });
    } catch (error) {
        console.error('Create application error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * 取得單筆申請案件處理器
 * 根據申請 ID 取得申請案件的基本資料
 * 包含權限檢查，確保只有申請擁有者能存取
 * 
 * @async
 * @function getApplicationById
 * @param {Request} req - Express 請求物件
 * @param {Object} req.params - 路徑參數
 * @param {string} req.params.id - 申請案件 ID
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的申請案件資料
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "application_id": 1,
 *     "email": "test@example.com",
 *     "injury_date": "2025-01-15",
 *     // ... 其他欄位
 *   }
 * }
 */
exports.getApplicationById = async (req, res) => {
    try {
        const application = await applicationService.getApplicationById(req.params.id);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        // 驗證是否為該申請的擁有者（權限控制）
        if (!req.user.user_id || req.user.user_id !== application.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Access denied'
            });
        }
        res.status(200).json({
            success: true,
            data: application
        });
    } catch (error) {
        console.error('Get application error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * 更新申請案件處理器
 * 更新特定申請案件的資料
 * 包含權限檢查，確保只有申請擁有者能更新
 * 
 * @async
 * @function updateApplication
 * @param {Request} req - Express 請求物件
 * @param {Object} req.params - 路徑參數
 * @param {string} req.params.id - 申請案件 ID
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Object} req.body - 請求主體（要更新的欄位）
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的更新結果
 * 
 * @example
 * // Request body
 * {
 *   "injury_date": "2025-01-20",
 *   "injury_location": "辦公室三樓"
 * }
 * 
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "message": "Application updated successfully",
 *   "data": { "affectedRows": 1 }
 * }
 */
exports.updateApplication = async (req, res) => {
    try {
        const applicationId = req.params.id;
        // 先檢查申請是否存在及權限
        const existingApp = await applicationService.getApplicationById(applicationId);
        if (!existingApp) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        // 驗證是否為該申請的擁有者（權限控制）
        if (!req.user.user_id || req.user.user_id !== existingApp.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: Access denied'
            });
        }
        // 準備更新資料
        const applicationData = {
            application_id: applicationId,
            ...req.body
        };
        const result = await applicationService.updateApplication(applicationData);
        res.status(200).json({
            success: true,
            message: 'Application updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Update application error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ============================================================================
// 進階查詢功能
// ============================================================================

/**
 * 取得我的申請列表處理器
 * 取得當前登入使用者的所有申請案件（僅包含 ID 與時間戳）
 * 
 * @async
 * @function getMyApplications
 * @param {Request} req - Express 請求物件
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的申請列表
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": [
 *     { "application_id": 1, "created_at": "2025-01-15T10:30:00Z", "updated_at": "..." },
 *     { "application_id": 2, "created_at": "2025-01-20T14:45:00Z", "updated_at": "..." }
 *   ]
 * }
 */
exports.getMyApplications = async (req, res) => {
    try {
        // 目前 service 對於 listApplicationIds 仍保留 email 兼容介面
        // 這裡傳入 email 可保證兼容性
        const applications = await applicationService.listApplicationIdsByEmail(req.user.email);
        res.status(200).json({
            success: true,
            data: applications
        });
    } catch (error) {
        console.error('Get my applications error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * 取得申請完整資料包處理器
 * 取得申請案件、使用者資料、斷續工作期間的完整資料包
 * 包含權限檢查，確保只有申請擁有者能存取
 * 
 * @async
 * @function getApplicationFullDetails
 * @param {Request} req - Express 請求物件
 * @param {Object} req.params - 路徑參數
 * @param {string} req.params.id - 申請案件 ID
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 JSON 格式的完整資料包
 * 
 * @example
 * // Response (200 OK)
 * {
 *   "success": true,
 *   "data": {
 *     "application": { "application_id": 1, "injury_date": "2025-01-15", ... },
 *     "user": { "user_id": 1, "email": "test@example.com", "username": "王小明", ... },
 *     "interruption_periods": [
 *       { "period_id": 1, "start_date": "2025-01-16", "end_date": "2025-01-20" }
 *     ]
 *   }
 * }
 */
exports.getApplicationFullDetails = async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id, 10);
        // 傳入 requester 的 user_id 以進行正確的權限檢查
        const requesterUserId = req.user.user_id;
        const packageData = await applicationService.getApplicationPackage(applicationId, requesterUserId);
        res.status(200).json({
            success: true,
            data: packageData
        });
    } catch (error) {
        console.error('Get application full details error:', error.message);
        const errorMessage = error.message || 'Error';
        if (errorMessage.includes('Forbidden')) {
            return res.status(403).json({ success: false, message: errorMessage });
        }
        if (errorMessage.includes('not found') || errorMessage.includes('not exist')) {
            return res.status(404).json({ success: false, message: errorMessage });
        }
        return res.status(400).json({ success: false, message: errorMessage });
    }
};

// ============================================================================
// PDF 生成功能
// ============================================================================

/**
 * 生成申請 PDF 處理器
 * 生成包含申請資料、使用者資料、斷續工作期間的 PDF 表單
 * 支援下載或預覽、自訂檔名、控制收據顯示
 * 
 * @async
 * @function getApplicationPdf
 * @param {Request} req - Express 請求物件
 * @param {Object} req.params - 路徑參數
 * @param {string} req.params.id - 申請案件 ID
 * @param {Object} req.user - 由 authMiddleware 附加的使用者資訊
 * @param {string} req.user.email - 使用者電子郵件
 * @param {Object} req.query - 查詢參數（選填）
 * @param {string} [req.query.download] - 是否下載（1=下載，其他=預覽）
 * @param {string} [req.query.filename] - 自訂檔名
 * @param {string} [req.query.receipt] - 是否顯示收據（0=隱藏，其他=顯示）
 * @param {string} [req.query.title] - 自訂標題
 * @param {Response} res - Express 回應物件
 * 
 * @returns {void} 回傳 PDF 檔案（Content-Type: application/pdf）
 * 
 * @example
 * // GET /api/applications/1/pdf?download=1&filename=我的申請.pdf&receipt=1
 * 
 * // Response headers
 * Content-Type: application/pdf
 * Content-Disposition: attachment; filename="application_1.pdf"; filename*=UTF-8''%E6%88%91%E7%9A%84%E7%94%B3%E8%AB%8B.pdf
 */
exports.getApplicationPdf = async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id, 10);
        const requesterUserId = req.user.user_id;
        const pkg = await applicationService.getApplicationPackage(applicationId, requesterUserId);

        // Query options: ?download=1&filename=...&receipt=0&title=...
        const { download, filename, receipt, title } = req.query || {};
        const showReceipt = receipt === '0' ? false : true;

        // 生成 PDF
        const pdfBuffer = await pdfService.generateApplicationPdf(pkg, { showReceipt, title });
        
        // Content-Disposition 設定（支援中文檔名）
        const dispType = download ? 'attachment' : 'inline';
        const defaultName = `application_${applicationId}.pdf`;
        const requestedName = (filename && String(filename).trim()) || defaultName;
        const asciiName = requestedName.replace(/[^\x20-\x7E]/g, '');
        const safeAscii = asciiName || defaultName;
        const utf8Name = encodeURIComponent(requestedName);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${dispType}; filename="${safeAscii}"; filename*=UTF-8''${utf8Name}`);
        return res.status(200).send(pdfBuffer);
    } catch (error) {
        console.error('Get application PDF error:', error.message);
        const msg = error.message || 'Error';
        if (msg.includes('Forbidden')) {
            return res.status(403).json({ success: false, message: msg });
        }
        if (msg.includes('not found') || msg.includes('not exist')) {
            return res.status(404).json({ success: false, message: msg });
        }
        return res.status(400).json({ success: false, message: msg });
    }
};
