const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'change_this_secret';

module.exports = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = auth.split(' ')[1];
    try {
        const payload = jwt.verify(token, SECRET);
        // payload should include email
        req.user = { email: payload.email };
        return next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};