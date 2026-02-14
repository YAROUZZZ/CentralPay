const express = require('express');
const router = express.Router();

// Import controller and middleware
const userController = require('../controllers/normalController');
const { validateRequestBody, sanitizeBody } = require('../middleware/validation');

router.post('/signup',
    sanitizeBody(['name', 'email', 'password']),
    validateRequestBody(['name', 'email', 'password']),
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