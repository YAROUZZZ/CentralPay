// Utility functions for input validation
const validateEmail = (email) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
};

const validateName = (name) => {
    const nameRegex = /^[a-zA-Z ]/;
    return nameRegex.test(name);
};

const validatePassword = (password) => {
    return password.length >= 8;
};

const validateRequiredFields = (fields, fieldNames) => {
    const missingFields = fieldNames.filter(fieldName => !fields[fieldName] || fields[fieldName].trim() === "");
    return missingFields.length === 0 ? null : `Missing required fields: ${missingFields.join(', ')}`;
};

const sanitizeInput = (input) => {
    return input.trim();
};

module.exports = {
    validateEmail,
    validateName,
    validatePassword,
    validateRequiredFields,
    sanitizeInput
};
