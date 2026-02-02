// JWT utility functions for token generation and verification
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (payload) => {
    try {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    } catch (error) {
        throw new Error('Failed to generate JWT token');
    }
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

const generateUserToken = (user) => {
    const payload = {
        userId: user._id,
        email: user.email,
        name: user.name
    };
    return generateToken(payload);
};

module.exports = {
    generateToken,
    verifyToken,
    generateUserToken
};

