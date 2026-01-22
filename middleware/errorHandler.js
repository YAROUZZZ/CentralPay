// middleware/errorHandler.js
const { sendError } = require('../utils/response');
const AppError = require('../utils/appError');

const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);

    // Handle AppError
    if (err instanceof AppError) {
        return sendError(res, err.statusCode, err.message);
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return sendError(res, 400, err.message);
    }

    // Handle cast errors
    if (err.name === 'CastError') {
        return sendError(res, 400, 'Invalid data format');
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
        return sendError(res, 409, 'Duplicate entry');
    }

    // Default error
    return sendError(res, 500, 'Internal server error');
};

module.exports = errorHandler;