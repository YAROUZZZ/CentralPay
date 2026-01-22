// middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/appError');

const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            throw AppError.create('No token provided', 401);
        }

        const decoded = verifyToken(token);
        req.currentUser = decoded;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = authenticate;