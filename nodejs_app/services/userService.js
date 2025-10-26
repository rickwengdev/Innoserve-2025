const UserModel = require('../model/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';  // 建議使用環境變數
const JWT_EXPIRES_IN = '24h';  // Token 有效期限
const SALT_ROUNDS = 10;  // bcrypt salt rounds

class UserService {
    // 註冊新使用者
    async registerUser(userData) {
        try {
            // 驗證必填欄位
            const requiredFields = ['email', 'password', 'username'];
            for (const field of requiredFields) {
                if (!userData[field]) {
                    throw new Error(`${field} is required`);
                }
            }
            
            // 驗證 email 格式
            if (!this._isValidEmail(userData.email)) {
                throw new Error('Invalid email format');
            }
            
            // 驗證密碼長度
            if (userData.password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }
            
            // 檢查 email 是否已存在
            const existingUser = await UserModel.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Email already exists');
            }
            
            // Hash password
            userData.password_hash = await bcrypt.hash(userData.password, SALT_ROUNDS);
            delete userData.password; // 刪除明文密碼
            
            const user = new UserModel(userData);
            const result = await user.create();
            
            // 生成 token
            const token = this._generateToken({ email: userData.email, username: userData.username });
            
            return {
                user_id: result.insertId,
                email: userData.email,
                username: userData.username,
                token
            };
        } catch (error) {
            throw new Error('User registration failed: ' + error.message);
        }
    }

    // 使用者登入驗證
    async authenticateUser(email, password) {
        try {
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }
            
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) {
                throw new Error('Invalid email or password');
            }
            
            // 生成 JWT token
            const token = this._generateToken(user);
            
            // 回傳用戶資訊和 token（排除敏感資訊）
            return {
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    username: user.username,
                    DOB: user.DOB,
                    ID_number: user.ID_number,
                    ZIP_code: user.ZIP_code,
                    useraddress: user.useraddress,
                    home_telephone: user.home_telephone,
                    telephone: user.telephone
                },
                token
            };
        } catch (error) {
            throw new Error('Authentication failed: ' + error.message);
        }
    }

    // 根據 email 取得使用者資料（排除密碼）
    async getUserByEmail(email) {
        try {
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            
            // 移除敏感資訊
            delete user.password_hash;
            return user;
        } catch (error) {
            throw new Error('Get user failed: ' + error.message);
        }
    }

    // 更新使用者資料
    async updateUserProfile(email, userData) {
        try {
            // 確保不能更新 email 和密碼相關欄位
            const { password, password_hash, ...safeData } = userData;
            
            // 檢查使用者是否存在
            const existingUser = await UserModel.findByEmail(email);
            if (!existingUser) {
                throw new Error('User not found');
            }
            
            const user = new UserModel({ email, ...safeData });
            await user.update();
            
            // 返回更新後的使用者資料
            return await this.getUserByEmail(email);
        } catch (error) {
            throw new Error('Profile update failed: ' + error.message);
        }
    }

    // 修改密碼
    async changePassword(email, currentPassword, newPassword) {
        try {
            // 驗證當前密碼
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            
            const match = await bcrypt.compare(currentPassword, user.password_hash);
            if (!match) {
                throw new Error('Current password is incorrect');
            }
            
            // Hash 新密碼
            const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            
            // 更新密碼（需要在 UserModel 中添加 updatePassword 方法）
            await UserModel.updatePassword(email, newPasswordHash);
            
            return true;
        } catch (error) {
            throw new Error('Password change failed: ' + error.message);
        }
    }

    // 生成 JWT token
    _generateToken(user) {
        return jwt.sign(
            {
                email: user.email,
                username: user.username
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }

    // 驗證 JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    // 驗證 email 格式
    _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

module.exports = new UserService();