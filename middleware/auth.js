// middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/appError');
const { findUserById } = require('../utils/database');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            throw AppError.create('No token provided', 401);
        }

        const decoded = verifyToken(token);
        
        // التحقق من أن المستخدم موجود فعلاً في قاعدة البيانات
        const userExists = await findUserById(decoded.userId);
        if (!userExists) {
            throw AppError.create('User no longer exists or has been deleted', 401);
        }
        
        req.currentUser = decoded;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = authenticate;