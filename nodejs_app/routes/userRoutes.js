const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// 公開路由（不需要驗證）
// 註冊新使用者
router.post('/register', userController.register);

// 使用者登入
router.post('/login', userController.login);

// 需要驗證的路由
// 驗證 token 是否有效
router.get('/verify', auth, userController.verifyToken);

// 取得當前使用者資料
router.get('/profile', auth, userController.getProfile);

// 更新使用者資料
router.put('/profile', auth, userController.updateProfile);

// 修改密碼
router.put('/change-password', auth, userController.changePassword);

module.exports = router;