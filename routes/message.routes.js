const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/allowedTo');


router.post('/parse', authenticate, (req, res, next) => {
    messageController.extractAndSave(req, res).catch(next);
});

router.get('/recents', authenticate, (req, res, next) => {
    messageController.getRecentTransactions(req, res).catch(next);
});


router.get('/monthlyTransactions', authenticate, (req, res, next) => {
    messageController.getMonthlyTransactions(req, res).catch(next);
});


module.exports = router;