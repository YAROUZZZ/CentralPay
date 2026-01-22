// Utility functions for standardized API responses

const sendError = (res, statusCode, message) => {
    return res.status(statusCode).json({
        status: "FAILED",
        message: message
    });
};

const sendSuccess = (res, statusCode, message, data = null) => {
    const response = {
        status: "SUCCESS",
        message: message
    };

    if (data) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

const sendPending = (res, statusCode, message) => {
    return res.status(statusCode).json({
        status: "PENDING",
        message: message
    });
};

module.exports = {
    sendError,
    sendSuccess,
    sendPending
};

