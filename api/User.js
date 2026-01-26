const express = require('express');
const router = express.Router();

// Import controller and middleware
const userController = require('../controllers/userController');
const { validateRequestBody, sanitizeBody } = require('../middleware/validation');
const auth = require('../middleware/auth');

// User registration route
router.post('/signup',
    sanitizeBody(['name', 'email', 'password', 'role']),
    validateRequestBody(['name', 'email', 'password']),
    userController.signup
);

// Account verification route (requires token from registration)
router.post("/verify", 
    auth,
    userController.verifyAccount
);

// User authentication route
router.post('/signin',
    sanitizeBody(['email', 'password']),
    validateRequestBody(['email', 'password']),
    userController.signin
);

module.exports = router;