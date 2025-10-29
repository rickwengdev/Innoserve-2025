const applicationService = require('../services/applicationService');
const pdfService = require('../services/pdfService');

// 創建新申請
exports.createApplication = async (req, res) => {
    try {
        // 從 auth middleware 取得使用者 email
        const applicationData = {
            ...req.body,
            email: req.user.email // 確保使用當前登入使用者的 email
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

// 根據申請ID取得單筆申請基本資料
exports.getApplicationById = async (req, res) => {
    try {
        const application = await applicationService.getApplicationById(req.params.id);
        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }
        // 驗證是否為該申請的擁有者
        if (req.user.email !== application.email) {
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

// 取得當前使用者的所有申請列表
exports.getMyApplications = async (req, res) => {
    try {
        const email = req.user.email;
        const applications = await applicationService.listApplicationIdsByEmail(email);
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

// 取得申請的完整資料包（application + user + interruption_periods）
exports.getApplicationFullDetails = async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id, 10);
        const requesterEmail = req.user.email;
        const packageData = await applicationService.getApplicationPackage(applicationId, requesterEmail);
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

// 更新申請資料
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
        // 驗證是否為該申請的擁有者
        if (req.user.email !== existingApp.email) {
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

// 生成申請 PDF（包含申請與使用者資訊，必要時含斷續時間）
exports.getApplicationPdf = async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id, 10);
        const requesterEmail = req.user.email;
        const pkg = await applicationService.getApplicationPackage(applicationId, requesterEmail);

        // Query options: ?download=1&filename=...&receipt=0&title=...
        const { download, filename, receipt, title } = req.query || {};
        const showReceipt = receipt === '0' ? false : true;

        const pdfBuffer = await pdfService.generateApplicationPdf(pkg, { showReceipt, title });        // Content-Disposition
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
