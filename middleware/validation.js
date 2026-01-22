// Request validation middleware
const { sendError } = require('../utils/response');

// Middleware to validate request body
const validateRequestBody = (requiredFields) => {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        next();
    };
};

// Middleware to sanitize request body
const sanitizeBody = (fields) => {
    return (req, res, next) => {
        fields.forEach(field => {
            if (req.body[field]) {
                req.body[field] = req.body[field].trim();
            }
        });
        next();
    };
};

module.exports = {
    validateRequestBody,
    sanitizeBody
};
