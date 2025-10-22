const UserModel = require('../model/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';  // 建議使用環境變數
const JWT_EXPIRES_IN = '24h';  // Token 有效期限

class UserService {
    async registerUser(userData) {
        try {
            // Hash password
            const saltRounds = 10;
            userData.password_hash = await bcrypt.hash(userData.password, saltRounds);
            
            const user = new UserModel(userData);
            return await user.create();
        } catch (error) {
            throw new Error('User registration failed: ' + error.message);
        }
    }

    async authenticateUser(email, password) {
        try {
            const user = await UserModel.findByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) {
                throw new Error('Invalid password');
            }
            
            // 生成 JWT token
            const token = this._generateToken(user);
            
            // 回傳用戶資訊和 token
            return {
                user: {
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

    // 新增 - 生成 JWT token
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

    // 新增 - 驗證 JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    async updateUserProfile(email, userData) {
        try {
            const user = new UserModel({ email, ...userData });
            return await user.update();
        } catch (error) {
            throw new Error('Profile update failed: ' + error.message);
        }
    }
}

module.exports = new UserService();