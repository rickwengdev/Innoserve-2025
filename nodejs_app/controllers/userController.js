const userService = require('../services/userService');

// 註冊新使用者
exports.register = async (req, res) => {
    try {
        const result = await userService.registerUser(req.body);
        // 將回應扁平化：token 與 user 在頂層，避免前端需要 data.data.token
        const { token, ...user } = result;
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user,
            token
        });
    } catch (error) {
        console.error('Register error:', error.message);
        // 檢查是否為重複 email 錯誤
        if (error.message.includes('Duplicate entry') || error.message.includes('duplicate')) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// 使用者登入
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 驗證必填欄位
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        const { user, token } = await userService.authenticateUser(email, password);
        // 扁平化回應，避免 data.data.token
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user,
            token
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

// 取得當前使用者資料
exports.getProfile = async (req, res) => {
    try {
        const email = req.user.email;
        const user = await userService.getUserByEmail(email);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// 更新使用者資料
exports.updateProfile = async (req, res) => {
    try {
        const email = req.user.email;
        
        // 防止更新敏感欄位
        const { password, password_hash, ...updateData } = req.body;
        
        const result = await userService.updateUserProfile(email, updateData);
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Update profile error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// 修改密碼
exports.changePassword = async (req, res) => {
    try {
        const email = req.user.email;
        const { currentPassword, newPassword } = req.body;
        
        // 驗證必填欄位
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        // 驗證新密碼長度
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }
        
        await userService.changePassword(email, currentPassword, newPassword);
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// 驗證 token（檢查 token 是否有效）
exports.verifyToken = async (req, res) => {
    try {
        // 如果能通過 auth middleware，token 就是有效的
        res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: {
                email: req.user.email
            }
        });
    } catch (error) {
        console.error('Verify token error:', error.message);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};
