const express = require('express');
const router = express.Router();

// Import controller and middleware
const userController = require('../controllers/userController');
const { validateRequestBody, sanitizeBody } = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/signup',
    sanitizeBody(['name', 'email', 'password', 'role']),
    validateRequestBody(['name', 'email', 'password', 'role']),
    userController.signup
);

router.post("/verify", 
    userController.verifyAccount
);

router.post('/signin',
    sanitizeBody(['email', 'password']),
    validateRequestBody(['email', 'password']),
    userController.signin
);

router.delete('/delete', userController.deleteAccount);

module.exports = router;