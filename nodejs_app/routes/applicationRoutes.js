const express = require('express');
const router = express.Router();
const applicationService = require('../services/applicationService');
const auth = require('../middleware/authMiddleware');

router.post('/', async (req, res) => {
    try {
        const result = await applicationService.createApplication(req.body);
        res.status(201).json({
            success: true,
            message: 'Application created successfully',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await applicationService.getApplicationById(req.params.id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

router.get('/user/:email', async (req, res) => {
    try {
        const results = await applicationService.getUserApplications(req.params.email);
        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const applicationData = { application_id: req.params.id, ...req.body };
        const result = await applicationService.updateApplication(applicationData);
        res.status(200).json({
            success: true,
            message: 'Application updated successfully',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// 列出登入使用者的 application id 列表（含 created_at, updated_at）
router.get('/me', auth, async (req, res) => {
    try {
        const email = req.user.email;
        const results = await applicationService.listApplicationIdsByEmail(email);
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// 取得完整封包： application + user + interruption_periods
// 只有 application 擁有者可以取用（auth middleware 會比對 email）
router.get('/:id/package', auth, async (req, res) => {
    try {
        const applicationId = parseInt(req.params.id, 10);
        const requesterEmail = req.user.email;
        const pkg = await applicationService.getApplicationPackage(applicationId, requesterEmail);
        res.status(200).json({ success: true, data: pkg });
    } catch (error) {
        // 403 for forbidden ownership, 404 for not found, 400 for bad request
        const msg = error.message || 'Error';
        if (msg.includes('Forbidden')) return res.status(403).json({ success: false, message: msg });
        if (msg.includes('not found') || msg.includes('not exist')) return res.status(404).json({ success: false, message: msg });
        return res.status(400).json({ success: false, message: msg });
    }
});

module.exports = router;