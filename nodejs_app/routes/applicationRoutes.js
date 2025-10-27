const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const auth = require('../middleware/authMiddleware');

// 取得當前登入使用者的所有申請列表（僅 ID 和時間戳）
router.get('/my-applications', auth, applicationController.getMyApplications);

// 取得申請的完整資料包（application + user + interruption_periods）
// 注意：此路由需要放在 '/:id' 之前，避免 'full-details' 被當作 id
router.get('/:id/full-details', auth, applicationController.getApplicationFullDetails);

// 下載/預覽申請 PDF（含申請、使用者、斷續時間摘要）
router.get('/:id/pdf', auth, applicationController.getApplicationPdf);

// 新增申請
router.post('/', auth, applicationController.createApplication);

// 取得單筆申請基本資料
router.get('/:id', auth, applicationController.getApplicationById);

// 更新申請
router.put('/:id', auth, applicationController.updateApplication);

module.exports = router;