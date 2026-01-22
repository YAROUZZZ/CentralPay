const express = require('express');
const router = express.Router();

// Import controller and middleware
const userController = require('../controllers/userController');
const { validateRequestBody, sanitizeBody } = require('../middleware/validation');

// User registration route
router.post('/signup',
    sanitizeBody(['name', 'email', 'password', 'role']),
    validateRequestBody(['name', 'email', 'password']),
    userController.signup
);


// Email verification route
router.get("/verify/:Id/:uniqueString", userController.verifyEmail);

// Verified page route
router.get("/verified", userController.getVerifiedPage);

// User authentication route
router.post('/signin',
    sanitizeBody(['email', 'password']),
    validateRequestBody(['email', 'password']),
    userController.signin
);

module.exports = router;