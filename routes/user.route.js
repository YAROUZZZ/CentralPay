const express = require('express');
const router = express.Router();

// Import controller and middleware
const userController = require('../controllers/userController.js');
const { validateRequestBody, sanitizeBody } = require('../middleware/validation');
const authenticate = require('../middleware/auth');

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

router.patch('/changeRole', authenticate, userController.changeRole);

router.get('/userData', authenticate, userController.getCurrentUser);

module.exports = router;